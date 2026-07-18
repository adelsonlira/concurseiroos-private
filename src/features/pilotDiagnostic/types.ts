export type DiagnosticOptionLabel = "A" | "B" | "C" | "D" | "E";

export interface PilotDiagnosticAlternative {
  label: DiagnosticOptionLabel;
  text: string;
  assetKey?: string;
}

export interface PilotDiagnosticQuestion {
  position: number;
  questionId: string;
  stem: string;
  statementAssetKeys: string[];
  alternatives: PilotDiagnosticAlternative[];
}

export interface PilotDiagnosticPublicCatalog {
  diagnosticId: "diag-fgv-dataprev-bd-v1";
  version: 1;
  title: "Diagnóstico Piloto FGV-DATAPREV — Banco de Dados";
  suggestedDurationMinutes: 50;
  questionCount: 24;
  fixedOrder: true;
  penaltyForWrongAnswer: false;
  questions: PilotDiagnosticQuestion[];
}

export interface ActivePilotDiagnosticAttempt {
  attemptId: string;
  diagnosticId: PilotDiagnosticPublicCatalog["diagnosticId"];
  version: PilotDiagnosticPublicCatalog["version"];
  status: "ACTIVE";
  startedAt: string;
  updatedAt: string;
  currentPosition: number;
  answers: Partial<Record<string, DiagnosticOptionLabel>>;
  reviewQuestionIds: string[];
  affectsSde: false;
}

export interface DiagnosticAnswerRecord {
  questionId: string;
  position: number;
  selectedAnswer: DiagnosticOptionLabel | null;
}

export interface FinalizePilotDiagnosticRequest {
  attemptId: string;
  diagnosticId: PilotDiagnosticPublicCatalog["diagnosticId"];
  version: PilotDiagnosticPublicCatalog["version"];
  startedAt: string;
  answers: DiagnosticAnswerRecord[];
}

export type DiagnosticCorrectionStatus = "CORRECT" | "INCORRECT" | "BLANK";

export interface DiagnosticQuestionCorrection {
  questionId: string;
  position: number;
  selectedAnswer: DiagnosticOptionLabel | null;
  operationalAnswer: DiagnosticOptionLabel;
  status: DiagnosticCorrectionStatus;
}

export interface DiagnosticAreaResult {
  selectionArea: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  percentage: number;
}

export interface DiagnosticCoverageResult {
  label: "Cobertura principal e complementar";
  principal: {
    total: 20;
    correct: number;
    wrong: number;
    blank: number;
    percentage: number;
  };
  complementary: {
    total: 4;
    correct: number;
    wrong: number;
    blank: number;
    percentage: number;
  };
}

export interface DiagnosticTraceabilityRecord {
  questionId: string;
  position: number;
  recordFingerprint: string;
}

export interface FinalizedPilotDiagnosticAttempt {
  attemptId: string;
  diagnosticId: PilotDiagnosticPublicCatalog["diagnosticId"];
  version: PilotDiagnosticPublicCatalog["version"];
  status: "FINALIZED";
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  answers: DiagnosticAnswerRecord[];
  blankQuestionIds: string[];
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalQuestions: 24;
  percentage: number;
  affectsSde: false;
  areaResults: DiagnosticAreaResult[];
  coverage: DiagnosticCoverageResult;
  corrections: DiagnosticQuestionCorrection[];
  traceability: DiagnosticTraceabilityRecord[];
}

export interface PilotDiagnosticPersistenceSnapshot {
  activeAttempt: ActivePilotDiagnosticAttempt | null;
  finalizedAttempts: FinalizedPilotDiagnosticAttempt[];
}
