import { describe, expect, it } from "vitest";
import { buildHistoricalShadowMatrix, compareShadowRanking } from "../index";

describe("historical shadow matrix", () => {
  it("usa somente sinais revisados, definitivos e canônicos", () => {
    const matrix = buildHistoricalShadowMatrix({
      eligibleExamIds: ["e1", "e2"],
      signals: [
        { canonicalQuestionId: "q1", examId: "e1", examYear: 2024, targetNodeId: "topic", equivalenceStrength: "EXACT", confidence: 0.9, humanReviewed: true, definitiveAnswerLinked: true, duplicateRepresentative: true },
        { canonicalQuestionId: "q2", examId: "e2", examYear: 2025, targetNodeId: "topic", equivalenceStrength: "PARTIAL", confidence: 0.95, humanReviewed: false, definitiveAnswerLinked: true, duplicateRepresentative: true },
      ],
    });
    expect(matrix[0].matchedQuestions).toBe(1);
    expect(matrix[0].eligibleForSDE).toBe(false);
  });

  it("compara ranking sem autorizar ativação", () => {
    const comparison = compareShadowRanking({ currentTopicOrder: ["a", "b"], simulatedTopicOrder: ["b", "a"] });
    expect(comparison.every((item) => item.activationAllowed === false)).toBe(true);
    expect(comparison[0].status).toBe("CHANGED");
  });
});
