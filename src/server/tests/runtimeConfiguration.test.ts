import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  startManagedHttpTestServer,
  type ManagedHttpTestServer,
} from "../testing/httpTestHarness";

let managedServer: ManagedHttpTestServer | null = null;

async function startApp(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "AUTH_MODE",
    "AUTH_ALLOW_SELF_SIGNUP",
    "NODE_ENV",
  ]) {
    delete process.env[key];
  }
  Object.entries(env).forEach(([key, value]) => {
    if (value !== undefined) process.env[key] = value;
  });
  const { default: app } = await import("../httpApp");
  managedServer = await startManagedHttpTestServer(createServer(app));
  return managedServer;
}

afterEach(async () => {
  await managedServer?.close();
  managedServer = null;
});

describe("runtime service configuration", () => {
  it("exposes only public Supabase configuration and a Gemini boolean", async () => {
    const appServer = await startApp({
      AUTH_MODE: "optional",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "public-anon-key",
      GEMINI_API_KEY: "secret-gemini-key",
      GEMINI_MODEL: "gemini-3.5-flash",
    });
    const response = await appServer.request("/api/runtime-config");
    const text = response.text;
    const payload = JSON.parse(text);
    expect(response.status).toBe(200);
    expect(payload.supabase.configured).toBe(true);
    expect(payload.supabase.anonKey).toBe("public-anon-key");
    expect(payload.auth).toEqual({ mode: "optional", allowSelfSignup: false });
    expect(payload.ai).toEqual({ configured: true, model: "gemini-3.5-flash" });
    expect(text).not.toContain("secret-gemini-key");
  });

  it("normalizes quoted variables and keeps runtime-config reachable", async () => {
    const appServer = await startApp({
      AUTH_MODE: '"optional"',
      SUPABASE_URL: '"https://project.supabase.co"',
      SUPABASE_ANON_KEY: '"public-anon-key"',
      GEMINI_API_KEY: '"secret-gemini-key"',
      GEMINI_MODEL: '"gemini-3.5-flash"',
    });
    const response = await appServer.request("/api/runtime-config");
    const payload = response.json<any>();
    expect(response.status).toBe(200);
    expect(payload.supabase).toMatchObject({
      configured: true,
      url: "https://project.supabase.co",
      anonKey: "public-anon-key",
      source: "SERVER_RUNTIME",
    });
    expect(payload.ai).toEqual({ configured: true, model: "gemini-3.5-flash" });
  });

  it("falls back to the valid VITE pair instead of crashing on malformed server variables", async () => {
    const appServer = await startApp({
      AUTH_MODE: "optional",
      SUPABASE_URL: "not-a-url",
      SUPABASE_ANON_KEY: "bad-server-key",
      VITE_SUPABASE_URL: "https://project.supabase.co",
      VITE_SUPABASE_ANON_KEY: "public-anon-key",
    });
    const response = await appServer.request("/api/runtime-config");
    const payload = response.json<any>();
    expect(response.status).toBe(200);
    expect(payload.supabase).toMatchObject({
      configured: true,
      source: "VITE_COMPAT",
      url: "https://project.supabase.co",
      anonKey: "public-anon-key",
    });
    expect(payload.supabase.configurationIssue).toMatch(/SUPABASE_URL/);
  });

  it("returns a safe unconfigured payload for invalid Supabase values", async () => {
    const appServer = await startApp({
      AUTH_MODE: "optional",
      SUPABASE_URL: "not-a-url",
      SUPABASE_ANON_KEY: "public-anon-key",
      GEMINI_API_KEY: "secret-gemini-key",
    });
    const response = await appServer.request("/api/runtime-config");
    const payload = response.json<any>();
    expect(response.status).toBe(200);
    expect(payload.supabase.configured).toBe(false);
    expect(payload.supabase.url).toBeNull();
    expect(payload.ai.configured).toBe(true);
  });

  it("promove modo optional para required em produção", async () => {
    const appServer = await startApp({
      NODE_ENV: "production",
      AUTH_MODE: "optional",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "public-anon-key",
    });
    const response = await appServer.request("/api/runtime-config");
    const payload = response.json<any>();
    expect(payload.auth.mode).toBe("required");
  });

  it("habilita cadastro público somente quando configurado explicitamente", async () => {
    const appServer = await startApp({
      AUTH_MODE: "required",
      AUTH_ALLOW_SELF_SIGNUP: "true",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "public-anon-key",
    });
    const response = await appServer.request("/api/runtime-config");
    const payload = response.json<any>();
    expect(payload.auth).toEqual({ mode: "required", allowSelfSignup: true });
  });

  it("exposes a public readiness report without credentials or private content", async () => {
    const appServer = await startApp({ AUTH_MODE: "optional" });
    const response = await appServer.request("/api/readiness");
    const text = response.text;
    const payload = JSON.parse(text);
    expect(response.status).toBe(200);
    expect([
      "READY_FOR_LOCAL_DAILY_USE",
      "READY_WITH_LIMITATIONS",
      "NOT_READY",
    ]).toContain(payload.status);
    expect(Array.isArray(payload.checks)).toBe(true);
    expect(text).not.toContain("GEMINI_API_KEY");
    expect(text).not.toContain("SUPABASE_ANON_KEY");
  });

  it("combines the static audit with the configuration of the running server", async () => {
    const appServer = await startApp({
      AUTH_MODE: "optional",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "public-anon-key",
      GEMINI_API_KEY: "secret-gemini-key",
    });
    const response = await appServer.request("/api/readiness");
    const payload = response.json<any>();
    expect(payload.runtime).toMatchObject({
      supabaseConfigured: true,
      geminiConfigured: true,
      authMode: "optional",
      nodeVersion: process.versions.node,
    });
    const nodeCheck = payload.checks.find(
      (check: { id: string }) => check.id === "node-runtime",
    );
    expect(nodeCheck.detail).toContain(process.versions.node);
    expect(payload.warnings.join(" ")).toMatch(
      /configuração pública presente/i,
    );
    expect(payload.warnings.join(" ")).toMatch(/chave presente no backend/i);
    expect(payload.warnings.join(" ")).not.toMatch(
      /credenciais públicas não disponíveis/i,
    );
  });

  it("returns 503 for the Gemini probe without a key in optional auth mode", async () => {
    const appServer = await startApp({ AUTH_MODE: "optional" });
    const response = await appServer.request("/api/ai-health", {
      method: "POST",
    });
    expect(response.status).toBe(503);
  });
});
