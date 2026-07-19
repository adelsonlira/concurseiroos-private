import type {
  CronogramaRevisao,
  Questao,
  SessaoEstudo,
  Simulado,
  Subassunto,
  TentativaQuestaoUsuario,
} from "../../types";
import type { ExternalEvidenceRecord } from "../externalEvidence/types";
import { deriveExternalEvidenceViews } from "../externalEvidence/ledger";
import type { FinalizedFgvTrainingAttempt, FgvTrainingPublicCatalog } from "../../features/fgvTraining/types";
import type { FinalizedPilotDiagnosticAttempt } from "../../features/pilotDiagnostic/types";
import { SDE_V2_CONFIG } from "./config";
import type { NormalizedEvidence } from "./types";

const DAY_MS = 86_400_000;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Data de evidência inválida: ${value}.`);
  return date;
}

function ageInDays(occurredAt: string, referenceDate: string): number {
  const occurred = parseDate(occurredAt).getTime();
  const reference = parseDate(`${referenceDate}T23:59:59.999Z`).getTime();
  return Math.max(0, Math.floor((reference - occurred) / DAY_MS));
}

function recencyWeight(age: number): number {
  return Math.pow(0.5, age / SDE_V2_CONFIG.evidence.recencyHalfLifeDays);
}

function consultationFactor(value: boolean | null): number {
  if (value === true) return SDE_V2_CONFIG.evidence.consultationFactors.yes;
  if (value === false) return SDE_V2_CONFIG.evidence.consultationFactors.no;
  return SDE_V2_CONFIG.evidence.consultationFactors.not_applicable;
}

function normalized(params: Omit<NormalizedEvidence, "ageInDays" | "recencyWeight" | "effectiveSampleSize"> & {
  referenceDate: string;
  effectiveBase: number;
}): NormalizedEvidence {
  const age = ageInDays(params.occurredAt, params.referenceDate);
  const recency = recencyWeight(age);
  const effective = Math.max(
    0,
    params.effectiveBase * params.authorityWeight * params.measurementWeight * recency,
  );
  const { referenceDate: _referenceDate, effectiveBase: _effectiveBase, ...rest } = params;
  return {
    ...rest,
    ageInDays: age,
    recencyWeight: recency,
    effectiveSampleSize: Math.round(effective * 1000) / 1000,
  };
}

function authorityForLegacyAttempt(attempt: TentativaQuestaoUsuario): number {
  if (attempt.origem === "SIMULADO") return SDE_V2_CONFIG.evidence.sourceAuthority.official_simulation;
  if (attempt.fonteExterna?.toLocaleLowerCase("pt-BR").includes("qconcursos")) {
    return SDE_V2_CONFIG.evidence.sourceAuthority.qconcursos_fgv;
  }
  return SDE_V2_CONFIG.evidence.sourceAuthority.tracked_individual;
}

function normalizeLegacyAttempts(
  attempts: readonly TentativaQuestaoUsuario[],
  referenceDate: string,
): NormalizedEvidence[] {
  return attempts
    .filter((attempt) => Boolean(attempt.subassuntoId))
    .map((attempt) => {
      const consulted = attempt.consultouMaterial ?? null;
      return normalized({
        evidenceId: attempt.id,
        disciplineId: attempt.disciplinaId,
        topicId: attempt.assuntoId,
        subtopicId: attempt.subassuntoId,
        sourceType: attempt.origem === "SIMULADO" ? "official_simulation" : "legacy_individual_question",
        granularity: "individual",
        totalItems: 1,
        correctItems: attempt.acertou ? 1 : 0,
        wrongItems: !attempt.acertou && !attempt.respostaEmBranco ? 1 : 0,
        blankItems: attempt.respostaEmBranco ? 1 : 0,
        occurredAt: attempt.respondidaEm,
        consultedMaterial: consulted,
        authorityWeight: authorityForLegacyAttempt(attempt),
        measurementWeight: consultationFactor(consulted),
        errorCauses: attempt.erroCausa ? [attempt.erroCausa] : [],
        durationMinutes: Math.max(0, attempt.tempoRespostaSegundos / 60),
        decisionEligible: true,
        eligibilityReason: "Tentativa individual legada rastreada.",
        referenceDate,
        effectiveBase: 1,
      });
    });
}

function normalizeExternalLedger(
  ledger: readonly ExternalEvidenceRecord[],
  referenceDate: string,
): NormalizedEvidence[] {
  const active = deriveExternalEvidenceViews(ledger).filter((view) => view.status === "active");
  return active.map(({ record }) => {
    const total = record.totalQuestions ?? record.actualQuestions ?? 0;
    const consulted = record.consultedMaterial === "yes" || record.consultedMaterial === "occasionally";
    const isFgv = record.examiningBoard?.trim().toLocaleUpperCase("pt-BR") === "FGV";
    const sourceKey = record.source === "qconcursos" && isFgv
      ? "qconcursos_fgv"
      : record.granularity === "individual"
        ? "tracked_individual"
        : consulted
          ? "aggregate_with_consultation"
          : "aggregate_no_consultation";
    const eligible =
      record.decisionStatus === "eligible_for_future_sde" &&
      record.affectsSde === true &&
      total > 0 &&
      (record.correctAnswers ?? 0) + (record.wrongAnswers ?? 0) + (record.blankAnswers ?? 0) === total;
    return normalized({
      evidenceId: record.evidenceId,
      disciplineId: record.disciplineId,
      topicId: record.topicId,
      subtopicId: record.subtopicId,
      syllabusItemId: record.syllabusItemId,
      sourceType: `external_ledger:${record.source}`,
      granularity: record.granularity,
      totalItems: total,
      correctItems: record.correctAnswers,
      wrongItems: record.wrongAnswers,
      blankItems: record.blankAnswers,
      occurredAt: record.recordedAt,
      consultedMaterial: record.consultedMaterial === "not_applicable" ? null : consulted,
      authorityWeight: SDE_V2_CONFIG.evidence.sourceAuthority[sourceKey],
      measurementWeight: SDE_V2_CONFIG.evidence.consultationFactors[record.consultedMaterial],
      errorCauses: [record.primaryErrorCause, ...(record.secondaryErrorCauses ?? [])].filter((item): item is NonNullable<typeof item> => Boolean(item)),
      durationMinutes: record.durationMinutes,
      decisionEligible: eligible,
      eligibilityReason: eligible
        ? "Evento ativo, objetivo e validado deterministicamente para o SDE v2."
        : "Evento em shadow, anulado/substituído ou sem marcação de elegibilidade decisória.",
      referenceDate,
      effectiveBase: eligible ? total : 0,
    });
  });
}

function normalizeSessions(params: {
  sessions: readonly SessaoEstudo[];
  subtopics: readonly Subassunto[];
  reviewSchedules: readonly CronogramaRevisao[];
  referenceDate: string;
}): NormalizedEvidence[] {
  const result: NormalizedEvidence[] = [];
  const topicBySubtopic = new Map(params.subtopics.map((subtopic) => [subtopic.id, subtopic.assuntoId] as const));
  for (const session of params.sessions) {
    if (!session.subassuntoId || !session.concluidaComSucesso) continue;
    const topicId = session.assuntoId ?? topicBySubtopic.get(session.subassuntoId);
    if (!topicId) continue;
    result.push(normalized({
      evidenceId: `session:${session.id}`,
      disciplineId: session.disciplinaId,
      topicId,
      subtopicId: session.subassuntoId,
      sourceType: "completed_study_session",
      granularity: "session",
      occurredAt: session.dataFim,
      consultedMaterial: null,
      authorityWeight: SDE_V2_CONFIG.evidence.sourceAuthority.theory_or_self_assessment,
      measurementWeight: 0.25,
      errorCauses: [],
      theoryCompleted: session.atividadeEstudo === "teoria",
      durationMinutes: session.tempoGastoSegundos / 60,
      decisionEligible: true,
      eligibilityReason: "Sessão concluída informa cobertura, não domínio objetivo.",
      referenceDate: params.referenceDate,
      effectiveBase: 0,
    }));
  }
  for (const subtopic of params.subtopics.filter((item) => item.completado)) {
    result.push(normalized({
      evidenceId: `theory:${subtopic.id}`,
      disciplineId: "",
      topicId: subtopic.assuntoId,
      subtopicId: subtopic.id,
      sourceType: "theory_coverage",
      granularity: "session",
      occurredAt: `${params.referenceDate}T00:00:00.000Z`,
      consultedMaterial: null,
      authorityWeight: SDE_V2_CONFIG.evidence.sourceAuthority.theory_or_self_assessment,
      measurementWeight: 0.2,
      errorCauses: [],
      theoryCompleted: true,
      decisionEligible: true,
      eligibilityReason: "Cobertura teórica confirmada; não equivale a desempenho.",
      referenceDate: params.referenceDate,
      effectiveBase: 0,
    }));
  }
  for (const review of params.reviewSchedules) {
    if (review.desabilitada || review.isDeleted) continue;
    const pending = review.proximaRevisaoData.slice(0, 10) <= params.referenceDate;
    if (!pending) continue;
    result.push(normalized({
      evidenceId: `review:${review.id}`,
      disciplineId: review.disciplinaId,
      topicId: review.assuntoId,
      subtopicId: review.subassuntoId,
      sourceType: "scheduled_review",
      granularity: "session",
      occurredAt: review.proximaRevisaoData,
      consultedMaterial: null,
      authorityWeight: 0.4,
      measurementWeight: 0,
      errorCauses: [],
      reviewPending: true,
      decisionEligible: true,
      eligibilityReason: "Revisão vencida é sinal operacional, não medição de acerto.",
      referenceDate: params.referenceDate,
      effectiveBase: 0,
    }));
  }
  return result;
}

function normalizeOfficialSimulationQuestions(params: {
  simulations: readonly Simulado[];
  questions: readonly Questao[];
  referenceDate: string;
}): NormalizedEvidence[] {
  const questionById = new Map(params.questions.map((question) => [question.id, question] as const));
  const result: NormalizedEvidence[] = [];
  for (const simulation of params.simulations.filter((item) => item.status === "CONCLUIDO" && !item.isDeleted)) {
    for (const answer of Object.values(simulation.respostas)) {
      const question = questionById.get(answer.questaoId);
      if (!question?.subassuntoId) continue;
      result.push(normalized({
        evidenceId: `simulation:${simulation.id}:${answer.questaoId}`,
        disciplineId: question.disciplinaId,
        topicId: question.assuntoId,
        subtopicId: question.subassuntoId,
        sourceType: "official_simulation",
        granularity: "individual",
        totalItems: 1,
        correctItems: answer.isCorreta ? 1 : 0,
        wrongItems: answer.isCorreta ? 0 : 1,
        blankItems: 0,
        occurredAt: simulation.concluidoEm ?? simulation.updatedAt,
        consultedMaterial: false,
        authorityWeight: SDE_V2_CONFIG.evidence.sourceAuthority.official_simulation,
        measurementWeight: 1,
        errorCauses: [],
        durationMinutes: answer.tempoGastoSegundos / 60,
        decisionEligible: true,
        eligibilityReason: "Questão identificada de simulado oficial concluído.",
        referenceDate: params.referenceDate,
        effectiveBase: 1,
      }));
    }
  }
  return result;
}

function normalizeTrainingFgv(params: {
  attempts: readonly FinalizedFgvTrainingAttempt[];
  catalog: FgvTrainingPublicCatalog | null;
  referenceDate: string;
}): NormalizedEvidence[] {
  if (!params.catalog) return [];
  const questionById = new Map(params.catalog.questions.map((question) => [question.questionId, question] as const));
  const result: NormalizedEvidence[] = [];
  for (const attempt of params.attempts) {
    for (const correction of attempt.corrections) {
      const question = questionById.get(correction.questionId);
      if (!question) continue;
      result.push(normalized({
        evidenceId: `training-fgv:${attempt.attemptId}:${correction.questionId}`,
        disciplineId: "dp26-p3-conhecimentos-especificos",
        topicId: "dp26-p3-esp-banco-dados",
        subtopicId: question.primaryItem.id,
        syllabusItemId: question.primaryItem.id,
        sourceType: "training_fgv",
        granularity: "individual",
        totalItems: 1,
        correctItems: correction.status === "CORRECT" ? 1 : 0,
        wrongItems: correction.status === "INCORRECT" ? 1 : 0,
        blankItems: correction.status === "BLANK" ? 1 : 0,
        occurredAt: attempt.endedAt,
        consultedMaterial: false,
        authorityWeight: SDE_V2_CONFIG.evidence.sourceAuthority.training_fgv,
        measurementWeight: 0,
        errorCauses: [],
        durationMinutes: attempt.totalQuestions > 0 ? attempt.durationSeconds / 60 / attempt.totalQuestions : undefined,
        decisionEligible: false,
        eligibilityReason: "Treino FGV permanece isolado e não altera o SDE nesta versão.",
        referenceDate: params.referenceDate,
        effectiveBase: 0,
      }));
    }
  }
  return result;
}

function normalizeDiagnostic(
  attempts: readonly FinalizedPilotDiagnosticAttempt[],
  referenceDate: string,
): NormalizedEvidence[] {
  return attempts.flatMap((attempt) =>
    attempt.areaResults.map((area) => normalized({
      evidenceId: `diagnostic:${attempt.attemptId}:${area.selectionArea}`,
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-banco-dados",
      sourceType: "pilot_diagnostic_shadow",
      granularity: "aggregate",
      totalItems: area.total,
      correctItems: area.correct,
      wrongItems: area.wrong,
      blankItems: area.blank,
      occurredAt: attempt.endedAt,
      consultedMaterial: false,
      authorityWeight: SDE_V2_CONFIG.evidence.sourceAuthority.diagnostic_shadow,
      measurementWeight: 0,
      errorCauses: [],
      durationMinutes: attempt.durationSeconds / 60,
      decisionEligible: false,
      eligibilityReason: "Diagnóstico Piloto não foi explicitamente marcado como elegível ao SDE.",
      referenceDate,
      effectiveBase: 0,
    })),
  );
}

export interface UnifiedEvidenceInput {
  referenceDate: string;
  legacyAttempts: readonly TentativaQuestaoUsuario[];
  externalEvidenceLedger: readonly ExternalEvidenceRecord[];
  sessions: readonly SessaoEstudo[];
  reviewSchedules: readonly CronogramaRevisao[];
  subtopics: readonly Subassunto[];
  simulations?: readonly Simulado[];
  questions?: readonly Questao[];
  fgvTrainingAttempts?: readonly FinalizedFgvTrainingAttempt[];
  fgvTrainingCatalog?: FgvTrainingPublicCatalog | null;
  pilotDiagnosticAttempts?: readonly FinalizedPilotDiagnosticAttempt[];
}

export function normalizeUnifiedEvidence(input: UnifiedEvidenceInput): NormalizedEvidence[] {
  return [
    ...normalizeLegacyAttempts(input.legacyAttempts, input.referenceDate),
    ...normalizeExternalLedger(input.externalEvidenceLedger, input.referenceDate),
    ...normalizeSessions({
      sessions: input.sessions,
      subtopics: input.subtopics,
      reviewSchedules: input.reviewSchedules,
      referenceDate: input.referenceDate,
    }),
    ...normalizeOfficialSimulationQuestions({
      simulations: input.simulations ?? [],
      questions: input.questions ?? [],
      referenceDate: input.referenceDate,
    }),
    ...normalizeTrainingFgv({
      attempts: input.fgvTrainingAttempts ?? [],
      catalog: input.fgvTrainingCatalog ?? null,
      referenceDate: input.referenceDate,
    }),
    ...normalizeDiagnostic(input.pilotDiagnosticAttempts ?? [], input.referenceDate),
  ];
}

export function countDecisionEligibleEvidence(evidence: readonly NormalizedEvidence[]): number {
  return evidence.filter((item) => item.decisionEligible && item.effectiveSampleSize > 0).length;
}

export function clampEvidenceWeight(value: number): number {
  return clamp(value);
}
