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
  const serialized = stableStringify(snapshot);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
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
