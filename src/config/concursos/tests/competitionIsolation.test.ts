import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "src");
const packagePathFragment = "config/concursos/dataprev-2026-perfil-3";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = resolve(directory, entry);
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    return /\.(ts|tsx)$/.test(entry) ? [absolute] : [];
  });
}

function toPortablePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function isAllowedCompetitionPackageConsumer(relativePath: string): boolean {
  return (
    relativePath.includes("/tests/") ||
    relativePath.startsWith("config/concursos/tests/") ||
    relativePath.startsWith(`${packagePathFragment}/`) ||
    relativePath === "config/concursos/registry.ts" ||
    relativePath === "config/concursos/index.ts"
  );
}

describe("competition package isolation", () => {
  it("normaliza caminhos do Windows antes de aplicar as regras arquiteturais", () => {
    expect(toPortablePath("integrations\\sde\\tests\\coachContext.test.ts")).toBe(
      "integrations/sde/tests/coachContext.test.ts"
    );
  });

  it("impede consumidores de produção de importar diretamente o pacote DATAPREV", () => {
    const violations = sourceFiles(root)
      .map((absolutePath) => ({
        absolutePath,
        relativePath: toPortablePath(relative(root, absolutePath))
      }))
      .filter(({ relativePath }) => !isAllowedCompetitionPackageConsumer(relativePath))
      .filter(({ absolutePath }) =>
        readFileSync(absolutePath, "utf8").includes(packagePathFragment)
      )
      .map(({ relativePath }) => relativePath);

    expect(violations).toEqual([]);
  });
});
