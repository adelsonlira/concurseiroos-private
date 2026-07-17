import qualityJson from "../../../../data/knowledge/official-corpus-quality.json";

export interface QuestionBankReadinessSummary {
  totalCorpusRecords: number;
  canonicalQuestionRecords: number;
  definitiveAnswerKeyRecords: number;
  manuallyReviewedAnalyticEligibleRecords: number;
  uniqueAnalyticEligibleRecords: number;
  inAppPracticeEligibleRecords: number;
  reviewQueueItems: number;
  reasonInAppPracticeIsZero: string;
  policy: {
    manualSyllabusReviewRequired: boolean;
    exactTitleAndCadernoKeyRequired: boolean;
    canonicalRecordRequired: boolean;
    completeQuestionAndOptionsRequiredForPractice: boolean;
    preliminaryKeysMustRemainMarkedProvisional: boolean;
    mayDriveStrategicIncidence: boolean;
  };
}

const counts = qualityJson.counts;

export const DATAPREV_2026_QUESTION_BANK_READINESS: QuestionBankReadinessSummary = Object.freeze({
  totalCorpusRecords: counts.questionsExtracted,
  canonicalQuestionRecords: counts.uniqueCanonicalQuestions,
  definitiveAnswerKeyRecords: counts.questionsLinkedToDefinitiveAnswerKey,
  manuallyReviewedAnalyticEligibleRecords: 0,
  uniqueAnalyticEligibleRecords: 0,
  inAppPracticeEligibleRecords: 0,
  reviewQueueItems: counts.reviewQueueItems,
  reasonInAppPracticeIsZero: "O corpus canônico armazena somente metadados minimizados; enunciado e alternativas integrais permanecem nos PDFs oficiais.",
  policy: {
    manualSyllabusReviewRequired: true,
    exactTitleAndCadernoKeyRequired: true,
    canonicalRecordRequired: true,
    completeQuestionAndOptionsRequiredForPractice: true,
    preliminaryKeysMustRemainMarkedProvisional: true,
    mayDriveStrategicIncidence: false,
  },
});
