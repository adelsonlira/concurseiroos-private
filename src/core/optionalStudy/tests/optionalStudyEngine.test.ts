import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import {
  appendOptionalStudyEvent,
  buildOptionalStudyCalibrationRecord,
  buildOptionalStudyRecommendation,
  deriveOptionalStudyState,
  durationWarning,
  hashOptionalStudyInput,
  OPTIONAL_STUDY_QUICK_DURATIONS,
  validateManualOptionalChoice,
} from "..";
import type { OptionalStudyLedgerEvent } from "../types";

const seed = buildDataprev2026Profile3AppSeed();

function input(overrides: Record<string, unknown> = {}) {
  return {
    now: "2026-07-19T12:00:00.000Z",
    localDate: "2026-07-19",
    context: "rest_day_optional" as const,
    scheduledMinutes: 0,
    completedMinutes: 0,
    remainingMinutes: 0,
    weeklyStudiedMinutes: 0,
    examDate: seed.concurso.dataProva,
    effectiveDecision: null,
    disciplines: seed.disciplinas,
    topics: seed.assuntos,
    subtopics: seed.subassuntos,
    sessions: [],
    reviews: [],
    errorCases: [],
    materials: seed.biblioteca,
    evidence: [],
    ...overrides,
  } as Parameters<typeof buildOptionalStudyRecommendation>[0];
}

function event(partial: Partial<OptionalStudyLedgerEvent> = {}): OptionalStudyLedgerEvent {
  return {
    eventId: "e1",
    schemaVersion: 1,
    occurredAt: "2026-07-19T12:00:00.000Z",
    localDate: "2026-07-19",
    eventType: "recommendation_generated",
    context: "rest_day_optional",
    recommendationId: "r1",
    inputFingerprint: "f1",
    engineVersion: "1.0",
    isOptional: true,
    mandatory: false,
    affectsPlanCompliance: false,
    payload: {},
    ...partial,
  };
}

describe("optional study deterministic engine", () => {
  it("offers the required quick durations", () => expect(OPTIONAL_STUDY_QUICK_DURATIONS).toEqual([15, 30, 45, 60, 90, 120]));
  it("accepts a custom positive duration", () => expect(durationWarning(37)).toBeNull());
  it("warns above 120 without blocking", () => expect(durationWarning(121)).toMatch(/ultrapassa/i));
  it("rejects a non-positive duration", () => expect(durationWarning(0)).toMatch(/positiva/i));
  it("generates a Sunday recommendation", () => expect(buildOptionalStudyRecommendation(input())).not.toBeNull());
  it("marks the recommendation as rest-day optional", () => expect(buildOptionalStudyRecommendation(input())?.context).toBe("rest_day_optional"));
  it("keeps SDE v1 effective in the input snapshot", () => expect(buildOptionalStudyRecommendation(input())?.snapshot.sdeV1Effective).toBe(true));
  it("keeps SDE v2 in shadow", () => expect(buildOptionalStudyRecommendation(input())?.snapshot.sdeV2ExecutionMode).toBe("shadow"));
  it("marks SDE v2 as non-prescriptive", () => expect(buildOptionalStudyRecommendation(input())?.snapshot.sdeV2AffectsPrescription).toBe(false));
  it("includes discipline, topic, method and duration", () => expect(buildOptionalStudyRecommendation(input())?.primary).toMatchObject({ disciplineId: expect.any(String), topicId: expect.any(String), method: expect.any(String), durationMinutes: expect.any(Number) }));
  it("includes a completion criterion", () => expect(buildOptionalStudyRecommendation(input())?.primary.completionCriterion.length).toBeGreaterThan(10));
  it("includes an expected pedagogical effect", () => expect(buildOptionalStudyRecommendation(input())?.primary.expectedPedagogicalEffect.length).toBeGreaterThan(10));
  it("limits alternatives to four", () => expect(buildOptionalStudyRecommendation(input())?.alternatives.length).toBeLessThanOrEqual(4));
  it("diversifies alternative methods", () => {
    const recommendation = buildOptionalStudyRecommendation(input())!;
    expect(new Set([recommendation.primary.method, ...recommendation.alternatives.map((o) => o.method)]).size).toBe(1 + recommendation.alternatives.length);
  });
  it("does not invent material when none is available", () => {
    const recommendation = buildOptionalStudyRecommendation(input({ materials: [] }))!;
    expect(recommendation.primary.materialId).toBeUndefined();
    expect(recommendation.primary.materialLabel).toBeUndefined();
  });
  it("uses a light duration after high weekly load", () => expect(buildOptionalStudyRecommendation(input({ weeklyStudiedMinutes: 700 }))?.primary.durationMinutes).toBe(15));
  it("warns about high weekly load", () => expect(buildOptionalStudyRecommendation(input({ weeklyStudiedMinutes: 700 }))?.primary.warnings.join(" ")).toMatch(/carga alta/i));
  it("produces a stable fingerprint", () => expect(hashOptionalStudyInput({ a: 1, b: [2] })).toBe(hashOptionalStudyInput({ b: [2], a: 1 })));
  it("changes the fingerprint when inputs change", () => expect(hashOptionalStudyInput({ a: 1 })).not.toBe(hashOptionalStudyInput({ a: 2 })));
  it("append-only ignores duplicate event IDs", () => expect(appendOptionalStudyEvent([event()], event())).toHaveLength(1));
  it("append-only preserves prior event objects", () => {
    const first = event(); const second = event({ eventId: "e2", eventType: "hidden_for_today" });
    expect(appendOptionalStudyEvent([first], second)[0]).toBe(first);
  });
  it("derives hidden state", () => expect(deriveOptionalStudyState([event({ eventType: "hidden_for_today" })], "2026-07-19").hidden).toBe(true));
  it("derives rest-kept state", () => expect(deriveOptionalStudyState([event({ eventType: "rest_kept" })], "2026-07-19").restKept).toBe(true));
  it("manual validation warns about prerequisite and missing material", () => expect(validateManualOptionalChoice({ durationMinutes: 30, materialMatchConfidence: "none", prerequisiteAdequate: false, weeklyStudiedMinutes: 0, method: "theory_notebooklm", environment: "notebooklm" })).toHaveLength(2));
  it("calibration record is optional, shadow and non-prescriptive", () => {
    const calibration = buildOptionalStudyCalibrationRecord(buildOptionalStudyRecommendation(input())!);
    expect(calibration).toMatchObject({ decisionContext: "optional_study", activeSdeVersion: "v1", executionMode: "shadow", affectsPrescription: false });
  });
});
