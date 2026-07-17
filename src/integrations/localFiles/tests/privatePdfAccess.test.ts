import { describe, expect, it } from "vitest";
import {
  buildPdfPageUrl,
  clearAllPrivatePdfAssociations,
  fileNameMatchesExpected,
  normalizeComparableFileName
} from "../privatePdfAccess";

describe("privatePdfAccess", () => {
  it("normaliza acentos, caixa e espaços sem alterar a identidade do arquivo", () => {
    expect(normalizeComparableFileName("  AÇÃO   01.PDF ")).toBe("acao 01.pdf");
    expect(fileNameMatchesExpected("Ação 01.pdf", "acao 01.PDF")).toBe(true);
  });

  it("rejeita um PDF com nome diferente do material prescrito", () => {
    expect(fileNameMatchesExpected("Aula 02.pdf", "Aula 01.pdf")).toBe(false);
  });

  it("abre a página prescrita e substitui fragmento anterior", () => {
    expect(buildPdfPageUrl("blob:https://app/id", 17)).toBe("blob:https://app/id#page=17");
    expect(buildPdfPageUrl("https://host/aula.pdf#page=2", 8)).toBe("https://host/aula.pdf#page=8");
    expect(buildPdfPageUrl("https://host/aula.pdf", 0)).toBe("https://host/aula.pdf#page=1");
  });

  it("limpa vínculos com segurança quando o navegador não oferece acesso persistente", async () => {
    await expect(clearAllPrivatePdfAssociations()).resolves.toBeUndefined();
  });
});
