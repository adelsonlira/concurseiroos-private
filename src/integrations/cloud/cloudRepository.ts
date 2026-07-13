import type { Session, User } from "@supabase/supabase-js";
import type { BackupExportSchema } from "../../types";
import { getCloudEnvironment } from "./environment";
import { getSupabaseClient } from "./supabaseClient";
import type { CloudSnapshotRow, PrivateCloudDocument } from "./types";

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("SUPABASE_NOT_CONFIGURED");
  return client;
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signUpWithPassword(email: string, password: string): Promise<User | null> {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signInWithPassword(email: string, password: string): Promise<User> {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("AUTH_USER_NOT_RETURNED");
  return data.user;
}

export async function signOut(): Promise<void> {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function loadCloudSnapshot(userId: string): Promise<CloudSnapshotRow | null> {
  const client = requireClient();
  const { snapshotTable } = getCloudEnvironment();
  const { data, error } = await client
    .from(snapshotTable)
    .select("user_id,snapshot,revision,device_id,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as CloudSnapshotRow | null) ?? null;
}

export async function saveCloudSnapshot(params: {
  userId: string;
  snapshot: BackupExportSchema;
  expectedRevision: number;
  deviceId: string;
}): Promise<CloudSnapshotRow> {
  const client = requireClient();
  const { data, error } = await client.rpc("save_user_snapshot", {
    p_expected_revision: params.expectedRevision,
    p_snapshot: params.snapshot,
    p_device_id: params.deviceId
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.user_id !== params.userId) {
    throw new Error("CLOUD_SNAPSHOT_WRITE_INVALID_RESPONSE");
  }
  return row as CloudSnapshotRow;
}

export async function uploadPrivateDocument(userId: string, path: string, file: File): Promise<void> {
  if (!path.startsWith(`${userId}/`)) throw new Error("INVALID_PRIVATE_STORAGE_PATH");
  const client = requireClient();
  const { privateBucket } = getCloudEnvironment();
  const { error } = await client.storage.from(privateBucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "application/pdf",
    upsert: false
  });
  if (error) throw error;
}

export async function listPrivateDocuments(userId: string): Promise<PrivateCloudDocument[]> {
  const client = requireClient();
  const { privateBucket } = getCloudEnvironment();
  const { data: dateFolders, error: dateError } = await client.storage
    .from(privateBucket)
    .list(userId, { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (dateError) throw dateError;

  const documents: PrivateCloudDocument[] = [];
  for (const folder of dateFolders ?? []) {
    const folderPath = `${userId}/${folder.name}`;
    const { data: files, error } = await client.storage
      .from(privateBucket)
      .list(folderPath, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    for (const file of files ?? []) {
      if (!file.id) continue;
      documents.push({
        name: file.name,
        storagePath: `${folderPath}/${file.name}`,
        sizeBytes: typeof file.metadata?.size === "number" ? file.metadata.size : null,
        mimeType: typeof file.metadata?.mimetype === "string" ? file.metadata.mimetype : null,
        createdAt: file.created_at ?? null,
        updatedAt: file.updated_at ?? null
      });
    }
  }
  return documents;
}

export async function createPrivateDocumentSignedUrl(
  userId: string,
  storagePath: string,
  expiresInSeconds = 600
): Promise<string> {
  if (!storagePath.startsWith(`${userId}/`)) throw new Error("INVALID_PRIVATE_STORAGE_PATH");
  const client = requireClient();
  const { privateBucket } = getCloudEnvironment();
  const { data, error } = await client.storage
    .from(privateBucket)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePrivateDocument(userId: string, storagePath: string): Promise<void> {
  if (!storagePath.startsWith(`${userId}/`)) throw new Error("INVALID_PRIVATE_STORAGE_PATH");
  const client = requireClient();
  const { privateBucket } = getCloudEnvironment();
  const { error } = await client.storage.from(privateBucket).remove([storagePath]);
  if (error) throw error;
}
