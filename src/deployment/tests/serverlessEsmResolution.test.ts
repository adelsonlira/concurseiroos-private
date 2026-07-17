import { build } from "esbuild";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const temporaryDirectories: string[] = [];
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
const originalEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const serverlessRuntimeFiles = [
  "api/ai-health.ts",
  "api/coach-chat.ts",
  "api/explain-question.ts",
  "api/organize-material.ts",
  "api/parse-edital.ts",
  "api/runtime-config.ts",
  "api/semantic-search.ts",
  "src/server/httpApp.ts",
  "src/server/runtimeEnvironment.ts",
  "src/core/readiness/productReadiness.ts",
  "src/core/readiness/types.ts",
] as const;

function clearEnvironment() {
  for (const key of ENV_KEYS) delete process.env[key];
}

function restoreEnvironment() {
  clearEnvironment();
  for (const key of ENV_KEYS) {
    const value = originalEnvironment[key];
    if (value !== undefined) process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnvironment();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Vercel Node ESM resolution", () => {
  it("uses explicit extensions in every relative import reachable from the serverless entrypoints", () => {
    const extensionlessImports: string[] = [];
    const relativeSpecifierPattern = /(?:from\s+|import\s*\()\s*["'](\.{1,2}\/[^"']+)["']/g;

    for (const relativeFile of serverlessRuntimeFiles) {
      const source = readFileSync(resolve(root, relativeFile), "utf8");
      for (const match of source.matchAll(relativeSpecifierPattern)) {
        const specifier = match[1];
        if (!extname(specifier)) extensionlessImports.push(`${relativeFile}: ${specifier}`);
      }
    }

    expect(extensionlessImports).toEqual([]);
  });

  it("loads the emitted diagnostic and shared Express entrypoints with native Node ESM resolution", async () => {
    clearEnvironment();
    process.env.AUTH_MODE = "disabled";

    const outputDirectory = mkdtempSync(resolve(root, ".tmp-serverless-esm-"));
    temporaryDirectories.push(outputDirectory);

    await build({
      absWorkingDir: root,
      entryPoints: [...serverlessRuntimeFiles],
      outbase: root,
      outdir: outputDirectory,
      bundle: false,
      format: "esm",
      platform: "node",
      target: "node22",
      packages: "external",
      logLevel: "silent",
    });

    const readinessSource = resolve(root, "data/quality/product-readiness-report.json");
    const readinessTarget = resolve(outputDirectory, "data/quality/product-readiness-report.json");
    mkdirSync(dirname(readinessTarget), { recursive: true });
    copyFileSync(readinessSource, readinessTarget);

    const cacheBuster = `${Date.now()}-${Math.random()}`;
    const runtimeModule = await import(`${pathToFileURL(resolve(outputDirectory, "api/runtime-config.js")).href}?${cacheBuster}`);
    const runtimeResponse = await runtimeModule.default.fetch();
    expect(runtimeResponse.status).toBe(200);

    const aiModule = await import(`${pathToFileURL(resolve(outputDirectory, "api/ai-health.js")).href}?${cacheBuster}`);
    const aiResponse = await aiModule.default.fetch(new Request("https://example.test/api/ai-health", { method: "POST" }));
    expect(aiResponse.status).toBe(503);
    await expect(aiResponse.json()).resolves.toMatchObject({ code: "GEMINI_NOT_CONFIGURED" });

    const coachModule = await import(`${pathToFileURL(resolve(outputDirectory, "api/coach-chat.js")).href}?${cacheBuster}`);
    expect(typeof coachModule.default).toBe("function");
  });
});
