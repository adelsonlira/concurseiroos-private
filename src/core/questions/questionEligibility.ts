export type QuestionClassificationStatus =
  | "UNCLASSIFIED"
  | "AUTO_CLASSIFIED_REVIEW_REQUIRED"
  | "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
  | "MANUALLY_REVIEWED"
  | "AUTO_EXCLUDED_OUT_OF_SCOPE"
  | "MANUALLY_EXCLUDED";

export type AnswerKeyStatus = "PRELIMINARY" | "DEFINITIVE" | "PUBLISHED_UNQUALIFIED";

export interface QuestionEvidenceRecord {
  questionHash: string;
  canonicalQuestionHash: string;
  classificationStatus: QuestionClassificationStatus;
  primaryTopicId: string | null;
  primarySubtopicId: string | null;
  answerKeyOption?: string | null;
  answerKeyStatus?: AnswerKeyStatus | null;
  answerKeyMatchStatus?: "EXACT_TITLE_AND_CADERNO_MATCH" | string | null;
  duplicateType?: string | null;
  fullStem?: string | null;
  fullOptions?: readonly string[] | null;
}

export interface QuestionEligibilityResult {
  analyticEligible: boolean;
  inAppPracticeEligible: boolean;
  provisionalAnswerKey: boolean;
  reasons: string[];
}

/**
 * The analytic gate is intentionally stricter than corpus extraction.
 * A question may support audited descriptive analysis only after manual
 * syllabus review and exact answer-key matching. In-app practice additionally
 * requires the complete question and all options, which excerpt-only corpora do not provide.
 */
export function evaluateQuestionEligibility(
  record: QuestionEvidenceRecord
): QuestionEligibilityResult {
  const reasons: string[] = [];

  if (record.classificationStatus !== "MANUALLY_REVIEWED") {
    reasons.push("CLASSIFICATION_NOT_MANUALLY_REVIEWED");
  }
  if (!record.primaryTopicId || !record.primarySubtopicId) {
    reasons.push("OFFICIAL_SYLLABUS_MAPPING_MISSING");
  }
  if (record.answerKeyMatchStatus !== "EXACT_TITLE_AND_CADERNO_MATCH") {
    reasons.push("ANSWER_KEY_NOT_EXACTLY_MATCHED");
  }
  if (!record.answerKeyOption) {
    reasons.push("ANSWER_KEY_OPTION_MISSING_OR_ANNULLED");
  }
  if (record.duplicateType) {
    reasons.push("NON_CANONICAL_DUPLICATE");
  }

  const analyticEligible = reasons.length === 0;
  const fullQuestionAvailable =
    Boolean(record.fullStem?.trim()) &&
    Array.isArray(record.fullOptions) &&
    record.fullOptions.length >= 2 &&
    record.fullOptions.every((option) => Boolean(option.trim()));

  if (!fullQuestionAvailable) {
    reasons.push("FULL_QUESTION_AND_OPTIONS_NOT_AVAILABLE");
  }

  return {
    analyticEligible,
    inAppPracticeEligible: analyticEligible && fullQuestionAvailable,
    provisionalAnswerKey: record.answerKeyStatus !== "DEFINITIVE",
    reasons
  };
}
