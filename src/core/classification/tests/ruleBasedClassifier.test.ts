import { describe, expect, it } from "vitest";
import { proposeRuleBasedClassification } from "../index";

describe("rule-based classification proposals", () => {
  it("propõe classificação conservadora sem torná-la elegível para incidência", () => {
    const proposal = proposeRuleBasedClassification({ questionId: "q1", text: "No Scrum, o Product Backlog e a Sprint são...", evidenceSourceId: "exam", evidencePage: 2 });
    expect(proposal?.targetTaxonomyNodeId).toBe("dp26-p3-esp-metodologias-ageis");
    expect(proposal?.status).toBe("PROPOSED");
    expect(proposal?.equivalenceStrength).toBe("APPROXIMATE");
    expect(proposal?.confidence).toBeLessThan(0.8);
  });
  it("recusa empate entre regras concorrentes", () => {
    const proposal = proposeRuleBasedClassification({
      questionId: "q2", text: "Scrum e SQL aparecem sem contexto suficiente.", evidenceSourceId: "exam", evidencePage: 3,
      rules: [
        { id: "a", targetTaxonomyNodeId: "a", keywords: [/scrum/i], confidence: 0.7 },
        { id: "b", targetTaxonomyNodeId: "b", keywords: [/sql/i], confidence: 0.7 },
      ],
    });
    expect(proposal).toBeNull();
  });
});
