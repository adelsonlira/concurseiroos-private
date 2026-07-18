import { validateActiveFgvTrainingAttempt, validateFinalizedFgvTrainingAttempt } from "./engine";
import type { ActiveFgvTrainingAttempt, FinalizedFgvTrainingAttempt, FgvTrainingPersistenceSnapshot } from "./types";

export interface FgvTrainingStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
export const FGV_TRAINING_ACTIVE_STORAGE_KEY = "concurseiroos.training.fgv.active.v1";
export const FGV_TRAINING_FINALIZED_STORAGE_KEY = "concurseiroos.training.fgv.finalized.v1";

function parse(value: string | null): unknown { try { return value ? JSON.parse(value) : null; } catch { return null; } }

export function readFgvTrainingSnapshot(storage: FgvTrainingStorage): FgvTrainingPersistenceSnapshot {
  const activeRaw = parse(storage.getItem(FGV_TRAINING_ACTIVE_STORAGE_KEY));
  const finalizedRaw = parse(storage.getItem(FGV_TRAINING_FINALIZED_STORAGE_KEY));
  return {
    activeAttempt: validateActiveFgvTrainingAttempt(activeRaw) ? activeRaw : null,
    finalizedAttempts: Array.isArray(finalizedRaw) ? finalizedRaw.filter(validateFinalizedFgvTrainingAttempt) : [],
  };
}

export function startActiveFgvTrainingAttempt(storage: FgvTrainingStorage, attempt: ActiveFgvTrainingAttempt): void {
  if (readFgvTrainingSnapshot(storage).activeAttempt) throw new Error("Já existe um treino ativo.");
  saveActiveFgvTrainingAttempt(storage, attempt);
}

export function saveActiveFgvTrainingAttempt(storage: FgvTrainingStorage, attempt: ActiveFgvTrainingAttempt): void {
  if (!validateActiveFgvTrainingAttempt(attempt)) throw new Error("Tentativa de treino inválida.");
  storage.setItem(FGV_TRAINING_ACTIVE_STORAGE_KEY, JSON.stringify(attempt));
}

export function cancelActiveFgvTrainingAttempt(storage: FgvTrainingStorage): void { storage.removeItem(FGV_TRAINING_ACTIVE_STORAGE_KEY); }

export function appendFinalizedFgvTrainingAttempt(storage: FgvTrainingStorage, attempt: FinalizedFgvTrainingAttempt): FinalizedFgvTrainingAttempt[] {
  if (!validateFinalizedFgvTrainingAttempt(attempt)) throw new Error("Resultado de treino inválido.");
  const snapshot = readFgvTrainingSnapshot(storage);
  if (snapshot.finalizedAttempts.some((item) => item.attemptId === attempt.attemptId)) throw new Error("Tentativa finalizada é imutável.");
  const next = [...snapshot.finalizedAttempts, attempt];
  storage.setItem(FGV_TRAINING_FINALIZED_STORAGE_KEY, JSON.stringify(next));
  storage.removeItem(FGV_TRAINING_ACTIVE_STORAGE_KEY);
  return next;
}
