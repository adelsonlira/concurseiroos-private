import { describe, expect, it } from "vitest";
import { evaluateQuestionEligibility, QuestionEvidenceRecord } from "../questionEligibility";

const base: QuestionEvidenceRecord = {
  questionHash: "q1",
  canonicalQuestionHash: "q1",
  classificationStatus: "MANUALLY_REVIEWED",
  primaryTopicId: "topic",
  primarySubtopicId: "subtopic",
  answerKeyOption: "A",
  answerKeyStatus: "PRELIMINARY",
  answerKeyMatchStatus: "EXACT_TITLE_AND_CADERNO_MATCH",
  duplicateType: null
};

describe("question evidence eligibility", () => {
  it("allows audited analytics but not a quiz from an excerpt-only record", () => {
    const result = evaluateQuestionEligibility(base);
    expect(result.analyticEligible).toBe(true);
    expect(result.inAppPracticeEligible).toBe(false);
    expect(result.provisionalAnswerKey).toBe(true);
    expect(result.reasons).toContain("FULL_QUESTION_AND_OPTIONS_NOT_AVAILABLE");
  });

  it("allows in-app practice only with full options and complete provenance", () => {
    const result = evaluateQuestionEligibility({
      ...base,
      answerKeyStatus: "DEFINITIVE",
      fullStem: "Enunciado completo",
      fullOptions: ["A", "B", "C", "D", "E"]
    });
    expect(result).toMatchObject({
      analyticEligible: true,
      inAppPracticeEligible: true,
      provisionalAnswerKey: false,
      reasons: []
    });
  });

  it("blocks auto-classified questions from audited analytics", () => {
    const result = evaluateQuestionEligibility({
      ...base,
      classificationStatus: "AUTO_CLASSIFIED_HIGH_CONFIDENCE"
    });
    expect(result.analyticEligible).toBe(false);
    expect(result.reasons).toContain("CLASSIFICATION_NOT_MANUALLY_REVIEWED");
  });

  it("blocks duplicate and non-exact answer-key records", () => {
    const result = evaluateQuestionEligibility({
      ...base,
      answerKeyMatchStatus: "TITLE_ONLY",
      duplicateType: "CROSS_EXPORT_DUPLICATE"
    });
    expect(result.analyticEligible).toBe(false);
    expect(result.reasons).toContain("ANSWER_KEY_NOT_EXACTLY_MATCHED");
    expect(result.reasons).toContain("NON_CANONICAL_DUPLICATE");
  });
});
