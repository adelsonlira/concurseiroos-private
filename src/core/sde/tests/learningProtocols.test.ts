import { describe, expect, it } from "vitest";
import { buildExecutionSteps } from "../planner/blockBuilder";
import type { PlannerContext } from "../planner/plannerTypes";

const context: PlannerContext = {
  tempoDisponivelMinutos: 180,
  diasAteAProva: 90,
  referenceDate: "2026-07-13",
  bancaName: "FGV",
  tempoAlvoPorQuestaoSegundos: null,
  policy: {
    minSessionMinutes: { teoria: 15, questoes: 15, revisao: 10, flashcards: 5, simulado: 30 },
    maxSessionMinutes: { teoria: 60, questoes: 60, revisao: 45, flashcards: 30, simulado: 240 },
    cognitiveWeight: { teoria: 1, questoes: 1, revisao: 1, flashcards: 1, simulado: 1 },
    maxContinuousCognitiveLoad: 90,
    breakDurationMinutes: 5,
    minStudyMinutesAfterBreak: 10
  }
};

function total(steps: ReturnType<typeof buildExecutionSteps>): number {
  return steps.reduce((sum, step) => sum + step.tempoMinutos, 0);
}

describe("planner learning protocols", () => {
  it("turns theory into study plus closed-book retrieval without changing session duration", () => {
    const steps = buildExecutionSteps("teoria", 40, "REST", context, "UNSEEN_THEORY");
    expect(total(steps)).toBe(40);
    expect(steps.map((step) => step.descricao).join(" ")).toMatch(/recuperar.*sem consulta/i);
    expect(steps.map((step) => step.descricao).join(" ")).toMatch(/confirmar a cobertura/i);
  });

  it("adds correction and a second attempt to diagnostic questions", () => {
    const steps = buildExecutionSteps("questoes", 45, "SQL", context, "DIAGNOSTIC_QUESTIONS");
    expect(total(steps)).toBe(45);
    expect(steps.map((step) => step.descricao).join(" ")).toMatch(/amostra diagnóstica/i);
    expect(steps.map((step) => step.descricao).join(" ")).toMatch(/questão contrastiva/i);
  });

  it("uses retrieval-feedback-retrieval for review sessions", () => {
    const steps = buildExecutionSteps("revisao", 25, "OWASP", context, "SCHEDULED_REVIEW_DUE");
    expect(total(steps)).toBe(25);
    expect(steps).toHaveLength(3);
    expect(steps[0].descricao).toMatch(/sem consulta/i);
    expect(steps[2].descricao).toMatch(/segunda recuperação/i);
  });
});
