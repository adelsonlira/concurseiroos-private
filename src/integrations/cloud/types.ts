import type { BackupExportSchema } from "../../types";

export type CloudAvailability = "CONFIGURED" | "NOT_CONFIGURED";
export type CloudAuthStatus = "UNKNOWN" | "SIGNED_OUT" | "SIGNED_IN";
export type CloudSyncPhase =
  | "IDLE"
  | "INITIALIZING"
  | "AUTHENTICATING"
  | "SYNCING"
  | "UPLOADING"
  | "CONFLICT"
  | "ERROR";

export interface CloudEnvironmentConfig {
  availability: CloudAvailability;
  source: "BUILD_TIME" | "SERVER_RUNTIME" | "NONE";
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  snapshotTable: string;
  privateBucket: string;
}

export interface RuntimeServiceStatus {
  configurationSource: CloudEnvironmentConfig["source"];
  authMode: string;
  allowSelfSignup: boolean;
  geminiConfigured: boolean | null;
  geminiModel: string | null;
  runtimeEndpointReachable: boolean;
}

export interface CloudUserSummary {
  id: string;
  email: string | null;
}

export interface CloudSnapshotRow {
  user_id: string;
  snapshot: BackupExportSchema;
  revision: number;
  device_id: string;
  updated_at: string;
}

export interface LocalSyncMetadata {
  deviceId: string;
  baseRevision: number | null;
  remoteUpdatedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  localFingerprint: string | null;
}

export type SyncConflictReason =
  | "REMOTE_NEWER_THAN_LOCAL_BASE"
  | "REMOTE_EXISTS_WITHOUT_LOCAL_BASE";

export interface SyncConflict {
  reason: SyncConflictReason;
  remoteRevision: number;
  remoteUpdatedAt: string;
}

export interface CloudSyncResult {
  success: boolean;
  revision?: number;
  updatedAt?: string;
  conflict?: SyncConflict;
  error?: string;
}

export interface PrivateCloudDocument {
  name: string;
  storagePath: string;
  sha256: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
