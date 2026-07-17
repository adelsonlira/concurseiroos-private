export type OfficialExamKind = 'OBJECTIVE' | 'MIXED' | 'DISCURSIVE_ONLY' | 'UNKNOWN';
export type OfficialExtractionStatus =
  | 'EXTRACTED_REVIEW_PENDING'
  | 'PARTIAL_REVIEW_REQUIRED'
  | 'EXCLUDED_DISCURSIVE_ONLY'
  | 'FAILED_REVIEW_REQUIRED'
  | 'SOURCE_MISSING'
  | 'HASH_MISMATCH';
export type AnswerKeyLinkStatus =
  | 'AUTO_LINKED_HIGH_CONFIDENCE'
  | 'CANDIDATE_REVIEW_REQUIRED'
  | 'AMBIGUOUS_REVIEW_REQUIRED'
  | 'UNRESOLVED'
  | 'NOT_APPLICABLE';
export type QuestionDuplicateType = 'UNIQUE' | 'EXACT' | 'NEAR';

export interface OfficialExamManifestRecord {
  id: string;
  contestId: string;
  examDocumentId: string;
  year: number | null;
  organizedPath: string;
  sourceSha256: string;
  sourceVerified: boolean;
  shadowMode: true;
  incidenceEligible: false;
  examKind: OfficialExamKind;
  bookletLabel?: string;
  expectedQuestionCount?: number | null;
  extractedQuestionCount?: number;
  sequenceComplete?: boolean;
  extractionStatus: OfficialExtractionStatus;
  issues: string[];
  answerKeyLink?: {
    status: AnswerKeyLinkStatus;
    confidence: number;
    sectionId?: string;
    answerKeyDocumentId?: string;
    answerKeyStatus?: 'definitivo' | 'preliminar' | 'unknown';
    rationale?: string;
  };
}

export interface OfficialQuestionRecord {
  id: string;
  contestId: string;
  year: number | null;
  examDocumentId: string;
  bookletId: string;
  bookletLabel: string;
  questionNumber: number;
  page: number;
  contentFingerprint: string;
  normalizedLength: number;
  excerpt: string;
  alternativeLabels: string[];
  rawAlternativeMarkerCount: number;
  alternativesComplete: boolean;
  extraction: {
    status: 'EXTRACTED_REVIEW_PENDING';
    confidence: number;
    reviewStatus: 'PENDING' | 'REVIEWED' | 'REJECTED';
  };
  classificationStatus: 'NOT_CLASSIFIED' | 'AUTO_CLASSIFIED' | 'REVIEWED';
  answerKey: {
    status: 'UNRESOLVED' | 'AUTO_LINKED_HIGH_CONFIDENCE';
    answer?: 'A' | 'B' | 'C' | 'D' | 'E' | '*';
    annulled?: boolean;
    answerKeyStatus?: 'definitivo' | 'preliminar' | 'unknown';
    answerKeyDocumentId?: string;
    sectionId?: string;
    confidence?: number;
    reviewStatus?: 'PENDING' | 'REVIEWED' | 'REJECTED';
  };
  deduplication: {
    canonicalQuestionId: string;
    groupId: string | null;
    type: QuestionDuplicateType;
    similarity: number;
    reviewStatus: 'NOT_REQUIRED' | 'PENDING' | 'REVIEWED' | 'REJECTED';
  };
  source: {
    kind: 'OFFICIAL';
    documentId: string;
    organizedPath: string;
    sha256: string;
    locator: string;
  };
  incidenceEligible: false;
  shadowMode: true;
}

export interface OfficialCorpusReadiness {
  extractionReady: boolean;
  answerAnalysisReady: boolean;
  historicalIncidenceReady: false;
  blockers: string[];
}

export function assessOfficialCorpusReadiness(
  exams: OfficialExamManifestRecord[],
  questions: OfficialQuestionRecord[],
): OfficialCorpusReadiness {
  const objectiveExams = exams.filter(exam => exam.examKind === 'OBJECTIVE' || exam.examKind === 'MIXED');
  const extractionProblems = objectiveExams.filter(
    exam => exam.extractionStatus !== 'EXTRACTED_REVIEW_PENDING' || !exam.sequenceComplete,
  );
  const pendingQuestionReviews = questions.filter(question => question.extraction.reviewStatus !== 'REVIEWED');
  const unresolvedAnswerKeys = objectiveExams.filter(
    exam => exam.answerKeyLink?.status !== 'AUTO_LINKED_HIGH_CONFIDENCE',
  );
  const pendingDuplicateReviews = questions.filter(
    question => question.deduplication.type !== 'UNIQUE' && question.deduplication.reviewStatus !== 'REVIEWED',
  );
  const unclassifiedQuestions = questions.filter(question => question.classificationStatus !== 'REVIEWED');

  const blockers: string[] = [];
  if (extractionProblems.length > 0) blockers.push(`${extractionProblems.length} prova(s) objetiva(s) exigem revisão de extração.`);
  if (pendingQuestionReviews.length > 0) blockers.push(`${pendingQuestionReviews.length} questão(ões) aguardam revisão da extração.`);
  if (unresolvedAnswerKeys.length > 0) blockers.push(`${unresolvedAnswerKeys.length} prova(s) objetiva(s) não possuem vínculo de gabarito inequívoco.`);
  if (pendingDuplicateReviews.length > 0) blockers.push(`${pendingDuplicateReviews.length} registro(s) duplicado(s) aguardam confirmação humana.`);
  if (unclassifiedQuestions.length > 0) blockers.push(`${unclassifiedQuestions.length} questão(ões) ainda não possuem classificação temática revisada.`);
  blockers.push('A incidência histórica permanece desligada do SDE por política de shadow mode.');

  return {
    extractionReady: extractionProblems.length === 0 && pendingQuestionReviews.length === 0,
    answerAnalysisReady:
      extractionProblems.length === 0
      && pendingQuestionReviews.length === 0
      && unresolvedAnswerKeys.length === 0,
    historicalIncidenceReady: false,
    blockers,
  };
}

export function validateOfficialQuestionRecord(question: OfficialQuestionRecord): string[] {
  const errors: string[] = [];
  if (!question.id.startsWith(`question:${question.examDocumentId}:`)) errors.push('Question id does not match exam document id.');
  if (!Number.isInteger(question.questionNumber) || question.questionNumber < 1) errors.push('Invalid question number.');
  if (!Number.isInteger(question.page) || question.page < 1) errors.push('Invalid source page.');
  if (!/^[a-f0-9]{64}$/.test(question.contentFingerprint)) errors.push('Invalid content fingerprint.');
  if (!/^[a-f0-9]{64}$/.test(question.source.sha256)) errors.push('Invalid source hash.');
  if (Array.from(question.excerpt).length > 280) errors.push('Excerpt exceeds the data-minimization limit.');
  if (question.shadowMode !== true || question.incidenceEligible !== false) errors.push('Question escaped shadow-mode policy.');
  if ('statement' in question || 'alternatives' in question) errors.push('Full copyrighted content must not be embedded in the canonical corpus.');
  if (question.answerKey.status === 'AUTO_LINKED_HIGH_CONFIDENCE' && !question.answerKey.answer) {
    errors.push('Linked answer key is missing the answer.');
  }
  return errors;
}
