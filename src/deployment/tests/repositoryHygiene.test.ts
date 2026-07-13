import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function rootFiles(): string[] {
  return readdirSync(root).filter((entry) => statSync(resolve(root, entry)).isFile());
}

describe("repository hygiene", () => {
  it("mantém relatórios históricos fora da raiz", () => {
    const historicalAtRoot = rootFiles().filter(
      (entry) => entry.startsWith("SPRINT_") || entry.startsWith("HOTFIX_")
    );
    expect(historicalAtRoot).toEqual([]);
    expect(statSync(resolve(root, "docs/history")).isDirectory()).toBe(true);
  });

  it("não inclui arquivo de ambiente real no repositório", () => {
    expect(rootFiles()).not.toContain(".env");
    expect(rootFiles()).toContain(".env.example");
  });
});
