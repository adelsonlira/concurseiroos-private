import { describe, expect, it } from "vitest";
import { decideAppAccess } from "../appAccessPolicy";
import type { CloudEnvironmentConfig, RuntimeServiceStatus } from "../types";

const configured: CloudEnvironmentConfig = {
  availability: "CONFIGURED",
  source: "SERVER_RUNTIME",
  supabaseUrl: "https://project.supabase.co",
  supabaseAnonKey: "anon",
  snapshotTable: "user_snapshots",
  privateBucket: "private-study-materials"
};

const localOnly: CloudEnvironmentConfig = {
  ...configured,
  availability: "NOT_CONFIGURED",
  source: "NONE",
  supabaseUrl: null,
  supabaseAnonKey: null
};

function runtime(authMode: string): RuntimeServiceStatus {
  return {
    configurationSource: configured.source,
    authMode,
    allowSelfSignup: false,
    geminiConfigured: true,
    geminiModel: "gemini",
    runtimeEndpointReachable: true
  };
}

describe("decideAppAccess", () => {
  it("blocks the private shell until the session is resolved", () => {
    expect(decideAppAccess({
      initialized: false,
      phase: "IDLE",
      authStatus: "UNKNOWN",
      environment: configured,
      runtimeStatus: runtime("required")
    }).status).toBe("INITIALIZING");
  });

  it("requires login when auth is required", () => {
    expect(decideAppAccess({
      initialized: true,
      phase: "IDLE",
      authStatus: "SIGNED_OUT",
      environment: configured,
      runtimeStatus: runtime("required")
    }).status).toBe("LOGIN_REQUIRED");
  });

  it("allows an authenticated private session", () => {
    expect(decideAppAccess({
      initialized: true,
      phase: "IDLE",
      authStatus: "SIGNED_IN",
      environment: configured,
      runtimeStatus: runtime("required")
    }).status).toBe("ALLOW");
  });

  it("fails closed when remote auth mode cannot be verified but Supabase exists", () => {
    expect(decideAppAccess({
      initialized: true,
      phase: "IDLE",
      authStatus: "SIGNED_OUT",
      environment: configured,
      runtimeStatus: runtime("unknown")
    }).status).toBe("LOGIN_REQUIRED");
  });

  it("keeps the explicitly optional local mode available", () => {
    expect(decideAppAccess({
      initialized: true,
      phase: "IDLE",
      authStatus: "SIGNED_OUT",
      environment: localOnly,
      runtimeStatus: runtime("optional")
    }).status).toBe("ALLOW");
  });

  it("reports a server configuration error instead of exposing the shell", () => {
    expect(decideAppAccess({
      initialized: true,
      phase: "IDLE",
      authStatus: "SIGNED_OUT",
      environment: localOnly,
      runtimeStatus: runtime("required")
    }).status).toBe("MISCONFIGURED");
  });
});
