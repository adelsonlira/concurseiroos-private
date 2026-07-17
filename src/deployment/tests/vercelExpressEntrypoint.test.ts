import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel serverless entrypoints", () => {
  const root = resolve(process.cwd());
  const serverSource = readFileSync(resolve(root, "server.ts"), "utf8");
  const httpAppSource = readFileSync(resolve(root, "src/server/httpApp.ts"), "utf8");
  const healthSource = readFileSync(resolve(root, "api/health.ts"), "utf8");
  const vercelConfig = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  const aiRoutes = [
    "parse-edital",
    "explain-question",
    "coach-chat",
    "semantic-search",
    "organize-material"
  ];

  it("keeps local Vite/static serving outside the serverless HTTP app", () => {
    expect(serverSource).toContain('import app from "./src/server/httpApp"');
    expect(serverSource).toContain('await import("vite")');
    expect(serverSource).toContain('if (process.env.VERCEL !== "1")');
    expect(serverSource).toContain("void startLocalServer()");
    expect(httpAppSource).not.toContain('from "vite"');
    expect(httpAppSource).not.toContain("express.static");
  });

  it("loads Gemini lazily and does not require it for health or auth", () => {
    expect(httpAppSource).toContain('await import("@google/genai")');
    expect(httpAppSource).not.toContain('import { GoogleGenAI');
    expect(httpAppSource).not.toContain("new GoogleGenAI({\n  apiKey: process.env.GEMINI_API_KEY");
  });

  it("publishes the Vite frontend from the public directory", () => {
    expect(vercelConfig.outputDirectory).toBe("public");
  });

  it("defines a dependency-free Web API health function", () => {
    expect(healthSource).toContain("fetch()");
    expect(healthSource).toContain("Response.json");
    expect(healthSource).not.toContain("../server");
    expect(healthSource).not.toContain("httpApp");
  });


  it("keeps the Gemini probe independent from the shared Express boot path", () => {
    const source = readFileSync(resolve(root, "api/ai-health.ts"), "utf8");
    expect(source).toContain("async fetch(request: Request)");
    expect(source).toContain('from "../src/server/runtimeEnvironment.js"');
    expect(source).toContain('await import("@google/genai")');
    expect(source).toContain('await import("@supabase/supabase-js")');
    expect(source).not.toContain("httpApp");
    expect(source).not.toContain('import { GoogleGenAI');
  });

  it("keeps runtime configuration independent from the Express and Supabase SDK boot path", () => {
    const runtimeSource = readFileSync(resolve(root, "api/runtime-config.ts"), "utf8");
    expect(runtimeSource).toContain("Response.json");
    expect(runtimeSource).toContain('from "../src/server/runtimeEnvironment.js"');
    expect(runtimeSource).not.toContain("httpApp");
    expect(runtimeSource).not.toContain("@supabase/supabase-js");
  });

  it("routes AI functions through the serverless-safe shared app", () => {
    for (const route of aiRoutes) {
      const entrypoint = resolve(root, "api", `${route}.ts`);
      expect(existsSync(entrypoint), `missing ${entrypoint}`).toBe(true);
      const source = readFileSync(entrypoint, "utf8");
      expect(source).toContain('import app from "../src/server/httpApp.js"');
      expect(source).toContain("return app(req, res)");
    }
  });
});
