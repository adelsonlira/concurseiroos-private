import summaryJson from "../../../../data/evidence/dataprev-2026-perfil-3/fgv-gabaritos/fgv-gabarito-summary.json";

export interface AnswerKeyEvidenceSummary {
  records: number;
  exactMatches: number;
  definitive: number;
  preliminary: number;
  publishedUnqualified: number;
  officialUserSupplied: number;
  headerStatusMismatches: number;
  annulledQuestions: number;
  corpusCoverage: {
    corpusFilesProcessed: number;
    totalCorpusRecords: number;
    recordsWithAnswerKey: number;
  };
}

export const DATAPREV_2026_ANSWER_KEY_EVIDENCE =
  summaryJson as AnswerKeyEvidenceSummary;

export const ANSWER_KEY_EVIDENCE_POLICY = Object.freeze({
  exactCadernoRequired: true,
  preliminaryMayBeSuperseded: true,
  mayCorrectQuestionRecords: true,
  mayDriveStrategicIncidence: false
});
