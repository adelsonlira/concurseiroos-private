import { createHash } from "node:crypto";
import diagnosticImport from "../../../data/diagnostics/diag-fgv-dataprev-bd-v1/diagnostic-v1.internal.json" with { type: "json" };
import type {
  DiagnosticAreaResult,
  DiagnosticCoverageResult,
  DiagnosticOptionLabel,
  DiagnosticQuestionCorrection,
  DiagnosticTraceabilityRecord,
  FinalizePilotDiagnosticRequest,
  FinalizedPilotDiagnosticAttempt,
} from "../../features/pilotDiagnostic/types.js";

interface InternalDiagnosticAlternative {
  label: DiagnosticOptionLabel;
  text: string;
  asset?: string;
}

interface InternalDiagnosticQuestion {
  position: number;
  question_id: string;
  stem: string;
  alternatives: InternalDiagnosticAlternative[];
  statement_assets: string[];
  answer_key: DiagnosticOptionLabel;
  traceability: {
    corpus_ordinal: number;
    platform_id: string;
    answer_origin: string;
    adherence: "ADERENTE_DIRETA" | "ADERENTE_PARCIAL";
    subject: string;
    subsubject: string;
    primary_edital_item: string;
    secondary_edital_items: string;
    original_pages: number[];
    asset_files: string[];
    duplicate_group: string;
    principal_record: number;
    secondary_contest_metadata: string;
    selection_area: string;
  };
}

interface InternalDiagnosticImport {
  diagnostic_id: "diag-fgv-dataprev-bd-v1";
  title: string;
  version: "1";
  internal_label: string;
  suggested_duration_minutes: 50;
  question_count: 24;
  fixed_order: true;
  penalty_for_wrong_answer: false;
  questions: InternalDiagnosticQuestion[];
}

const INTERNAL_DIAGNOSTIC = diagnosticImport as InternalDiagnosticImport;
const OPTION_LABELS = new Set<DiagnosticOptionLabel>(["A", "B", "C", "D", "E"]);
const ABSOLUTE_LOCAL_PATH = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;

function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentage(correct: number, total: number): number {
  return total === 0 ? 0 : roundPercentage((correct / total) * 100);
}

function fingerprintQuestion(question: InternalDiagnosticQuestion): string {
  const payload = JSON.stringify({
    questionId: question.question_id,
    position: question.position,
    corpusOrdinal: question.traceability.corpus_ordinal,
    principalRecord: question.traceability.principal_record,
    platformId: question.traceability.platform_id,
    answerOrigin: question.traceability.answer_origin,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function assertRelativeAssetPath(path: string): void {
  if (!path || ABSOLUTE_LOCAL_PATH.test(path) || path.includes("..")) {
    throw new Error(`Caminho de asset inválido: ${path || "(vazio)"}.`);
  }
}

export function validateInternalPilotDiagnosticCatalog(
  catalog: InternalDiagnosticImport = INTERNAL_DIAGNOSTIC,
): { assetPaths: string[]; controls: number[] } {
  if (catalog.diagnostic_id !== "diag-fgv-dataprev-bd-v1") throw new Error("diagnostic_id inválido.");
  if (catalog.version !== "1") throw new Error("Versão inválida.");
  if (catalog.question_count !== 24 || catalog.questions.length !== 24) {
    throw new Error("O diagnóstico deve conter exatamente 24 questões.");
  }
  if (!catalog.fixed_order || catalog.penalty_for_wrong_answer) {
    throw new Error("Contrato de ordem fixa ou penalização inválido.");
  }

  const positions = catalog.questions.map((question) => question.position);
  if (positions.some((position, index) => position !== index + 1)) {
    throw new Error("A ordem fixa das 24 questões foi alterada.");
  }
  const questionIds = new Set(catalog.questions.map((question) => question.question_id));
  if (questionIds.size !== 24) throw new Error("Há questões duplicadas no diagnóstico.");

  const assetPaths = catalog.questions.flatMap((question) => [
    ...question.statement_assets,
    ...question.alternatives.flatMap((alternative) => alternative.asset ? [alternative.asset] : []),
  ]);
  for (const path of assetPaths) assertRelativeAssetPath(path);
  if (new Set(assetPaths).size !== 6) throw new Error("O diagnóstico deve usar exatamente seis assets únicos.");

  const controls = catalog.questions
    .map((question) => question.traceability.corpus_ordinal)
    .filter((ordinal) => ordinal === 14 || ordinal === 53)
    .sort((left, right) => left - right);
  if (controls.join(",") !== "14,53") throw new Error("Controles 14 e 53 ausentes.");

  return { assetPaths, controls };
}

function validateFinalizationRequest(request: FinalizePilotDiagnosticRequest): void {
  if (!request || typeof request !== "object") throw new Error("Solicitação de finalização ausente.");
  if (request.diagnosticId !== INTERNAL_DIAGNOSTIC.diagnostic_id || request.version !== 1) {
    throw new Error("Diagnóstico ou versão incompatível.");
  }
  if (!request.attemptId?.trim()) throw new Error("Identificador da tentativa ausente.");
  if (Number.isNaN(Date.parse(request.startedAt))) throw new Error("Data de início inválida.");
  if (!Array.isArray(request.answers) || request.answers.length !== 24) {
    throw new Error("A finalização deve conter os 24 registros de resposta.");
  }

  const knownIds = new Set(INTERNAL_DIAGNOSTIC.questions.map((question) => question.question_id));
  const receivedIds = new Set<string>();
  for (const answer of request.answers) {
    if (!knownIds.has(answer.questionId)) throw new Error("Resposta associada a questão desconhecida.");
    if (receivedIds.has(answer.questionId)) throw new Error("Questão duplicada na finalização.");
    receivedIds.add(answer.questionId);
    if (answer.selectedAnswer !== null && !OPTION_LABELS.has(answer.selectedAnswer)) {
      throw new Error("Alternativa inválida na finalização.");
    }
  }
  if (receivedIds.size !== 24) throw new Error("A finalização não cobre as 24 questões.");
}

function buildAreaResults(
  corrections: DiagnosticQuestionCorrection[],
): DiagnosticAreaResult[] {
  const correctionById = new Map(corrections.map((correction) => [correction.questionId, correction]));
  const groups = new Map<string, DiagnosticAreaResult>();

  for (const question of INTERNAL_DIAGNOSTIC.questions) {
    // Regra obrigatória: a dimensão principal vem exclusivamente de selection_area.
    const selectionArea = question.traceability.selection_area;
    const correction = correctionById.get(question.question_id)!;
    const current = groups.get(selectionArea) ?? {
      selectionArea,
      total: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
      percentage: 0,
    };
    current.total += 1;
    if (correction.status === "CORRECT") current.correct += 1;
    if (correction.status === "INCORRECT") current.wrong += 1;
    if (correction.status === "BLANK") current.blank += 1;
    groups.set(selectionArea, current);
  }

  return [...groups.values()].map((result) => ({
    ...result,
    percentage: percentage(result.correct, result.total),
  }));
}

function buildCoverage(corrections: DiagnosticQuestionCorrection[]): DiagnosticCoverageResult {
  const correctionById = new Map(corrections.map((correction) => [correction.questionId, correction]));
  const aggregate = <T extends 20 | 4>(
    adherence: "ADERENTE_DIRETA" | "ADERENTE_PARCIAL",
    expectedTotal: T,
  ): { total: T; correct: number; wrong: number; blank: number; percentage: number } => {
    const selected = INTERNAL_DIAGNOSTIC.questions.filter(
      (question) => question.traceability.adherence === adherence,
    );
    if (selected.length !== expectedTotal) throw new Error("Distribuição de aderência do diagnóstico foi alterada.");
    const result = { total: expectedTotal, correct: 0, wrong: 0, blank: 0, percentage: 0 };
    for (const question of selected) {
      const status = correctionById.get(question.question_id)!.status;
      if (status === "CORRECT") result.correct += 1;
      if (status === "INCORRECT") result.wrong += 1;
      if (status === "BLANK") result.blank += 1;
    }
    result.percentage = percentage(result.correct, expectedTotal);
    return result;
  };

  return {
    label: "Cobertura principal e complementar",
    principal: aggregate("ADERENTE_DIRETA", 20),
    complementary: aggregate("ADERENTE_PARCIAL", 4),
  };
}

export function gradePilotDiagnosticAttempt(
  request: FinalizePilotDiagnosticRequest,
  endedAt = new Date().toISOString(),
): FinalizedPilotDiagnosticAttempt {
  validateInternalPilotDiagnosticCatalog();
  validateFinalizationRequest(request);
  if (Number.isNaN(Date.parse(endedAt))) throw new Error("Data de término inválida.");

  const answerByQuestion = new Map(request.answers.map((answer) => [answer.questionId, answer]));
  const corrections: DiagnosticQuestionCorrection[] = INTERNAL_DIAGNOSTIC.questions.map((question) => {
    const answer = answerByQuestion.get(question.question_id)!;
    return {
      questionId: question.question_id,
      position: question.position,
      selectedAnswer: answer.selectedAnswer,
      operationalAnswer: question.answer_key,
      status: answer.selectedAnswer === null
        ? "BLANK"
        : answer.selectedAnswer === question.answer_key
          ? "CORRECT"
          : "INCORRECT",
    };
  });
  const correctCount = corrections.filter((item) => item.status === "CORRECT").length;
  const wrongCount = corrections.filter((item) => item.status === "INCORRECT").length;
  const blankCount = corrections.filter((item) => item.status === "BLANK").length;
  const endedAtMs = Date.parse(endedAt);
  const startedAtMs = Date.parse(request.startedAt);
  const durationSeconds = Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000));
  const traceability: DiagnosticTraceabilityRecord[] = INTERNAL_DIAGNOSTIC.questions.map((question) => ({
    questionId: question.question_id,
    position: question.position,
    recordFingerprint: fingerprintQuestion(question),
  }));

  return {
    attemptId: request.attemptId,
    diagnosticId: INTERNAL_DIAGNOSTIC.diagnostic_id,
    version: 1,
    status: "FINALIZED",
    startedAt: request.startedAt,
    endedAt,
    durationSeconds,
    answers: INTERNAL_DIAGNOSTIC.questions.map((question) => answerByQuestion.get(question.question_id)!),
    blankQuestionIds: corrections.filter((item) => item.status === "BLANK").map((item) => item.questionId),
    correctCount,
    wrongCount,
    blankCount,
    totalQuestions: 24,
    percentage: percentage(correctCount, 24),
    affectsSde: false,
    areaResults: buildAreaResults(corrections),
    coverage: buildCoverage(corrections),
    corrections,
    traceability,
  };
}
