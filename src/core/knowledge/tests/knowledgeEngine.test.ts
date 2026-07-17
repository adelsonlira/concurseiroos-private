import { describe, expect, it } from 'vitest';
import { buildAuditLinks, createConfidence, deduplicateQuestions, validateCatalog } from '..';

const base = {
  institution: 'Órgão', year: 2024, package_status: 'completo', match_confidence: 'alta' as const,
  pages: 1, size_bytes: 100, usable_for_incidence_analysis: true,
};

describe('Knowledge Engine foundation', () => {
  it('classifies confidence without overstating weak evidence', () => {
    expect(createConfidence(0.95, 'official').status).toBe('CONFIRMED');
    expect(createConfidence(0.65, 'package inference').status).toBe('INFERRED');
    expect(createConfidence(0.2, 'missing evidence').status).toBe('INSUFFICIENT');
  });

  it('links exam, notice and final answer key in shadow mode', () => {
    const docs = [
      { ...base, document_id: 'p', contest_id: 'c', document_type: 'prova' as const, gabarito_status: null, organized_path: 'c/provas/p.pdf', sha256: 'a'.repeat(64) },
      { ...base, document_id: 'e', contest_id: 'c', document_type: 'edital' as const, gabarito_status: null, organized_path: 'c/editais/e.pdf', sha256: 'b'.repeat(64) },
      { ...base, document_id: 'g', contest_id: 'c', document_type: 'gabarito' as const, gabarito_status: 'definitivo' as const, organized_path: 'c/gabaritos/g.pdf', sha256: 'c'.repeat(64) },
    ];
    const [link] = buildAuditLinks(docs);
    expect(link.shadowMode).toBe(true);
    expect(link.incidenceEligible).toBe(true);
    expect(link.confidence.status).toBe('CONFIRMED');
  });

  it('deduplicates normalized question content while preserving questions without text', () => {
    const result = deduplicateQuestions([
      { id: 'q1', statement: 'Qual é a opção correta?', alternatives: [{ id: 'a', label: 'A', text: 'Teste' }] },
      { id: 'q2', statement: 'QUAL E A OPCAO CORRETA!', alternatives: [{ id: 'a', label: 'A', text: 'Teste' }] },
      { id: 'q3', alternatives: [] },
    ]);
    expect(result.unique.map(item => item.id)).toEqual(['q1', 'q3']);
    expect(result.duplicates[0].duplicateId).toBe('q2');
  });

  it('rejects duplicate canonical hashes', () => {
    const docs = [
      { ...base, document_id: '1', contest_id: 'c', document_type: 'prova' as const, gabarito_status: null, organized_path: 'a', sha256: 'd'.repeat(64) },
      { ...base, document_id: '2', contest_id: 'c', document_type: 'prova' as const, gabarito_status: null, organized_path: 'b', sha256: 'd'.repeat(64) },
    ];
    expect(validateCatalog(docs).valid).toBe(false);
  });
});
