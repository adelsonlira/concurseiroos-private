import { describe, expect, it } from "vitest";
import { auditRankingStability } from "../validation/rankingStability";
import type { StrategicAction } from "../prioritization/types";

function action(subtopic: string, rank: number): StrategicAction {
  return { disciplinaId: "d", assuntoId: "t", subassuntoId: subtopic, tipo: "teoria", prioridade: rank } as StrategicAction;
}

describe("ranking stability audit", () => {
  it("bloqueia salto brusco sem mudança de evidência", () => {
    const result = auditRankingStability({ previous: [action("a", 1), action("b", 2)], next: [action("b", 1), action("a", 6)], maximumUnexplainedRankDelta: 2 });
    expect(result.valid).toBe(false);
  });
  it("aceita mudança quando a evidência da ação foi explicitamente alterada", () => {
    const key = "d:t:a:teoria";
    const result = auditRankingStability({ previous: [action("a", 1)], next: [action("a", 8)], changedEvidenceActionKeys: [key], maximumUnexplainedRankDelta: 2 });
    expect(result.valid).toBe(true);
  });
});
