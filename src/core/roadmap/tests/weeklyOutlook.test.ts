import { describe, expect, it } from "vitest";
import { buildWeeklyOutlook } from "../weeklyOutlook";
import type { SDEApplicationResult } from "../../../integrations/sde/types";
import { ConstitutionalTier, type StrategicAction } from "../../sde/prioritization/types";

function action(id: string, reasonCode: StrategicAction["reasonCode"] = "UNSEEN_THEORY"): StrategicAction {
  return {
    prioridade: 1,
    score: 10,
    tempoEstimadoMinutos: 25,
    estimatedDurationMinutes: 25,
    disciplinaId: "d",
    disciplinaNome: "Disciplina",
    assuntoId: "a",
    assuntoNome: "Assunto",
    subassuntoId: id,
    subassuntoNome: id,
    tipo: reasonCode === "SCHEDULED_REVIEW_DUE" ? "revisao" : "teoria",
    ganhoEsperado: null,
    riscoEvitado: null,
    hitRate: null,
    custoOportunidade: null,
    justificativaXAI: {
      porQue: `Motivo ${id}`,
      dadosUtilizados: "",
      beneficioEsperado: null,
      custoIgnorar: "",
      camadaConstitucional: ConstitutionalTier.EXPANSAO_EDITAL,
      fatosUtilizados: "",
      inferencias: "",
      dadosAusentes: [],
      nivelConfianca: "BAIXA",
      custoOportunidade: "",
      vetosConsiderados: []
    },
    camadaConstitucional: ConstitutionalTier.EXPANSAO_EDITAL,
    reasonCode,
    decisionEvidence: {
      knowledgeState: "UNSEEN" as never,
      sampleSize: 0,
      confidenceScore: 0,
      confidenceLevel: "LOW",
      topicWeightSource: "OFFICIAL",
      historicalIncidenceSource: "UNAVAILABLE",
      historicalIncidenceRate: null
    }
  };
}

function decision(actions: StrategicAction[], scheduled = 180, remaining = 180): SDEApplicationResult {
  return {
    status: remaining > 0 ? "SUCCESS" : "NO_TIME_AVAILABLE",
    referenceDate: "2026-07-13",
    availability: {
      date: "2026-07-13",
      scheduledMinutes: scheduled,
      completedMinutes: scheduled - remaining,
      remainingMinutes: remaining,
      source: "WEEKLY_SCHEDULE",
      includesBreaks: true,
      overrideReason: null
    },
    actions,
    planner: null,
    prescription: null,
    warnings: [],
    errors: []
  };
}

describe("weekly provisional outlook", () => {
  it("builds seven deterministic days and diversifies repeated expansion actions", () => {
    const a = action("s1");
    const b = action("s2");
    const c = action("s3");
    const d = action("s4");
    const outlook = buildWeeklyOutlook({
      referenceDate: "2026-07-13",
      decisionForDate: () => decision([a, b, c, d])
    });

    expect(outlook.days).toHaveLength(7);
    expect(outlook.days[0].primary?.subassuntoId).toBe("s1");
    expect(outlook.days[1].primary?.subassuntoId).toBe("s4");
    expect(outlook.caveats.join(" ")).toContain("provisória");
  });

  it("allows consecutive due reviews instead of suppressing a safety action", () => {
    const review = action("s1", "SCHEDULED_REVIEW_DUE");
    const outlook = buildWeeklyOutlook({
      referenceDate: "2026-07-13",
      numberOfDays: 2,
      decisionForDate: () => decision([review])
    });

    expect(outlook.days[0].primary?.subassuntoId).toBe("s1");
    expect(outlook.days[1].primary?.subassuntoId).toBe("s1");
  });

  it("preserves rest days and consumed days without inventing actions", () => {
    const outlook = buildWeeklyOutlook({
      referenceDate: "2026-07-13",
      numberOfDays: 2,
      decisionForDate: (date) =>
        date === "2026-07-13" ? decision([], 0, 0) : decision([action("s1")], 180, 0)
    });

    expect(outlook.days[0].status).toBe("REST_DAY");
    expect(outlook.days[0].primary).toBeNull();
    expect(outlook.days[1].status).toBe("NO_TIME_AVAILABLE");
    expect(outlook.days[1].primary).toBeNull();
  });

  it("rejects invalid horizons", () => {
    expect(() =>
      buildWeeklyOutlook({
        referenceDate: "2026-07-13",
        numberOfDays: 15,
        decisionForDate: () => decision([])
      })
    ).toThrow("entre 1 e 14");
  });
});
