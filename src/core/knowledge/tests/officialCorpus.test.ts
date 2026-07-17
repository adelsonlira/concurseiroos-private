import { describe, expect, it } from 'vitest';
import {
  assessOfficialCorpusReadiness,
  validateOfficialQuestionRecord,
  type OfficialExamManifestRecord,
  type OfficialQuestionRecord,
} from '../officialCorpus';

const exam = (overrides: Partial<OfficialExamManifestRecord> = {}): OfficialExamManifestRecord => ({
  id: 'exam:abc',
  contestId: 'contest',
  examDocumentId: 'doc-exam',
  year: 2024,
  organizedPath: 'contest/provas/exam.pdf',
  sourceSha256: 'a'.repeat(64),
  sourceVerified: true,
  shadowMode: true,
  incidenceEligible: false,
  examKind: 'OBJECTIVE',
  expectedQuestionCount: 1,
  extractedQuestionCount: 1,
  sequenceComplete: true,
  extractionStatus: 'EXTRACTED_REVIEW_PENDING',
  issues: [],
  answerKeyLink: { status: 'AUTO_LINKED_HIGH_CONFIDENCE', confidence: 0.95 },
  ...overrides,
});

const question = (overrides: Partial<OfficialQuestionRecord> = {}): OfficialQuestionRecord => ({
  id: 'question:doc-exam:1',
  contestId: 'contest',
  year: 2024,
  examDocumentId: 'doc-exam',
  bookletId: 'booklet:doc-exam',
  bookletLabel: 'Tipo 1',
  questionNumber: 1,
  page: 3,
  contentFingerprint: 'b'.repeat(64),
  normalizedLength: 100,
  excerpt: 'Trecho mínimo para auditoria.',
  alternativeLabels: ['A', 'B', 'C', 'D', 'E'],
  rawAlternativeMarkerCount: 5,
  alternativesComplete: true,
  extraction: { status: 'EXTRACTED_REVIEW_PENDING', confidence: 0.98, reviewStatus: 'PENDING' },
  classificationStatus: 'NOT_CLASSIFIED',
  answerKey: { status: 'UNRESOLVED' },
  deduplication: {
    canonicalQuestionId: 'question:doc-exam:1',
    groupId: null,
    type: 'UNIQUE',
    similarity: 1,
    reviewStatus: 'NOT_REQUIRED',
  },
  source: {
    kind: 'OFFICIAL',
    documentId: 'doc-exam',
    organizedPath: 'contest/provas/exam.pdf',
    sha256: 'a'.repeat(64),
    locator: 'page:3;question:1',
  },
  incidenceEligible: false,
  shadowMode: true,
  ...overrides,
});

describe('official FGV corpus safety contract', () => {
  it('rejects any record that escapes shadow mode', () => {
    const unsafe = { ...question(), incidenceEligible: true } as unknown as OfficialQuestionRecord;
    expect(validateOfficialQuestionRecord(unsafe)).toContain('Question escaped shadow-mode policy.');
  });

  it('enforces metadata minimization and hash integrity', () => {
    const invalid = {
      ...question(),
      contentFingerprint: 'not-a-hash',
      excerpt: 'x'.repeat(321),
      statement: 'full question',
    } as unknown as OfficialQuestionRecord;
    expect(validateOfficialQuestionRecord(invalid)).toEqual(expect.arrayContaining([
      'Invalid content fingerprint.',
      'Excerpt exceeds the data-minimization limit.',
      'Full copyrighted content must not be embedded in the canonical corpus.',
    ]));
  });

  it('keeps historical incidence disabled even after all operational reviews', () => {
    const reviewedQuestion = question({
      extraction: { status: 'EXTRACTED_REVIEW_PENDING', confidence: 1, reviewStatus: 'REVIEWED' },
      classificationStatus: 'REVIEWED',
      answerKey: {
        status: 'AUTO_LINKED_HIGH_CONFIDENCE', answer: 'A', answerKeyStatus: 'definitivo',
        confidence: 1, reviewStatus: 'REVIEWED',
      },
    });
    const readiness = assessOfficialCorpusReadiness([exam()], [reviewedQuestion]);
    expect(readiness.extractionReady).toBe(true);
    expect(readiness.answerAnalysisReady).toBe(true);
    expect(readiness.historicalIncidenceReady).toBe(false);
  });

  it('reports extraction, answer-key, duplicate and classification blockers independently', () => {
    const duplicated = question({
      deduplication: {
        canonicalQuestionId: 'question:doc-exam:1', groupId: 'exact:1', type: 'EXACT',
        similarity: 1, reviewStatus: 'PENDING',
      },
    });
    const readiness = assessOfficialCorpusReadiness([
      exam({ extractionStatus: 'PARTIAL_REVIEW_REQUIRED', sequenceComplete: false, answerKeyLink: { status: 'UNRESOLVED', confidence: 0 } }),
    ], [duplicated]);
    expect(readiness.extractionReady).toBe(false);
    expect(readiness.answerAnalysisReady).toBe(false);
    expect(readiness.blockers.join(' ')).toContain('duplicado');
    expect(readiness.blockers.join(' ')).toContain('classificação temática');
  });
});
