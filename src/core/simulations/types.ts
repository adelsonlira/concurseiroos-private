export const SIMULATION_POLICY_VERSION = "OFFICIAL_BLUEPRINT_IDENTIFIED_SOURCES_V1";

export type SimulationKind = "PARTIAL" | "FULL";
export type SimulationSourceKind = "EXTERNAL_BANK" | "LOCAL_IDENTIFIED_QUESTIONS";

export interface SimulationSource {
  id: string;
  label: string;
  kind: SimulationSourceKind;
  /** Human-readable reference that allows the source to be found again. */
  reference: string;
  /** Optional direct access URL for a known external platform. */
  accessUrl?: string;
}

export interface SimulationQuestionReference {
  questionId: string;
  disciplineId: string;
  sourceDocumentId?: string;
  hasOfficialAnswer: boolean;
  isCustomQuestion: boolean;
}

export interface SimulationDisciplineBlueprint {
  disciplineId: string;
  disciplineName: string;
  questionCount: number;
  pointsPerQuestion: number;
  maximumPoints: number;
}

export interface SimulationBlueprint {
  competitionId: string;
  competitionName: string;
  version: string;
  officialDocument: string;
  examDurationMinutes: number;
  totalQuestions: number;
  maximumPoints: number;
  minimumTotalPoints: number;
  eliminatesOnZeroDiscipline: boolean;
  disciplines: SimulationDisciplineBlueprint[];
}

export interface CreateSimulationInput {
  title: string;
  kind: SimulationKind;
  source: SimulationSource;
  selectedDisciplineIds?: string[];
}

export interface SimulationCompositionRequest {
  kind: SimulationKind;
  selectedDisciplineIds?: string[];
  source: SimulationSource;
  availableQuestions?: SimulationQuestionReference[];
  deterministicSeed?: string;
}

export interface SimulationDisciplinePlan extends SimulationDisciplineBlueprint {
  questionIds: string[];
  sourceInstruction: string;
}

export interface SimulationPlan {
  policyVersion: typeof SIMULATION_POLICY_VERSION;
  blueprintVersion: string;
  competitionId: string;
  competitionName: string;
  kind: SimulationKind;
  source: SimulationSource;
  officialDocument: string;
  durationMinutes: number;
  totalQuestions: number;
  maximumPoints: number;
  minimumTotalPoints: number;
  eliminatesOnZeroDiscipline: boolean;
  disciplines: SimulationDisciplinePlan[];
  guardrails: string[];
}

export interface SimulationDisciplineResult {
  disciplineId: string;
  correct: number;
  wrong: number;
  blank: number;
  elapsedSeconds: number;
}

export interface SimulationDisciplineAnalysis extends SimulationDisciplineResult {
  disciplineName: string;
  pointsPerQuestion: number;
  points: number;
  maximumPoints: number;
  hitRate: number;
  zeroScoreRisk: boolean;
  missedPoints: number;
}

export type SimulationEligibilityStatus =
  | "NOT_EVALUATED_PARTIAL"
  | "MEETS_RECORDED_RULES"
  | "BELOW_TOTAL_CUTOFF"
  | "ZERO_SCORE_DISCIPLINE";

export interface SimulationCorrectionAction {
  order: number;
  disciplineId: string;
  disciplineName: string;
  priority: "ZERO_SCORE_RISK" | "BLANKS" | "MISSED_POINTS";
  reason: string;
  instructions: string[];
}

export interface SimulationAnalysis {
  policyVersion: typeof SIMULATION_POLICY_VERSION;
  kind: SimulationKind;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  elapsedSeconds: number;
  points: number;
  maximumPoints: number;
  percentageOfMaximum: number;
  minimumTotalPoints: number;
  zeroScoreDisciplineIds: string[];
  eligibilityStatus: SimulationEligibilityStatus;
  disciplines: SimulationDisciplineAnalysis[];
  correctionPlan: SimulationCorrectionAction[];
  limitations: string[];
}

export interface SimulationComparison {
  comparable: boolean;
  reason?: string;
  pointsDelta?: number;
  correctDelta?: number;
  blankDelta?: number;
  elapsedSecondsDelta?: number;
  disciplinePointDeltas?: Record<string, number>;
}
