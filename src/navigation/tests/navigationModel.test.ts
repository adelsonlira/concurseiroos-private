import { describe, expect, it } from "vitest";
import {
  filterNavigationItems,
  getNavigationItem,
  NAVIGATION_ITEMS,
  normalizeNavigationText,
} from "../navigationModel";

describe("navigationModel", () => {
  it("preserva a ordem operacional definida para uso diário", () => {
    expect(filterNavigationItems("").filter((result) => result.item.group === "daily").map((result) => result.item.id)).toEqual([
      "dashboard",
      "focus",
      "reviews",
      "exercises",
    ]);
  });

  it("normaliza acentos e caixa para busca", () => {
    expect(normalizeNavigationText("Revisões & ERROS")).toBe("revisoes & erros");
  });

  it("encontra uma tela por palavra-chave", () => {
    const results = filterNavigationItems("supabase");
    expect(results.map((result) => result.item.id)).toEqual(["online"]);
  });

  it("encontra uma tela por subitem", () => {
    const results = filterNavigationItems("saldo diário");
    expect(results[0]?.item.id).toBe("dashboard");
    expect(results[0]?.matchContext).toBe("Saldo diário");
  });

  it("retorna todos os itens quando a consulta está vazia", () => {
    expect(filterNavigationItems("   ")).toHaveLength(9);
    expect(filterNavigationItems("coach").map((result) => result.item.id)).toContain("coach");
  });

  it("mantém fora da rotina o cadastro de outro concurso", () => {
    expect(NAVIGATION_ITEMS.some((item) => item.id === "parser")).toBe(false);
    expect(filterNavigationItems("importar novo edital")).toEqual([]);
  });

  it("resolve o título do módulo ativo", () => {
    expect(getNavigationItem("focus")?.label).toBe("Sessão guiada");
    expect(getNavigationItem("inexistente")).toBeUndefined();
  });
});
