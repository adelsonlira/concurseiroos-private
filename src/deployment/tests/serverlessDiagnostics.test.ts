import { afterEach, describe, expect, it } from "vitest";
import runtimeConfigHandler from "../../../api/runtime-config";
import aiHealthHandler from "../../../api/ai-health";

const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "AUTH_MODE",
  "NODE_ENV",
] as const;

const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function clearEnvironment() {
  for (const key of ENV_KEYS) delete process.env[key];
}

afterEach(() => {
  clearEnvironment();
  for (const key of ENV_KEYS) {
    const value = original[key];
    if (value !== undefined) process.env[key] = value;
  }
});

describe("serverless diagnostics", () => {
  it("serves runtime configuration even when the primary Supabase URL is malformed", async () => {
    clearEnvironment();
    process.env.AUTH_MODE = "optional";
    process.env.SUPABASE_URL = "invalid";
    process.env.SUPABASE_ANON_KEY = "invalid-pair";
    process.env.VITE_SUPABASE_URL = "https://project.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.GEMINI_API_KEY = '"server-key"';

    const response = await runtimeConfigHandler.fetch();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.supabase).toMatchObject({ configured: true, source: "VITE_COMPAT" });
    expect(payload.ai.configured).toBe(true);
  });

  it("returns a controlled JSON error instead of HTTP 500 when Gemini is absent", async () => {
    clearEnvironment();
    process.env.AUTH_MODE = "disabled";

    const response = await aiHealthHandler.fetch(new Request("https://example.test/api/ai-health", { method: "POST" }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ code: "GEMINI_NOT_CONFIGURED" });
  });
});
