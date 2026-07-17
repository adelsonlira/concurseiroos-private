import { createConfidence } from './confidence';
import type { AuditLink } from './types';

export interface CatalogDocument {
  document_id: string;
  contest_id: string;
  institution: string;
  year: number;
  document_type: 'edital' | 'prova' | 'gabarito';
  gabarito_status: 'preliminar' | 'definitivo' | null;
  package_status: string;
  match_confidence: 'alta' | 'media' | 'baixa';
  organized_path: string;
  pages: number;
  size_bytes: number;
  sha256: string;
  usable_for_incidence_analysis: boolean;
}

export function buildAuditLinks(documents: CatalogDocument[]): AuditLink[] {
  const byContest = new Map<string, CatalogDocument[]>();
  for (const document of documents) {
    const group = byContest.get(document.contest_id) ?? [];
    group.push(document);
    byContest.set(document.contest_id, group);
  }

  const links: AuditLink[] = [];
  for (const [contestId, group] of byContest) {
    const notices = group.filter(item => item.document_type === 'edital');
    const exams = group.filter(item => item.document_type === 'prova');
    const keys = group.filter(item => item.document_type === 'gabarito');
    const hasFinalKey = keys.some(item => item.gabarito_status === 'definitivo');
    for (const exam of exams) {
      const score = notices.length > 0 && hasFinalKey ? 0.95 : notices.length > 0 || keys.length > 0 ? 0.65 : 0.25;
      links.push({
        id: `${contestId}:${exam.document_id}`,
        contestId,
        examDocumentId: exam.document_id,
        noticeDocumentIds: notices.map(item => item.document_id),
        answerKeyDocumentIds: keys.map(item => item.document_id),
        confidence: createConfidence(score, notices.length > 0 && hasFinalKey
          ? 'Contest package contains notice and final answer key; question-level linkage remains pending.'
          : 'Document linkage inferred from organized contest package; missing one or more official components.'),
        incidenceEligible: Boolean(exam.usable_for_incidence_analysis && notices.length > 0 && hasFinalKey),
        shadowMode: true,
      });
    }
  }
  return links;
}

export function validateCatalog(documents: CatalogDocument[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const hashes = new Map<string, string>();
  for (const document of documents) {
    if (ids.has(document.document_id)) errors.push(`Duplicate document_id: ${document.document_id}`);
    ids.add(document.document_id);
    if (!/^[a-f0-9]{64}$/.test(document.sha256)) errors.push(`Invalid sha256: ${document.document_id}`);
    if (document.size_bytes <= 0) errors.push(`Invalid size: ${document.document_id}`);
    const previous = hashes.get(document.sha256);
    if (previous) errors.push(`Canonical catalog contains duplicate hash: ${previous}/${document.document_id}`);
    hashes.set(document.sha256, document.document_id);
  }
  return { valid: errors.length === 0, errors };
}
