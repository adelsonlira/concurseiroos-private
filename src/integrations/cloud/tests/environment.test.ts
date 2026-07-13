import { describe, expect, it } from "vitest";
import { resolveCloudEnvironment } from "../environment";

describe("cloud environment", () => {
  it("keeps the app in local mode when credentials are incomplete", () => {
    expect(resolveCloudEnvironment({ VITE_SUPABASE_URL: "https://example.supabase.co" })).toEqual({
      availability: "NOT_CONFIGURED",
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
});
