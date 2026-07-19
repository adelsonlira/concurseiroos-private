export type SdeVersion = "1.0" | "2.0";

export type EvidenceGranularity = "individual" | "aggregate" | "session";

export interface NormalizedEvidence {
  evidenceId: string;
  disciplineId: string;
  topicId: string;
  subtopicId?: string;
  syllabusItemId?: string;
  sourceType: string;
  granularity: EvidenceGranularity;
  totalItems?: number;
  correctItems?: number;
  wrongItems?: number;
  blankItems?: number;
  occurredAt: string;
  ageInDays: number;
  consultedMaterial: boolean | null;
  authorityWeight: number;
  measurementWeight: number;
  recencyWeight: number;
  effectiveSampleSize: number;
  errorCauses: string[];
  theoryCompleted?: boolean;
  reviewPending?: boolean;
  durationMinutes?: number;
  decisionEligible: boolean;
  eligibilityReason: string;
}

export type KnowledgeStateV2 =
  | "UNSEEN"
  | "INSUFFICIENT_EVIDENCE"
  | "LEARNING"
  | "PRACTICING"
  | "STABLE"
  | "DECAYING"
  | "CRITICAL"
  | "INVALID";

export interface KnowledgeStateAssessment {
  nodeId: string;
  state: KnowledgeStateV2;
  weightedAccuracy: number | null;
  effectiveSampleSize: number;
  lastEvidenceAt: string | null;
  ageInDays: number | null;
  consultedEvidenceRatio: number;
  trend: "IMPROVING" | "STABLE" | "WORSENING" | "UNKNOWN";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  primaryErrorCause: string | null;
  theoryCoverage: "NONE" | "PARTIAL" | "CONFIRMED";
  reviewPending: boolean;
  evidenceIds: string[];
  reasons: string[];
}

export type KnowledgeRelation =
  | "required_prerequisite"
  | "recommended_prerequisite"
  | "transfer";

export interface KnowledgeNodeDefinition {
  nodeId: string;
  taxonomyNodeId: string;
  label: string;
}

export interface KnowledgeEdge {
  fromNodeId: string;
  toNodeId: string;
  relation: KnowledgeRelation;
  strength: number;
  rationale: string;
  version: string;
}

export interface VersionedKnowledgeGraph {
  version: string;
  nodes: KnowledgeNodeDefinition[];
  edges: KnowledgeEdge[];
}

export interface HierarchicalNodeWeight {
  disciplineId: string;
  topicId: string;
  subtopicId: string;
  officialDisciplineWeight: number;
  topicParticipation: number;
  subtopicParticipation: number;
  participationConfidence: number;
  effectiveNodeWeight: number;
  source: "OFFICIAL_DISCIPLINE_NEUTRAL_INTERNAL" | "CONFIGURED_INTERNAL_PARTICIPATION";
}

export interface HardRuleResult {
  condition: string;
  result: "PASSED" | "BLOCKED" | "FAVORED" | "NOT_APPLICABLE";
  justification: string;
  affectedAction: string;
}

export interface ScoreComponent {
  key: string;
  label: string;
  normalizedValue: number;
  coefficient: number;
  contribution: number;
  source: string;
  fallbackUsed: boolean;
  explanation: string;
}

export interface HistoricalIncidenceSignal {
  nodeId: string;
  observedCount: number;
  deduplicatedCount: number;
  directCount: number;
  partialCount: number;
  recencyAdjustedValue: number;
  roleProximityValue: number;
  classificationConfidence: number;
  finalShadowValue: number;
  decisionWeight: 0;
  label: "Inferência histórica em validação — shadow mode";
}

export type SdeV2Method =
  | "short_diagnostic"
  | "theory_notebooklm"
  | "concept_recovery"
  | "fgv_question_batch"
  | "active_review"
  | "timed_question_batch"
  | "structured_error_recovery"
  | "spaced_maintenance"
  | "prerequisite_recovery";

export interface MethodSelection {
  method: SdeV2Method;
  rule: string;
  objective: string;
  executionSequence: Array<{
    order: number;
    tool: string;
    minutes: number;
    instruction: string;
  }>;
  advanceCriterion: string;
  reducedPlan: Array<{
    order: number;
    tool: string;
    minutes: number;
    instruction: string;
  }>;
}

export interface SdeV2CandidateDecision {
  nodeId: string;
  disciplineId: string;
  topicId: string;
  subtopicId: string;
  disciplineName: string;
  topicName: string;
  subtopicName: string;
  score: number;
  hardRules: HardRuleResult[];
  scoreComponents: ScoreComponent[];
  knowledgeState: KnowledgeStateAssessment;
  prerequisiteState: {
    requiredBlocked: boolean;
    blockingNodeIds: string[];
    recommendedNodeIds: string[];
    transferValue: number;
    rationale: string[];
  };
  method: MethodSelection;
  historicalIncidenceShadow: HistoricalIncidenceSignal;
  availableMinutes: number;
  estimatedMinutes: number;
  materialAvailable: boolean;
  evidenceIds: string[];
}


export type SdeCalibrationField =
  | "discipline"
  | "topic"
  | "subtopic"
  | "method"
  | "duration"
  | "advance_criterion"
  | "prerequisite"
  | "score";

export interface SdeDecisionComparisonSnapshot {
  version: "1.0" | "2.0";
  status: string;
  disciplineId: string | null;
  topicId: string | null;
  subtopicId: string | null;
  method: string | null;
  durationMinutes: number | null;
  advanceCriterion: string | null;
  prerequisiteSummary: string | null;
  score: number | null;
  topFactors: string[];
}

export interface SdeCalibrationDivergence {
  field: SdeCalibrationField;
  v1Value: string | number | null;
  v2Value: string | number | null;
}

export interface SdeV1V2Comparison {
  sameNode: boolean;
  sameActivity: boolean;
  v1NodeId: string | null;
  v1Activity: string | null;
  divergenceReasons: string[];
  v1: SdeDecisionComparisonSnapshot;
  v2: SdeDecisionComparisonSnapshot | null;
  divergences: SdeCalibrationDivergence[];
  isEqual: boolean;
}

export interface SdeCalibrationRecord {
  calibrationId: string;
  schemaVersion: 1;
  createdAt: string;
  referenceDate: string;
  inputFingerprint: string;
  activeSdeVersion: "v1";
  executionMode: "shadow";
  affectsPrescription: false;
  v1Decision: SdeDecisionComparisonSnapshot;
  v2Decision: SdeDecisionComparisonSnapshot | null;
  divergences: SdeCalibrationDivergence[];
  isEqual: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string;
  evidenceIds: string[];
  historicalIncidenceShadow?: HistoricalIncidenceSignal;
  sessionOutcome?: {
    sessionId: string;
    completedAt: string;
    completed: boolean;
  } | null;
}

export interface DecisionRecord {
  decisionId: string;
  sdeVersion: "2.0";
  createdAt: string;
  referenceDate: string;
  selectedAction: string;
  selectedNodeId: string;
  selectedMethod: string;
  availableMinutes: number;
  hardRules: HardRuleResult[];
  scoreComponents: ScoreComponent[];
  evidenceIds: string[];
  prerequisiteState: SdeV2CandidateDecision["prerequisiteState"];
  historicalIncidenceShadow?: HistoricalIncidenceSignal;
  alternativesConsidered: Array<{
    nodeId: string;
    score: number;
    method: SdeV2Method;
    excludedBy?: string;
  }>;
  fallbackUsed: boolean;
  fallbackReason?: string;
  comparisonWithV1?: SdeV1V2Comparison;
}

export interface SdeV2DecisionOutput {
  status: "SUCCESS" | "INVALID_INPUT" | "NO_EXECUTABLE_ACTION";
  selected: SdeV2CandidateDecision | null;
  candidates: SdeV2CandidateDecision[];
  normalizedEvidence: NormalizedEvidence[];
  knowledgeStates: Record<string, KnowledgeStateAssessment>;
  nodeWeights: Record<string, HierarchicalNodeWeight>;
  decisionRecord: DecisionRecord | null;
  errors: string[];
  warnings: string[];
}

export interface SdeV2RuntimeConfig {
  version: "2.0";
  activeSdeVersion: "v1" | "v2";
  evidence: {
    recencyHalfLifeDays: number;
    minimumEffectiveSample: number;
    stableEffectiveSample: number;
    mediumConfidenceSample: number;
    highConfidenceSample: number;
    stableAccuracy: number;
    criticalAccuracy: number;
    decayDays: number;
    consultationFactors: Record<string, number>;
    sourceAuthority: Record<string, number>;
  };
  score: {
    components: Record<string, number>;
    componentCap: number;
  };
  methods: {
    defaultMinutes: Record<SdeV2Method, number>;
    minimumQuestionTarget: number;
    maintenanceQuestionTarget: number;
  };
  safeguards: {
    maxRecentSameNodeSelections: number;
    recentWindowDays: number;
    requiredPrerequisiteMinimumState: KnowledgeStateV2[];
  };
}
