import qualityJson from "../../../../data/knowledge/official-corpus-quality.json";

export interface AnswerKeyEvidenceSummary {
  answerKeyDocuments: number;
  answerKeySections: number;
  highConfidenceExamLinks: number;
  candidateExamLinks: number;
  ambiguousExamLinks: number;
  unresolvedExamLinks: number;
  definitiveQuestionLinks: number;
  humanReviewedExamLinks: number;
  shadowMode: true;
  eligibleForSDEHistoricalIncidence: false;
}

const counts = qualityJson.counts;

export const DATAPREV_2026_ANSWER_KEY_EVIDENCE: AnswerKeyEvidenceSummary = Object.freeze({
  answerKeyDocuments: counts.answerKeyDocuments,
  answerKeySections: counts.answerKeySectionsParsed,
  highConfidenceExamLinks: counts.highConfidenceExamAnswerKeyLinks,
  candidateExamLinks: counts.candidateExamAnswerKeyLinks,
  ambiguousExamLinks: counts.ambiguousExamAnswerKeyLinks,
  unresolvedExamLinks: counts.unresolvedExamAnswerKeyLinks,
  definitiveQuestionLinks: counts.questionsLinkedToDefinitiveAnswerKey,
  humanReviewedExamLinks: 0,
  shadowMode: true,
  eligibleForSDEHistoricalIncidence: false,
});

export const ANSWER_KEY_EVIDENCE_POLICY = Object.freeze({
  exactCadernoRequired: true,
  preliminaryMayBeSuperseded: true,
  automaticHighConfidenceStillRequiresReview: true,
  mayCorrectQuestionRecords: true,
  mayDriveStrategicIncidence: false,
});
