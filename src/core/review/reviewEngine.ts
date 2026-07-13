import type {
  AttemptForErrorAnalysis,
  ErrorCause,
  ErrorTopicSummary,
  InterleavedReviewItem,
  RecoveryEvidenceState,
  ReviewMethod,
  ReviewMethodEvidenceSummary,
  ReviewMethodPreferenceDecision,
  ReviewMethodSelectionReason,
  ReviewMode,
  ReviewPerformance,
  ReviewScheduleIdentity,
  ReviewScheduleLike,
  ReviewTrigger,
} from "./types";

/**
 * Hybrid, adaptive and exam-oriented retrieval policy.
 * It compares delayed within-user outcomes conservatively, while preserving
 * context-specific safeguards and deterministic exploration to avoid lock-in.
 */
export const REVIEW_POLICY_VERSION = "HYBRID_ADAPTIVE_REVIEW_V2";
export const PREVIOUS_REVIEW_POLICY_VERSION = "ADAPTIVE_EXAM_RETRIEVAL_V1";
export const LEGACY_REVIEW_POLICY_VERSION = "FIXED_1_3_7_14_30_60_V1";
export const LEGACY_REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60] as const;
export const ADAPTIVE_POLICY_SUMMARY =
  "Recuperação ativa e reaprendizagem corretiva convivem com prática intercalada. O sistema compara resultados tardios observados, mantém exploração controlada e nunca deixa a fila de revisão bloquear todo o avanço do edital.";

const FLEXIBLE_METHODS: readonly ReviewMethod[] = [
  "ADAPTIVE_RETRIEVAL",
  "INTERLEAVED_RETRIEVAL",
] as const;

export const REVIEW_METHOD_LABELS: Record<ReviewMethod, string> = {
  SUCCESSIVE_RELEARNING: "Recuperação sucessiva",
  ADAPTIVE_RETRIEVAL: "Recuperação adaptativa",
  INTERLEAVED_RETRIEVAL: "Prática intercalada",
  ERROR_FOCUSED_RELEARNING: "Reaprendizagem orientada ao erro",
};

function assertDateKey(dateKey: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new Error(`Invalid calendar date: ${dateKey}`);
  }
}

export function toDateKey(timestampOrDateKey: string): string {
  const candidate = timestampOrDateKey.slice(0, 10);
  assertDateKey(candidate);
  return candidate;
}

export function addCalendarDays(dateKey: string, days: number): string {
  assertDateKey(dateKey);
  if (!Number.isInteger(days) || days < 0) {
    throw new Error("days must be a non-negative integer");
  }
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function calendarDaysBetween(fromDateKey: string, toDateKey: string): number {
  assertDateKey(fromDateKey);
  assertDateKey(toDateKey);
  const from = new Date(`${fromDateKey}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDateKey}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function initialMode(trigger: ReviewTrigger): ReviewMode {
  return trigger === "ERRO_QUESTAO"
    ? "REAPRENDIZAGEM_IMEDIATA"
    : "RECUPERACAO_ATIVA";
}

function initialMethod(trigger: ReviewTrigger): ReviewMethod {
  if (trigger === "ERRO_QUESTAO") return "ERROR_FOCUSED_RELEARNING";
  if (trigger === "TEORIA_CONCLUIDA") return "SUCCESSIVE_RELEARNING";
  return "ADAPTIVE_RETRIEVAL";
}

function initialMethodReason(
  trigger: ReviewTrigger,
): ReviewMethodSelectionReason {
  if (trigger === "ERRO_QUESTAO") return "SAFETY_ERROR_RECOVERY";
  if (trigger === "TEORIA_CONCLUIDA") return "NEW_CONTENT_CONSOLIDATION";
  return "BALANCED_EXPLORATION";
}

function modeForMethod(method: ReviewMethod): ReviewMode {
  if (method === "ERROR_FOCUSED_RELEARNING") return "REAPRENDIZAGEM_IMEDIATA";
  if (method === "INTERLEAVED_RETRIEVAL") return "PRATICA_INTERCALADA";
  return "RECUPERACAO_ATIVA";
}

function inferMethod(schedule: ReviewScheduleLike): ReviewMethod {
  if (schedule.metodoProximaRevisao) return schedule.metodoProximaRevisao;
  if (schedule.modoProximaRevisao === "REAPRENDIZAGEM_IMEDIATA") {
    return "ERROR_FOCUSED_RELEARNING";
  }
  if (schedule.modoProximaRevisao === "PRATICA_INTERCALADA") {
    return "INTERLEAVED_RETRIEVAL";
  }
  if (schedule.gatilhoOrigem === "TEORIA_CONCLUIDA")
    return "SUCCESSIVE_RELEARNING";
  return "ADAPTIVE_RETRIEVAL";
}

function inferLegacyStability(schedule: ReviewScheduleLike): number {
  if (
    Number.isFinite(schedule.estabilidadeDias) &&
    (schedule.estabilidadeDias ?? 0) > 0
  ) {
    return Math.max(1, Math.round(schedule.estabilidadeDias!));
  }
  const step = Math.max(
    0,
    Math.min(
      schedule.passosCicloAtuais,
      LEGACY_REVIEW_INTERVALS_DAYS.length - 1,
    ),
  );
  return LEGACY_REVIEW_INTERVALS_DAYS[step];
}

function capForExamHorizon(daysUntilExam: number): number {
  if (daysUntilExam <= 7) return 2;
  if (daysUntilExam <= 21) return 5;
  if (daysUntilExam <= 45) return 10;
  if (daysUntilExam <= 90) return 21;
  return 45;
}

function adaptiveInterval(args: {
  schedule: ReviewScheduleLike;
  performance: ReviewPerformance;
  reviewedDate: string;
  examDate?: string;
}): {
  intervalDays: number;
  stabilityDays: number;
  independentStreak: number;
  failures: number;
  requiresImmediateRelearning: boolean;
  rationale: string[];
} {
  const previousStability = inferLegacyStability(args.schedule);
  const previousStreak = Math.max(
    0,
    args.schedule.recuperacoesIndependentesConsecutivas ?? 0,
  );
  const previousFailures = Math.max(0, args.schedule.falhasRecuperacao ?? 0);
  const rationale: string[] = [];

  let stabilityDays: number;
  let independentStreak: number;
  let failures = previousFailures;
  let requiresImmediateRelearning = false;

  if (args.performance === "HARD") {
    stabilityDays = 1;
    independentStreak = 0;
    failures += 1;
    requiresImmediateRelearning = true;
    rationale.push(
      "A informação não foi recuperada de modo independente; exige correção e nova tentativa na mesma sessão.",
    );
  } else if (args.performance === "MEDIUM") {
    stabilityDays =
      previousStability <= 1
        ? 2
        : Math.max(2, Math.round(previousStability * 1.5));
    independentStreak = previousStreak + 1;
    rationale.push(
      "Houve recuperação independente, porém com esforço; o intervalo cresce de forma conservadora.",
    );
  } else {
    stabilityDays =
      previousStability <= 1
        ? 4
        : Math.max(4, Math.round(previousStability * 2));
    independentStreak = previousStreak + 1;
    rationale.push(
      "Houve recuperação independente e fluente; o intervalo pode crescer mais, sem presumir domínio permanente.",
    );
  }

  let intervalDays = stabilityDays;
  const trigger = args.schedule.gatilhoOrigem;
  if (trigger === "ERRO_QUESTAO" && independentStreak < 2) {
    intervalDays = Math.min(intervalDays, 3);
    rationale.push(
      "O ciclo nasceu de erro real e permanece em contato curto até duas recuperações independentes consecutivas.",
    );
  } else if (trigger === "ACERTO_BAIXA_CONFIANCA" && independentStreak < 2) {
    intervalDays = Math.min(intervalDays, 5);
    rationale.push("A confiança baixa limita a expansão inicial do intervalo.");
  } else if (
    trigger === "TEORIA_CONCLUIDA" &&
    args.schedule.historicoTentativas.length === 0
  ) {
    intervalDays = Math.min(intervalDays, 2);
    rationale.push(
      "A primeira recuperação posterior à teoria é mantida próxima para verificar aprendizagem real.",
    );
  }

  if (args.examDate) {
    const examDate = toDateKey(args.examDate);
    const daysUntilExam = calendarDaysBetween(args.reviewedDate, examDate);
    if (daysUntilExam > 0) {
      const horizonCap = capForExamHorizon(daysUntilExam);
      const beforeExamCap = Math.max(1, daysUntilExam - 2);
      const capped = Math.min(intervalDays, horizonCap, beforeExamCap);
      if (capped < intervalDays) {
        rationale.push(
          `O intervalo foi limitado a ${capped} dia(s) pelo horizonte de ${daysUntilExam} dia(s) até a prova.`,
        );
      }
      intervalDays = capped;
    } else {
      intervalDays = 1;
      rationale.push(
        "A data da prova foi alcançada; o agendamento fica conservador e deve ser reavaliado.",
      );
    }
  } else {
    intervalDays = Math.min(intervalDays, 45);
    rationale.push(
      "Sem data de prova válida no contexto, foi aplicado teto operacional conservador de 45 dias.",
    );
  }

  return {
    intervalDays: Math.max(1, Math.round(intervalDays)),
    stabilityDays: Math.max(1, Math.round(stabilityDays)),
    independentStreak,
    failures,
    requiresImmediateRelearning,
    rationale,
  };
}

function wilsonInterval(
  successes: number,
  total: number,
): { lower: number; upper: number } | null {
  if (total <= 0) return null;
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
    denominator;
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

export function buildReviewMethodEvidence(
  schedules: readonly ReviewScheduleLike[],
): ReviewMethodEvidenceSummary[] {
  const accumulator = new Map<
    ReviewMethod,
    {
      outcomes: number;
      independent: number;
      fluent: number;
      failures: number;
      subtopics: Set<string>;
      successfulDelays: number[];
      timedOutcomes: number;
      timedIndependent: number;
      timedSubtopics: Set<string>;
      timedSessionMinutes: number[];
      successfulSessionMinutes: number[];
    }
  >();

  const ensure = (method: ReviewMethod) => {
    const existing = accumulator.get(method);
    if (existing) return existing;
    const created = {
      outcomes: 0,
      independent: 0,
      fluent: 0,
      failures: 0,
      subtopics: new Set<string>(),
      successfulDelays: [] as number[],
      timedOutcomes: 0,
      timedIndependent: 0,
      timedSubtopics: new Set<string>(),
      timedSessionMinutes: [] as number[],
      successfulSessionMinutes: [] as number[],
    };
    accumulator.set(method, created);
    return created;
  };

  for (const schedule of schedules) {
    const ordered = schedule.historicoTentativas
      .slice()
      .sort((a, b) => a.revisadoEm.localeCompare(b.revisadoEm));
    for (let index = 1; index < ordered.length; index += 1) {
      const prior = ordered[index - 1];
      const outcome = ordered[index];
      const method = prior.metodoAplicado;
      if (!method) continue;

      const bucket = ensure(method);
      const delay = Math.max(
        0,
        outcome.diasDesdeRevisaoAnterior ??
          calendarDaysBetween(
            toDateKey(prior.revisadoEm),
            toDateKey(outcome.revisadoEm),
          ),
      );
      bucket.outcomes += 1;
      bucket.subtopics.add(schedule.subassuntoId);
      const priorDurationSeconds = prior.tempoGastoSegundos;
      const hasTimedPriorSession =
        Number.isFinite(priorDurationSeconds) &&
        (priorDurationSeconds ?? 0) > 0;
      if (hasTimedPriorSession) {
        const priorMinutes = (priorDurationSeconds ?? 0) / 60;
        bucket.timedOutcomes += 1;
        bucket.timedSubtopics.add(schedule.subassuntoId);
        bucket.timedSessionMinutes.push(priorMinutes);
      }
      if (outcome.desempenhoAutoAvaliado === "HARD") {
        bucket.failures += 1;
      } else {
        bucket.independent += 1;
        bucket.successfulDelays.push(delay);
        if (hasTimedPriorSession) {
          const priorMinutes = (priorDurationSeconds ?? 0) / 60;
          bucket.timedIndependent += 1;
          bucket.successfulSessionMinutes.push(priorMinutes);
        }
        if (outcome.desempenhoAutoAvaliado === "EASY") bucket.fluent += 1;
      }
    }
  }

  const allMethods: ReviewMethod[] = [
    "SUCCESSIVE_RELEARNING",
    "ADAPTIVE_RETRIEVAL",
    "INTERLEAVED_RETRIEVAL",
    "ERROR_FOCUSED_RELEARNING",
  ];

  return allMethods.map((method) => {
    const item = ensure(method);
    const interval = wilsonInterval(item.independent, item.outcomes);
    const totalTimedMinutes = item.timedSessionMinutes.reduce(
      (sum, value) => sum + value,
      0,
    );
    return {
      method,
      delayedOutcomes: item.outcomes,
      independentRecoveries: item.independent,
      fluentRecoveries: item.fluent,
      failures: item.failures,
      distinctSubtopics: item.subtopics.size,
      medianSuccessfulDelayDays: median(item.successfulDelays),
      successRate: item.outcomes > 0 ? item.independent / item.outcomes : null,
      successWilsonLower: interval?.lower ?? null,
      successWilsonUpper: interval?.upper ?? null,
      preferenceEligible: item.outcomes >= 8 && item.subtopics.size >= 3,
      timedDelayedOutcomes: item.timedOutcomes,
      timedIndependentRecoveries: item.timedIndependent,
      timedDistinctSubtopics: item.timedSubtopics.size,
      totalTimedMinutes,
      medianTimedSessionMinutes: median(item.timedSessionMinutes),
      medianSuccessfulSessionMinutes: median(item.successfulSessionMinutes),
      observedIndependentRecoveriesPer10Minutes:
        totalTimedMinutes > 0
          ? (item.timedIndependent / totalTimedMinutes) * 10
          : null,
      efficiencyEligible:
        item.timedOutcomes >= 12 &&
        item.timedSubtopics.size >= 4 &&
        totalTimedMinutes >= 30,
    };
  });
}

export function selectObservedPreferredReviewMethod(
  evidence: readonly ReviewMethodEvidenceSummary[],
): ReviewMethodPreferenceDecision {
  const compared = FLEXIBLE_METHODS.map((method) =>
    evidence.find((item) => item.method === method),
  ).filter((item): item is ReviewMethodEvidenceSummary => Boolean(item));

  if (
    compared.length !== FLEXIBLE_METHODS.length ||
    compared.some((item) => !item.preferenceEligible)
  ) {
    return {
      status: "INSUFFICIENT_DATA",
      preferredMethod: null,
      basis: null,
      comparedMethods: [...FLEXIBLE_METHODS],
      reasons: [
        "A troca do método padrão exige ao menos 8 resultados tardios e 3 subassuntos distintos para cada método flexível comparado.",
      ],
    };
  }

  const [first, second] = compared;
  const firstLower = first.successWilsonLower ?? 0;
  const firstUpper = first.successWilsonUpper ?? 1;
  const secondLower = second.successWilsonLower ?? 0;
  const secondUpper = second.successWilsonUpper ?? 1;

  if (firstLower > secondUpper) {
    return {
      status: "OBSERVED_PREFERENCE",
      preferredMethod: first.method,
      basis: "RETENTION",
      comparedMethods: [...FLEXIBLE_METHODS],
      reasons: [
        `${REVIEW_METHOD_LABELS[first.method]} apresentou intervalo de confiança de recuperação independente inteiramente acima do método comparado.`,
        "A preferência é observacional, reversível e mantém exploração controlada.",
      ],
    };
  }
  if (secondLower > firstUpper) {
    return {
      status: "OBSERVED_PREFERENCE",
      preferredMethod: second.method,
      basis: "RETENTION",
      comparedMethods: [...FLEXIBLE_METHODS],
      reasons: [
        `${REVIEW_METHOD_LABELS[second.method]} apresentou intervalo de confiança de recuperação independente inteiramente acima do método comparado.`,
        "A preferência é observacional, reversível e mantém exploração controlada.",
      ],
    };
  }

  const efficiencyReady = compared.every((item) => item.efficiencyEligible);
  if (efficiencyReady) {
    const firstRate = first.successRate ?? 0;
    const secondRate = second.successRate ?? 0;
    const firstEfficiency =
      first.observedIndependentRecoveriesPer10Minutes ?? 0;
    const secondEfficiency =
      second.observedIndependentRecoveriesPer10Minutes ?? 0;
    const firstDominatesEfficiency =
      firstRate >= secondRate && firstEfficiency >= secondEfficiency * 1.3;
    const secondDominatesEfficiency =
      secondRate >= firstRate && secondEfficiency >= firstEfficiency * 1.3;

    if (firstDominatesEfficiency || secondDominatesEfficiency) {
      const preferred = firstDominatesEfficiency ? first : second;
      return {
        status: "OBSERVED_EFFICIENCY_PREFERENCE",
        preferredMethod: preferred.method,
        basis: "EFFICIENCY",
        comparedMethods: [...FLEXIBLE_METHODS],
        reasons: [
          `${REVIEW_METHOD_LABELS[preferred.method]} manteve taxa observada de recuperação não inferior e apresentou pelo menos 30% mais recuperações independentes tardias por 10 minutos registrados.`,
          "O desempate por eficiência exige 12 resultados tardios cronometrados, 4 subassuntos e 30 minutos por método; continua observacional e reversível.",
        ],
      };
    }
  }

  return {
    status: "INCONCLUSIVE",
    preferredMethod: null,
    basis: null,
    comparedMethods: [...FLEXIBLE_METHODS],
    reasons: [
      "Os resultados observados ainda são compatíveis entre si; o sistema mantém alternância determinística sem declarar vencedor.",
    ],
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function alternateFlexibleMethod(method: ReviewMethod): ReviewMethod {
  return method === "INTERLEAVED_RETRIEVAL"
    ? "ADAPTIVE_RETRIEVAL"
    : "INTERLEAVED_RETRIEVAL";
}

function selectNextReviewMethod(args: {
  schedule: ReviewScheduleLike;
  performance: ReviewPerformance;
  evidence: readonly ReviewMethodEvidenceSummary[];
}): {
  method: ReviewMethod;
  reason: ReviewMethodSelectionReason;
  exploratory: boolean;
  preference: ReviewMethodPreferenceDecision;
} {
  const streak = args.schedule.recuperacoesIndependentesConsecutivas ?? 0;
  const preference = selectObservedPreferredReviewMethod(args.evidence);

  if (
    args.performance === "HARD" ||
    (args.schedule.gatilhoOrigem === "ERRO_QUESTAO" && streak < 2)
  ) {
    return {
      method: "ERROR_FOCUSED_RELEARNING",
      reason: "SAFETY_ERROR_RECOVERY",
      exploratory: false,
      preference,
    };
  }

  if (args.schedule.gatilhoOrigem === "TEORIA_CONCLUIDA" && streak < 2) {
    return {
      method: "SUCCESSIVE_RELEARNING",
      reason: "NEW_CONTENT_CONSOLIDATION",
      exploratory: false,
      preference,
    };
  }

  const cycle =
    stableHash(
      `${args.schedule.id}:${args.schedule.historicoTentativas.length}`,
    ) % 5;
  if (
    (preference.status === "OBSERVED_PREFERENCE" ||
      preference.status === "OBSERVED_EFFICIENCY_PREFERENCE") &&
    preference.preferredMethod
  ) {
    const explore = cycle === 0;
    return {
      method: explore
        ? alternateFlexibleMethod(preference.preferredMethod)
        : preference.preferredMethod,
      reason: explore ? "PREFERENCE_EXPLORATION" : "OBSERVED_PREFERENCE",
      exploratory: explore,
      preference,
    };
  }

  const method =
    cycle % 2 === 0 ? "ADAPTIVE_RETRIEVAL" : "INTERLEAVED_RETRIEVAL";
  return {
    method,
    reason: "BALANCED_EXPLORATION",
    exploratory: true,
    preference,
  };
}

export function createOrRefreshReviewSchedule(args: {
  existing?: ReviewScheduleLike;
  identity: ReviewScheduleIdentity;
  trigger: ReviewTrigger;
  triggerTimestamp: string;
  triggerId?: string;
  examDate?: string;
}): ReviewScheduleLike {
  const triggerDate = toDateKey(args.triggerTimestamp);
  const nextDate = addCalendarDays(
    triggerDate,
    args.trigger === "MANUAL" ? 0 : 1,
  );
  const now = args.triggerTimestamp;
  const method = initialMethod(args.trigger);
  const methodReason = initialMethodReason(args.trigger);

  if (!args.existing) {
    return {
      ...args.identity,
      passosCicloAtuais: 0,
      historicoTentativas: [],
      proximaRevisaoData: nextDate,
      desabilitada: false,
      createdAt: now,
      updatedAt: now,
      gatilhoOrigem: args.trigger,
      ultimoGatilhoEm: now,
      ultimoGatilhoId: args.triggerId,
      politicaVersao: REVIEW_POLICY_VERSION,
      estabilidadeDias: 1,
      recuperacoesIndependentesConsecutivas: 0,
      falhasRecuperacao: 0,
      ultimaDecisaoIntervaloDias: args.trigger === "MANUAL" ? 0 : 1,
      racionalUltimoIntervalo: [
        args.trigger === "ERRO_QUESTAO"
          ? "Erro real registrado: corrigir agora e testar novamente em sessão posterior."
          : "Primeiro contato de recuperação agendado próximo ao gatilho para coletar evidência.",
      ],
      modoProximaRevisao: modeForMethod(method),
      requerReaprendizagemImediata: args.trigger === "ERRO_QUESTAO",
      dataLimiteProva: args.examDate ? toDateKey(args.examDate) : undefined,
      metodoProximaRevisao: method,
      motivoMetodoProximaRevisao: methodReason,
      proximaSelecaoExploratoria: methodReason === "BALANCED_EXPLORATION",
    };
  }

  const resetEvidence = args.trigger === "ERRO_QUESTAO";
  const priorPolicy = args.existing.politicaVersao;
  const selectedMethod = resetEvidence
    ? "ERROR_FOCUSED_RELEARNING"
    : (args.existing.metodoProximaRevisao ?? method);
  const selectedReason = resetEvidence
    ? "SAFETY_ERROR_RECOVERY"
    : (args.existing.motivoMetodoProximaRevisao ?? methodReason);
  return {
    ...args.existing,
    passosCicloAtuais: resetEvidence ? 0 : args.existing.passosCicloAtuais,
    proximaRevisaoData:
      resetEvidence || args.existing.desabilitada
        ? nextDate
        : args.existing.proximaRevisaoData.localeCompare(nextDate) <= 0
          ? args.existing.proximaRevisaoData
          : nextDate,
    desabilitada: false,
    updatedAt: now,
    gatilhoOrigem: args.trigger,
    ultimoGatilhoEm: now,
    ultimoGatilhoId: args.triggerId,
    politicaVersao: REVIEW_POLICY_VERSION,
    politicaMigradaDe:
      priorPolicy && priorPolicy !== REVIEW_POLICY_VERSION
        ? priorPolicy
        : args.existing.politicaMigradaDe,
    estabilidadeDias: resetEvidence ? 1 : inferLegacyStability(args.existing),
    recuperacoesIndependentesConsecutivas: resetEvidence
      ? 0
      : (args.existing.recuperacoesIndependentesConsecutivas ?? 0),
    falhasRecuperacao: args.existing.falhasRecuperacao ?? 0,
    ultimaDecisaoIntervaloDias: resetEvidence
      ? 1
      : args.existing.ultimaDecisaoIntervaloDias,
    racionalUltimoIntervalo: resetEvidence
      ? ["Novo erro real reiniciou a evidência de recuperação deste tópico."]
      : args.existing.racionalUltimoIntervalo,
    modoProximaRevisao: modeForMethod(selectedMethod),
    requerReaprendizagemImediata:
      resetEvidence || args.existing.requerReaprendizagemImediata,
    dataLimiteProva: args.examDate
      ? toDateKey(args.examDate)
      : args.existing.dataLimiteProva,
    metodoProximaRevisao: selectedMethod,
    motivoMetodoProximaRevisao: selectedReason,
    proximaSelecaoExploratoria: resetEvidence
      ? false
      : args.existing.proximaSelecaoExploratoria,
  };
}

export function completeReviewSchedule(args: {
  schedule: ReviewScheduleLike;
  performance: ReviewPerformance;
  reviewedAt: string;
  examDate?: string;
  /** Peer schedules let the selector learn from the user's complete review history. */
  peerSchedules?: readonly ReviewScheduleLike[];
  /** Real elapsed time. Omitted values remain unknown and are excluded from efficiency analysis. */
  tempoGastoSegundos?: number;
  duracaoFonte?: "TIMER" | "MANUAL" | "LEGACY_UNKNOWN";
}): ReviewScheduleLike {
  if (
    args.tempoGastoSegundos !== undefined &&
    (!Number.isInteger(args.tempoGastoSegundos) ||
      args.tempoGastoSegundos <= 0 ||
      args.tempoGastoSegundos > 28_800)
  ) {
    throw new Error(
      "tempoGastoSegundos must be an integer between 1 and 28800",
    );
  }
  const reviewedDate = toDateKey(args.reviewedAt);
  const decision = adaptiveInterval({
    schedule: args.schedule,
    performance: args.performance,
    reviewedDate,
    examDate: args.examDate ?? args.schedule.dataLimiteProva,
  });

  const independent = args.performance !== "HARD";
  const usedHelp = args.performance === "HARD";
  const priorHistory = args.schedule.historicoTentativas.slice();
  const priorEntry = priorHistory
    .slice()
    .sort((a, b) => a.revisadoEm.localeCompare(b.revisadoEm))
    .at(-1);
  const gapDays = priorEntry
    ? Math.max(
        0,
        calendarDaysBetween(toDateKey(priorEntry.revisadoEm), reviewedDate),
      )
    : undefined;
  const appliedMethod = inferMethod(args.schedule);
  const appliedReason =
    args.schedule.motivoMetodoProximaRevisao ?? "LEGACY_FALLBACK";

  const history = [
    ...priorHistory,
    {
      revisadoEm: args.reviewedAt,
      desempenhoAutoAvaliado: args.performance,
      recuperacaoIndependente: independent,
      usouAjuda: usedHelp,
      intervaloDecididoDias: decision.intervalDays,
      racionalIntervalo: [...decision.rationale],
      modoSeguinte: modeForMethod(appliedMethod),
      metodoAplicado: appliedMethod,
      motivoSelecaoMetodo: appliedReason,
      selecaoExploratoria: args.schedule.proximaSelecaoExploratoria ?? false,
      diasDesdeRevisaoAnterior: gapDays,
      tempoGastoSegundos: args.tempoGastoSegundos,
      duracaoFonte: args.tempoGastoSegundos
        ? (args.duracaoFonte ?? "TIMER")
        : "LEGACY_UNKNOWN",
    },
  ];

  const provisional: ReviewScheduleLike = {
    ...args.schedule,
    passosCicloAtuais: decision.independentStreak,
    historicoTentativas: history,
    proximaRevisaoData: addCalendarDays(reviewedDate, decision.intervalDays),
    desabilitada: false,
    updatedAt: args.reviewedAt,
    politicaVersao: REVIEW_POLICY_VERSION,
    politicaMigradaDe:
      args.schedule.politicaVersao &&
      args.schedule.politicaVersao !== REVIEW_POLICY_VERSION
        ? args.schedule.politicaVersao
        : args.schedule.politicaMigradaDe,
    estabilidadeDias: decision.stabilityDays,
    recuperacoesIndependentesConsecutivas: decision.independentStreak,
    falhasRecuperacao: decision.failures,
    ultimaDecisaoIntervaloDias: decision.intervalDays,
    racionalUltimoIntervalo: [...decision.rationale],
    requerReaprendizagemImediata: decision.requiresImmediateRelearning,
    dataLimiteProva: args.examDate
      ? toDateKey(args.examDate)
      : args.schedule.dataLimiteProva,
  };

  const evidenceSchedules = args.peerSchedules
    ? [
        ...args.peerSchedules.filter((item) => item.id !== provisional.id),
        provisional,
      ]
    : [provisional];
  const evidence = buildReviewMethodEvidence(evidenceSchedules);
  const methodDecision = selectNextReviewMethod({
    schedule: provisional,
    performance: args.performance,
    evidence,
  });
  const nextMode = modeForMethod(methodDecision.method);
  const rationale = [
    ...decision.rationale,
    methodDecision.reason === "OBSERVED_PREFERENCE"
      ? `${REVIEW_METHOD_LABELS[methodDecision.method]} tornou-se o método flexível preferido pelos resultados tardios observados, considerando retenção e, quando elegível, eficiência por tempo.`
      : methodDecision.reason === "PREFERENCE_EXPLORATION"
        ? "Uma sessão exploratória foi preservada para verificar se a preferência observada continua válida."
        : methodDecision.reason === "BALANCED_EXPLORATION"
          ? "Ainda não há evidência suficiente para um método padrão; o sistema alternará protocolos de forma determinística."
          : methodDecision.reason === "NEW_CONTENT_CONSOLIDATION"
            ? "Conteúdo novo permanece em recuperação sucessiva até existir evidência mínima de consolidação."
            : "Falha ou erro ativo mantém reaprendizagem corretiva como proteção obrigatória.",
  ];

  return {
    ...provisional,
    racionalUltimoIntervalo: rationale,
    modoProximaRevisao: nextMode,
    requerReaprendizagemImediata:
      methodDecision.method === "ERROR_FOCUSED_RELEARNING",
    metodoProximaRevisao: methodDecision.method,
    motivoMetodoProximaRevisao: methodDecision.reason,
    proximaSelecaoExploratoria: methodDecision.exploratory,
    metodoPreferidoObservado:
      methodDecision.preference.preferredMethod ?? undefined,
  };
}

export function getDueReviewSchedules<T extends ReviewScheduleLike>(
  schedules: readonly T[],
  referenceDate: string,
): T[] {
  assertDateKey(referenceDate);
  return schedules
    .filter(
      (schedule) =>
        !schedule.desabilitada &&
        schedule.proximaRevisaoData.slice(0, 10) <= referenceDate,
    )
    .slice()
    .sort((a, b) => {
      const byDate = a.proximaRevisaoData.localeCompare(b.proximaRevisaoData);
      return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
    });
}

export function buildInterleavedReviewQueue(args: {
  schedules: readonly ReviewScheduleLike[];
  errorSummaries: readonly ErrorTopicSummary[];
  referenceDate: string;
  maxItems?: number;
}): InterleavedReviewItem[] {
  const maxItems = Math.max(1, Math.floor(args.maxItems ?? 6));
  const errorBySubtopic = new Map(
    args.errorSummaries.map((item) => [item.subassuntoId, item]),
  );
  const candidates = getDueReviewSchedules(
    args.schedules,
    args.referenceDate,
  ).map((schedule) => {
    const error = errorBySubtopic.get(schedule.subassuntoId);
    const unresolvedRank = !error
      ? 3
      : error.estadoRecuperacao === "SEM_ACERTO_POSTERIOR"
        ? 0
        : error.estadoRecuperacao === "UM_ACERTO_POSTERIOR"
          ? 1
          : 2;
    const reasons: string[] = [];
    if (schedule.requerReaprendizagemImediata)
      reasons.push("reaprendizagem pendente");
    if (error?.estadoRecuperacao === "SEM_ACERTO_POSTERIOR")
      reasons.push("erro sem acerto posterior");
    if (error?.estadoRecuperacao === "UM_ACERTO_POSTERIOR")
      reasons.push("recuperação ainda isolada");
    if (schedule.metodoProximaRevisao === "INTERLEAVED_RETRIEVAL")
      reasons.push("selecionada para discriminação intercalada");
    reasons.push(`vencida em ${schedule.proximaRevisaoData.slice(0, 10)}`);
    return { schedule, unresolvedRank, reasons };
  });

  candidates.sort(
    (a, b) =>
      Number(b.schedule.requerReaprendizagemImediata) -
        Number(a.schedule.requerReaprendizagemImediata) ||
      a.unresolvedRank - b.unresolvedRank ||
      a.schedule.proximaRevisaoData.localeCompare(
        b.schedule.proximaRevisaoData,
      ) ||
      a.schedule.id.localeCompare(b.schedule.id),
  );

  const selected: typeof candidates = [];
  const remaining = [...candidates];
  while (remaining.length > 0 && selected.length < maxItems) {
    const previous = selected.at(-1)?.schedule;
    let index = remaining.findIndex(
      (item) =>
        !previous ||
        item.schedule.disciplinaId !== previous.disciplinaId ||
        item.schedule.assuntoId !== previous.assuntoId,
    );
    if (index < 0) index = 0;
    selected.push(remaining.splice(index, 1)[0]);
  }

  return selected.map(({ schedule, reasons }) => ({
    scheduleId: schedule.id,
    disciplinaId: schedule.disciplinaId,
    assuntoId: schedule.assuntoId,
    subassuntoId: schedule.subassuntoId,
    priorityReasons: reasons,
  }));
}

function recoveryState(correctCount: number): RecoveryEvidenceState {
  if (correctCount <= 0) return "SEM_ACERTO_POSTERIOR";
  if (correctCount === 1) return "UM_ACERTO_POSTERIOR";
  return "DOIS_OU_MAIS_ACERTOS_POSTERIORES";
}

function incrementCause(
  accumulator: Partial<Record<ErrorCause, number>>,
  cause: ErrorCause | undefined,
): void {
  if (!cause) return;
  accumulator[cause] = (accumulator[cause] ?? 0) + 1;
}

export function buildErrorTopicSummaries(
  attempts: readonly AttemptForErrorAnalysis[],
): ErrorTopicSummary[] {
  const bySubtopic = new Map<string, AttemptForErrorAnalysis[]>();

  for (const attempt of attempts) {
    if (!attempt.subassuntoId) continue;
    const current = bySubtopic.get(attempt.subassuntoId) ?? [];
    current.push(attempt);
    bySubtopic.set(attempt.subassuntoId, current);
  }

  const summaries: ErrorTopicSummary[] = [];

  for (const [subassuntoId, items] of bySubtopic.entries()) {
    const ordered = items
      .slice()
      .sort(
        (a, b) =>
          a.respondidaEm.localeCompare(b.respondidaEm) ||
          a.id.localeCompare(b.id),
      );
    const errors = ordered.filter((item) => !item.acertou);
    if (errors.length === 0) continue;

    const lastError = errors[errors.length - 1];
    const correctAfterLastError = ordered.filter(
      (item) => item.acertou && item.respondidaEm > lastError.respondidaEm,
    ).length;
    const causes: Partial<Record<ErrorCause, number>> = {};
    for (const error of errors) incrementCause(causes, error.erroCausa);

    const notes = errors
      .filter((error) => Boolean(error.erroNota?.trim()))
      .slice(-3)
      .reverse()
      .map((error) => ({
        tentativaId: error.id,
        nota: error.erroNota!.trim(),
        registradaEm: error.respondidaEm,
      }));

    summaries.push({
      disciplinaId: lastError.disciplinaId,
      assuntoId: lastError.assuntoId,
      subassuntoId,
      totalErros: errors.length,
      ultimoErroEm: lastError.respondidaEm,
      ultimoRegistroEm: ordered[ordered.length - 1].respondidaEm,
      acertosAposUltimoErro: correctAfterLastError,
      estadoRecuperacao: recoveryState(correctAfterLastError),
      causasDeclaradas: causes,
      notasRecentes: notes,
    });
  }

  return summaries.sort((a, b) => {
    const stateRank: Record<RecoveryEvidenceState, number> = {
      SEM_ACERTO_POSTERIOR: 0,
      UM_ACERTO_POSTERIOR: 1,
      DOIS_OU_MAIS_ACERTOS_POSTERIORES: 2,
    };
    const byState =
      stateRank[a.estadoRecuperacao] - stateRank[b.estadoRecuperacao];
    if (byState !== 0) return byState;
    const byLastError = b.ultimoErroEm.localeCompare(a.ultimoErroEm);
    return byLastError !== 0
      ? byLastError
      : a.subassuntoId.localeCompare(b.subassuntoId);
  });
}
