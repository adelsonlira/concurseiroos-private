import { readFileSync, readdirSync, statSync } from "node:fs";
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
  it("não distribui caminhos temporários nem conteúdo integral no acervo derivado", () => {
    const derivedFiles = [
      "data/knowledge/official-exam-manifest.json",
      "data/knowledge/official-answer-key-sections.json",
      "data/knowledge/official-question-corpus.ndjson",
      "data/knowledge/official-review-queue.json",
      "data/knowledge/official-corpus-quality.json",
      "data/evidence/dataprev-2026-perfil-3/fgv-exams-37/dataprev-reference-exam-question-map.json",
      "data/evidence/dataprev-2026-perfil-3/fgv-gabaritos/fgv-gabarito-summary.json",
    ];
    for (const relativePath of derivedFiles) {
      const content = readFileSync(resolve(root, relativePath), "utf8");
      expect(content).not.toContain("/mnt/data/");
      expect(content).not.toContain('"questionText"');
      expect(content).not.toContain('"statement"');
    }
  });

});
