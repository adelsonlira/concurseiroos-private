export type EvidenceCoverageState =
  | "NO_LEARNING_EVIDENCE"
  | "THEORY_WITHOUT_RETRIEVAL"
  | "INITIAL_RETRIEVAL_EVIDENCE"
  | "INITIAL_QUESTION_EVIDENCE"
  | "REPEATED_RETRIEVAL_EVIDENCE"
  | "REPEATED_QUESTION_EVIDENCE"
  | "ACTIVE_ERROR"
  | "RECOVERY_OBSERVED"
  | "RECOVERY_REPEATED";

export type EvidenceRoadmapActionKind =
  | "NEW_CONTENT"
  | "DIAGNOSTIC_QUESTIONS"
  | "RECOVERY"
  | "MAINTENANCE";

export interface DiagnosticDisciplineInput {
  id: string;
  nome: string;
  officialMaxPoints: number;
  ordem: number;
}

export interface DiagnosticTopicInput {
  id: string;
  disciplinaId: string;
  nome: string;
  ordem: number;
}

export interface DiagnosticSubtopicInput {
  id: string;
  assuntoId: string;
  nome: string;
  ordem: number;
  completado: boolean;
  isDeleted?: boolean;
}

export interface DiagnosticAttemptInput {
  id: string;
  disciplinaId: string;
  assuntoId: string;
  subassuntoId?: string;
  acertou: boolean;
  respondidaEm: string;
}

export interface DiagnosticReviewHistoryInput {
  revisadoEm: string;
  recuperacaoIndependente?: boolean;
  usouAjuda?: boolean;
}

export interface DiagnosticReviewScheduleInput {
  id: string;
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string;
  desabilitada: boolean;
  isDeleted?: boolean;
  historicoTentativas: DiagnosticReviewHistoryInput[];
}

export interface SubtopicEvidenceProfile {
  disciplinaId: string;
  disciplinaNome: string;
  assuntoId: string;
  assuntoNome: string;
  subassuntoId: string;
  subassuntoNome: string;
  officialDisciplineMaxPoints: number;
  theoryCompleted: boolean;
  attempts: number;
  correctAttempts: number;
  observedAccuracy: number | null;
  distinctAttemptDays: number;
  reviewCompletions: number;
  independentRetrievals: number;
  lastEvidenceAt: string | null;
  lastErrorAt: string | null;
  correctAfterLastError: number;
  state: EvidenceCoverageState;
  missingEvidence: string[];
}

export interface DisciplineEvidenceSummary {
  disciplinaId: string;
  disciplinaNome: string;
  officialMaxPoints: number;
  totalSubtopics: number;
  noLearningEvidence: number;
  theoryConfirmed: number;
  withQuestionEvidence: number;
  withRepeatedQuestionEvidence: number;
  activeErrorOrRecovery: number;
}

export interface EvidenceRoadmapAction {
  kind: EvidenceRoadmapActionKind;
  disciplinaId: string;
  disciplinaNome: string;
  assuntoId: string;
  assuntoNome: string;
  subassuntoId: string;
  subassuntoNome: string;
  state: EvidenceCoverageState;
  reason: string;
  evidenceFacts: string[];
}

export interface EvidenceCoverageReport {
  generatedAt: string;
  totalSubtopics: number;
  countsByState: Record<EvidenceCoverageState, number>;
  descriptiveCoverage: {
    theoryConfirmed: number;
    withAnyRetrievalEvidence: number;
    withQuestionEvidence: number;
    withRepeatedQuestionEvidence: number;
    activeErrorWithoutRecovery: number;
  };
  disciplines: DisciplineEvidenceSummary[];
  profiles: SubtopicEvidenceProfile[];
  roadmap: EvidenceRoadmapAction[];
  caveats: string[];
}

export interface EvidenceCoverageInput {
  generatedAt: string;
  disciplines: DiagnosticDisciplineInput[];
  topics: DiagnosticTopicInput[];
  subtopics: DiagnosticSubtopicInput[];
  attempts: DiagnosticAttemptInput[];
  reviewSchedules: DiagnosticReviewScheduleInput[];
  maxRoadmapItems?: number;
}
