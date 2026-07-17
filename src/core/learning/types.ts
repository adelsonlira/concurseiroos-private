export type LearningAnswerState = "CORRECT" | "PARTIAL" | "INCORRECT" | "DONT_KNOW";

export interface GuidedQuestionResponse {
  questionIndex: number;
  state: LearningAnswerState;
  /** User-authored retrieval. It is evidence of the attempt, not an automatically verified answer key. */
  answerText?: string;
}

export interface GuidedQuestionDraft {
  state: LearningAnswerState | null;
  answerText: string;
}

export interface GuidedLearningEvidenceInput {
  prescriptionId: string;
  sessionId?: string;
  recordedAt: string;
  preStudyResponses: GuidedQuestionResponse[];
  postStudyResponses: GuidedQuestionResponse[];
  usedMaterialDuringFinalRecall: boolean;
  remainingDoubts: string[];
  selfReportedFatigue: "LOW" | "MEDIUM" | "HIGH";
}

export interface GuidedLearningEvidence {
  id: string;
  prescriptionId: string;
  sessionId: string;
  recordedAt: string;
  preStudyResponses: GuidedQuestionResponse[];
  postStudyResponses: GuidedQuestionResponse[];
  usedMaterialDuringFinalRecall: boolean;
  remainingDoubts: string[];
  selfReportedFatigue: "LOW" | "MEDIUM" | "HIGH";
}

export interface LearningCycleAssessment {
  status: "MASTERED_FOR_NOW" | "RETRY_REQUIRED" | "RELEARN_REQUIRED" | "INSUFFICIENT_EVIDENCE";
  preStudyScore: number | null;
  postStudyScore: number | null;
  improvement: number | null;
  nextAction: "CONTINUE_PLAN" | "IMMEDIATE_RETRY" | "TARGETED_RELEARNING" | "RECORD_EVIDENCE";
  reviewDelayDays: number | null;
  reasons: string[];
}
