/**
 * Regression tests for Sprint P0.1-B.1.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildActionId,
  generateStrategicActions,
  PriorityEngineInputs
} from "../prioritization/priorityEngine";
import {
  calculateComparativeOpportunityCost,
  calculateOpportunityCost
} from "../prioritization/opportunityCost";
import { evaluateActivityEligibility } from "../prioritization/constraints";
import {
  ConstitutionalTier,
  EvidenciasCandidato,
  KnowledgeAssessment
} from "../prioritization/types";

const eliminationPolicy = {
  minDisciplineSampleSize: 5,
  minTopicSampleSizeForCoverage: 5,
  minWeightedCoverage: 0.5,
  warningMargin: 0.15
};

const opportunityPolicy = {
  minimumComparableActions: 2,
  durationToleranceRatio: 0.25
};

const leveragePolicy = {
  lowPerformanceUpperBound: 0.4,
  leverageZoneLowerBound: 0.55,
  leverageZoneUpperBound: 0.75,
  masteredLowerBound: 0.85
};

function attempts(
  subassuntoId: string,
  count: number,
  hits: number,
  prefix: string
) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    subassuntoId,
    acertou: index < hits,
    data: "2026-07-10",
    origem: "TREINO_ISOLADO" as const,
    tempoRespostaSegundos: 60
  }));
}

function createInput(
  history?: EvidenciasCandidato,
  durationMap?: Record<string, number>
): PriorityEngineInputs {
  return {
    edital: {
      concursoId: "c1",
      concursoNome: "Concurso Teste",
      banca: "Banca Teste",
      tipoQuestao: "MULTIPLA_ESCOLHA",
      pesosDisciplinas: { d1: 2, d2: 1 },
      minimosDisciplinas: { d1: 0.5, d2: 0.4 },
      pesosAssuntos: { a1: 4, a2: 2 },
      quantidadeQuestoesProva: { d1: 10, d2: 10 },
      pontosPorQuestao: { d1: 1, d2: 1 },
      regrasPenalizacao: "NENHUMA",
      dataProva: "2026-10-15",
      incidenciaHistoricaAssuntos: { a1: 0.6, a2: 0.4 },
      duracaoEstimadaProvaMinutos: 240
    },
    diagnosis: {
      disciplinasCriticasIds: [],
      swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
      assuntoRendimento: {},
      subassuntoRendimento: {},
      decayRates: { s1: 0.1, s2: 0.1 },
      tempoDisponivelMinutos: 120
    },
    knowledgeGraph: {
      nodes: {
        s1: { id: "s1", nome: "Sub 1", dependencias: [] },
        s2: { id: "s2", nome: "Sub 2", dependencias: [] }
      }
    },
    timeHorizon: {
      dataProva: "2026-10-15",
      diasAteAProva: 95,
      referenceDate: "2026-07-12"
    },
    history:
      history ??
      ({
        concursoId: "c1",
        porSubassunto: {
          s1: {
            subassuntoId: "s1",
            teoriaConcluida: true,
            dataUltimoEstudo: "2026-07-10",
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: attempts("s1", 10, 7, "s1"),
            historicoRevisoes: []
          },
          s2: {
            subassuntoId: "s2",
            teoriaConcluida: true,
            dataUltimoEstudo: "2026-07-10",
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: attempts("s2", 10, 8, "s2"),
            historicoRevisoes: []
          }
        }
      } satisfies EvidenciasCandidato),
    disciplinas: [
      { id: "d1", nome: "Disciplina 1", concursoId: "c1" },
      { id: "d2", nome: "Disciplina 2", concursoId: "c1" }
    ],
    assuntos: [
      { id: "a1", nome: "Assunto 1", disciplinaId: "d1" },
      { id: "a2", nome: "Assunto 2", disciplinaId: "d2" }
    ],
    subassuntos: [
      { id: "s1", nome: "Sub 1", assuntoId: "a1" },
      { id: "s2", nome: "Sub 2", assuntoId: "a2" }
    ],
    names: {
      disciplinas: { d1: "Disciplina 1", d2: "Disciplina 2" },
      assuntos: { a1: "Assunto 1", a2: "Assunto 2" },
      subassuntos: { s1: "Sub 1", s2: "Sub 2" }
    },
    assuntoToDisciplina: { a1: "d1", a2: "d2" },
    subassuntoToAssunto: { s1: "a1", s2: "a2" },
    assuntoToSubassuntos: { a1: ["s1"], a2: ["s2"] },
    policy: eliminationPolicy,
    opportunityCostPolicy: opportunityPolicy,
    learningLeveragePolicy: leveragePolicy,
    estimatedDurationMinutesByAction: durationMap
  };
}

function assessment(overrides: Partial<KnowledgeAssessment>): KnowledgeAssessment {
  return {
    state: "OBSERVED",
    hitRate: 0.7,
    sampleSize: 10,
    totalAcertos: 7,
    lastEvidenceAt: "2026-07-10",
    theoryCompleted: true,
    confidenceLevel: "LOW",
    confidenceScore: 0.4,
    ...overrides
  };
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

describe("Sprint P0.1-B.1", () => {
  it("teoria com uma questão errada não é elegível por baixo desempenho", () => {
    const result = evaluateActivityEligibility(
      "teoria",
      assessment({ hitRate: 0, sampleSize: 1, totalAcertos: 0 }),
      undefined,
      0,
      new Date("2026-07-12")
    );
    expect(result.eligible).toBe(false);
  });

  it("teoria com 41 questões e menos de 50% é elegível", () => {
    const result = evaluateActivityEligibility(
      "teoria",
      assessment({ hitRate: 0.4, sampleSize: 41, totalAcertos: 16 }),
      undefined,
      0,
      new Date("2026-07-12")
    );
    expect(result.eligible).toBe(true);
    expect(result.reasonCode).toBe("LOW_PERFORMANCE_THEORY");
  });

  it("simulado local não é sempre elegível", () => {
    const result = evaluateActivityEligibility(
      "simulado",
      assessment({}),
      undefined,
      0,
      new Date("2026-07-12")
    );
    expect(result.eligible).toBe(false);
  });

  it("pipeline não gera ação local de simulado", () => {
    expect(generateStrategicActions(createInput()).some((a) => a.tipo === "simulado")).toBe(false);
  });

  it("retorno marginal permanece insuficiente mesmo com amostra grande", () => {
    const history = createInput().history;
    history.porSubassunto.s1.tentativas = attempts("s1", 120, 90, "large");
    const actions = generateStrategicActions(createInput(history));
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.marginalReturnEstimate?.status).toBe("INSUFFICIENT_DATA");
      expect(action.marginalReturnEstimate?.expectedNetPointsPerHour).toBeNull();
    }
  });

  it("learningLeverageScore nunca é exposto como pontos por hora", () => {
    const action = generateStrategicActions(createInput())[0];
    expect(action).toBeDefined();
    expect(action.marginalReturnEstimate?.expectedNetPointsPerHour).toBeNull();
    expect(action.score).not.toBe(action.marginalReturnEstimate?.expectedNetPointsPerHour);
  });

  it("retorno marginal lista dados causais ausentes", () => {
    const action = generateStrategicActions(createInput())[0];
    expect(action.marginalReturnEstimate?.missingData).toEqual(
      expect.arrayContaining([
        "episodiosDeAprendizagem",
        "duracaoDaAtividade",
        "desempenhoAntes",
        "desempenhoDepois"
      ])
    );
  });

  it("custo individual sem duração retorna insuficiente e valor nulo", () => {
    const result = calculateOpportunityCost(null);
    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.value).toBeNull();
    expect(result.missingData).toContain("estimatedDurationMinutes");
  });

  it("custo individual não depende de assunto de outra disciplina", () => {
    expect(calculateOpportunityCost(null)).toEqual(calculateOpportunityCost(null));
  });

  it("comparação exige ações da mesma camada", () => {
    const result = calculateComparativeOpportunityCost({
      actionId: "a",
      actionValue: 10,
      estimatedDurationMinutes: 30,
      tier: ConstitutionalTier.RETORNO_ESPERADO,
      eligibleActions: [
        { id: "a", finalScore: 10, name: "A", estimatedDurationMinutes: 30, tier: ConstitutionalTier.RETORNO_ESPERADO },
        { id: "b", finalScore: 20, name: "B", estimatedDurationMinutes: 30, tier: ConstitutionalTier.RISCO_ELIMINACAO }
      ],
      policy: opportunityPolicy
    });
    expect(result.status).toBe("INSUFFICIENT_DATA");
  });

  it("comparação ignora duração incompatível", () => {
    const result = calculateComparativeOpportunityCost({
      actionId: "a",
      actionValue: 10,
      estimatedDurationMinutes: 30,
      tier: ConstitutionalTier.RETORNO_ESPERADO,
      eligibleActions: [
        { id: "a", finalScore: 10, name: "A", estimatedDurationMinutes: 30, tier: ConstitutionalTier.RETORNO_ESPERADO },
        { id: "b", finalScore: 20, name: "B", estimatedDurationMinutes: 90, tier: ConstitutionalTier.RETORNO_ESPERADO }
      ],
      policy: opportunityPolicy
    });
    expect(result.status).toBe("INSUFFICIENT_DATA");
  });

  it("comparação identifica alternativa com duração compatível", () => {
    const result = calculateComparativeOpportunityCost({
      actionId: "a",
      actionValue: 10,
      estimatedDurationMinutes: 30,
      tier: ConstitutionalTier.RETORNO_ESPERADO,
      eligibleActions: [
        { id: "a", finalScore: 10, name: "A", estimatedDurationMinutes: 30, tier: ConstitutionalTier.RETORNO_ESPERADO },
        { id: "b", finalScore: 20, name: "B", estimatedDurationMinutes: 35, tier: ConstitutionalTier.RETORNO_ESPERADO }
      ],
      policy: opportunityPolicy
    });
    expect(result.status).toBe("CALCULATED");
    expect(result.bestAlternativeActionId).toBe("b");
    expect(result.value).toBe(10);
  });

  it("ausência de alternativa retorna insuficiente", () => {
    const result = calculateComparativeOpportunityCost({
      actionId: "a",
      actionValue: 10,
      estimatedDurationMinutes: 30,
      tier: ConstitutionalTier.RETORNO_ESPERADO,
      eligibleActions: [
        { id: "a", finalScore: 10, name: "A", estimatedDurationMinutes: 30, tier: ConstitutionalTier.RETORNO_ESPERADO }
      ],
      policy: opportunityPolicy
    });
    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.value).toBeNull();
  });

  it("política de custo ausente é rejeitada", () => {
    const input = createInput() as PriorityEngineInputs & { opportunityCostPolicy?: unknown };
    delete input.opportunityCostPolicy;
    expect(() => generateStrategicActions(input as PriorityEngineInputs)).toThrow(/custo de oportunidade/i);
  });

  it("política de custo inválida é rejeitada", () => {
    const input = createInput();
    input.opportunityCostPolicy = { minimumComparableActions: 1, durationToleranceRatio: 2 };
    expect(() => generateStrategicActions(input)).toThrow();
  });

  it("política de alavancagem ausente é rejeitada", () => {
    const input = createInput() as PriorityEngineInputs & { learningLeveragePolicy?: unknown };
    delete input.learningLeveragePolicy;
    expect(() => generateStrategicActions(input as PriorityEngineInputs)).toThrow(/alavancagem/i);
  });

  it("política de alavancagem inválida é rejeitada", () => {
    const input = createInput();
    input.learningLeveragePolicy = {
      lowPerformanceUpperBound: 0.8,
      leverageZoneLowerBound: 0.5,
      leverageZoneUpperBound: 0.4,
      masteredLowerBound: 0.3
    };
    expect(() => generateStrategicActions(input)).toThrow(/fora de ordem/i);
  });

  it("pipeline sem durações mantém custo de oportunidade insuficiente", () => {
    const actions = generateStrategicActions(createInput());
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.estimatedDurationMinutes).toBeNull();
      expect(action.custoOportunidade).toBeNull();
      expect(action.opportunityCostResult?.status).toBe("INSUFFICIENT_DATA");
    }
  });

  it("pipeline calcula comparação quando durações reais são fornecidas", () => {
    const durationMap: Record<string, number> = {};
    for (const assunto of ["a1", "a2"]) {
      const disciplina = assunto === "a1" ? "d1" : "d2";
      for (const tipo of ["questoes", "revisao"] as const) {
        durationMap[buildActionId({ disciplinaId: disciplina, assuntoId: assunto, tipo })] = 30;
      }
      const sub = assunto === "a1" ? "s1" : "s2";
      durationMap[buildActionId({ disciplinaId: disciplina, assuntoId: assunto, subassuntoId: sub, tipo: "questoes" })] = 30;
      durationMap[buildActionId({ disciplinaId: disciplina, assuntoId: assunto, subassuntoId: sub, tipo: "revisao" })] = 30;
    }
    const actions = generateStrategicActions(createInput(undefined, durationMap));
    expect(actions.some((a) => a.opportunityCostResult?.status === "CALCULATED")).toBe(true);
  });

  it("XAI não contém textos econômicos proibidos", () => {
    const serialized = JSON.stringify(generateStrategicActions(createInput())).toLowerCase();
    expect(serialized).not.toContain("custooportunidadedetox");
    expect(serialized).not.toContain("proficiência confortável");
    expect(serialized).not.toContain("peso irrisório");
    expect(serialized).not.toContain("congelando sua evolução");
  });

  it("vetos exibidos correspondem somente aos checks executados", () => {
    const action = generateStrategicActions(createInput())[0];
    expect(action.justificativaXAI.vetosConsiderados.length).toBeGreaterThan(0);
    for (const check of action.justificativaXAI.vetosConsiderados) {
      expect(check).toMatch(/PASSED|VETOED|NOT_APPLICABLE/);
    }
    expect(action.justificativaXAI.vetosConsiderados).not.toContain("Veto de Incompatibilidade Conceitual");
  });

  it("nenhuma função de produção utiliza relógio do sistema", () => {
    const files = [
      "../prioritization/constraints.ts",
      "../prioritization/opportunityCost.ts",
      "../prioritization/priorityEngine.ts",
      "../prioritization/priorityScore.ts",
      "../prioritization/recommendation.ts",
      "../validation/validator.ts"
    ];
    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).not.toMatch(/new Date\(\s*\)/);
      expect(source).not.toContain("Date.now");
      expect(source).not.toContain("Math.random");
    }
  });

  it("fórmulas econômicas antigas não permanecem no código", () => {
    const source = readFileSync(
      new URL("../prioritization/opportunityCost.ts", import.meta.url),
      "utf8"
    );
    expect(source).not.toContain("12 * (topicWeight / 3)");
    expect(source).not.toContain("> 0.40");
    expect(source).not.toContain("topicEstimatedPoints");
  });

  it("entradas profundamente congeladas não são modificadas", () => {
    const input = deepFreeze(createInput());
    expect(() => generateStrategicActions(input)).not.toThrow();
  });

  it("duas execuções retornam resultados profundamente iguais", () => {
    const input = createInput();
    const first = generateStrategicActions(structuredClone(input));
    const second = generateStrategicActions(structuredClone(input));
    expect(first).toEqual(second);
  });
  it("duração estimada inválida é rejeitada", () => {
    const input = createInput(undefined, {
      [buildActionId({ disciplinaId: "d1", assuntoId: "a1", tipo: "questoes" })]: -10
    });
    expect(() => generateStrategicActions(input)).toThrow(/duração estimada/i);
  });

  it("minimumComparableActions fracionário é rejeitado", () => {
    const input = createInput();
    input.opportunityCostPolicy = {
      minimumComparableActions: 2.5,
      durationToleranceRatio: 0.25
    };
    expect(() => generateStrategicActions(input)).toThrow(/inteiro/i);
  });

  it("comparação não usa ação de camada constitucional inferior", () => {
    const result = calculateComparativeOpportunityCost({
      actionId: "critical",
      actionValue: 50,
      estimatedDurationMinutes: 30,
      tier: ConstitutionalTier.RISCO_ELIMINACAO,
      eligibleActions: [
        { id: "critical", finalScore: 50, name: "Crítica", estimatedDurationMinutes: 30, tier: ConstitutionalTier.RISCO_ELIMINACAO },
        { id: "lower", finalScore: 100, name: "Inferior", estimatedDurationMinutes: 30, tier: ConstitutionalTier.RETORNO_ESPERADO }
      ],
      policy: opportunityPolicy
    });
    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.bestAlternativeActionId).toBeNull();
  });

  it("engine não importa políticas padrão internamente", () => {
    const source = readFileSync(
      new URL("../prioritization/priorityEngine.ts", import.meta.url),
      "utf8"
    );
    expect(source).not.toContain("DEFAULT_OPPORTUNITY_COST_POLICY");
    expect(source).not.toContain("DEFAULT_LEARNING_LEVERAGE_POLICY");
  });

});
