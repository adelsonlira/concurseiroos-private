/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Evidence is deliberately separate from the learner evidence used by the SDE.
 * This module models evidence about the exam/banca, not evidence about the user.
 */
export type StrategicEvidenceSourceKind =
  | "OFFICIAL_NOTICE"
  | "OFFICIAL_QUESTION_CORPUS"
  | "SECONDARY_ANALYSIS"
  | "AI_SYNTHESIS"
  | "EXPERT_VIDEO";

export type StrategicEvidenceValidationStatus =
  | "AUTHORITATIVE"
  | "RAW_UNCURATED"
  | "PENDING_REPRODUCTION"
  | "PENDING_TRANSCRIPT"
  | "VALIDATED";

export type StrategicEvidenceUse =
  | "OFFICIAL_FACTS"
  | "QUESTION_STYLE"
  | "TOPIC_CANDIDATE_DISCOVERY"
  | "SDE_HISTORICAL_INCIDENCE"
  | "COACH_QUALITATIVE_CONTEXT";

export interface StrategicEvidenceSource {
  id: string;
  title: string;
  kind: StrategicEvidenceSourceKind;
  validationStatus: StrategicEvidenceValidationStatus;
  yearFrom?: number;
  yearTo?: number;
  uri?: string;
  documentName?: string;
  sha256?: string;
  questionCount?: number;
  uniqueQuestionCount?: number;
  allowedUses: StrategicEvidenceUse[];
  forbiddenUses: StrategicEvidenceUse[];
  notes: string[];
}

export type IncidenceEvidenceStatus =
  | "UNVERIFIED_EXTERNAL_ESTIMATE"
  | "AUTO_CLASSIFIED_UNREVIEWED"
  | "MANUALLY_REVIEWED"
  | "VALIDATED";

export interface TopicIncidenceEvidence {
  id: string;
  topicId: string;
  sourceIds: string[];
  status: IncidenceEvidenceStatus;
  matchedQuestionCount: number | null;
  eligibleCorpusQuestionCount: number | null;
  incidenceRate: number | null;
  manuallyReviewedQuestionCount: number;
  deduplicated: boolean;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  notes: string[];
}

export interface ExternalStrategicEstimate {
  id: string;
  label: string;
  sourceId: string;
  estimatedQuestionCount: number | null;
  estimatedFrequency: number | null;
  trend: "CRESCENTE" | "ESTAVEL" | "DECRESCENTE" | "NAO_INFORMADA";
  status: "UNVERIFIED_EXTERNAL_ESTIMATE";
  notes: string[];
}

export interface EvidenceActivationPolicy {
  minimumManuallyReviewedQuestionsPerTopic: number;
  requireDeduplication: boolean;
  requireReproducibleInclusionCriteria: boolean;
  requireReproducibleExclusionCriteria: boolean;
}

export interface StrategicEvidencePackage {
  version: string;
  sources: StrategicEvidenceSource[];
  incidenceEvidence: TopicIncidenceEvidence[];
  externalEstimates: ExternalStrategicEstimate[];
  activationPolicy: EvidenceActivationPolicy;
}

export interface ValidatedIncidenceResolution {
  value: number;
  source: "EMPIRICAL" | "UNAVAILABLE";
  evidenceId: string | null;
  note: string;
}
