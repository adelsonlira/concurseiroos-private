import catalogJson from "./data/diagnosticPublicCatalog.json";
import type { PilotDiagnosticPublicCatalog } from "./types";

export const PILOT_DIAGNOSTIC_CATALOG = catalogJson as PilotDiagnosticPublicCatalog;

export function getPilotDiagnosticQuestion(position: number) {
  return PILOT_DIAGNOSTIC_CATALOG.questions.find((question) => question.position === position);
}
