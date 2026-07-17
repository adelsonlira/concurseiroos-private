export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecoverableSnapshot<T> {
  value: T | null;
  source: "PRIMARY" | "RECOVERY" | "NONE";
  errors: string[];
}

export function persistSnapshotAtomically(storage: KeyValueStorage, key: string, serialized: string): void {
  const previous = storage.getItem(key);
  if (previous !== null) storage.setItem(`${key}_RECOVERY`, previous);
  storage.setItem(`${key}_PENDING`, serialized);
  storage.setItem(key, serialized);
  storage.removeItem(`${key}_PENDING`);
}

function parse<T>(raw: string | null, label: string, errors: string[]): T | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as T;
    if (!value || typeof value !== "object") throw new Error("conteúdo não é objeto");
    return value;
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : "JSON inválido"}`);
    return null;
  }
}

export function readRecoverableSnapshot<T>(storage: KeyValueStorage, key: string): RecoverableSnapshot<T> {
  const errors: string[] = [];
  const primary = parse<T>(storage.getItem(key), "snapshot principal inválido", errors);
  if (primary) return { value: primary, source: "PRIMARY", errors };
  const recovery = parse<T>(storage.getItem(`${key}_RECOVERY`), "snapshot de recuperação inválido", errors);
  if (recovery) return { value: recovery, source: "RECOVERY", errors };
  return { value: null, source: "NONE", errors };
}
