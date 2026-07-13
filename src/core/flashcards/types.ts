export type FlashcardRetrievalPerformance = "FAILED" | "EFFORTFUL" | "FLUENT";

export interface FlashcardRetrievalHistoryEntry {
  revisadoEm: string;
  resultado: FlashcardRetrievalPerformance;
  intervaloDecididoDias: number;
  recuperacaoIndependente: boolean;
  racionalIntervalo: string[];
}

export interface FlashcardScheduleLike {
  status: "NEW" | "LEARNING" | "REVIEW" | "LAPSED";
  intervaloDias: number;
  repeticoes: number;
  ultimaRevisaoData?: string;
  politicaVersao?: string;
  estabilidadeObservadaDias?: number;
  recuperacoesIndependentesConsecutivas?: number;
  falhasRecuperacao?: number;
  historicoRecuperacoes?: readonly FlashcardRetrievalHistoryEntry[];
}

export interface FlashcardScheduleDecision {
  policyVersion: string;
  nextStatus: "LEARNING" | "REVIEW" | "LAPSED";
  nextReviewDate: string;
  intervalDays: number;
  observedStabilityDays: number;
  independentRecoveryStreak: number;
  retrievalFailures: number;
  requiresImmediateRelearning: boolean;
  migratedFrom?: string;
  rationale: string[];
  historyEntry: FlashcardRetrievalHistoryEntry;
}
