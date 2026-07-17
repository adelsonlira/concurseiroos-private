import { describe, expect, it } from "vitest";
import { resolveLatestQuestionBatchProgress } from "../questionBatchProgress";

describe("questionBatchProgress", () => {
  it("conta tentativas explicitamente ligadas à prescrição", () => {
    const result = resolveLatestQuestionBatchProgress({
      sessions: [
        {
          sessionId: "session-1",
          endedAt: "2026-07-15T10:00:00.000Z",
          disciplineId: "d1",
          topicId: "a1",
          subtopicId: "s1",
          prescriptionId: "p1",
          targetQuestionCount: 3,
          stretchQuestionCount: 4
        }
      ],
      attempts: [
        { attemptedAt: "2026-07-15T10:05:00.000Z", disciplineId: "d1", topicId: "a1", subtopicId: "s1", contextId: "p1" },
        { attemptedAt: "2026-07-15T10:06:00.000Z", disciplineId: "d1", topicId: "a1", subtopicId: "s1", contextId: "p1" }
      ]
    });

    expect(result).toMatchObject({
      completedQuestionCount: 2,
      remainingQuestionCount: 1,
      isTargetComplete: false,
      isStretchComplete: false
    });
  });

  it("aceita tentativa sem contexto somente depois da sessão e no mesmo escopo", () => {
    const result = resolveLatestQuestionBatchProgress({
      sessions: [
        {
          sessionId: "session-1",
          endedAt: "2026-07-15T10:00:00.000Z",
          disciplineId: "d1",
          topicId: "a1",
          targetQuestionCount: 2
        }
      ],
      attempts: [
        { attemptedAt: "2026-07-15T09:59:00.000Z", disciplineId: "d1", topicId: "a1" },
        { attemptedAt: "2026-07-15T10:01:00.000Z", disciplineId: "d2", topicId: "a1" },
        { attemptedAt: "2026-07-15T10:02:00.000Z", disciplineId: "d1", topicId: "a1" },
        { attemptedAt: "2026-07-15T10:03:00.000Z", disciplineId: "d1", topicId: "a1", contextId: "outra" }
      ]
    });

    expect(result?.completedQuestionCount).toBe(1);
    expect(result?.remainingQuestionCount).toBe(1);
  });

  it("usa a sessão prescrita mais recente", () => {
    const result = resolveLatestQuestionBatchProgress({
      sessions: [
        {
          sessionId: "old",
          endedAt: "2026-07-14T10:00:00.000Z",
          disciplineId: "d1",
          topicId: "a1",
          targetQuestionCount: 10
        },
        {
          sessionId: "new",
          endedAt: "2026-07-15T10:00:00.000Z",
          disciplineId: "d2",
          topicId: "a2",
          targetQuestionCount: 1
        }
      ],
      attempts: [
        { attemptedAt: "2026-07-15T10:01:00.000Z", disciplineId: "d2", topicId: "a2" }
      ]
    });

    expect(result).toMatchObject({ sessionId: "new", isTargetComplete: true });
  });
});
