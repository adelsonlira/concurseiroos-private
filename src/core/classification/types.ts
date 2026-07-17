export type ClassificationStatus =
  | "PROPOSED"
  | "HUMAN_APPROVED"
  | "HUMAN_CORRECTED"
  | "REJECTED"
  | "INSUFFICIENT_EVIDENCE";

export type EquivalenceStrength = "EXACT" | "PARTIAL" | "APPROXIMATE" | "NONE";

export interface QuestionClassificationProposal {
  id: string;
  questionId: string;
  sourceTaxonomyNodeId: string | null;
  targetTaxonomyNodeId: string | null;
  equivalenceStrength: EquivalenceStrength;
  confidence: number;
  evidenceSourceIds: string[];
  evidencePage: number | null;
  method: "RULE_BASED" | "AI_ASSISTED" | "HUMAN";
  status: ClassificationStatus;
  rationale: string;
  questionStyle?: "DIRECT_KNOWLEDGE" | "CONCEPT_COMPARISON" | "SCENARIO" | "ASSERTION_SET" | "CODE_SCENARIO";
}

export interface ClassificationEligibility {
  eligibleForDescriptiveShadowAnalytics: boolean;
  eligibleForHistoricalIncidence: boolean;
  reasons: string[];
}
