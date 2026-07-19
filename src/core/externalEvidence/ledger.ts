import { calculateExternalEvidenceQuality } from "./quality";
import type {
  ExternalEvidenceInput,
  ExternalEvidenceRecord,
  ExternalEvidenceRecordView,
  ExternalEvidenceStatus,
  ExternalEvidenceSummaryRow,
  ExternalEvidenceTaxonomy,
  ExternalEvidenceValidationResult,
} from "./types";

const SCHEMA_VERSION = 1;
const SENSITIVE_EXTERNAL_DATA =
  /(authorization\s*:|bearer\s+[a-z0-9._-]+|password\s*[=:]|passwd\s*[=:]|cookie\s*[=:]|document\.cookie|(?:access|refresh|auth)[_-]?token\s*[=:]|api[_-]?key\s*[=:]|(?:^|[?&\s])token\s*=|https?:\/\/[^\s/:]+:[^\s/@]+@)/i;
const FULL_HTML = /<\s*(html|head|body|script|iframe|form)\b/i;

function isNonNegativeInteger(value: number | undefined): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function normalizeText(
  value: string | undefined,
  maximumLength: number,
): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maximumLength);
}

export function containsSensitiveExternalData(
  value: string | undefined,
): boolean {
  return Boolean(
    value && (SENSITIVE_EXTERNAL_DATA.test(value) || FULL_HTML.test(value)),
  );
}

export function sanitizeExternalEvidenceText(
  value: string | undefined,
  maximumLength: number,
): string | undefined {
  const normalized = normalizeText(value, maximumLength);
  if (!normalized) return undefined;
  return normalized.replace(/<[^>]*>/g, "").trim() || undefined;
}

export function validateExternalEvidenceInput(
  input: ExternalEvidenceInput,
  taxonomy: ExternalEvidenceTaxonomy,
): ExternalEvidenceValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!taxonomy.disciplineIds.has(input.disciplineId)) {
    fieldErrors.disciplineId =
      "Selecione uma disciplina existente na taxonomia ativa.";
  }
  if (taxonomy.topicToDiscipline.get(input.topicId) !== input.disciplineId) {
    fieldErrors.topicId =
      "Selecione um assunto pertencente à disciplina escolhida.";
  }
  if (
    input.subtopicId &&
    taxonomy.subtopicToTopic.get(input.subtopicId) !== input.topicId
  ) {
    fieldErrors.subtopicId =
      "Selecione um subassunto pertencente ao assunto escolhido.";
  }
  if (input.syllabusItemId) {
    const syllabusMatchesSubtopic =
      taxonomy.subtopicToTopic.get(input.syllabusItemId) === input.topicId;
    const syllabusMatchesTopic = input.syllabusItemId === input.topicId;
    if (!syllabusMatchesSubtopic && !syllabusMatchesTopic) {
      fieldErrors.syllabusItemId =
        "O item do edital informado não pertence à taxonomia ativa selecionada.";
    }
  }

  if (
    !isNonNegativeInteger(input.totalQuestions) ||
    (input.totalQuestions ?? 0) === 0
  ) {
    fieldErrors.totalQuestions =
      "O total deve ser um número inteiro maior que zero.";
  }
  if (!isNonNegativeInteger(input.correctAnswers)) {
    fieldErrors.correctAnswers =
      "Acertos devem ser um número inteiro igual ou maior que zero.";
  }
  if (!isNonNegativeInteger(input.wrongAnswers)) {
    fieldErrors.wrongAnswers =
      "Erros devem ser um número inteiro igual ou maior que zero.";
  }
  if (!isNonNegativeInteger(input.blankAnswers)) {
    fieldErrors.blankAnswers =
      "Brancos devem ser um número inteiro igual ou maior que zero.";
  }

  if (
    isNonNegativeInteger(input.totalQuestions) &&
    isNonNegativeInteger(input.correctAnswers) &&
    isNonNegativeInteger(input.wrongAnswers) &&
    isNonNegativeInteger(input.blankAnswers) &&
    input.correctAnswers! + input.wrongAnswers! + input.blankAnswers! !==
      input.totalQuestions
  ) {
    fieldErrors.counts =
      "Acertos, erros e brancos precisam somar exatamente o total de questões.";
  }

  if (
    input.durationMinutes !== undefined &&
    (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 0)
  ) {
    fieldErrors.durationMinutes = "A duração deve ser igual ou maior que zero.";
  }
  if (
    input.plannedQuestions !== undefined &&
    (!isNonNegativeInteger(input.plannedQuestions) ||
      input.plannedQuestions === 0)
  ) {
    fieldErrors.plannedQuestions =
      "A quantidade planejada deve ser um inteiro maior que zero.";
  }
  if (
    input.actualQuestions !== undefined &&
    (!isNonNegativeInteger(input.actualQuestions) ||
      input.actualQuestions === 0)
  ) {
    fieldErrors.actualQuestions =
      "A quantidade realizada deve ser um inteiro maior que zero.";
  }
  if (
    input.actualQuestions !== undefined &&
    input.totalQuestions !== undefined &&
    input.actualQuestions !== input.totalQuestions
  ) {
    fieldErrors.actualQuestions =
      "A quantidade realizada deve corresponder ao total registrado.";
  }

  for (const [field, value] of [
    ["sourceLabel", input.sourceLabel],
    ["sourceReference", input.sourceReference],
    ["difficultPoints", input.difficultPoints],
    ["notes", input.notes],
  ] as const) {
    if (containsSensitiveExternalData(value)) {
      fieldErrors[field] =
        "Não informe credenciais, cookies, tokens ou HTML de páginas externas.";
    }
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

function defaultEvidenceId(now: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `evidence-${uuid}`;
  return `evidence-${Date.parse(now)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createExternalEvidenceRecord(params: {
  input: ExternalEvidenceInput;
  taxonomy: ExternalEvidenceTaxonomy;
  now?: string;
  evidenceId?: string;
}): {
  record: ExternalEvidenceRecord | null;
  validation: ExternalEvidenceValidationResult;
} {
  const validation = validateExternalEvidenceInput(
    params.input,
    params.taxonomy,
  );
  if (!validation.valid) return { record: null, validation };

  const now = params.now ?? new Date().toISOString();
  const input = params.input;
  const action = input.supersedesEvidenceId ? "correction" : "record";
  const objectiveTotal = input.totalQuestions ?? input.actualQuestions ?? 0;
  const objectiveCountsMatch =
    objectiveTotal > 0 &&
    (input.correctAnswers ?? 0) + (input.wrongAnswers ?? 0) + (input.blankAnswers ?? 0) === objectiveTotal;
  const eligibleForSdeV2 =
    objectiveCountsMatch &&
    input.source !== "notebooklm" &&
    input.evidenceType !== "guided_retrieval";
  const record: ExternalEvidenceRecord = {
    evidenceId: params.evidenceId ?? defaultEvidenceId(now),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    recordedAt: input.recordedAt ?? now,
    evidenceType: input.evidenceType,
    source: input.source,
    sourceLabel: sanitizeExternalEvidenceText(input.sourceLabel, 120),
    sourceReference: sanitizeExternalEvidenceText(input.sourceReference, 500),
    prescriptionId: normalizeText(input.prescriptionId, 160),
    sessionId: normalizeText(input.sessionId, 160),
    disciplineId: input.disciplineId,
    topicId: input.topicId,
    subtopicId: input.subtopicId,
    syllabusItemId: input.syllabusItemId,
    examiningBoard: sanitizeExternalEvidenceText(input.examiningBoard, 80),
    totalQuestions: input.totalQuestions,
    correctAnswers: input.correctAnswers,
    wrongAnswers: input.wrongAnswers,
    blankAnswers: input.blankAnswers,
    durationMinutes: input.durationMinutes,
    plannedQuestions: input.plannedQuestions,
    actualQuestions: input.actualQuestions ?? input.totalQuestions,
    consultedMaterial: input.consultedMaterial,
    perceivedConfidence: input.perceivedConfidence,
    primaryErrorCause: input.primaryErrorCause,
    secondaryErrorCauses: input.secondaryErrorCauses?.length
      ? [...new Set(input.secondaryErrorCauses)]
      : undefined,
    difficultPoints: sanitizeExternalEvidenceText(input.difficultPoints, 2000),
    notes: sanitizeExternalEvidenceText(input.notes, 3000),
    granularity: input.granularity,
    decisionStatus: eligibleForSdeV2 ? "eligible_for_future_sde" : "shadow",
    affectsSde: eligibleForSdeV2,
    evidenceQuality: calculateExternalEvidenceQuality(input),
    ledgerAction: action,
    supersedesEvidenceId: input.supersedesEvidenceId,
  };

  return { record, validation };
}

export function createExternalEvidenceVoidRecord(params: {
  target: ExternalEvidenceRecord;
  now?: string;
  evidenceId?: string;
  reason?: string;
}): ExternalEvidenceRecord {
  const now = params.now ?? new Date().toISOString();
  return {
    ...params.target,
    evidenceId: params.evidenceId ?? defaultEvidenceId(now),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    recordedAt: now,
    decisionStatus: "shadow",
    affectsSde: false,
    ledgerAction: "void",
    supersedesEvidenceId: undefined,
    voidsEvidenceId: params.target.evidenceId,
    voidReason: sanitizeExternalEvidenceText(params.reason, 500),
  };
}

export function deriveExternalEvidenceViews(
  ledger: readonly ExternalEvidenceRecord[],
): ExternalEvidenceRecordView[] {
  const supersededBy = new Map<string, string>();
  const voidedBy = new Map<string, string>();

  for (const event of ledger) {
    if (event.ledgerAction !== "void" && event.supersedesEvidenceId) {
      supersededBy.set(event.supersedesEvidenceId, event.evidenceId);
    }
    if (event.ledgerAction === "void" && event.voidsEvidenceId) {
      voidedBy.set(event.voidsEvidenceId, event.evidenceId);
    }
  }

  return ledger
    .filter((event) => event.ledgerAction !== "void")
    .map((record) => {
      let status: ExternalEvidenceStatus = "active";
      if (supersededBy.has(record.evidenceId)) status = "superseded";
      if (voidedBy.has(record.evidenceId)) status = "voided";
      return {
        record,
        status,
        supersededByEvidenceId: supersededBy.get(record.evidenceId),
        voidedByEvidenceId: voidedBy.get(record.evidenceId),
      };
    });
}

export interface ExternalEvidenceViewFilters {
  source?: string;
  disciplineId?: string;
  topicId?: string;
  status?: ExternalEvidenceStatus;
  recordedAfter?: string;
}

export function filterExternalEvidenceViews(
  views: readonly ExternalEvidenceRecordView[],
  filters: ExternalEvidenceViewFilters,
): ExternalEvidenceRecordView[] {
  return views.filter(({ record, status }) => {
    if (filters.source && record.source !== filters.source) return false;
    if (filters.disciplineId && record.disciplineId !== filters.disciplineId)
      return false;
    if (filters.topicId && record.topicId !== filters.topicId) return false;
    if (filters.status && status !== filters.status) return false;
    if (filters.recordedAfter && record.recordedAt < filters.recordedAfter)
      return false;
    return true;
  });
}

export function activeExternalEvidenceRecords(
  ledger: readonly ExternalEvidenceRecord[],
): ExternalEvidenceRecord[] {
  return deriveExternalEvidenceViews(ledger)
    .filter((item) => item.status === "active")
    .map((item) => item.record);
}

export function summarizeExternalEvidence(
  ledger: readonly ExternalEvidenceRecord[],
): ExternalEvidenceSummaryRow[] {
  const rows = new Map<string, ExternalEvidenceSummaryRow>();
  for (const record of activeExternalEvidenceRecords(ledger)) {
    const total = record.totalQuestions ?? 0;
    if (total <= 0) continue;
    const key = `${record.disciplineId}::${record.topicId}`;
    const current = rows.get(key) ?? {
      disciplineId: record.disciplineId,
      topicId: record.topicId,
      batches: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      blankAnswers: 0,
      rawPercentage: 0,
      durationMinutes: 0,
      lastEvidenceAt: record.recordedAt,
      withConsultation: 0,
      withoutConsultation: 0,
    };
    current.batches += 1;
    current.totalQuestions += total;
    current.correctAnswers += record.correctAnswers ?? 0;
    current.wrongAnswers += record.wrongAnswers ?? 0;
    current.blankAnswers += record.blankAnswers ?? 0;
    current.durationMinutes += record.durationMinutes ?? 0;
    if (record.recordedAt > current.lastEvidenceAt)
      current.lastEvidenceAt = record.recordedAt;
    if (
      record.consultedMaterial === "no" ||
      record.consultedMaterial === "not_applicable"
    ) {
      current.withoutConsultation += 1;
    } else {
      current.withConsultation += 1;
    }
    rows.set(key, current);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      rawPercentage:
        row.totalQuestions > 0
          ? Math.round((row.correctAnswers / row.totalQuestions) * 10000) / 100
          : 0,
      durationMinutes: Math.round(row.durationMinutes * 10) / 10,
    }))
    .sort((left, right) =>
      right.lastEvidenceAt.localeCompare(left.lastEvidenceAt),
    );
}

export function findExternalEvidenceStatus(
  ledger: readonly ExternalEvidenceRecord[],
  evidenceId: string,
): ExternalEvidenceStatus | null {
  return (
    deriveExternalEvidenceViews(ledger).find(
      (item) => item.record.evidenceId === evidenceId,
    )?.status ?? null
  );
}
