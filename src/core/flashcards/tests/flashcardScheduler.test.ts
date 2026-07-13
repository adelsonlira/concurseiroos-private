import { describe, expect, it } from "vitest";
import {
  FLASHCARD_POLICY_VERSION,
  scheduleFlashcardReview,
} from "../flashcardScheduler";
import type { FlashcardScheduleLike } from "../types";

function card(overrides: Partial<FlashcardScheduleLike> = {}): FlashcardScheduleLike {
  return {
    status: "NEW",
    intervaloDias: 1,
    repeticoes: 0,
    ...overrides,
  };
}

describe("scheduleFlashcardReview", () => {
  it("treats failure as evidence for immediate relearning, not as a correct recall", () => {
    const result = scheduleFlashcardReview({
      card: card(),
      performance: "FAILED",
      reviewedAt: "2026-07-13T10:00:00.000Z",
      examDate: "2026-10-11",
    });

    expect(result.nextStatus).toBe("LAPSED");
    expect(result.independentRecoveryStreak).toBe(0);
    expect(result.retrievalFailures).toBe(1);
    expect(result.requiresImmediateRelearning).toBe(true);
    expect(result.intervalDays).toBe(1);
  });

  it("keeps the first independent retrieval close instead of assuming mastery", () => {
    const effortful = scheduleFlashcardReview({
      card: card(),
      performance: "EFFORTFUL",
      reviewedAt: "2026-07-13T10:00:00.000Z",
      examDate: "2026-10-11",
    });
    const fluent = scheduleFlashcardReview({
      card: card(),
      performance: "FLUENT",
      reviewedAt: "2026-07-13T10:00:00.000Z",
      examDate: "2026-10-11",
    });

    expect(effortful.intervalDays).toBe(2);
    expect(fluent.intervalDays).toBe(3);
    expect(fluent.independentRecoveryStreak).toBe(1);
  });

  it("expands a repeated fluent retrieval but respects the exam horizon", () => {
    const result = scheduleFlashcardReview({
      card: card({
        status: "REVIEW",
        intervaloDias: 20,
        repeticoes: 4,
        politicaVersao: FLASHCARD_POLICY_VERSION,
        estabilidadeObservadaDias: 20,
        recuperacoesIndependentesConsecutivas: 4,
        historicoRecuperacoes: [
          {
            revisadoEm: "2026-09-15T10:00:00.000Z",
            resultado: "FLUENT",
            intervaloDecididoDias: 20,
            recuperacaoIndependente: true,
            racionalIntervalo: [],
          },
        ],
      }),
      performance: "FLUENT",
      reviewedAt: "2026-10-05T10:00:00.000Z",
      examDate: "2026-10-11",
    });

    expect(result.intervalDays).toBe(2);
    expect(result.nextReviewDate).toBe("2026-10-07");
    expect(result.rationale.join(" ")).toContain("horizonte");
  });

  it("never schedules a review after the exam", () => {
    const result = scheduleFlashcardReview({
      card: card({ intervaloDias: 30, repeticoes: 5 }),
      performance: "FLUENT",
      reviewedAt: "2026-10-10T10:00:00.000Z",
      examDate: "2026-10-11",
    });

    expect(result.nextReviewDate).toBe("2026-10-11");
  });

  it("records migration from legacy SM-2 without using its ease factor", () => {
    const legacyA = scheduleFlashcardReview({
      card: card({ intervaloDias: 6, repeticoes: 2 }),
      performance: "EFFORTFUL",
      reviewedAt: "2026-07-13T10:00:00.000Z",
    });
    const legacyB = scheduleFlashcardReview({
      card: card({ intervaloDias: 6, repeticoes: 2 }),
      performance: "EFFORTFUL",
      reviewedAt: "2026-07-13T10:00:00.000Z",
    });

    expect(legacyA.migratedFrom).toBe("SM2_LEGACY");
    expect(legacyA).toEqual(legacyB);
    expect(legacyA.policyVersion).toBe(FLASHCARD_POLICY_VERSION);
  });

  it("does not mutate the source card", () => {
    const source = card({
      status: "LAPSED",
      intervaloDias: 2,
      repeticoes: 0,
      falhasRecuperacao: 3,
    });
    const before = structuredClone(source);

    scheduleFlashcardReview({
      card: source,
      performance: "EFFORTFUL",
      reviewedAt: "2026-07-13T10:00:00.000Z",
      examDate: "2026-10-11",
    });

    expect(source).toEqual(before);
  });
});
