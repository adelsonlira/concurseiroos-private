import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel Express entrypoints", () => {
  const root = resolve(process.cwd());
  const serverSource = readFileSync(resolve(root, "server.ts"), "utf8");
  const vercelConfig = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  const apiRoutes = [
    "health",
    "parse-edital",
    "explain-question",
    "coach-chat",
    "semantic-search",
    "organize-material"
  ];

  it("exports the shared Express application", () => {
    expect(serverSource).toContain("export default app");
  });

  it("does not open a local port inside Vercel", () => {
    expect(serverSource).toContain('if (process.env.VERCEL !== "1")');
    expect(serverSource).toContain("void startLocalServer()");
  });

  it("publishes the Vite frontend from the public directory", () => {
    expect(vercelConfig.outputDirectory).toBe("public");
  });

  it("defines explicit Vercel Functions for every public API endpoint", () => {
    for (const route of apiRoutes) {
      const entrypoint = resolve(root, "api", `${route}.ts`);
      expect(existsSync(entrypoint), `missing ${entrypoint}`).toBe(true);
      const source = readFileSync(entrypoint, "utf8");
      expect(source).toContain('import app from "../server"');
      expect(source).toContain("return app(req, res)");
    }
  });
});
