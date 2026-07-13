import { describe, expect, it } from "vitest";
import { ConstitutionalTier, StrategicAction } from "../prioritization/types";
import {
  ActivityTimeAllocation,
  allocateTime
} from "../planner/timeAllocator";
import { allocateReviewSafeguards } from "../planner/reviewAllocator";
import { redistributeAllocations } from "../planner/blockBuilder";
import { getCognitiveLoad } from "../planner/sessionOptimizer";
import {
  PlannerContext,
  PlannerPolicy,
  StudySession
} from "../planner/plannerTypes";
import { createStudyPlan } from "../planner/studyPlanner";
import { STRATEGY_TEMPLATES } from "../planner/strategyTemplates";

const policy: PlannerPolicy = {
  minSessionMinutes: {
    teoria: 20,
    questoes: 15,
    revisao: 15,
    flashcards: 10,
    simulado: 90
  },
  maxSessionMinutes: {
    teoria: 50,
    questoes: 60,
    revisao: 35,
    flashcards: 20,
    simulado: 180
  },
  cognitiveWeight: {
    teoria: 1.1,
    questoes: 1.2,
    revisao: 0.9,
    flashcards: 0.6,
    simulado: 1.3
  },
  maxContinuousCognitiveLoad: 60,
  breakDurationMinutes: 10,
  minStudyMinutesAfterBreak: 15
};

function context(overrides: Partial<PlannerContext> = {}): PlannerContext {
  return {
    tempoDisponivelMinutos: 180,
    diasAteAProva: 90,
    referenceDate: "2026-07-12",
    bancaName: "Banca X",
    tipoQuestao: "MULTIPLA_ESCOLHA",
    tempoAlvoPorQuestaoSegundos: null,
    seedId: "planner-test",
    policy,
    ...overrides
  };
}

function action(
  prioridade: number,
  tipo: StrategicAction["tipo"],
  duration: number,
  overrides: Partial<StrategicAction> = {}
): StrategicAction {
  return {
    prioridade,
    score: 100 - prioridade,
    tempoEstimadoMinutos: duration,
    estimatedDurationMinutes: duration,
    disciplinaId: `d-${prioridade}`,
    disciplinaNome: `Disciplina ${prioridade}`,
    assuntoId: `a-${prioridade}`,
    assuntoNome: `Assunto ${prioridade}`,
    tipo,
    ganhoEsperado: null,
    riscoEvitado: null,
    hitRate: 0.7,
    custoOportunidade: null,
    justificativaXAI: {
      porQue: "Justificativa de teste que menciona FGV e não deve ser usada para descobrir a banca.",
      dadosUtilizados: "banca FGV",
      beneficioEsperado: null,
      custoIgnorar: "N/A",
      camadaConstitucional: ConstitutionalTier.RETORNO_ESPERADO,
      fatosUtilizados: "N/A",
      inferencias: "N/A",
      dadosAusentes: [],
      nivelConfianca: "MEDIA",
      custoOportunidade: "N/A",
      vetosConsiderados: []
    },
    camadaConstitucional: ConstitutionalTier.RETORNO_ESPERADO,
    diagnosticPurpose: false,
    reasonCode: tipo === "teoria" ? "LOW_PERFORMANCE_THEORY" :
      tipo === "revisao" ? "REVISION_EXPIRED" :
      tipo === "flashcards" ? "FLASHCARDS_PENDING" :
      tipo === "simulado" ? "SIMULADO_ELIGIBLE" : "OBSERVED_PRACTICE",
    ...overrides
  };
}

function studySessions(result: ReturnType<typeof createStudyPlan>): StudySession[] {
  if (result.status !== "SUCCESS") return [];
  return result.plan.blocos.flatMap((block) => block.sessões);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

describe("Sprint P0.1-C - planner seguro e determinístico", () => {
  it("aceita tempo diário variável como entrada do planner", () => {
    const actions = [action(1, "questoes", 120), action(2, "questoes", 120)];
    const shortPlan = createStudyPlan({ actions, context: context({ tempoDisponivelMinutos: 90 }) });
    const longPlan = createStudyPlan({ actions, context: context({ tempoDisponivelMinutos: 180 }) });
    expect(shortPlan.status).toBe("SUCCESS");
    expect(longPlan.status).toBe("SUCCESS");
    if (shortPlan.status !== "SUCCESS" || longPlan.status !== "SUCCESS") throw new Error("planos ausentes");
    expect(shortPlan.plan.tempoDisponivelMinutos).toBe(90);
    expect(longPlan.plan.tempoDisponivelMinutos).toBe(180);
    expect(longPlan.plan.tempoTotalPlanejadoMinutos).toBeGreaterThan(shortPlan.plan.tempoTotalPlanejadoMinutos);
  });

  it("preserva prioridade estratégica entre tipos diferentes", () => {
    const result = createStudyPlan({
      actions: [action(2, "teoria", 40), action(1, "questoes", 50), action(3, "revisao", 25)],
      context: context()
    });
    const firstStudy = studySessions(result).find((session) => session.tipo !== "descanso");
    expect(firstStudy).toBeDefined();
    expect(firstStudy?.strategicPriority).toBe(1);
    expect(firstStudy?.tipo).toBe("questoes");
  });

  it("mantém prioridades não decrescentes nas sessões de estudo", () => {
    const result = createStudyPlan({
      actions: [
        action(1, "questoes", 50),
        action(2, "teoria", 40),
        action(3, "revisao", 25),
        action(4, "questoes", 20)
      ],
      context: context()
    });
    const priorities = studySessions(result)
      .filter((session) => session.tipo !== "descanso")
      .map((session) => session.strategicPriority as number);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });

  it("a prioridade 1 recebe mínimo operacional mesmo com ratio zero", () => {
    const result = createStudyPlan({
      actions: [action(1, "teoria", 20), action(2, "revisao", 60)],
      context: context({ diasAteAProva: 1, tempoDisponivelMinutos: 80 }),
      forcedStrategyId: "EXAM_TOMORROW"
    });
    const firstStudy = studySessions(result).find((session) => session.tipo !== "descanso");
    expect(firstStudy?.tipo).toBe("teoria");
    expect(firstStudy?.tempoMinutos).toBeGreaterThanOrEqual(policy.minSessionMinutes.teoria);
  });

  it("não cria simulado quando não existe ação validada", () => {
    const result = createStudyPlan({
      actions: [action(1, "questoes", 60)],
      context: context({ tempoDisponivelMinutos: 120 })
    });
    expect(studySessions(result).some((session) => session.tipo === "simulado")).toBe(false);
  });

  it("agenda simulado existente quando a estratégia permite", () => {
    const result = createStudyPlan({
      actions: [action(1, "simulado", 110)],
      context: context({ tempoDisponivelMinutos: 120 }),
      forcedStrategyId: "NORMAL"
    });
    const sessions = studySessions(result);
    expect(sessions.some((session) => session.tipo === "simulado")).toBe(true);
    expect(sessions.some((session) => session.tipo === "descanso")).toBe(false);
  });

  it("não transforma plano somente de simulado em descanso", () => {
    const result = createStudyPlan({
      actions: [action(1, "simulado", 120)],
      context: context({ tempoDisponivelMinutos: 120 }),
      forcedStrategyId: "NORMAL"
    });
    const sessions = studySessions(result);
    expect(sessions[0]?.tipo).toBe("simulado");
    expect(sessions.every((session) => session.tipo === "simulado" || session.tipo === "descanso")).toBe(true);
  });

  it("adia simulado com razão estruturada quando a estratégia não permite", () => {
    const result = createStudyPlan({
      actions: [action(1, "revisao", 40), action(2, "simulado", 100)],
      context: context({ diasAteAProva: 7, tempoDisponivelMinutos: 90 }),
      forcedStrategyId: "7_DAYS"
    });
    expect(result.status).toBe("SUCCESS");
    if (result.status !== "SUCCESS") throw new Error("plano ausente");
    expect(result.plan.deferredActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ reasonCode: "STRATEGY_DISALLOWS_SIMULADO" })
    ]));
    expect(studySessions(result).some((session) => session.tipo === "simulado")).toBe(false);
  });

  it("insere pausas apenas entre sessões", () => {
    const result = createStudyPlan({
      actions: [
        action(1, "questoes", 60),
        action(2, "teoria", 50),
        action(3, "revisao", 30),
        action(4, "questoes", 30)
      ],
      context: context({ tempoDisponivelMinutos: 180 })
    });
    const sessions = studySessions(result);
    const breakIndexes = sessions
      .map((session, index) => session.tipo === "descanso" ? index : -1)
      .filter((index) => index >= 0);
    expect(breakIndexes.length).toBeGreaterThan(0);
    expect(breakIndexes.every((index) => index > 0 && index < sessions.length - 1)).toBe(true);
    expect(sessions.at(-1)?.tipo).not.toBe("descanso");
  });

  it("carga cognitiva considera duração da sessão", () => {
    const base: StudySession = {
      id: "s",
      sequencia: 1,
      actionId: "a",
      strategicPriority: 1,
      sourceScore: 1,
      disciplinaId: "d",
      disciplinaNome: "D",
      assuntoId: "a",
      assuntoNome: "A",
      tipo: "questoes",
      tempoMinutos: 15,
      objetivos: [],
      passosExecucao: []
    };
    expect(getCognitiveLoad({ ...base, tempoMinutos: 60 }, context())).toBeGreaterThan(
      getCognitiveLoad(base, context())
    );
  });

  it("tempo total planejado nunca excede a janela disponível", () => {
    const result = createStudyPlan({
      actions: [action(1, "questoes", 120), action(2, "teoria", 120), action(3, "revisao", 120)],
      context: context({ tempoDisponivelMinutos: 180 })
    });
    expect(result.status).toBe("SUCCESS");
    if (result.status !== "SUCCESS") throw new Error("plano ausente");
    expect(result.plan.tempoTotalPlanejadoMinutos).toBeLessThanOrEqual(180);
    expect(result.plan.tempoTotalPlanejadoMinutos + result.plan.tempoNaoAlocadoMinutos).toBe(180);
  });

  it("minutos não utilizáveis são reportados, não convertidos em atividade inventada", () => {
    const result = createStudyPlan({
      actions: [action(1, "questoes", 30)],
      context: context({ tempoDisponivelMinutos: 180 })
    });
    expect(result.status).toBe("SUCCESS");
    if (result.status !== "SUCCESS") throw new Error("plano ausente");
    expect(result.plan.tempoNaoAlocadoMinutos).toBeGreaterThan(0);
    expect(result.plan.adjustments.some((item) => item.code === "UNALLOCATED_TIME")).toBe(true);
  });

  it("usa banca explícita do contexto e não extrai banca da XAI", () => {
    const result = createStudyPlan({
      actions: [action(1, "questoes", 45)],
      context: context({ bancaName: "Banca Contextual" })
    });
    const text = JSON.stringify(result);
    expect(text).toContain("Banca Contextual");
    expect(text).not.toContain("questões FGV");
  });

  it("usa tempo-alvo por questão somente quando informado", () => {
    const withTarget = createStudyPlan({
      actions: [action(1, "questoes", 45)],
      context: context({ tempoAlvoPorQuestaoSegundos: 180 })
    });
    const withoutTarget = createStudyPlan({
      actions: [action(1, "questoes", 45)],
      context: context({ tempoAlvoPorQuestaoSegundos: null })
    });
    expect(JSON.stringify(withTarget)).toContain("180 segundos por questão");
    expect(JSON.stringify(withoutTarget)).not.toMatch(/\d+ segundos por questão/);
  });

  it("redistributeAllocations não modifica as entradas", () => {
    const allocations: ActivityTimeAllocation[] = [
      { tipo: "teoria", tempoMinutos: 40 },
      { tipo: "questoes", tempoMinutos: 40 }
    ];
    const snapshot = structuredClone(allocations);
    const result = redistributeAllocations(allocations, [action(1, "questoes", 40)]);
    expect(allocations).toEqual(snapshot);
    expect(result).not.toBe(allocations);
  });

  it("allocateReviewSafeguards não modifica as entradas", () => {
    const allocationPlan = allocateTime(
      [action(1, "revisao", 30)],
      STRATEGY_TEMPLATES.NORMAL,
      context({ tempoDisponivelMinutos: 60 })
    );
    const snapshot = structuredClone(allocationPlan);
    allocateReviewSafeguards(allocationPlan, [action(1, "revisao", 30)], policy);
    expect(allocationPlan).toEqual(snapshot);
  });

  it("ações e contexto congelados não são modificados", () => {
    const actions = deepFreeze([action(1, "questoes", 60), action(2, "teoria", 40)]);
    const plannerContext = deepFreeze(context());
    const actionsSnapshot = structuredClone(actions);
    const contextSnapshot = structuredClone(plannerContext);
    const result = createStudyPlan({ actions, context: plannerContext });
    expect(result.status).toBe("SUCCESS");
    expect(actions).toEqual(actionsSnapshot);
    expect(plannerContext).toEqual(contextSnapshot);
  });

  it("duas execuções idênticas geram planos profundamente iguais", () => {
    const inputs = {
      actions: [action(1, "questoes", 60), action(2, "teoria", 40)],
      context: context()
    };
    expect(createStudyPlan(structuredClone(inputs))).toEqual(createStudyPlan(structuredClone(inputs)));
  });

  it("retorna NO_VALID_ACTIONS sem lançar exceção", () => {
    const result = createStudyPlan({ actions: [], context: context() });
    expect(result.status).toBe("NO_VALID_ACTIONS");
    expect(result.plan).toBeNull();
  });

  it("retorna INVALID_INPUT para tempo diário inválido", () => {
    const result = createStudyPlan({
      actions: [action(1, "questoes", 30)],
      context: context({ tempoDisponivelMinutos: 0 })
    });
    expect(result.status).toBe("INVALID_INPUT");
  });

  it("retorna INVALID_INPUT para política cognitiva inválida", () => {
    const invalidPolicy = structuredClone(policy);
    invalidPolicy.breakDurationMinutes = 0;
    const result = createStudyPlan({
      actions: [action(1, "questoes", 30)],
      context: context({ policy: invalidPolicy })
    });
    expect(result.status).toBe("INVALID_INPUT");
  });

  it("não agenda ação com duração inválida", () => {
    const result = createStudyPlan({
      actions: [action(1, "questoes", 0)],
      context: context({ tempoDisponivelMinutos: 60 })
    });
    expect(result.status).toBe("NO_VALID_ACTIONS");
  });

  it("não adiciona pausa ao fim quando não há outra sessão de estudo", () => {
    const result = createStudyPlan({
      actions: [action(1, "questoes", 30)],
      context: context({ tempoDisponivelMinutos: 180 })
    });
    const sessions = studySessions(result);
    expect(sessions.at(-1)?.tipo).toBe("questoes");
  });
});

describe("hybrid review anti-starvation guard", () => {
  it("preserves one executable unseen-content session when review backlog is large", () => {
    const guardedPolicy: PlannerPolicy = {
      ...policy,
      progressionGuard: {
        enabled: true,
        minNewContentSessionMinutes: 25
      }
    };
    const unseen = action(9, "teoria", 45, {
      disciplinaId: "d-unseen",
      assuntoId: "a-unseen",
      subassuntoId: "s-unseen",
      reasonCode: "UNSEEN_THEORY",
      camadaConstitucional: ConstitutionalTier.EXPANSAO_EDITAL
    });
    const result = createStudyPlan({
      actions: [
        action(1, "revisao", 120, { reasonCode: "REVISION_EXPIRED" }),
        action(2, "revisao", 120, {
          disciplinaId: "d-r2",
          assuntoId: "a-r2",
          reasonCode: "HIGH_DECAY"
        }),
        unseen
      ],
      context: context({ tempoDisponivelMinutos: 180, policy: guardedPolicy }),
      forcedStrategyId: "7_DAYS"
    });

    expect(result.status).toBe("SUCCESS");
    if (result.status !== "SUCCESS") throw new Error("plano ausente");
    const unseenSession = studySessions(result).find(
      (session) => session.subassuntoId === "s-unseen" && session.tipo === "teoria"
    );
    expect(unseenSession?.tempoMinutos).toBeGreaterThanOrEqual(25);
    expect(
      result.plan.adjustments.some((item) => item.code === "NEW_CONTENT_PROGRESS_GUARD")
    ).toBe(true);
  });

  it("does not invent room for new content when the window cannot fit represented minimums", () => {
    const guardedPolicy: PlannerPolicy = {
      ...policy,
      progressionGuard: {
        enabled: true,
        minNewContentSessionMinutes: 25
      }
    };
    const result = createStudyPlan({
      actions: [
        action(1, "revisao", 30, { reasonCode: "REVISION_EXPIRED" }),
        action(2, "teoria", 20, {
          disciplinaId: "d-unseen-short",
          assuntoId: "a-unseen-short",
          subassuntoId: "s-unseen-short",
          reasonCode: "UNSEEN_THEORY"
        })
      ],
      context: context({ tempoDisponivelMinutos: 30, policy: guardedPolicy }),
      forcedStrategyId: "7_DAYS"
    });

    expect(result.status).toBe("SUCCESS");
    if (result.status !== "SUCCESS") throw new Error("plano ausente");
    expect(result.plan.tempoTotalPlanejadoMinutos).toBeLessThanOrEqual(30);
  });
});

describe("progression guard preserves strategic order", () => {
  it("does not starve a higher-priority theory action to make room for unseen content", () => {
    const guardedPolicy: PlannerPolicy = {
      ...policy,
      progressionGuard: {
        enabled: true,
        minNewContentSessionMinutes: 25
      }
    };
    const result = createStudyPlan({
      actions: [
        action(1, "teoria", 20, {
          disciplinaId: "d-remedial",
          assuntoId: "a-remedial",
          subassuntoId: "s-remedial",
          reasonCode: "LOW_PERFORMANCE_THEORY"
        }),
        action(2, "revisao", 120, { reasonCode: "REVISION_EXPIRED" }),
        action(9, "teoria", 45, {
          disciplinaId: "d-new",
          assuntoId: "a-new",
          subassuntoId: "s-new",
          reasonCode: "UNSEEN_THEORY"
        })
      ],
      context: context({ tempoDisponivelMinutos: 180, policy: guardedPolicy }),
      forcedStrategyId: "7_DAYS"
    });

    expect(result.status).toBe("SUCCESS");
    if (result.status !== "SUCCESS") throw new Error("plano ausente");
    const sessions = studySessions(result);
    expect(sessions.some((item) => item.subassuntoId === "s-remedial")).toBe(true);
    expect(sessions.some((item) => item.subassuntoId === "s-new")).toBe(true);
    const priorities = sessions
      .filter((item) => item.tipo !== "descanso")
      .map((item) => item.strategicPriority as number);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });
});
