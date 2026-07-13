import { describe, expect, it } from "vitest";
import {
  filterNavigationItems,
  getNavigationItem,
  NAVIGATION_ITEMS,
  normalizeNavigationText,
} from "../navigationModel";

describe("navigationModel", () => {
  it("preserva a ordem operacional definida para uso diário", () => {
    expect(NAVIGATION_ITEMS.slice(0, 5).map((item) => item.id)).toEqual([
      "dashboard",
      "focus",
      "roadmap",
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
    expect(filterNavigationItems("   ")).toHaveLength(NAVIGATION_ITEMS.length);
  });

  it("resolve o título do módulo ativo", () => {
    expect(getNavigationItem("focus")?.label).toBe("Desk de Foco");
    expect(getNavigationItem("inexistente")).toBeUndefined();
  });
});
