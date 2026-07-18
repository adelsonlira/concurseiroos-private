import { activeExternalEvidenceRecords } from "./ledger";
import type { ExternalEvidenceRecord } from "./types";

export function externalEvidenceMatchesContext(
  record: ExternalEvidenceRecord,
  context: { prescriptionId?: string; sessionId?: string },
): boolean {
  if (context.prescriptionId && record.prescriptionId === context.prescriptionId) return true;
  if (context.sessionId && record.sessionId === context.sessionId) return true;
  return false;
}

export function countExternalEvidenceQuestionsForContext(
  ledger: readonly ExternalEvidenceRecord[],
  context: { prescriptionId?: string; sessionId?: string },
): number {
  return activeExternalEvidenceRecords(ledger)
    .filter((record) => externalEvidenceMatchesContext(record, context))
    .reduce((total, record) => total + (record.actualQuestions ?? record.totalQuestions ?? 0), 0);
}
