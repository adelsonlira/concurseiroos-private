import type { Question } from './types';

export function normalizeQuestionText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

export function questionFingerprint(question: Pick<Question, 'statement' | 'alternatives'>): string | undefined {
  if (!question.statement?.trim()) return undefined;
  const normalized = [question.statement, ...question.alternatives.map(item => item.text ?? '')]
    .map(normalizeQuestionText)
    .join('|');
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function deduplicateQuestions<T extends Pick<Question, 'id' | 'statement' | 'alternatives'>>(questions: T[]) {
  const seen = new Map<string, T>();
  const duplicates: Array<{ canonicalId: string; duplicateId: string; fingerprint: string }> = [];
  const unique: T[] = [];

  for (const question of questions) {
    const fingerprint = questionFingerprint(question);
    if (!fingerprint) {
      unique.push(question);
      continue;
    }
    const canonical = seen.get(fingerprint);
    if (canonical) {
      duplicates.push({ canonicalId: canonical.id, duplicateId: question.id, fingerprint });
      continue;
    }
    seen.set(fingerprint, question);
    unique.push(question);
  }
  return { unique, duplicates };
}
