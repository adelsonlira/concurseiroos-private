import readinessJson from "../../../../data/evidence/dataprev-2026-perfil-3/fgv-gabaritos/question-bank-readiness.json";

export interface QuestionBankReadinessSummary {
  totalCorpusRecords: number;
  exactAnswerKeyRecords: number;
  manuallyReviewedAnalyticEligibleRecords: number;
  uniqueAnalyticEligibleRecords: number;
  inAppPracticeEligibleRecords: number;
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

export const DATAPREV_2026_QUESTION_BANK_READINESS =
  readinessJson as QuestionBankReadinessSummary;
