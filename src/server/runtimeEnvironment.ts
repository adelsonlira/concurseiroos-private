export type ApiAuthMode = "disabled" | "optional" | "required";

interface EnvLike {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_SNAPSHOT_TABLE?: string;
  VITE_SUPABASE_PRIVATE_BUCKET?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  AUTH_MODE?: string;
  AUTH_ALLOW_SELF_SIGNUP?: string;
  NODE_ENV?: string;
}

export interface RuntimeEnvironment {
  supabase: {
    configured: boolean;
    url: string | null;
    anonKey: string | null;
    source: "SERVER_RUNTIME" | "VITE_COMPAT" | "NONE";
    configurationIssue: string | null;
    snapshotTable: string;
    privateBucket: string;
  };
  auth: {
    mode: ApiAuthMode;
    allowSelfSignup: boolean;
  };
  ai: {
    configured: boolean;
    apiKey: string | null;
    model: string;
  };
}

const PLACEHOLDER_GEMINI_KEYS = new Set(["MY_GEMINI_API_KEY", "SUA_CHAVE_DO_GEMINI"]);

export function normalizeEnvironmentValue(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  let normalized = value.trim();
  if (normalized.length >= 2) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      normalized = normalized.slice(1, -1).trim();
    }
  }
  return normalized || null;
}

function isValidHttpUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function resolveAuthMode(env: EnvLike): ApiAuthMode {
  const requested = normalizeEnvironmentValue(env.AUTH_MODE)?.toLowerCase();
  const normalized = requested === "disabled" || requested === "optional" || requested === "required"
    ? requested
    : null;
  if (env.NODE_ENV === "production") return normalized === "disabled" ? "disabled" : "required";
  return normalized ?? "optional";
}

export function resolveRuntimeEnvironment(env: EnvLike = process.env): RuntimeEnvironment {
  const serverUrl = normalizeEnvironmentValue(env.SUPABASE_URL);
  const serverKey = normalizeEnvironmentValue(env.SUPABASE_ANON_KEY);
  const viteUrl = normalizeEnvironmentValue(env.VITE_SUPABASE_URL);
  const viteKey = normalizeEnvironmentValue(env.VITE_SUPABASE_ANON_KEY);

  let supabaseUrl: string | null = null;
  let supabaseKey: string | null = null;
  let supabaseSource: RuntimeEnvironment["supabase"]["source"] = "NONE";
  let configurationIssue: string | null = null;

  if (serverUrl && serverKey && isValidHttpUrl(serverUrl)) {
    supabaseUrl = serverUrl;
    supabaseKey = serverKey;
    supabaseSource = "SERVER_RUNTIME";
  } else if (viteUrl && viteKey && isValidHttpUrl(viteUrl)) {
    supabaseUrl = viteUrl;
    supabaseKey = viteKey;
    supabaseSource = "VITE_COMPAT";
    if (serverUrl || serverKey) {
      configurationIssue = "O par SUPABASE_URL/SUPABASE_ANON_KEY do servidor está incompleto ou inválido; foi usado o par VITE compatível.";
    }
  } else if (serverUrl || serverKey || viteUrl || viteKey) {
    configurationIssue = "As variáveis do Supabase estão incompletas ou a URL não é válida.";
  }

  const geminiApiKey = normalizeEnvironmentValue(env.GEMINI_API_KEY);
  const geminiConfigured = Boolean(geminiApiKey && !PLACEHOLDER_GEMINI_KEYS.has(geminiApiKey));

  return {
    supabase: {
      configured: Boolean(supabaseUrl && supabaseKey),
      url: supabaseUrl,
      anonKey: supabaseKey,
      source: supabaseSource,
      configurationIssue,
      snapshotTable: normalizeEnvironmentValue(env.VITE_SUPABASE_SNAPSHOT_TABLE) || "user_snapshots",
      privateBucket: normalizeEnvironmentValue(env.VITE_SUPABASE_PRIVATE_BUCKET) || "private-study-materials",
    },
    auth: {
      mode: resolveAuthMode(env),
      allowSelfSignup: normalizeEnvironmentValue(env.AUTH_ALLOW_SELF_SIGNUP)?.toLowerCase() === "true",
    },
    ai: {
      configured: geminiConfigured,
      apiKey: geminiConfigured ? geminiApiKey : null,
      model: normalizeEnvironmentValue(env.GEMINI_MODEL) || "gemini-3.5-flash",
    },
  };
}

export function buildPublicRuntimeConfiguration(runtime: RuntimeEnvironment) {
  return {
    supabase: {
      configured: runtime.supabase.configured,
      url: runtime.supabase.url,
      anonKey: runtime.supabase.anonKey,
      source: runtime.supabase.source,
      configurationIssue: runtime.supabase.configurationIssue,
      snapshotTable: runtime.supabase.snapshotTable,
      privateBucket: runtime.supabase.privateBucket,
    },
    auth: {
      mode: runtime.auth.mode,
      allowSelfSignup: runtime.auth.allowSelfSignup,
    },
    ai: {
      configured: runtime.ai.configured,
      model: runtime.ai.model,
    },
  };
}
