export type AnswerConfidence = "BAIXA" | "MEDIA" | "ALTA";

export type ErrorCause =
  | "LACUNA_CONTEUDO"
  | "INTERPRETACAO"
  | "APLICACAO"
  | "MEMORIA"
  | "DISTRAÇÃO"
  | "PRESSAO_TEMPO"
  | "DESCONHECIDA";

export type ReviewTrigger =
  | "ERRO_QUESTAO"
  | "ACERTO_BAIXA_CONFIANCA"
  | "TEORIA_CONCLUIDA"
  | "MANUAL";

/**
 * Backward-compatible storage values with retrieval-oriented semantics:
 * HARD = failed or needed consultation; MEDIUM = independent but effortful;
 * EASY = independent and fluent.
 */
export type ReviewPerformance = "HARD" | "MEDIUM" | "EASY";

export type ReviewDurationSource = "TIMER" | "MANUAL" | "LEGACY_UNKNOWN";

export interface ReviewCompletionInput {
  performance: ReviewPerformance;
  tempoGastoSegundos?: number;
  duracaoFonte?: ReviewDurationSource;
}

export type ReviewMode =
  | "REAPRENDIZAGEM_IMEDIATA"
  | "RECUPERACAO_ATIVA"
  | "PRATICA_INTERCALADA";

/**
 * Methods are operational protocols, not claims of universal superiority.
 * Context-specific safeguards may override the empirically preferred flexible method.
 */
export type ReviewMethod =
  | "SUCCESSIVE_RELEARNING"
  | "ADAPTIVE_RETRIEVAL"
  | "INTERLEAVED_RETRIEVAL"
  | "ERROR_FOCUSED_RELEARNING";

export type ReviewMethodSelectionReason =
  | "SAFETY_ERROR_RECOVERY"
  | "NEW_CONTENT_CONSOLIDATION"
  | "BALANCED_EXPLORATION"
  | "OBSERVED_PREFERENCE"
  | "PREFERENCE_EXPLORATION"
  | "LEGACY_FALLBACK";

export type RecoveryEvidenceState =
  | "SEM_ACERTO_POSTERIOR"
  | "UM_ACERTO_POSTERIOR"
  | "DOIS_OU_MAIS_ACERTOS_POSTERIORES";

export interface AttemptForErrorAnalysis {
  id: string;
  disciplinaId: string;
  assuntoId: string;
  subassuntoId?: string;
  acertou: boolean;
  respondidaEm: string;
  erroCausa?: ErrorCause;
  erroNota?: string;
  nivelConfianca?: AnswerConfidence;
  fonteExterna?: string;
}

export interface ErrorTopicSummary {
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string;
  totalErros: number;
  ultimoErroEm: string;
  ultimoRegistroEm: string;
  acertosAposUltimoErro: number;
  estadoRecuperacao: RecoveryEvidenceState;
  causasDeclaradas: Partial<Record<ErrorCause, number>>;
  notasRecentes: Array<{
    tentativaId: string;
    nota: string;
    registradaEm: string;
  }>;
}

export interface ReviewHistoryEntry {
  revisadoEm: string;
  desempenhoAutoAvaliado: ReviewPerformance;
  recuperacaoIndependente?: boolean;
  usouAjuda?: boolean;
  intervaloDecididoDias?: number;
  racionalIntervalo?: string[];
  modoSeguinte?: ReviewMode;
  /** Protocol executed in this review session. */
  metodoAplicado?: ReviewMethod;
  /** Why this method was selected for the session. */
  motivoSelecaoMetodo?: ReviewMethodSelectionReason;
  /** True when the method was deliberately used to avoid premature lock-in. */
  selecaoExploratoria?: boolean;
  /** Calendar gap since the previous review session for this schedule. */
  diasDesdeRevisaoAnterior?: number;
  /** Real elapsed time for the review session. Missing values remain unknown. */
  tempoGastoSegundos?: number;
  duracaoFonte?: ReviewDurationSource;
}

export interface ReviewScheduleLike {
  id: string;
  subassuntoId: string;
  assuntoId: string;
  disciplinaId: string;
  /** Legacy field retained for backup compatibility; no longer represents a fixed ladder step. */
  passosCicloAtuais: number;
  historicoTentativas: ReviewHistoryEntry[];
  proximaRevisaoData: string;
  desabilitada: boolean;
  createdAt: string;
  updatedAt: string;
  gatilhoOrigem?: ReviewTrigger;
  ultimoGatilhoEm?: string;
  ultimoGatilhoId?: string;
  politicaVersao?: string;
  estabilidadeDias?: number;
  recuperacoesIndependentesConsecutivas?: number;
  falhasRecuperacao?: number;
  ultimaDecisaoIntervaloDias?: number;
  racionalUltimoIntervalo?: string[];
  modoProximaRevisao?: ReviewMode;
  requerReaprendizagemImediata?: boolean;
  dataLimiteProva?: string;
  politicaMigradaDe?: string;
  /** Method prescribed for the next scheduled review. */
  metodoProximaRevisao?: ReviewMethod;
  motivoMetodoProximaRevisao?: ReviewMethodSelectionReason;
  proximaSelecaoExploratoria?: boolean;
  /** Flexible method currently favored by within-user delayed outcomes, when evidence is sufficient. */
  metodoPreferidoObservado?: ReviewMethod;
}

export interface ReviewScheduleIdentity {
  id: string;
  subassuntoId: string;
  assuntoId: string;
  disciplinaId: string;
}

export interface InterleavedReviewItem {
  scheduleId: string;
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string;
  priorityReasons: string[];
}

export interface ReviewMethodEvidenceSummary {
  method: ReviewMethod;
  delayedOutcomes: number;
  independentRecoveries: number;
  fluentRecoveries: number;
  failures: number;
  distinctSubtopics: number;
  medianSuccessfulDelayDays: number | null;
  successRate: number | null;
  successWilsonLower: number | null;
  successWilsonUpper: number | null;
  preferenceEligible: boolean;
  timedDelayedOutcomes: number;
  timedIndependentRecoveries: number;
  timedDistinctSubtopics: number;
  totalTimedMinutes: number;
  medianTimedSessionMinutes: number | null;
  medianSuccessfulSessionMinutes: number | null;
  observedIndependentRecoveriesPer10Minutes: number | null;
  efficiencyEligible: boolean;
}

export interface ReviewMethodPreferenceDecision {
  status:
    | "INSUFFICIENT_DATA"
    | "INCONCLUSIVE"
    | "OBSERVED_PREFERENCE"
    | "OBSERVED_EFFICIENCY_PREFERENCE";
  preferredMethod: ReviewMethod | null;
  basis: "RETENTION" | "EFFICIENCY" | null;
  comparedMethods: ReviewMethod[];
  reasons: string[];
}
