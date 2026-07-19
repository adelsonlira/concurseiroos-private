import { describe, expect, it } from "vitest";
import { buildHistoricalIncidenceSignal } from "../historicalIncidence";
import { selectStudyMethod } from "../methodSelector";
import { buildScoreComponents, evaluateHardRules, scoreFromComponents } from "../scoreEngine";
import type { KnowledgeStateAssessment } from "../types";

function knowledge(overrides: Partial<KnowledgeStateAssessment> = {}): KnowledgeStateAssessment {
  return {
    nodeId: "s1", state: "PRACTICING", weightedAccuracy: 0.7, effectiveSampleSize: 10,
    lastEvidenceAt: "2026-07-18T12:00:00Z", ageInDays: 0, consultedEvidenceRatio: 0,
    trend: "STABLE", confidence: "MEDIUM", primaryErrorCause: null,
    theoryCoverage: "CONFIRMED", reviewPending: false, evidenceIds: ["e1"], reasons: [], ...overrides,
  };
}

describe("SDE v2 method selection", () => {
  it("uses a short diagnostic when evidence is absent and material exists", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ state: "UNSEEN", weightedAccuracy: null, effectiveSampleSize: 0 }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 50 }).method).toBe("short_diagnostic");
  });
  it("uses theory when evidence is absent and no material locator is available", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ state: "UNSEEN", weightedAccuracy: null, effectiveSampleSize: 0 }), prerequisiteBlocked: false, materialAvailable: false, availableMinutes: 50 }).method).toBe("theory_notebooklm");
  });
  it("uses concept recovery for a conceptual gap", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ primaryErrorCause: "conceptual_gap" }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 60 }).method).toBe("concept_recovery");
  });
  it("uses FGV questions for application or interpretation errors", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ primaryErrorCause: "application" }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 45 }).method).toBe("fgv_question_batch");
  });
  it("uses active review for memory errors", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ primaryErrorCause: "memory" }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 40 }).method).toBe("active_review");
  });
  it("uses a timed batch for time-management errors", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ primaryErrorCause: "time_management" }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 40 }).method).toBe("timed_question_batch");
  });
  it("uses structured recovery for critical recurring errors", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ state: "CRITICAL" }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 45 }).method).toBe("structured_error_recovery");
  });
  it("uses prerequisite recovery before advanced content", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge(), prerequisiteBlocked: true, materialAvailable: true, availableMinutes: 45 }).method).toBe("prerequisite_recovery");
  });
  it("uses spaced maintenance for stable evidence", () => {
    expect(selectStudyMethod({ knowledgeState: knowledge({ state: "STABLE", weightedAccuracy: 0.9, effectiveSampleSize: 30 }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 30 }).method).toBe("spaced_maintenance");
  });
  it("keeps full and reduced plans inside the available time", () => {
    const method = selectStudyMethod({ knowledgeState: knowledge({ primaryErrorCause: "conceptual_gap" }), prerequisiteBlocked: false, materialAvailable: true, availableMinutes: 18 });
    expect(method.executionSequence.reduce((sum, step) => sum + step.minutes, 0)).toBeLessThanOrEqual(18);
    expect(method.reducedPlan.reduce((sum, step) => sum + step.minutes, 0)).toBeLessThanOrEqual(18);
    expect(method.advanceCriterion).toMatch(/80%/);
  });
});

describe("SDE v2 scoring and hard rules", () => {
  function components(shadow = buildHistoricalIncidenceSignal("s1")) {
    return buildScoreComponents({
      officialWeightNormalized: 0.5,
      knowledgeState: knowledge(),
      coverageGap: 0.4,
      eliminationRisk: 0.8,
      reviewUrgency: 0.5,
      prerequisiteValue: 0.4,
      transferValue: 0.3,
      evidenceQuality: 0.6,
      examProximity: 0.5,
      expectedReturnPerMinute: 0.5,
      materialAvailable: true,
      recentDiversity: 1,
      historicalIncidenceShadow: shadow,
    });
  }

  it("produces a finite score between zero and one hundred", () => {
    const score = scoreFromComponents(components());
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("exposes every component contribution and fallback", () => {
    const result = components();
    expect(result.length).toBeGreaterThan(10);
    expect(result.every((item) => Number.isFinite(item.contribution) && item.explanation.length > 0)).toBe(true);
  });

  it("keeps historical incidence outside the score", () => {
    const none = scoreFromComponents(components(buildHistoricalIncidenceSignal("s1")));
    const high = scoreFromComponents(components(buildHistoricalIncidenceSignal("s1", { nodeId: "s1", observedCount: 100, deduplicatedCount: 80, recencyAdjustedValue: 1, roleProximityValue: 1, classificationConfidence: 1 })));
    expect(high).toBe(none);
    expect(buildHistoricalIncidenceSignal("s1").decisionWeight).toBe(0);
  });

  it("favors elimination risk and urgent reviews", () => {
    const rules = evaluateHardRules({ inActiveSyllabus: true, eliminationRisk: 1, reviewUrgent: true, requiredPrerequisiteBlocked: false, availableMinutes: 30, estimatedMinutes: 25, materialAvailable: true, evidenceSufficientForMethod: true, excessiveRecentRepetition: false, nodeId: "s1" });
    expect(rules.find((item) => item.condition === "ELIMINATION_OR_ZERO_RISK")?.result).toBe("FAVORED");
    expect(rules.find((item) => item.condition === "URGENT_REVIEW")?.result).toBe("FAVORED");
  });

  it("blocks required prerequisites, insufficient time and excessive repetition", () => {
    const rules = evaluateHardRules({ inActiveSyllabus: true, eliminationRisk: 0, reviewUrgent: false, requiredPrerequisiteBlocked: true, availableMinutes: 10, estimatedMinutes: 25, materialAvailable: true, evidenceSufficientForMethod: true, excessiveRecentRepetition: true, nodeId: "s1" });
    expect(rules.filter((item) => item.result === "BLOCKED").map((item) => item.condition)).toEqual(expect.arrayContaining(["REQUIRED_PREREQUISITE", "AVAILABLE_TIME", "RECENT_REPETITION"]));
  });
});
