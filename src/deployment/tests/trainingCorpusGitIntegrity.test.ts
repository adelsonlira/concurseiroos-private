import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const sourceRoot = resolve(root, "data/training-fgv/source");
const manifest = JSON.parse(
  readFileSync(resolve(sourceRoot, "CUR-BD-BANCO-OPERACIONAL-v2-MANIFESTO.json"), "utf8"),
) as {
  deliverables: Array<{ file: string; size_bytes: number; sha256: string }>;
};
const files = [
  "CUR-BD-BANCO-OPERACIONAL-v2-APTAS-ESTUDO.csv",
  "CUR-BD-BANCO-OPERACIONAL-v2-POTENCIALMENTE-APTAS-SIMULADO.csv",
  "CUR-BD-BANCO-OPERACIONAL-v2-EXCLUIDAS-PENDENTES.csv",
  "CUR-BD-BANCO-OPERACIONAL-v2-RECUPERACAO-87.csv",
];

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function lineEndings(buffer: Buffer): { crlf: number; bareLf: number } {
  let crlf = 0;
  let bareLf = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0x0a) continue;
    if (index > 0 && buffer[index - 1] === 0x0d) crlf += 1;
    else bareLf += 1;
  }
  return { crlf, bareLf };
}

function isGitRepository(): boolean {
  try {
    return execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() === "true";
  } catch {
    return false;
  }
}

describe("integridade Git do corpus operacional do Treino FGV", () => {
  it("preserva tamanho, SHA-256 e CRLF dos quatro CSVs aprovados", () => {
    for (const file of files) {
      const expected = manifest.deliverables.find((entry) => entry.file === file);
      expect(expected).toBeDefined();
      const bytes = readFileSync(resolve(sourceRoot, file));
      expect(bytes.length).toBe(expected?.size_bytes);
      expect(sha256(bytes)).toBe(expected?.sha256);
      const endings = lineEndings(bytes);
      expect(endings.crlf).toBeGreaterThan(0);
      expect(endings.bareLf).toBe(0);
    }
  });

  it("declara apenas as regras binárias específicas necessárias", () => {
    const attributes = readFileSync(resolve(root, ".gitattributes"), "utf8").trim().split(/\r?\n/);
    expect(attributes).toContain("data/training-fgv/source/*.csv -text");
    expect(attributes).toContain("data/training-fgv/source/*.jsonl -text");
    expect(attributes).toContain("data/training-fgv/source/*.json -text");
    expect(attributes).toContain("data/training-fgv/source/*.md -text");
    expect(attributes).toContain("data/training-fgv/source/*.xlsx binary");
    expect(attributes).toContain("static/fgv-training/assets/** binary");
    expect(attributes.some((line) => line === "* -text" || line === "* text=auto")).toBe(false);
  });

  it("mantém a validação do catálogo baseada nos bytes brutos", () => {
    const builder = readFileSync(resolve(root, "scripts/buildFgvTrainingCatalog.mjs"), "utf8");
    expect(builder).toContain("stat.size !== deliverable.size_bytes");
    expect(builder).toContain("sha256File(filePath) !== deliverable.sha256");
    expect(builder).not.toContain("replace(/\\r\\n/g");
    expect(builder).not.toContain("normalizeLineEndings");
  });

  it("mantém os blobs do commit idênticos quando o repositório Git está disponível", () => {
    if (!isGitRepository()) return;
    for (const file of files) {
      const expected = manifest.deliverables.find((entry) => entry.file === file);
      const relativePath = `data/training-fgv/source/${file}`;
      const blob = execFileSync("git", ["show", `HEAD:${relativePath}`], {
        cwd: root,
        maxBuffer: 16 * 1024 * 1024,
      });
      expect(blob.length).toBe(expected?.size_bytes);
      expect(sha256(blob)).toBe(expected?.sha256);
      expect(lineEndings(blob).bareLf).toBe(0);
    }
  });

  it("executa a validação uma única vez no CI e separa os três builds", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    expect(workflow.match(/npm run validate\b/g)).toHaveLength(1);
    expect(workflow).not.toContain("npm run build\n");
    expect(workflow).toContain("npm run build:web");
    expect(workflow).toContain("npm run build:server");
    expect(workflow).toContain("npm run build:serverless");
    expect(workflow).toContain("npm run training:audit-git -- --require-git");
  });
});
