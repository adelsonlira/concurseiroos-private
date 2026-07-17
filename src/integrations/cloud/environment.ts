import type { CloudEnvironmentConfig, RuntimeServiceStatus } from "./types";

interface EnvLike {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_SNAPSHOT_TABLE?: string;
  VITE_SUPABASE_PRIVATE_BUCKET?: string;
}

interface RuntimeConfigurationPayload {
  supabase?: {
    configured?: boolean;
    url?: string | null;
    anonKey?: string | null;
    snapshotTable?: string | null;
    privateBucket?: string | null;
  };
  auth?: { mode?: string | null; allowSelfSignup?: boolean };
  ai?: { configured?: boolean; model?: string | null };
}

let runtimeEnvironment: CloudEnvironmentConfig | null = null;

export function resolveCloudEnvironment(
  env: EnvLike,
  source: CloudEnvironmentConfig["source"] = "BUILD_TIME"
): CloudEnvironmentConfig {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || null;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() || null;
  const configured = Boolean(supabaseUrl && supabaseAnonKey);
  return {
    availability: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    source: configured ? source : "NONE",
    supabaseUrl,
    supabaseAnonKey,
    snapshotTable: env.VITE_SUPABASE_SNAPSHOT_TABLE?.trim() || "user_snapshots",
    privateBucket: env.VITE_SUPABASE_PRIVATE_BUCKET?.trim() || "private-study-materials"
  };
}

function buildTimeEnvironment(): CloudEnvironmentConfig {
  const viteEnv = (import.meta as ImportMeta & { env?: EnvLike }).env ?? {};
  return resolveCloudEnvironment(viteEnv);
}

export function setCloudEnvironment(environment: CloudEnvironmentConfig | null): void {
  runtimeEnvironment = environment;
}

export function getCloudEnvironment(): CloudEnvironmentConfig {
  return runtimeEnvironment ?? buildTimeEnvironment();
}

export async function loadRuntimeConfiguration(
  fetcher: typeof fetch = fetch
): Promise<{ environment: CloudEnvironmentConfig; services: RuntimeServiceStatus }> {
  const fallback = buildTimeEnvironment();
  try {
    const response = await fetcher("/api/runtime-config", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const payload = (await response.json()) as RuntimeConfigurationPayload;
    const runtimeUrl = payload.supabase?.url?.trim() || null;
    const runtimeKey = payload.supabase?.anonKey?.trim() || null;
    const runtimeConfigured = Boolean(payload.supabase?.configured && runtimeUrl && runtimeKey);
    const environment: CloudEnvironmentConfig = runtimeConfigured
      ? {
          availability: "CONFIGURED",
          source: "SERVER_RUNTIME",
          supabaseUrl: runtimeUrl,
          supabaseAnonKey: runtimeKey,
          snapshotTable: payload.supabase?.snapshotTable?.trim() || fallback.snapshotTable,
          privateBucket: payload.supabase?.privateBucket?.trim() || fallback.privateBucket
        }
      : fallback;
    setCloudEnvironment(environment);
    return {
      environment,
      services: {
        configurationSource: environment.source,
        authMode: payload.auth?.mode?.trim() || "optional",
        allowSelfSignup: payload.auth?.allowSelfSignup === true,
        geminiConfigured: payload.ai?.configured ?? null,
        geminiModel: payload.ai?.model?.trim() || null,
        runtimeEndpointReachable: true
      }
    };
  } catch {
    setCloudEnvironment(fallback);
    return {
      environment: fallback,
      services: {
        configurationSource: fallback.source,
        authMode: "unknown",
        allowSelfSignup: false,
        geminiConfigured: null,
        geminiModel: null,
        runtimeEndpointReachable: false
      }
    };
  }
}
