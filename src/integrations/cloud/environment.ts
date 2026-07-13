import type { CloudEnvironmentConfig } from "./types";

interface EnvLike {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_SNAPSHOT_TABLE?: string;
  VITE_SUPABASE_PRIVATE_BUCKET?: string;
}

export function resolveCloudEnvironment(env: EnvLike): CloudEnvironmentConfig {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || null;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() || null;
  const configured = Boolean(supabaseUrl && supabaseAnonKey);

  return {
    availability: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    supabaseUrl,
    supabaseAnonKey,
    snapshotTable: env.VITE_SUPABASE_SNAPSHOT_TABLE?.trim() || "user_snapshots",
    privateBucket:
      env.VITE_SUPABASE_PRIVATE_BUCKET?.trim() || "private-study-materials"
  };
}

export function getCloudEnvironment(): CloudEnvironmentConfig {
  const viteEnv = (import.meta as ImportMeta & { env?: EnvLike }).env ?? {};
  return resolveCloudEnvironment(viteEnv);
}
