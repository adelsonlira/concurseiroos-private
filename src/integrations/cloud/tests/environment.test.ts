import { describe, expect, it } from "vitest";
import { loadRuntimeConfiguration, resolveCloudEnvironment, setCloudEnvironment } from "../environment";

describe("cloud environment", () => {
  it("keeps the app in local mode when credentials are incomplete", () => {
    expect(resolveCloudEnvironment({ VITE_SUPABASE_URL: "https://example.supabase.co" })).toEqual({
      availability: "NOT_CONFIGURED",
      source: "NONE",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: null,
      snapshotTable: "user_snapshots",
      privateBucket: "private-study-materials"
    });
  });

  it("accepts explicit non-secret browser configuration", () => {
    const result = resolveCloudEnvironment({
      VITE_SUPABASE_URL: " https://project.supabase.co ",
      VITE_SUPABASE_ANON_KEY: " anon-key ",
      VITE_SUPABASE_SNAPSHOT_TABLE: "snapshots_v2",
      VITE_SUPABASE_PRIVATE_BUCKET: "vault"
    });

    expect(result.availability).toBe("CONFIGURED");
    expect(result.supabaseUrl).toBe("https://project.supabase.co");
    expect(result.supabaseAnonKey).toBe("anon-key");
    expect(result.snapshotTable).toBe("snapshots_v2");
    expect(result.privateBucket).toBe("vault");
  });

  it("prefers the runtime configuration exposed by the server", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      supabase: {
        configured: true,
        url: "https://runtime.supabase.co",
        anonKey: "runtime-anon",
        snapshotTable: "runtime_snapshots",
        privateBucket: "runtime-vault"
      },
      auth: { mode: "required", allowSelfSignup: false },
      ai: { configured: true, model: "gemini-3.5-flash" }
    }), { status: 200, headers: { "Content-Type": "application/json" } });

    const result = await loadRuntimeConfiguration(fetcher as typeof fetch);
    expect(result.environment.source).toBe("SERVER_RUNTIME");
    expect(result.environment.supabaseUrl).toBe("https://runtime.supabase.co");
    expect(result.services.authMode).toBe("required");
    expect(result.services.allowSelfSignup).toBe(false);
    expect(result.services.geminiConfigured).toBe(true);
    setCloudEnvironment(null);
  });
});
