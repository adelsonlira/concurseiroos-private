import { describe, expect, it } from "vitest";
import { evaluateClassificationEligibility, validateClassificationProposal } from "../index";

const base = {
  id: "c1", questionId: "q1", sourceTaxonomyNodeId: "source", targetTaxonomyNodeId: "target", equivalenceStrength: "EXACT" as const, confidence: 0.92, evidenceSourceIds: ["exam"], evidencePage: 10, method: "HUMAN" as const, status: "HUMAN_APPROVED" as const, rationale: "Conteúdo e escopo equivalentes.",
};

describe("classification confidence gates", () => {
  it("só libera incidência após revisão humana e vínculo completo", () => {
    expect(evaluateClassificationEligibility(base).eligibleForHistoricalIncidence).toBe(true);
    expect(evaluateClassificationEligibility({ ...base, method: "AI_ASSISTED", status: "PROPOSED" }).eligibleForHistoricalIncidence).toBe(false);
  });

  it("bloqueia equivalência NONE apontando para destino", () => {
    expect(validateClassificationProposal({ ...base, equivalenceStrength: "NONE" })).toContain("Equivalência NONE não pode apontar para nó-alvo.");
  });
});
