import type { BackupExportSchema } from "../../types";
import type {
  CloudSnapshotRow,
  LocalSyncMetadata,
  SyncConflict
} from "./types";

const SYNC_METADATA_KEY = "CONCURSEIRO_OS_CLOUD_SYNC_METADATA";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(",")}}`;
}

export function fingerprintSnapshot(snapshot: BackupExportSchema): string {
  // Fingerprint only the persisted application data. Export timestamps, byte
  // counts and checksum metadata are intentionally volatile and would make an
  // unchanged snapshot look different on every call.
  const serialized = stableStringify(snapshot.dados);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export type SyncReconciliationAction =
  | "PUSH_LOCAL"
  | "RESTORE_CLOUD"
  | "CONFLICT"
  | "NOOP";

export function hasMeaningfulLocalProgress(snapshot: BackupExportSchema): boolean {
  const data = snapshot.dados;
  return [
    data.tentativasQuestoes,
    data.flashcards,
    data.documentos,
    data.resumos,
    data.anotacoes,
    data.planosEstudo,
    data.simulados,
    data.agenda,
    data.historicos,
    data.cronogramasRevisao,
    data.sessoesEstudo,
    data.evidenciasAprendizagemGuiada,
    data.externalEvidenceLedger,
    data.sdeDecisionLedger,
    data.sdeCalibrationLedger
  ].some((collection) => Array.isArray(collection) && collection.length > 0);
}

/**
 * Three-way synchronization policy.
 *
 * - a clean/new device receives the existing cloud snapshot automatically;
 * - a device with only local changes pushes automatically;
 * - a device with only remote changes restores automatically;
 * - the user is interrupted only when both sides changed from the same base.
 */
export function decideSyncReconciliation(
  remote: CloudSnapshotRow | null,
  localMetadata: LocalSyncMetadata,
  localSnapshot: BackupExportSchema
): SyncReconciliationAction {
  if (!remote) return "PUSH_LOCAL";

  const currentFingerprint = fingerprintSnapshot(localSnapshot);
  const localChanged =
    localMetadata.localFingerprint === null ||
    currentFingerprint !== localMetadata.localFingerprint;

  if (localMetadata.baseRevision === null) {
    return hasMeaningfulLocalProgress(localSnapshot) ? "CONFLICT" : "RESTORE_CLOUD";
  }

  if (remote.revision > localMetadata.baseRevision) {
    return localChanged ? "CONFLICT" : "RESTORE_CLOUD";
  }

  if (remote.revision === localMetadata.baseRevision) {
    return localChanged ? "PUSH_LOCAL" : "NOOP";
  }

  // A local base ahead of the server is unusual (for example, a restored
  // database). Preserve the local state by using the optimistic write path.
  return "PUSH_LOCAL";
}

export function validateBackupSnapshot(value: unknown): value is BackupExportSchema {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BackupExportSchema>;
  if (candidate.metadata?.appSource !== "ConcurseiroOS") return false;
  if (!candidate.dados || typeof candidate.dados !== "object") return false;
  return Array.isArray(candidate.dados.concursos) && Array.isArray(candidate.dados.disciplinas);
}

export function detectSyncConflict(
  remote: CloudSnapshotRow | null,
  localMetadata: LocalSyncMetadata
): SyncConflict | null {
  if (!remote) return null;

  if (localMetadata.baseRevision === null) {
    return {
      reason: "REMOTE_EXISTS_WITHOUT_LOCAL_BASE",
      remoteRevision: remote.revision,
      remoteUpdatedAt: remote.updated_at
    };
  }

  if (remote.revision > localMetadata.baseRevision) {
    return {
      reason: "REMOTE_NEWER_THAN_LOCAL_BASE",
      remoteRevision: remote.revision,
      remoteUpdatedAt: remote.updated_at
    };
  }

  return null;
}

export function defaultSyncMetadata(deviceId: string): LocalSyncMetadata {
  return {
    deviceId,
    baseRevision: null,
    remoteUpdatedAt: null,
    lastSuccessfulSyncAt: null,
    localFingerprint: null
  };
}

export function readSyncMetadata(deviceId: string, storage?: Storage): LocalSyncMetadata {
  const target = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!target) return defaultSyncMetadata(deviceId);

  try {
    const raw = target.getItem(SYNC_METADATA_KEY);
    if (!raw) return defaultSyncMetadata(deviceId);
    const parsed = JSON.parse(raw) as Partial<LocalSyncMetadata>;
    return {
      ...defaultSyncMetadata(deviceId),
      ...parsed,
      deviceId
    };
  } catch {
    return defaultSyncMetadata(deviceId);
  }
}

export function writeSyncMetadata(metadata: LocalSyncMetadata, storage?: Storage): void {
  const target = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!target) return;
  target.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
}

export function resetSyncMetadata(deviceId: string, storage?: Storage): LocalSyncMetadata {
  const metadata = defaultSyncMetadata(deviceId);
  writeSyncMetadata(metadata, storage);
  return metadata;
}
