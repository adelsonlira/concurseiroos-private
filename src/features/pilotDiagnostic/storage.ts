import {
  validateActivePilotDiagnosticAttempt,
  validateFinalizedPilotDiagnosticAttempt,
} from "./engine";
import type {
  ActivePilotDiagnosticAttempt,
  FinalizedPilotDiagnosticAttempt,
  PilotDiagnosticPersistenceSnapshot,
} from "./types";

export interface DiagnosticStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PILOT_DIAGNOSTIC_ACTIVE_STORAGE_KEY =
  "concurseiroos.diagnostics.diag-fgv-dataprev-bd-v1.active.v1";
export const PILOT_DIAGNOSTIC_FINALIZED_STORAGE_KEY =
  "concurseiroos.diagnostics.diag-fgv-dataprev-bd-v1.finalized.v1";

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function readPilotDiagnosticSnapshot(storage: DiagnosticStorage): PilotDiagnosticPersistenceSnapshot {
  const activeRaw = parseJson(storage.getItem(PILOT_DIAGNOSTIC_ACTIVE_STORAGE_KEY));
  const finalizedRaw = parseJson(storage.getItem(PILOT_DIAGNOSTIC_FINALIZED_STORAGE_KEY));
  const activeAttempt = validateActivePilotDiagnosticAttempt(activeRaw) ? activeRaw : null;
  const finalizedAttempts = Array.isArray(finalizedRaw)
    ? finalizedRaw.filter(validateFinalizedPilotDiagnosticAttempt)
    : [];
  return { activeAttempt, finalizedAttempts };
}

export function startActivePilotDiagnosticAttempt(
  storage: DiagnosticStorage,
  attempt: ActivePilotDiagnosticAttempt,
): void {
  const current = readPilotDiagnosticSnapshot(storage).activeAttempt;
  if (current) throw new Error("Já existe uma tentativa ativa.");
  saveActivePilotDiagnosticAttempt(storage, attempt);
}

export function saveActivePilotDiagnosticAttempt(
  storage: DiagnosticStorage,
  attempt: ActivePilotDiagnosticAttempt,
): void {
  if (!validateActivePilotDiagnosticAttempt(attempt)) throw new Error("Tentativa ativa inválida.");
  storage.setItem(PILOT_DIAGNOSTIC_ACTIVE_STORAGE_KEY, JSON.stringify(attempt));
}

export function cancelActivePilotDiagnosticAttempt(storage: DiagnosticStorage): void {
  storage.removeItem(PILOT_DIAGNOSTIC_ACTIVE_STORAGE_KEY);
}

export function appendFinalizedPilotDiagnosticAttempt(
  storage: DiagnosticStorage,
  attempt: FinalizedPilotDiagnosticAttempt,
): FinalizedPilotDiagnosticAttempt[] {
  if (!validateFinalizedPilotDiagnosticAttempt(attempt)) throw new Error("Resultado final inválido.");
  const snapshot = readPilotDiagnosticSnapshot(storage);
  if (snapshot.finalizedAttempts.some((item) => item.attemptId === attempt.attemptId)) {
    throw new Error("Tentativa finalizada é imutável e já foi registrada.");
  }
  const next = [...snapshot.finalizedAttempts, attempt];
  storage.setItem(PILOT_DIAGNOSTIC_FINALIZED_STORAGE_KEY, JSON.stringify(next));
  storage.removeItem(PILOT_DIAGNOSTIC_ACTIVE_STORAGE_KEY);
  return next;
}
