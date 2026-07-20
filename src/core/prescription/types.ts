import type { CompetitionStudyGuidance, StudyFocusGuide } from "./studyFocusGuide";
import type { MaterialLocatorRecommendation, PrivateStudyMaterial } from "../materials/types";
import type {
  ExternalQuestionBankDefinition,
  ExternalQuestionSourcePlan
} from "../questions/externalQuestionBanks";
import type { PlannerResponse, StudyActivityType, StudySession } from "../sde/planner/plannerTypes";
import type { StrategicAction } from "../sde/prioritization/types";
import type { StudyExecutionBlockedCandidate, StudyExecutionGateResult, StudyExecutionPacket } from "../studyExecution/types";

export type QuestionPaceSource =
  | "CANDIDATE_SUBTOPIC_MEDIAN"
  | "CANDIDATE_TOPIC_MEDIAN"
  | "CANDIDATE_DISCIPLINE_MEDIAN"
  | "OFFICIAL_EXAM_GROSS_PACE";

export type PrescriptionConfidence = "LOW" | "MEDIUM" | "HIGH";


export type PrescriptionReliabilityMode =
  | "EVIDENCE_SUPPORTED"
  | "DIAGNOSTIC"
  | "FIRST_CONTACT";

export interface PrescriptionDecisionReliability {
  level: PrescriptionConfidence;
  mode: PrescriptionReliabilityMode;
  historicalIncidenceUsed: boolean;
  missingData: string[];
  caveats: string[];
}

export interface PrescriptionExecutionReadiness {
  status: "READY" | "READY_WITH_FALLBACK" | "BLOCKED_NO_EXECUTABLE_PATH";
  reason: string;
  requiredResource: "NONE" | "MATERIAL" | "QUESTION_SOURCE";
}

export interface PrescriptionNextAction {
  afterCompletion: string;
  preview: string | null;
}

export interface QuestionAttemptPaceSample {
  disciplineId: string;
  topicId: string;
  subtopicId?: string;
  seconds: number;
}

export interface QuestionPrescriptionPolicy {
  minimumObservedSamples: number;
  mediumConfidenceSamples: number;
  highConfidenceSamples: number;
  stretchQuestions: number;
  diagnosticMinimumQuestions: number;
}

export interface QuestionPracticePrescription {
  targetQuestions: number;
  stretchTargetQuestions: number;
  practiceMinutes: number;
  correctionMinutes: number;
  paceSecondsPerQuestion: number;
  paceSource: QuestionPaceSource;
  sampleSize: number;
  confidence: PrescriptionConfidence;
  rationale: string;
  externalSourcePlan: ExternalQuestionSourcePlan | null;
}

export interface DiagnosticFollowUpPlan {
  minimumQuestions: number;
  minimumHitRatePercent: number;
  onPass: string;
  onFail: string;
  theoryMaterial: MaterialLocatorRecommendation | null;
}

export interface ExecutableStudyPrescription {
  id: string;
  sessionId: string;
  sequence: number;
  activity: StudyActivityType;
  durationMinutes: number;
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  subtopicId?: string;
  subtopicName?: string;
  actionId: string;
  strategicPriority: number;
  sourceScore: number;
  reasonCode: StrategicAction["reasonCode"];
  diagnosticPurpose: boolean;
  diagnosticFollowUp: DiagnosticFollowUpPlan | null;
  whyNow: string;
  confidence: StrategicAction["justificativaXAI"]["nivelConfianca"];
  objectives: StudySession["objetivos"];
  executionSteps: StudySession["passosExecucao"];
  focusGuide: StudyFocusGuide | null;
  material: MaterialLocatorRecommendation | null;
  questionPractice: QuestionPracticePrescription | null;
  completionEvidence: string[];
  decisionReliability: PrescriptionDecisionReliability;
  executionReadiness: PrescriptionExecutionReadiness;
  executionGate: StudyExecutionGateResult;
  executionPacket: StudyExecutionPacket | null;
  nextAction: PrescriptionNextAction;
}

export interface DailyStudyPrescription {
  status: "READY" | "NO_EXECUTABLE_SESSION";
  referenceDate: string;
  current: ExecutableStudyPrescription | null;
  upcoming: ExecutableStudyPrescription[];
  blockedCandidates: StudyExecutionBlockedCandidate[];
  warnings: string[];
}

export interface DailyStudyPrescriptionInput {
  concursoId: string;
  referenceDate: string;
  planner: PlannerResponse | null;
  actions: StrategicAction[];
  materialCatalog: readonly PrivateStudyMaterial[];
  externalQuestionBanks: readonly ExternalQuestionBankDefinition[];
  banca: string;
  studyGuidance?: CompetitionStudyGuidance | null;
  siblingSubtopicNamesByTopic?: Record<string, string[]>;
  attempts: readonly QuestionAttemptPaceSample[];
  examPacing: {
    durationMinutes: number;
    totalQuestions: number;
  };
  questionPolicy: QuestionPrescriptionPolicy;
  maxUpcomingSessions?: number;
}
