import { describe, expect, it } from "vitest";
import { assessProductReadiness } from "../index";

describe("product readiness", () => {
  it("distingue uso local de integrações ainda não testadas", () => {
    const result = assessProductReadiness([
      { id: "sde", label: "SDE", status: "PASS", requiredForDailyUse: true, detail: "Auditado" },
      { id: "cloud", label: "Supabase autenticado", status: "NOT_TESTED", requiredForDailyUse: false, detail: "Sem credenciais locais" },
    ]);
    expect(result.status).toBe("READY_WITH_LIMITATIONS");
    expect(result.blockingChecks).toHaveLength(0);
  });
  it("bloqueia falha decisória obrigatória", () => {
    expect(assessProductReadiness([{ id: "sde", label: "SDE", status: "FAIL", requiredForDailyUse: true, detail: "Falhou" }]).status).toBe("NOT_READY");
  });
});
