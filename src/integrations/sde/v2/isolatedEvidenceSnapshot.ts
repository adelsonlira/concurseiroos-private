import { FGV_TRAINING_CATALOG } from "../../../features/fgvTraining/catalog";
import { readFgvTrainingSnapshot, type FgvTrainingStorage } from "../../../features/fgvTraining/storage";
import type { FinalizedFgvTrainingAttempt, FgvTrainingPublicCatalog } from "../../../features/fgvTraining/types";
import { readPilotDiagnosticSnapshot, type DiagnosticStorage } from "../../../features/pilotDiagnostic/storage";
import type { FinalizedPilotDiagnosticAttempt } from "../../../features/pilotDiagnostic/types";

export interface IsolatedEvidenceSnapshot {
  fgvTrainingAttempts: FinalizedFgvTrainingAttempt[];
  fgvTrainingCatalog: FgvTrainingPublicCatalog;
  pilotDiagnosticAttempts: FinalizedPilotDiagnosticAttempt[];
}

export function readIsolatedEvidenceSnapshot(
  storage?: (FgvTrainingStorage & DiagnosticStorage) | null,
): IsolatedEvidenceSnapshot {
  const target = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!target) {
    return {
      fgvTrainingAttempts: [],
      fgvTrainingCatalog: FGV_TRAINING_CATALOG,
      pilotDiagnosticAttempts: [],
    };
  }
  return {
    fgvTrainingAttempts: readFgvTrainingSnapshot(target).finalizedAttempts,
    fgvTrainingCatalog: FGV_TRAINING_CATALOG,
    pilotDiagnosticAttempts: readPilotDiagnosticSnapshot(target).finalizedAttempts,
  };
}
