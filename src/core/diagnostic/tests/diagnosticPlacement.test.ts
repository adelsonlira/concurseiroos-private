import { describe, expect, it } from "vitest";
import { assessDiagnosticPlacement } from "../diagnosticPlacement";

function attempts(params: {
  total: number;
  correct: number;
  confidence?: "BAIXA" | "MEDIA" | "ALTA";
  consulted?: boolean;
  blank?: number;
}) {
  return Array.from({ length: params.total }, (_, index) => ({
    diagnosticoInicial: true,
    acertou: index < params.correct,
    nivelConfianca: params.confidence ?? "ALTA",
    consultouMaterial: params.consulted ?? false,
    respostaEmBranco: index >= params.total - (params.blank ?? 0)
  }));
}

describe("diagnostic placement", () => {
  it("mantém a decisão aberta antes de dez questões", () => {
    const result = assessDiagnosticPlacement(attempts({ total: 8, correct: 8 }));
    expect(result.status).toBe("INSUFFICIENT_SAMPLE");
    expect(result.missingQuestions).toBe(2);
  });

  it("dispensa teoria integral provisoriamente com 90%, confiança e ausência de consulta", () => {
    const result = assessDiagnosticPlacement(attempts({ total: 10, correct: 9, confidence: "MEDIA" }));
    expect(result.status).toBe("THEORY_BYPASS_ELIGIBLE");
    expect(result.hitRate).toBe(0.9);
  });

  it("não aceita o mesmo placar quando houve consulta", () => {
    const result = assessDiagnosticPlacement(attempts({ total: 10, correct: 9, consulted: true }));
    expect(result.status).toBe("THEORY_REQUIRED");
    expect(result.hasConsultation).toBe(true);
  });

  it("não aceita acertos de baixa confiança como base para dispensar teoria", () => {
    const result = assessDiagnosticPlacement(attempts({ total: 10, correct: 10, confidence: "BAIXA" }));
    expect(result.status).toBe("THEORY_REQUIRED");
    expect(result.hasUncertainAnswer).toBe(true);
  });

  it("ignora tentativas antigas não marcadas como diagnóstico inicial", () => {
    const result = assessDiagnosticPlacement([
      ...attempts({ total: 9, correct: 9 }),
      { diagnosticoInicial: false, acertou: true, nivelConfianca: "ALTA" as const }
    ]);
    expect(result.status).toBe("INSUFFICIENT_SAMPLE");
    expect(result.sampleSize).toBe(9);
  });
});
