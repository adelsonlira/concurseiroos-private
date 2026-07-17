import { describe, expect, it } from "vitest";
import { buildOnboardingPlan } from "../index";

describe("onboarding coach-first", () => {
  it("aplica padrões seguros e pede decisão apenas para disponibilidade ausente", () => {
    const plan = buildOnboardingPlan({ competitionSelected: true, examDateKnown: true, availabilityConfigured: false, hasMaterialLocator: false, hasQuestionSource: false, backupConfigured: false });
    expect(plan.readyToStudy).toBe(true);
    expect(plan.steps.filter((step) => step.studentDecisionRequired)).toHaveLength(1);
    expect(plan.steps.find((step) => step.id === "materials")?.studentDecisionRequired).toBe(false);
  });
});
