import type { Confidence, EvidenceStatus } from './types';

export function createConfidence(score: number, rationale: string): Confidence {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new Error('Confidence score must be between 0 and 1.');
  }
  const status: EvidenceStatus = score >= 0.9 ? 'CONFIRMED' : score >= 0.5 ? 'INFERRED' : 'INSUFFICIENT';
  return { score, status, rationale };
}

export function minimumConfidence(items: Confidence[]): Confidence {
  if (items.length === 0) return createConfidence(0, 'No evidence available.');
  return items.reduce((lowest, current) => current.score < lowest.score ? current : lowest);
}
