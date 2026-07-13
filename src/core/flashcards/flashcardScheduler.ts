import type {
  FlashcardRetrievalPerformance,
  FlashcardScheduleDecision,
  FlashcardScheduleLike,
} from "./types";

export const FLASHCARD_POLICY_VERSION = "HYBRID_ADAPTIVE_FLASHCARD_V1";
export const LEGACY_FLASHCARD_POLICY_VERSION = "SM2_LEGACY";

function assertDateKey(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date key: ${value}`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
}

function toDateKey(value: string): string {
  const key = value.slice(0, 10);
  assertDateKey(key);
  return key;
}

function addDays(dateKey: string, days: number): string {
  assertDateKey(dateKey);
  if (!Number.isInteger(days) || days < 0) {
    throw new Error("days must be a non-negative integer");
  }
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  assertDateKey(from);
  assertDateKey(to);
  return Math.round(
    (new Date(`${to}T00:00:00.000Z`).getTime() -
      new Date(`${from}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
}

function horizonCap(daysUntilExam: number): number {
  if (daysUntilExam <= 7) return 2;
  if (daysUntilExam <= 21) return 5;
  if (daysUntilExam <= 45) return 10;
  if (daysUntilExam <= 90) return 21;
  return 45;
}

function inferPreviousStability(card: FlashcardScheduleLike): number {
  if (
    Number.isFinite(card.estabilidadeObservadaDias) &&
    (card.estabilidadeObservadaDias ?? 0) > 0
  ) {
    return Math.max(1, Math.round(card.estabilidadeObservadaDias!));
  }
  if (Number.isFinite(card.intervaloDias) && card.intervaloDias > 0) {
    return Math.max(1, Math.round(card.intervaloDias));
  }
  return 1;
}

export function scheduleFlashcardReview(args: {
  card: FlashcardScheduleLike;
  performance: FlashcardRetrievalPerformance;
  reviewedAt: string;
  examDate?: string;
}): FlashcardScheduleDecision {
  const reviewedDate = toDateKey(args.reviewedAt);
  const previousStability = inferPreviousStability(args.card);
  const previousStreak = Math.max(
    0,
    args.card.recuperacoesIndependentesConsecutivas ?? args.card.repeticoes ?? 0,
  );
  const previousFailures = Math.max(0, args.card.falhasRecuperacao ?? 0);
  const isFirstObservedReview = (args.card.historicoRecuperacoes?.length ?? 0) === 0;
  const migratedFrom =
    args.card.politicaVersao &&
    args.card.politicaVersao !== FLASHCARD_POLICY_VERSION
      ? args.card.politicaVersao
      : !args.card.politicaVersao
        ? LEGACY_FLASHCARD_POLICY_VERSION
        : undefined;

  let intervalDays: number;
  let observedStabilityDays: number;
  let independentRecoveryStreak: number;
  let retrievalFailures = previousFailures;
  let nextStatus: FlashcardScheduleDecision["nextStatus"];
  let requiresImmediateRelearning = false;
  const rationale: string[] = [];

  if (args.performance === "FAILED") {
    intervalDays = 1;
    observedStabilityDays = 1;
    independentRecoveryStreak = 0;
    retrievalFailures += 1;
    nextStatus = "LAPSED";
    requiresImmediateRelearning = true;
    rationale.push(
      "A resposta não foi recuperada antes de consultar o verso; é necessária correção e nova tentativa na mesma sessão.",
    );
  } else if (args.performance === "EFFORTFUL") {
    independentRecoveryStreak = previousStreak + 1;
    observedStabilityDays =
      previousStability <= 1
        ? 2
        : Math.max(2, Math.round(previousStability * 1.35));
    intervalDays = observedStabilityDays;
    nextStatus = independentRecoveryStreak >= 2 ? "REVIEW" : "LEARNING";
    rationale.push(
      "Houve recuperação independente, porém com esforço; o intervalo cresce de forma conservadora.",
    );
  } else {
    independentRecoveryStreak = previousStreak + 1;
    observedStabilityDays =
      previousStability <= 1
        ? 3
        : Math.max(3, Math.round(previousStability * 1.8));
    intervalDays = observedStabilityDays;
    nextStatus = "REVIEW";
    rationale.push(
      "Houve recuperação independente e fluente; o intervalo cresce, sem presumir domínio permanente.",
    );
  }

  if (isFirstObservedReview && args.performance !== "FAILED") {
    const firstContactCap = args.performance === "EFFORTFUL" ? 2 : 3;
    intervalDays = Math.min(intervalDays, firstContactCap);
    rationale.push(
      "Por ser a primeira recuperação observada, o próximo contato permanece próximo para confirmar retenção em outra sessão.",
    );
  }

  if (
    args.card.status === "LAPSED" &&
    args.performance !== "FAILED" &&
    independentRecoveryStreak < 2
  ) {
    intervalDays = Math.min(intervalDays, 3);
    rationale.push(
      "O cartão vinha de uma falha e permanece em contato curto até duas recuperações independentes consecutivas.",
    );
  }

  if (args.examDate) {
    const examDate = toDateKey(args.examDate);
    const daysUntilExam = daysBetween(reviewedDate, examDate);
    if (daysUntilExam <= 0) {
      intervalDays = 0;
      rationale.push(
        "A data da prova foi alcançada; nenhuma revisão foi programada para depois do exame.",
      );
    } else {
      const latestUsefulInterval = Math.max(1, daysUntilExam - 1);
      const cappedInterval = Math.min(
        intervalDays,
        horizonCap(daysUntilExam),
        latestUsefulInterval,
      );
      if (cappedInterval < intervalDays) {
        rationale.push(
          `O intervalo foi limitado a ${cappedInterval} dia(s) pelo horizonte de ${daysUntilExam} dia(s) até a prova.`,
        );
      }
      intervalDays = cappedInterval;
    }
  } else {
    const cappedInterval = Math.min(intervalDays, 45);
    if (cappedInterval < intervalDays) {
      rationale.push(
        "Sem data de prova válida, foi aplicado teto operacional conservador de 45 dias.",
      );
    }
    intervalDays = cappedInterval;
  }

  intervalDays = Math.max(0, Math.round(intervalDays));
  const nextReviewDate = addDays(reviewedDate, intervalDays);
  const historyEntry = {
    revisadoEm: args.reviewedAt,
    resultado: args.performance,
    intervaloDecididoDias: intervalDays,
    recuperacaoIndependente: args.performance !== "FAILED",
    racionalIntervalo: rationale.slice(),
  } as const;

  return {
    policyVersion: FLASHCARD_POLICY_VERSION,
    nextStatus,
    nextReviewDate,
    intervalDays,
    observedStabilityDays: Math.max(1, Math.round(observedStabilityDays)),
    independentRecoveryStreak,
    retrievalFailures,
    requiresImmediateRelearning,
    migratedFrom,
    rationale,
    historyEntry,
  };
}
