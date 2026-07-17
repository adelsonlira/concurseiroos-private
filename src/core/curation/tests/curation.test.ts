import { describe, expect, it } from "vitest";
import { appendCurationEvent, prioritizeReviewQueue, replayCurationLedger } from "../index";

describe("curation ledger", () => {
  it("mantém trilha append-only encadeada e detecta adulteração", () => {
    const first = appendCurationEvent({
      events: [],
      targetKind: "ANSWER_KEY_LINK",
      targetId: "exam-dataprev-2024-dev",
      actor: { id: "curator-1", role: "HUMAN_CURATOR" },
      occurredAt: "2026-07-16T10:00:00-03:00",
      payload: {
        decision: "APPROVED",
        reason: "Caderno, cargo e quantidade conferidos no documento oficial.",
        sourceIds: ["exam-pdf", "answer-key-pdf"],
        confidence: "HIGH",
      },
    });
    const second = appendCurationEvent({
      events: first,
      targetKind: "TARGET_EQUIVALENCE",
      targetId: "question-13",
      actor: { id: "curator-1", role: "HUMAN_CURATOR" },
      occurredAt: "2026-07-16T10:05:00-03:00",
      payload: {
        decision: "INSUFFICIENT_EVIDENCE",
        reason: "Não há conteúdo suficiente para mapear com segurança.",
        sourceIds: ["exam-pdf"],
        confidence: "LOW",
      },
    });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(2);
    expect(replayCurationLedger(second).integrity.valid).toBe(true);
    const tampered = structuredClone(second);
    tampered[0].payload.reason = "alterado";
    expect(replayCurationLedger(tampered).integrity.valid).toBe(false);
  });

  it("prioriza DATAPREV 2024 e desenvolvimento antes do backlog arbitrário", () => {
    const queue = prioritizeReviewQueue([
      { id: "other", targetKind: "QUESTION_EXTRACTION", targetId: "q2", contestSlug: "tj", issueKinds: ["EXTRACTION"] },
      { id: "target", targetKind: "ANSWER_KEY_LINK", targetId: "q1", contestSlug: "dataprev", examYear: 2024, roleLabel: "Desenvolvimento de Software", issueKinds: ["ANSWER_KEY", "CLASSIFICATION"], technicalProximity: "TARGET" },
    ]);
    expect(queue[0].id).toBe("target");
    expect(queue[0].priorityBand).toBe("P0_TARGET");
  });
});
