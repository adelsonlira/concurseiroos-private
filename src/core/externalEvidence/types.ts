export type ExternalEvidenceType =
  | "aggregate_question_batch"
  | "individual_question"
  | "guided_retrieval"
  | "external_simulation";

export type ExternalEvidenceSource =
  | "qconcursos"
  | "treino_fgv"
  | "notebooklm"
  | "simulado_externo"
  | "outra";

export type ExternalEvidenceConsultation =
  | "no"
  | "occasionally"
  | "yes"
  | "not_applicable";

export type ExternalEvidenceConfidence =
  | "low"
  | "medium"
  | "high"
  | "not_informed";

export type ExternalEvidenceErrorCause =
  | "conceptual_gap"
  | "missing_prerequisite"
  | "interpretation"
  | "application"
  | "memory"
  | "distraction"
  | "time_management"
  | "guessing"
  | "not_identified";

export type ExternalEvidenceGranularity = "aggregate" | "individual";
export type ExternalEvidenceDecisionStatus = "shadow" | "eligible_for_future_sde";
export type ExternalEvidenceLedgerAction = "record" | "correction" | "void";
export type ExternalEvidenceStatus = "active" | "superseded" | "voided";

export interface ExternalEvidenceQuality {
  authority: "low" | "medium" | "high";
  measurementStrength: "low" | "medium" | "high";
  effectiveSampleSize: number;
}

export interface ExternalEvidenceRecord {
  evidenceId: string;
  schemaVersion: number;
  createdAt: string;
  recordedAt: string;

  evidenceType: ExternalEvidenceType;
  source: ExternalEvidenceSource;
  sourceLabel?: string;
  sourceReference?: string;

  prescriptionId?: string;
  sessionId?: string;

  disciplineId: string;
  topicId: string;
  subtopicId?: string;
  syllabusItemId?: string;

  examiningBoard?: string;

  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  blankAnswers?: number;
  durationMinutes?: number;
  plannedQuestions?: number;
  actualQuestions?: number;

  consultedMaterial: ExternalEvidenceConsultation;
  perceivedConfidence: ExternalEvidenceConfidence;
  primaryErrorCause?: ExternalEvidenceErrorCause;
  secondaryErrorCauses?: ExternalEvidenceErrorCause[];
  difficultPoints?: string;
  notes?: string;

  granularity: ExternalEvidenceGranularity;
  decisionStatus: ExternalEvidenceDecisionStatus;
  affectsSde: false;
  evidenceQuality: ExternalEvidenceQuality;
  ledgerAction: ExternalEvidenceLedgerAction;

  supersedesEvidenceId?: string;
  voidsEvidenceId?: string;
  voidReason?: string;
}

export interface ExternalEvidenceInput {
  evidenceType: ExternalEvidenceType;
  source: ExternalEvidenceSource;
  sourceLabel?: string;
  sourceReference?: string;
  prescriptionId?: string;
  sessionId?: string;
  disciplineId: string;
  topicId: string;
  subtopicId?: string;
  syllabusItemId?: string;
  examiningBoard?: string;
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  blankAnswers?: number;
  durationMinutes?: number;
  plannedQuestions?: number;
  actualQuestions?: number;
  consultedMaterial: ExternalEvidenceConsultation;
  perceivedConfidence: ExternalEvidenceConfidence;
  primaryErrorCause?: ExternalEvidenceErrorCause;
  secondaryErrorCauses?: ExternalEvidenceErrorCause[];
  difficultPoints?: string;
  notes?: string;
  granularity: ExternalEvidenceGranularity;
  recordedAt?: string;
  supersedesEvidenceId?: string;
}

export interface ExternalEvidenceTaxonomy {
  disciplineIds: ReadonlySet<string>;
  topicToDiscipline: ReadonlyMap<string, string>;
  subtopicToTopic: ReadonlyMap<string, string>;
}

export interface ExternalEvidenceValidationResult {
  valid: boolean;
  fieldErrors: Record<string, string>;
}

export interface ExternalEvidenceRecordView {
  record: ExternalEvidenceRecord;
  status: ExternalEvidenceStatus;
  supersededByEvidenceId?: string;
  voidedByEvidenceId?: string;
}

export interface ExternalEvidenceSummaryRow {
  disciplineId: string;
  topicId: string;
  batches: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  rawPercentage: number;
  durationMinutes: number;
  lastEvidenceAt: string;
  withConsultation: number;
  withoutConsultation: number;
}
