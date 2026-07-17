import type { EquivalenceStrength } from "../classification/types";

export interface ReviewedHistoricalQuestionSignal {
  canonicalQuestionId: string;
  examId: string;
  examYear: number;
  targetNodeId: string;
  equivalenceStrength: Exclude<EquivalenceStrength, "NONE">;
  confidence: number;
  humanReviewed: boolean;
  definitiveAnswerLinked: boolean;
  duplicateRepresentative: boolean;
}

export interface HistoricalTopicShadowMetric {
  targetNodeId: string;
  matchedQuestions: number;
  eligibleExams: number;
  years: number[];
  sampleAdequacy: "INSUFFICIENT" | "LIMITED" | "DESCRIPTIVE";
  incidenceRate: number | null;
  eligibleForSDE: false;
  caveats: string[];
}

export interface ShadowDecisionComparison {
  topicId: string;
  currentRank: number;
  simulatedRank: number;
  delta: number;
  status: "STABLE" | "CHANGED";
  activationAllowed: false;
}
