import { describe, expect, it } from "vitest";
import { SDE_CONFIG } from "../config/sdeConfig";
import { evaluateActivityEligibility } from "../prioritization/constraints";
import {
  calculatePriorityScore,
  calculateStatisticalConfidence,
  classifyConstitutionalTier,
  type ScoreBreakdown
} from "../prioritization/priorityScore";
import {
  ConstitutionalTier,
  EliminationRiskLevel,
  KnowledgeState,
  type EditalConfig,
  type EvidenciasCandidato,
  type KnowledgeAssessment,
  type StrategicAction
} from "../prioritization/types";
import { auditScoreBreakdown, auditStrategicActions } from "../validation/decisionAudit";
import { buildSDEParameterCatalog, listConfiguredNumericParameters } from "../validation/parameterCatalog";

const referenceDate = new Date("2026-07-16T00:00:00.000Z");

function attempts(count: number, hits: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `q-${index}`,
    subassuntoId: "s",
    acertou: index < hits,
    data: "2026-07-15",
    origem: "TREINO_ISOLADO" as const,
    tempoRespostaSegundos: 60
  }));
}

function history(count = 10, hits = 6, theoryCompleted = true): EvidenciasCandidato {
  return {
    concursoId: "c",
    porSubassunto: {
      s: {
        subassuntoId: "s",
        teoriaConcluida: theoryCompleted,
        dataUltimoEstudo: "2026-07-15",
        flashcardsDisponiveis: 0,
        flashcardsPendentes: 0,
        tentativas: attempts(count, hits),
        historicoRevisoes: []
      }
    }
  };
}

function edital(historicalIncidence: number, source: "EMPIRICAL" | "UNAVAILABLE"): EditalConfig {
  return {
    concursoId: "c",
    concursoNome: "Concurso",
    banca: "FGV",
    tipoQuestao: "MULTIPLA_ESCOLHA",
    pesosDisciplinas: { d: 1 },
    minimosDisciplinas: { d: 0.2 },
    pesosAssuntos: { a: 1 },
    quantidadeQuestoesProva: { d: 10 },
    pontosPorQuestao: { d: 1 },
    regrasPenalizacao: "NENHUMA",
    dataProva: "2026-10-11",
    incidenciaHistoricaAssuntos: { a: historicalIncidence },
    assuntoModelMetadata: {
      a: { topicWeightSource: "OFFICIAL", historicalIncidenceSource: source }
    },
    duracaoEstimadaProvaMinutos: 240
  };
}

function score(historicalIncidence: number, source: "EMPIRICAL" | "UNAVAILABLE") {
  return calculatePriorityScore(
    "d",
    "a",
    "s",
    "questoes",
    edital(historicalIncidence, source),
    {
      disciplinasCriticasIds: [],
      swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
      assuntoRendimento: {},
      subassuntoRendimento: {},
      decayRates: { s: 0.1 },
      tempoDisponivelMinutos: 60
    },
    history(),
    { nodes: { s: { id: "s", nome: "Sub", dependencias: [] } } },
    { dataProva: "2026-10-11", diasAteAProva: 87, referenceDate: "2026-07-16" },
    { a: "d" },
    { a: ["s"] },
    { minDisciplineSampleSize: 5, minTopicSampleSizeForCoverage: 1, minWeightedCoverage: 0.5, warningMargin: 0.15 },
    false,
    { lowPerformanceUpperBound: 0.4, leverageZoneLowerBound: 0.55, leverageZoneUpperBound: 0.75, masteredLowerBound: 0.85 }
  );
}

function action(id: string, prioridade: number, scoreValue: number): StrategicAction {
  return {
    prioridade,
    score: scoreValue,
    tempoEstimadoMinutos: 30,
    estimatedDurationMinutes: 30,
    disciplinaId: "d",
    disciplinaNome: "Disciplina",
    assuntoId: "a",
    assuntoNome: "Assunto",
    subassuntoId: id,
    subassuntoNome: id,
    tipo: "questoes",
    ganhoEsperado: null,
    riscoEvitado: null,
    hitRate: 0.6,
    custoOportunidade: null,
    justificativaXAI: {
      porQue: "Evidência observada.",
      dadosUtilizados: "Amostra real.",
      beneficioEsperado: null,
      custoIgnorar: "Não quantificado.",
      camadaConstitucional: ConstitutionalTier.MANUTENCAO_EXCELENCIA,
      fatosUtilizados: "Sem incidência histórica informada.",
      inferencias: "Heurística de ordenação.",
      dadosAusentes: ["incidência histórica"],
      nivelConfianca: "MEDIA",
      custoOportunidade: "Não calculado.",
      vetosConsiderados: []
    },
    camadaConstitucional: ConstitutionalTier.MANUTENCAO_EXCELENCIA,
    reasonCode: "OBSERVED_PRACTICE",
    decisionEvidence: {
      knowledgeState: KnowledgeState.OBSERVED,
      sampleSize: 10,
      confidenceScore: 0.5,
      confidenceLevel: "MEDIUM",
      topicWeightSource: "OFFICIAL",
      historicalIncidenceSource: "UNAVAILABLE",
      historicalIncidenceRate: null
    }
  };
}

describe("SDE mathematical safety contract", () => {
  it("keeps unavailable historical incidence completely neutral", () => {
    const zero = score(0, "UNAVAILABLE");
    const one = score(1, "UNAVAILABLE");
    expect(one.finalScore).toBe(zero.finalScore);
    expect(one.camadaConstitucional).toBe(zero.camadaConstitucional);
    expect(one.incidenciaHistorica).toBe(0);
    expect(one.historicalIncidenceRate).toBe(0);
    expect(auditScoreBreakdown(one).valid).toBe(true);
  });

  it("uses empirical incidence only when provenance explicitly permits it", () => {
    const unavailable = score(1, "UNAVAILABLE");
    const empirical = score(1, "EMPIRICAL");
    expect(empirical.finalScore).toBeGreaterThan(unavailable.finalScore);
    expect(empirical.camadaConstitucional).toBe(ConstitutionalTier.RETORNO_ESPERADO);
  });

  it("does not classify a neutral prior as a historical high-incidence gap", () => {
    const tier = classifyConstitutionalTier({
      disciplinaId: "d",
      assuntoId: "a",
      subassuntoId: "s",
      tipo: "questoes",
      hitRate: 0.4,
      elimRiskLevel: EliminationRiskLevel.SAFE,
      topicWeight: 1,
      historicalIncidence: 1,
      historicalIncidenceSource: "UNAVAILABLE",
      decayRate: 0,
      knowledgeState: KnowledgeState.OBSERVED,
      sampleSize: 10
    });
    expect(tier).toBe(ConstitutionalTier.MANUTENCAO_EXCELENCIA);
  });

  it("treats an unassessed discipline as a temporary no-zero safety constraint", () => {
    const tier = classifyConstitutionalTier({
      disciplinaId: "d",
      assuntoId: "a",
      subassuntoId: "s",
      tipo: "teoria",
      hitRate: null,
      elimRiskLevel: EliminationRiskLevel.INSUFFICIENT_DATA,
      topicWeight: 1,
      historicalIncidence: 0.5,
      historicalIncidenceSource: "UNAVAILABLE",
      decayRate: 0,
      knowledgeState: KnowledgeState.UNSEEN,
      sampleSize: 0,
      disciplineZeroSafetyStatus: "UNASSESSED"
    });
    expect(tier).toBe(ConstitutionalTier.RISCO_ELIMINACAO);
  });

  it("opens an initial theory recovery route for observed low performance", () => {
    const assessment: KnowledgeAssessment = {
      state: "OBSERVED",
      hitRate: 0.3,
      sampleSize: 10,
      totalAcertos: 3,
      theoryCompleted: false,
      lastEvidenceAt: "2026-07-15",
      confidenceScore: 0.4,
      confidenceLevel: "LOW"
    };
    const result = evaluateActivityEligibility("teoria", assessment, undefined, 0, referenceDate);
    expect(result.eligible).toBe(true);
    expect(result.reasonCode).toBe("LOW_PERFORMANCE_THEORY");
  });

  it("does not reopen completed theory on a weak sample, while practice remains available", () => {
    const assessment: KnowledgeAssessment = {
      state: "OBSERVED",
      hitRate: 0.3,
      sampleSize: 10,
      totalAcertos: 3,
      theoryCompleted: true,
      lastEvidenceAt: "2026-07-15",
      confidenceScore: 0.4,
      confidenceLevel: "LOW"
    };
    expect(evaluateActivityEligibility("teoria", assessment, undefined, 0, referenceDate).eligible).toBe(false);
    expect(evaluateActivityEligibility("questoes", assessment, undefined, 0, referenceDate).eligible).toBe(true);
  });

  it("reopens theory after persistent low performance with a strong sample", () => {
    const assessment: KnowledgeAssessment = {
      state: "OBSERVED",
      hitRate: 0.3,
      sampleSize: SDE_CONFIG.ELIGIBILITY.STRONG_THEORY_REMEDIATION_MIN_SAMPLE_SIZE,
      totalAcertos: 12,
      theoryCompleted: true,
      lastEvidenceAt: "2026-07-15",
      confidenceScore: 0.7,
      confidenceLevel: "MEDIUM"
    };
    expect(evaluateActivityEligibility("teoria", assessment, undefined, 0, referenceDate).eligible).toBe(true);
  });

  it("keeps confidence monotonic in sample size and decreasing with staleness", () => {
    expect(calculateStatisticalConfidence(20, 1)).toBeGreaterThan(calculateStatisticalConfidence(10, 1));
    expect(calculateStatisticalConfidence(20, 30)).toBeLessThan(calculateStatisticalConfidence(20, 1));
  });

  it("produces finite bounded confidence on an input grid", () => {
    for (const count of [0, 1, 5, 20, 100, 1000]) {
      for (const age of [0, 1, 15, 45, 365, Infinity]) {
        const value = calculateStatisticalConfidence(count, age);
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("catalogues every configured numeric parameter exactly once", () => {
    const configured = listConfiguredNumericParameters();
    const catalog = buildSDEParameterCatalog();
    expect(catalog.map((entry) => entry.path)).toEqual(configured.map((entry) => entry.path));
    expect(new Set(catalog.map((entry) => entry.path)).size).toBe(catalog.length);
    expect(catalog.every((entry) => Number.isFinite(entry.value) && entry.rationale.length > 0)).toBe(true);
  });

  it("audits deterministic action ordering and unsupported evidence claims", () => {
    const actions = [action("s1", 1, 20), action("s2", 2, 10)];
    expect(auditStrategicActions(actions)).toEqual({ valid: true, issues: [] });
  });

  it("detects a tampered score breakdown", () => {
    const valid = score(0, "UNAVAILABLE");
    const tampered: ScoreBreakdown = { ...valid, finalScore: valid.finalScore + 1 };
    expect(auditScoreBreakdown(tampered).valid).toBe(false);
  });
});
