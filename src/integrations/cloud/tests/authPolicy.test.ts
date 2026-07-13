import { describe, expect, it } from "vitest";
import { describeAuthError, normalizeAuthEmail } from "../authPolicy";

describe("auth policy", () => {
  it("normaliza o e-mail antes de autenticar", () => {
    expect(normalizeAuthEmail("  Usuario@Exemplo.COM ")).toBe("usuario@exemplo.com");
  });

  it("traduz credenciais inválidas sem revelar qual campo falhou", () => {
    expect(describeAuthError(new Error("Invalid login credentials"))).toContain(
      "E-mail ou senha não conferem"
    );
  });

  it("preserva mensagens desconhecidas para diagnóstico", () => {
    expect(describeAuthError(new Error("AUTH_UNKNOWN"))).toBe("AUTH_UNKNOWN");
  });
});
