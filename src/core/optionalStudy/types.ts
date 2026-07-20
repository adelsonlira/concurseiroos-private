import type { ExternalEvidenceConsultation, ExternalEvidenceErrorCause, ExternalEvidenceSource } from "../externalEvidence/types";
import type { HistoricalIncidenceSignal } from "../sde-v2/types";
import type { StudyExecutionBlockReason, StudyExecutionPacket, StudyExecutionStatus } from "../studyExecution/types";

export type OptionalStudyContext = "rest_day_optional" | "extra_after_required_plan" | "manual_optional";
export type OptionalStudyMethod =
  | "theory_notebooklm"
  | "continue_theory"
  | "prerequisite_recovery"
  | "guided_reading"
  | "active_recall"
  | "fgv_questions"
  | "short_question_batch"
  | "timed_question_batch"
  | "review_due"
  | "error_review"
  | "flashcards"
  | "technical_practice"
  | "mini_simulation"
  | "light_organization";

export type OptionalStudyEnvironment = "notebooklm" | "qconcursos" | "treino_fgv" | "concurseiroos" | "material" | "manual";
export type OptionalStudyMaterialMatchConfidence = "exact_subtopic" | "topic" | "discipline_broad" | "none";
export type OptionalStudyOptionOrigin = "sde_v1_optional" | "sde_v2_real" | "manual";

export interface OptionalStudyRecommendationOption {
  optionId: string;
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  subtopicId?: string;
  subtopicName?: string;
  method: OptionalStudyMethod;
  environment: OptionalStudyEnvironment;
  materialId?: string;
  materialLabel?: string;
  materialMatchConfidence?: OptionalStudyMaterialMatchConfidence;
  durationMinutes: number;
  objective: string;
  completionCriterion: string;
  rationale: string;
  expectedPedagogicalEffect: string;
  warnings: string[];
  supportSignals?: string[];
  prerequisiteAdequate?: boolean | null;
  origin?: OptionalStudyOptionOrigin;
  sdeVersion?: "1.0" | "2.0";
  sourceDecisionId?: string;
  score?: number | null;
  suggestedSource?: ExternalEvidenceSource;
  suggestedExaminingBoard?: string;
  executionStatus?: StudyExecutionStatus;
  executionPacket?: StudyExecutionPacket | null;
  executionBlockReasons?: StudyExecutionBlockReason[];
}

export interface OptionalStudyInputSnapshot {
  localDate: string;
  context: OptionalStudyContext;
  scheduledMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  weeklyStudiedMinutes: number;
  examDate?: string;
  effectivePrescriptionId?: string;
  effectiveDisciplineId?: string;
  effectiveTopicId?: string;
  effectiveSubtopicId?: string;
  recentErrorSubtopicIds: string[];
  dueReviewSubtopicIds: string[];
  recentSessionSubtopicIds: string[];
  availableMaterialIds: string[];
  evidenceIds: string[];
  prerequisiteBlockedSubtopicIds?: string[];
  sdeV1Effective: true;
  sdeV2ExecutionMode: "shadow";
  sdeV2AffectsPrescription: false;
}

export interface OptionalStudyShadowExecution {
  adapter: "optionalStudySdeV2ShadowAdapter";
  executed: boolean;
  fallbackUsed: boolean;
  fallbackReason?: "OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2" | "SDE_V2_OUTPUT_INVALID" | "SDE_V2_OUTPUT_UNAVAILABLE";
  sourceDecisionId?: string;
  evidenceIds?: string[];
  historicalIncidenceShadow?: HistoricalIncidenceSignal;
}

export interface OptionalStudyRecommendation {
  recommendationId: string;
  schemaVersion: 1;
  engineVersion: "1.0" | "1.1" | "1.2";
  generatedAt: string;
  localDate: string;
  context: OptionalStudyContext;
  inputFingerprint: string;
  requestOrdinal: number;
  primary: OptionalStudyRecommendationOption;
  alternatives: OptionalStudyRecommendationOption[];
  blockedOptions?: OptionalStudyRecommendationOption[];
  /** Present only when produced by a real SDE v2 execution. */
  shadowAlternative?: OptionalStudyRecommendationOption;
  shadowExecution?: OptionalStudyShadowExecution;
  snapshot: OptionalStudyInputSnapshot;
  explanation: {
    signalsUsed: string[];
    missingInformation: string[];
    shadowModeNotice: string;
  };
}

export type OptionalStudyEventType =
  | "recommendation_generated"
  | "alternatives_requested"
  | "rest_kept"
  | "hidden_for_today"
  | "accepted"
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "session_completed"
  | "session_interrupted"
  | "result_recorded";

export interface OptionalStudyLedgerEvent {
  eventId: string;
  schemaVersion: 1;
  occurredAt: string;
  localDate: string;
  eventType: OptionalStudyEventType;
  context: OptionalStudyContext;
  recommendationId?: string;
  sessionId?: string;
  inputFingerprint?: string;
  engineVersion: "1.0" | "1.1" | "1.2";
  isOptional: true;
  mandatory: false;
  affectsPlanCompliance: false;
  payload: Record<string, unknown>;
}

export type OptionalStudyResultKind = "questions" | "theory" | "review" | "simulation" | "technical_practice" | "organization";
export type OptionalStudyReviewPerformance = "difficult" | "intermediate" | "fluent";
export type OptionalStudyTechnicalDifficulty = "low" | "medium" | "high" | "not_informed";

export interface OptionalStudyResultInput {
  kind: OptionalStudyResultKind;
  actualMinutes: number;
  objectiveCriteriaMet?: boolean;
  notes?: string;

  // Question batches and simulations.
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  blankAnswers?: number;
  examiningBoard?: string;
  source?: ExternalEvidenceSource;
  sourceReference?: string;
  batchType?: string;
  resolutionConditions?: string;
  consultedMaterial?: ExternalEvidenceConsultation;
  primaryErrorCause?: ExternalEvidenceErrorCause;

  // Theory.
  materialId?: string;
  materialLabel?: string;
  pagesOrSection?: string;
  activeRecallPerformed?: boolean;
  completionCriterionReported?: string;
  remainingDoubts?: string;

  // Review.
  reviewPerformance?: OptionalStudyReviewPerformance;
  rememberedContent?: string;
  persistentErrors?: string;
  needsNewReview?: boolean;

  // Technical practice.
  technicalTask?: string;
  observableResult?: string;
  taskCompleted?: boolean;
  technicalDifficulty?: OptionalStudyTechnicalDifficulty;
  helpNeeded?: boolean;
  artifactDescription?: string;

  // Operational organization.
  operationalAction?: string;
}

export interface OptionalStudyDerivedState {
  recommendation: OptionalStudyRecommendation | null;
  hidden: boolean;
  restKept: boolean;
  activeSessionId: string | null;
  sessionStatus: "none" | "active" | "paused" | "completed" | "interrupted";
  selectedOption: OptionalStudyRecommendationOption | null;
}
