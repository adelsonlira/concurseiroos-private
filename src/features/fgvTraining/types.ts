export type FgvTrainingOptionLabel = "A" | "B" | "C" | "D" | "E";
export type FgvTrainingAdherence = "DIRECT" | "PARTIAL";
export type FgvTrainingAdherenceFilter = FgvTrainingAdherence | "BOTH";
export type FgvTrainingCorrectionStatus = "CORRECT" | "INCORRECT" | "BLANK";

export interface FgvTrainingAlternative {
  label: FgvTrainingOptionLabel;
  text: string;
  assetPath?: string;
}

export interface FgvTrainingQuestion {
  questionId: string;
  stem: string;
  statementAssetPaths: string[];
  alternatives: FgvTrainingAlternative[];
  selectionArea: string;
  primaryItem: { id: string; name: string };
  adherence: FgvTrainingAdherence;
}

export interface FgvTrainingPublicCatalog {
  catalogId: "cur-bd-banco-operacional-fgv-dataprev-v2-training";
  version: 1;
  trainingType: "thematic_fgv";
  sourceRecordCount: number;
  eligibleQuestionCount: number;
  assetCount: number;
  allowedQuantities: readonly [5, 10, 15, 20];
  affectsSde: false;
  countsAsOfficialSimulation: false;
  questions: FgvTrainingQuestion[];
}

export interface FgvTrainingFilters {
  selectionArea: string | null;
  primaryItemId: string | null;
  adherence: FgvTrainingAdherenceFilter;
  quantity: 5 | 10 | 15 | 20;
}

export interface FgvTrainingCheckedCorrection {
  questionId: string;
  selectedAnswer: FgvTrainingOptionLabel;
  operationalAnswer: FgvTrainingOptionLabel;
  status: "CORRECT" | "INCORRECT";
}

export interface ActiveFgvTrainingAttempt {
  attemptId: string;
  catalogId: FgvTrainingPublicCatalog["catalogId"];
  catalogVersion: 1;
  trainingType: "thematic_fgv";
  status: "ACTIVE";
  startedAt: string;
  updatedAt: string;
  currentIndex: number;
  seed: string;
  questionOrder: string[];
  filters: FgvTrainingFilters;
  answers: Partial<Record<string, FgvTrainingOptionLabel>>;
  checkedCorrections: Partial<Record<string, FgvTrainingCheckedCorrection>>;
  reviewQuestionIds: string[];
  affectsSde: false;
  countsAsOfficialSimulation: false;
}

export interface FgvTrainingAnswerRecord {
  questionId: string;
  selectedAnswer: FgvTrainingOptionLabel | null;
}

export interface CheckFgvTrainingAnswerRequest {
  attemptId: string;
  catalogId: FgvTrainingPublicCatalog["catalogId"];
  catalogVersion: 1;
  questionOrder: string[];
  questionId: string;
  selectedAnswer: FgvTrainingOptionLabel;
}

export interface FinalizeFgvTrainingRequest {
  attemptId: string;
  catalogId: FgvTrainingPublicCatalog["catalogId"];
  catalogVersion: 1;
  startedAt: string;
  seed: string;
  questionOrder: string[];
  filters: FgvTrainingFilters;
  answers: FgvTrainingAnswerRecord[];
}

export interface FgvTrainingQuestionCorrection {
  questionId: string;
  position: number;
  selectedAnswer: FgvTrainingOptionLabel | null;
  operationalAnswer: FgvTrainingOptionLabel;
  status: FgvTrainingCorrectionStatus;
}

export interface FgvTrainingAggregateResult {
  key: string;
  label: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  percentage: number;
}

export interface FgvTrainingTraceabilityRecord {
  questionId: string;
  position: number;
  recordFingerprint: string;
}

export interface FinalizedFgvTrainingAttempt {
  attemptId: string;
  catalogId: FgvTrainingPublicCatalog["catalogId"];
  catalogVersion: 1;
  trainingType: "thematic_fgv";
  status: "FINALIZED";
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  seed: string;
  questionOrder: string[];
  filters: FgvTrainingFilters;
  answers: FgvTrainingAnswerRecord[];
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalQuestions: number;
  percentage: number;
  areaResults: FgvTrainingAggregateResult[];
  itemResults: FgvTrainingAggregateResult[];
  adherenceResults: FgvTrainingAggregateResult[];
  corrections: FgvTrainingQuestionCorrection[];
  traceability: FgvTrainingTraceabilityRecord[];
  affectsSde: false;
  countsAsOfficialSimulation: false;
}

export interface FgvTrainingPersistenceSnapshot {
  activeAttempt: ActiveFgvTrainingAttempt | null;
  finalizedAttempts: FinalizedFgvTrainingAttempt[];
}
