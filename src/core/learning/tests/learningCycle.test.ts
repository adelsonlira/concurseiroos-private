import { describe, expect, it } from "vitest";
import { assessGuidedLearningCycle } from "../index";

const evidence = {
  id: "e1", prescriptionId: "p1", sessionId: "s1", recordedAt: "2026-07-16T10:00:00-03:00", preStudyResponses: [{ questionIndex: 0, state: "DONT_KNOW" as const }], postStudyResponses: [{ questionIndex: 0, state: "CORRECT" as const }], usedMaterialDuringFinalRecall: false, remainingDoubts: [], selfReportedFatigue: "LOW" as const,
};

describe("guided learning cycle", () => {
  it("não confirma domínio sem recuperação final", () => {
    expect(assessGuidedLearningCycle({ ...evidence, postStudyResponses: [] }).status).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("exige reaprendizagem quando houve consulta na recuperação final", () => {
    expect(assessGuidedLearningCycle({ ...evidence, usedMaterialDuringFinalRecall: true }).nextAction).toBe("TARGETED_RELEARNING");
  });
  it("avança apenas com ao menos 80% sem consulta", () => {
    expect(assessGuidedLearningCycle(evidence).status).toBe("MASTERED_FOR_NOW");
  });
});
