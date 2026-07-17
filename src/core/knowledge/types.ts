export type SourceKind = 'OFFICIAL' | 'PEDAGOGICAL' | 'EXTERNAL_PLATFORM' | 'AI_ASSISTED';
export type EvidenceStatus = 'CONFIRMED' | 'INFERRED' | 'INSUFFICIENT';
export type ReviewStatus = 'PENDING' | 'REVIEWED' | 'REJECTED';
export type AnswerKeyStatus = 'PRELIMINARY' | 'FINAL' | 'UNKNOWN';

export interface Confidence {
  score: number;
  status: EvidenceStatus;
  rationale: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SourceRef {
  id: string;
  kind: SourceKind;
  label: string;
  locator?: string;
  sha256?: string;
}

export interface Contest {
  id: string;
  institution: string;
  year: number;
  board: 'FGV';
  target: boolean;
}

export interface Notice {
  id: string;
  contestId: string;
  source: SourceRef;
  confidence: Confidence;
}

export interface Exam {
  id: string;
  contestId: string;
  source: SourceRef;
  bookletIds: string[];
  confidence: Confidence;
}

export interface Booklet {
  id: string;
  examId: string;
  label: string;
  questionIds: string[];
}

export interface Alternative {
  id: string;
  label: string;
  text?: string;
}

export interface SubjectRef {
  subject: string;
  subsubject?: string;
  taxonomyId?: string;
}

export interface Classification {
  subject: SubjectRef;
  confidence: Confidence;
  source: SourceRef;
  reviewStatus: ReviewStatus;
}

export interface Question {
  id: string;
  bookletId: string;
  number: number;
  statement?: string;
  alternatives: Alternative[];
  classifications: Classification[];
  source: SourceRef;
  contentFingerprint?: string;
}

export interface AnswerKeyChange {
  questionNumber: number;
  from?: string;
  to?: string;
  reason?: string;
  source: SourceRef;
}

export interface AnnulledQuestion {
  questionNumber: number;
  reason?: string;
  source: SourceRef;
}

export interface AnswerKey {
  id: string;
  contestId: string;
  examId?: string;
  status: AnswerKeyStatus;
  answers: Record<number, string>;
  changes: AnswerKeyChange[];
  annulled: AnnulledQuestion[];
  source: SourceRef;
  confidence: Confidence;
}

export interface AuditLink {
  id: string;
  contestId: string;
  examDocumentId: string;
  noticeDocumentIds: string[];
  answerKeyDocumentIds: string[];
  confidence: Confidence;
  incidenceEligible: boolean;
  shadowMode: true;
}
