import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel Express entrypoint", () => {
  const root = resolve(process.cwd());
  const serverSource = readFileSync(resolve(root, "server.ts"), "utf8");
  const vercelConfig = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));

  it("exports the Express application for Vercel function discovery", () => {
    expect(serverSource).toContain("export default app");
  });

  it("does not open a local port inside Vercel", () => {
    expect(serverSource).toContain('if (process.env.VERCEL !== "1")');
    expect(serverSource).toContain("void startLocalServer()");
  });

  it("does not force a static-only output directory in project configuration", () => {
    expect(vercelConfig).not.toHaveProperty("outputDirectory");
  });
});
