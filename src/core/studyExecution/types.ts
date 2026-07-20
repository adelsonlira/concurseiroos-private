import type { ExternalQuestionSourcePlan } from "../questions/externalQuestionBanks";
import type { MaterialLocatorRecommendation, PrivateStudyMaterial } from "../materials/types";

export type StudyExecutionNotebookStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED_PENDING_REVIEW"
  | "READY_THEORY_ONLY"
  | "READY_WITH_FGV_EVIDENCE"
  | "BLOCKED";

export type StudyExecutionFgvEvidenceStatus =
  | "NOT_AVAILABLE"
  | "PENDING"
  | "APPROVED";

export type StudyExecutionFgvStyleTeaching =
  | "DISABLED"
  | "ENABLED_LIMITED";

export type StudyExecutionMaterialMatch =
  | "EXACT_SUBTOPIC"
  | "EXACT_TOPIC"
  | "DISCIPLINE_LEVEL"
  | "UNVERIFIED"
  | "INCOMPATIBLE";

export type StudyExecutionEnvironment =
  | "notebooklm"
  | "qconcursos"
  | "treino_fgv"
  | "internal_material"
  | "guided_session"
  | "simulation"
  | "manual_external";

export type StudyExecutionStatus = "READY" | "BLOCKED_NO_EXECUTABLE_PATH";

export type StudyExecutionBlockReason =
  | "NO_CONFIGURED_NOTEBOOK"
  | "NO_APPROVED_SOURCE"
  | "NO_MATCHING_MATERIAL"
  | "NO_RESULT_CAPTURE"
  | "ENVIRONMENT_UNAVAILABLE"
  | "MATERIAL_INCOMPATIBLE"
  | "MISSING_CONTENT_SCOPE"
  | "MISSING_COMPLETION_CRITERION"
  | "INVALID_DURATION";

export interface StudyExecutionSourceDefinition {
  sourceId: string;
  fileName: string;
  title: string;
  kind: "INSTITUTIONAL" | "THEORY" | "SECONDARY_PEDAGOGICAL" | "FGV_EVIDENCE";
  coverage: string;
  topicKeywords?: string[];
  fgvEvidence: boolean;
  defaultSelected: boolean;
}

export interface StudyExecutionNotebookConfiguration {
  conversationMode: string;
  responseLength: string;
  webSearchAllowed: boolean;
  dataAnalysisAllowed: boolean;
}

export interface StudyExecutionTopicCapability {
  topicId: string;
  topicName: string;
  notebookStatus: StudyExecutionNotebookStatus;
  notebookName: string | null;
  notebookUrl: string | null;
  fgvEvidenceStatus: StudyExecutionFgvEvidenceStatus;
  fgvStyleTeaching: StudyExecutionFgvStyleTeaching;
  approvedSources: StudyExecutionSourceDefinition[];
  sourcesToDisableByDefault: string[];
  notebookConfiguration: StudyExecutionNotebookConfiguration;
  environments: StudyExecutionEnvironment[];
  coverageStatus?: "FULL" | "PARTIAL";
  limitations?: string[];
}

export interface StudyExecutionDisciplineCapability {
  disciplineId: string;
  disciplineName: string;
  notebookStatus: StudyExecutionNotebookStatus;
  notebookName: string | null;
  notebookUrl: string | null;
  fgvEvidenceStatus: StudyExecutionFgvEvidenceStatus;
  fgvStyleTeaching: StudyExecutionFgvStyleTeaching;
  approvedSources: StudyExecutionSourceDefinition[];
  topicOverrides: StudyExecutionTopicCapability[];
}

export interface StudyExecutionRegistry {
  schemaVersion: string;
  registryId: string;
  competitionId: string;
  generatedAt: string;
  defaultNotebookStatus: StudyExecutionNotebookStatus;
  materialCatalog: {
    registryId: string;
    version: string;
    sourceModule: string;
    readyMatches: StudyExecutionMaterialMatch[];
    disciplineLevelRequiresValidation: boolean;
    unverifiedAllowedAsReady: boolean;
  };
  resultCaptureRoutes: Record<StudyExecutionResultCapture["kind"], string>;
  globalEnvironments: Array<{
    environment: StudyExecutionEnvironment;
    status: "AVAILABLE" | "AVAILABLE_WITH_USER_INPUT" | "UNAVAILABLE";
    notes: string;
  }>;
  disciplines: StudyExecutionDisciplineCapability[];
  materialSemanticRules: Array<{
    topicId: string;
    requiredAny: string[];
    incompatibleAny: string[];
  }>;
}

export interface StudyExecutionMaterialCandidate {
  materialId: string;
  materialTitle: string;
  sectionTitle?: string;
  startPage?: number;
  endPage?: number;
  sourceFileName?: string;
  matchScope?: "EXACT_SUBTOPIC" | "TOPIC_FALLBACK";
  contentKind?: string;
  questionBank?: string | null;
}

export interface StudyExecutionResultCapture {
  kind: "theory" | "questions" | "review" | "technical_practice" | "simulation" | "operational";
  fields: string[];
  routeHint: string;
}

export interface StudyExecutionPacket {
  executionId: string;
  disciplineId: string;
  topicId: string;
  subtopicId: string | null;
  method: string;
  environment: StudyExecutionEnvironment;
  durationMinutes: number;
  objective: string;
  contentScope: string;
  materialId: string | null;
  materialTitle: string | null;
  sectionsOrPages: string;
  materialMatch: StudyExecutionMaterialMatch;
  materialMatchLabel: string;
  environmentInstructions: string[];
  selectedSources: string[];
  sourcesToDisable: string[];
  prompt: string;
  completionCriterion: string;
  resultCapture: StudyExecutionResultCapture;
  returnInstructions: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  limitations: string[];
  notebook?: {
    name: string;
    url: string | null;
    status: StudyExecutionNotebookStatus;
    mode: string;
    responseLength: string;
    webSearchAllowed: boolean;
    dataAnalysisAllowed: boolean;
    fgvEvidenceStatus: StudyExecutionFgvEvidenceStatus;
    fgvStyleTeaching: StudyExecutionFgvStyleTeaching;
    fgvEvidenceBoundary: string;
  };
  questionFilters?: {
    source: string;
    examiningBoard: string | null;
    discipline: string;
    topic: string;
    subtopic: string | null;
    years: string | null;
    excludeAnnulled: boolean;
    excludeOutdated: boolean;
    consultationAllowed: boolean;
    targetQuestions: number | null;
  };
}

export interface StudyExecutionBlockedCandidate {
  disciplineId: string;
  topicId: string;
  subtopicId: string | null;
  requestedMethod: string;
  requestedEnvironment: StudyExecutionEnvironment | null;
  reasons: StudyExecutionBlockReason[];
  explanation: string;
}

export interface StudyExecutionGateResult {
  executionStatus: StudyExecutionStatus;
  packet: StudyExecutionPacket | null;
  requestedMethod: string;
  effectiveMethod: string | null;
  requestedEnvironment: StudyExecutionEnvironment | null;
  effectiveEnvironment: StudyExecutionEnvironment | null;
  methodChanged: boolean;
  methodChangeReason: string | null;
  blockedReasons: StudyExecutionBlockReason[];
  materialMatch: StudyExecutionMaterialMatch;
  blockedCandidate?: StudyExecutionBlockedCandidate;
}

export interface StudyExecutionGateInput {
  competitionId: string;
  context: "mandatory" | "rest_day_optional" | "extra_after_required_plan" | "manual_optional";
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  subtopicId?: string;
  subtopicName?: string;
  requestedMethod: string;
  requestedEnvironment?: StudyExecutionEnvironment | null;
  durationMinutes: number;
  objective: string;
  completionCriterion: string;
  material?: MaterialLocatorRecommendation | StudyExecutionMaterialCandidate | null;
  materialCatalog?: readonly PrivateStudyMaterial[];
  questionSourcePlan?: ExternalQuestionSourcePlan | null;
  targetQuestions?: number | null;
  examiningBoard?: string | null;
  sourceLabel?: string | null;
  sourceDecisionId?: string;
  allowMethodFallback?: boolean;
  forceFgvEvidenceUse?: boolean;
}
