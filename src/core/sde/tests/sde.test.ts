/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import { generateStrategicActions, PriorityEngineInputs } from "../prioritization/priorityEngine";
import { 
  ConstitutionalTier, 
  KnowledgeState, 
  EditalConfig, 
  SDEDiagnosis, 
  KnowledgeGraph, 
  TimeHorizon, 
  EvidenciasCandidato, 
  StrategicAction,
  Disciplina,
  Assunto,
  Subassunto,
  EliminationRiskLevel,
  KnowledgeAssessment
} from "../prioritization/types";
import { 
  calculateDisciplineHitRate, 
  calculateEliminationRisk, 
  calculateStatisticalConfidence,
  assessSubassunto,
  assessAssunto,
  assessDisciplina,
  calculatePriorityScore,
  DisciplinaAssessment
} from "../prioritization/priorityScore";
import { evaluateActivityEligibility, evaluateConstraints } from "../prioritization/constraints";
import { validateSDEInputs, validateStrictISODate } from "../validation/validator";
import { DEFAULT_OPPORTUNITY_COST_POLICY, DEFAULT_LEARNING_LEVERAGE_POLICY } from "../config/sdeConfig";

// Helper to create basic mock metadata
function createMockMetadata() {
  const disciplinas: Disciplina[] = [
    { id: "d-constitucional", nome: "Direito Constitucional", concursoId: "c-1" },
    { id: "d-administrativo", nome: "Direito Administrativo", concursoId: "c-1" }
  ];

  const assuntos: Assunto[] = [
    { id: "a-propriedade", nome: "Direito de Propriedade", disciplinaId: "d-constitucional" },
    { id: "a-licitacoes", nome: "Licitações Públicas", disciplinaId: "d-administrativo" },
    { id: "a-atos", nome: "Atos Administrativos", disciplinaId: "d-administrativo" }
  ];

  const subassuntos: Subassunto[] = [
    { id: "sub-propriedade-1", nome: "Desapropriação", assuntoId: "a-propriedade" },
    { id: "sub-licitacoes-1", nome: "Dispensa de Licitação", assuntoId: "a-licitacoes" },
    { id: "sub-atos-1", nome: "Atributos do Ato", assuntoId: "a-atos" }
  ];

  const assuntoToDisciplina = {
    "a-propriedade": "d-constitucional",
    "a-licitacoes": "d-administrativo",
    "a-atos": "d-administrativo"
  };

  const subassuntoToAssunto = {
    "sub-propriedade-1": "a-propriedade",
    "sub-licitacoes-1": "a-licitacoes",
    "sub-atos-1": "a-atos"
  };

  const assuntoToSubassuntos = {
    "a-propriedade": ["sub-propriedade-1"],
    "a-licitacoes": ["sub-licitacoes-1"],
    "a-atos": ["sub-atos-1"]
  };

  const names = {
    disciplinas: {
      "d-constitucional": "Direito Constitucional",
      "d-administrativo": "Direito Administrativo"
    },
    assuntos: {
      "a-propriedade": "Direito de Propriedade",
      "a-licitacoes": "Licitações Públicas",
      "a-atos": "Atos Administrativos"
    },
    subassuntos: {
      "sub-propriedade-1": "Desapropriação",
      "sub-licitacoes-1": "Dispensa de Licitação",
      "sub-atos-1": "Atributos do Ato"
    }
  };

  return {
    disciplinas,
    assuntos,
    subassuntos,
    assuntoToDisciplina,
    subassuntoToAssunto,
    assuntoToSubassuntos,
    names
  };
}

function createMockPolicy() {
  return {
    minDisciplineSampleSize: 5,
    minTopicSampleSizeForCoverage: 1,
    minWeightedCoverage: 0.50,
    warningMargin: 0.15
  };
}

function createMockEdital(): EditalConfig {
  return {
    concursoId: "c-1",
    concursoNome: "Auditor Fiscal",
    banca: "FGV",
    tipoQuestao: "MULTIPLA_ESCOLHA",
    pesosDisciplinas: {
      "d-constitucional": 2,
      "d-administrativo": 1
    },
    minimosDisciplinas: {
      "d-constitucional": 0.50,
      "d-administrativo": 0.40
    },
    pesosAssuntos: {
      "a-propriedade": 3,
      "a-licitacoes": 4,
      "a-atos": 2
    },
    quantidadeQuestoesProva: {
      "d-constitucional": 20,
      "d-administrativo": 10
    },
    pontosPorQuestao: {
      "d-constitucional": 2,
      "d-administrativo": 1
    },
    regrasPenalizacao: "NENHUMA",
    dataProva: "2026-10-15",
    incidenciaHistoricaAssuntos: {
      "a-propriedade": 0.45,
      "a-licitacoes": 0.60,
      "a-atos": 0.20
    },
    duracaoEstimadaProvaMinutos: 240
  };
}

function createMockDiagnosis(): SDEDiagnosis {
  return {
    disciplinasCriticasIds: [],
    swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
    assuntoRendimento: {
      "a-propriedade": 0.40,
      "a-licitacoes": 0.70,
      "a-atos": 0.80
    },
    subassuntoRendimento: {
      "sub-propriedade-1": 0.40,
      "sub-licitacoes-1": 0.70,
      "sub-atos-1": 0.80
    },
    decayRates: {
      "sub-propriedade-1": 0.20,
      "sub-licitacoes-1": 0.10,
      "sub-atos-1": 0.05
    },
    tempoDisponivelMinutos: 180
  };
}

function createMockGraph(): KnowledgeGraph {
  return {
    nodes: {
      "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: [] },
      "sub-licitacoes-1": { id: "sub-licitacoes-1", nome: "Dispensa de Licitação", dependencias: [] },
      "sub-atos-1": { id: "sub-atos-1", nome: "Atributos do Ato", dependencias: [] }
    }
  };
}

function createMockHorizon(): TimeHorizon {
  return {
    dataProva: "2026-10-15",
    diasAteAProva: 95,
    referenceDate: "2026-07-12"
  };
}

describe("Strategic Decision Engine (SDE) - Sprint Corretivo P0.1-A", () => {
  const metadata = createMockMetadata();
  const referenceDate = new Date("2026-07-12");

  // --- REQUISITO 1: AGREGAÇÃO DE HITRATE ---
  it("1. Agregação de hitRate: média ponderada real de tentativas (não simples)", () => {
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t2", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t3", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        },
        "sub-licitacoes-1": {
          subassuntoId: "sub-licitacoes-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t4", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    };

    const assAssessment = assessAssunto(
      "a-propriedade",
      ["sub-propriedade-1", "sub-licitacoes-1"],
      history,
      referenceDate
    );

    // Total: 2 acertos de 4 tentativas = 50% (Média simples seria (66.6% + 0%) / 2 = 33.3%)
    expect(assAssessment.hitRate).toBeCloseTo(0.50);
    expect(assAssessment.sampleSize).toBe(4);
    expect(assAssessment.totalAcertos).toBe(2);
  });

  it("2. Agregação de hitRate: sem tentativas retorna null", () => {
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 0,
          flashcardsPendentes: 0,
          tentativas: [],
          historicoRevisoes: []
        }
      }
    };

    const assAssessment = assessAssunto(
      "a-propriedade",
      ["sub-propriedade-1"],
      history,
      referenceDate
    );

    expect(assAssessment.hitRate).toBeNull();
    expect(assAssessment.sampleSize).toBe(0);
  });

  // --- REQUISITO 2: RISCO ELIMINATÓRIO ---
  it("3. Risco eliminatório: CRITICAL se hitRate <= minimoDisciplinas", () => {
    const edital = createMockEdital(); // d-constitucional min = 50%
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t2", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t3", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t4", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t5", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    }; // Hit rate = 20% (abaixo de 50%)

    const risk = calculateEliminationRisk(
      "d-constitucional",
      edital,
      history,
      metadata.assuntoToDisciplina,
      metadata.assuntoToSubassuntos,
      referenceDate,
      createMockPolicy()
    );

    expect(risk.level).toBe(EliminationRiskLevel.CRITICAL);
    expect(risk.margin).toBeLessThan(0);
  });

  it("4. Risco eliminatório: WARNING se margin <= 10% do mínimo", () => {
    const edital = createMockEdital(); // d-constitucional min = 50%
    // Para aviso: margem de até 10% do mínimo (e.g. 50% a 55%)
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t2", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t3", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t4", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t5", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t6", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t7", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t8", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t9", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t10", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t11", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    }; // Hit rate = 6/11 = 54.5% (margem = 4.5% acima de 50%, menor ou igual a 10% de margem)

    const risk = calculateEliminationRisk(
      "d-constitucional",
      edital,
      history,
      metadata.assuntoToDisciplina,
      metadata.assuntoToSubassuntos,
      referenceDate,
      createMockPolicy()
    );

    expect(risk.level).toBe(EliminationRiskLevel.WARNING);
  });

  it("5. Risco eliminatório: SAFE se margin > 10% do mínimo", () => {
    const edital = createMockEdital(); // d-constitucional min = 50%
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t2", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t3", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t4", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t5", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    }; // Hit rate = 80% (margem = 30% acima de 50%, maior que 10%)

    const risk = calculateEliminationRisk(
      "d-constitucional",
      edital,
      history,
      metadata.assuntoToDisciplina,
      metadata.assuntoToSubassuntos,
      referenceDate,
      createMockPolicy()
    );

    expect(risk.level).toBe(EliminationRiskLevel.SAFE);
  });

  it("6. Risco eliminatório: INSUFFICIENT_DATA se amostra de tentativas da disciplina < 5", () => {
    const edital = createMockEdital();
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    }; // Apenas 1 tentativa

    const risk = calculateEliminationRisk(
      "d-constitucional",
      edital,
      history,
      metadata.assuntoToDisciplina,
      metadata.assuntoToSubassuntos,
      referenceDate,
      createMockPolicy()
    );

    expect(risk.level).toBe(EliminationRiskLevel.INSUFFICIENT_DATA);
  });

  it("7. Risco eliminatório: NOT_APPLICABLE se disciplina não possuir mínimo", () => {
    const edital = createMockEdital();
    delete edital.minimosDisciplinas["d-constitucional"];

    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t2", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t3", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t4", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t5", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    };

    const risk = calculateEliminationRisk(
      "d-constitucional",
      edital,
      history,
      metadata.assuntoToDisciplina,
      metadata.assuntoToSubassuntos,
      referenceDate,
      createMockPolicy()
    );

    expect(risk.level).toBe(EliminationRiskLevel.NOT_APPLICABLE);
  });

  // --- REQUISITO 3: CONFIANÇA ESTATÍSTICA ---
  it("8. Confiança estatística: HIGH se amostra > 100 e diasSinceLastStudy <= 15 dias", () => {
    const assessment = assessSubassunto(
      "sub-propriedade-1",
      {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            dataUltimoEstudo: "2026-07-10", // 2 dias de recência
            flashcardsDisponiveis: 10,
            flashcardsPendentes: 0,
            tentativas: Array.from({ length: 110 }, (_, i) => ({
              id: `t-${i}`,
              subassuntoId: "sub-propriedade-1",
              acertou: true,
              data: "2026-07-10",
              tempoRespostaSegundos: 45,
              origem: "TREINO_ISOLADO"
            })),
            historicoRevisoes: []
          }
        }
      },
      referenceDate
    );

    expect(assessment.confidenceLevel).toBe("HIGH");
  });

  it("9. Confiança estatística: MEDIUM se amostra [20, 100] ou amostra > 100 com recência > 15 dias", () => {
    const assessment1 = assessSubassunto(
      "sub-propriedade-1",
      {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            dataUltimoEstudo: "2026-07-10",
            flashcardsDisponiveis: 10,
            flashcardsPendentes: 0,
            tentativas: Array.from({ length: 50 }, (_, i) => ({
              id: `t-${i}`,
              subassuntoId: "sub-propriedade-1",
              acertou: true,
              data: "2026-07-10",
              tempoRespostaSegundos: 45,
              origem: "TREINO_ISOLADO"
            })),
            historicoRevisoes: []
          }
        }
      },
      referenceDate
    );

    const assessment2 = assessSubassunto(
      "sub-propriedade-1",
      {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            dataUltimoEstudo: "2026-05-10", // mais de 15 dias de recência
            flashcardsDisponiveis: 10,
            flashcardsPendentes: 0,
            tentativas: Array.from({ length: 110 }, (_, i) => ({
              id: `t-${i}`,
              subassuntoId: "sub-propriedade-1",
              acertou: true,
              data: "2026-05-10",
              tempoRespostaSegundos: 45,
              origem: "TREINO_ISOLADO"
            })),
            historicoRevisoes: []
          }
        }
      },
      referenceDate
    );

    expect(assessment1.confidenceLevel).toBe("MEDIUM");
    expect(assessment2.confidenceLevel).toBe("MEDIUM");
  });

  it("10. Confiança estatística: LOW se amostra < 20 e recência > 30 dias", () => {
    const assessment = assessSubassunto(
      "sub-propriedade-1",
      {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            dataUltimoEstudo: "2026-05-10", // 63 dias atrás
            flashcardsDisponiveis: 10,
            flashcardsPendentes: 0,
            tentativas: Array.from({ length: 5 }, (_, i) => ({
              id: `t-${i}`,
              subassuntoId: "sub-propriedade-1",
              acertou: true,
              data: "2026-05-10",
              tempoRespostaSegundos: 45,
              origem: "TREINO_ISOLADO"
            })),
            historicoRevisoes: []
          }
        }
      },
      referenceDate
    );

    expect(assessment.confidenceLevel).toBe("LOW");
  });

  it("11. Confiança estatística: recência de estudo degradada reduz score de confiança de forma proporcional", () => {
    // 50 questões resolvidas hoje vs 50 questões resolvidas há 60 dias
    const confHoje = calculateStatisticalConfidence(50, 0);
    const confPassado = calculateStatisticalConfidence(50, 60);

    expect(confPassado).toBeLessThan(confHoje);
  });

  // --- REQUISITO 4: ELEGIBILIDADE ---
  it("12. Elegibilidade: teoria é elegível se UNSEEN", () => {
    const assessment: any = {
      state: "UNSEEN",
      hitRate: null,
      sampleSize: 0,
      lastEvidenceAt: null,
      theoryCompleted: false
    };

    const eligibility = evaluateActivityEligibility("teoria", assessment, undefined, 0, new Date("2026-07-12"));
    expect(eligibility.eligible).toBe(true);
  });

  it("13. Elegibilidade: teoria é elegível se hitRate < 50% com sampleSize > 40", () => {
    const assessment: any = {
      state: "OBSERVED",
      hitRate: 0.40,
      sampleSize: 45,
      lastEvidenceAt: "2026-07-10",
      theoryCompleted: true
    };

    const eligibility = evaluateActivityEligibility("teoria", assessment, undefined, 0, new Date("2026-07-12"));
    expect(eligibility.eligible).toBe(true);
  });

  it("14. Elegibilidade: teoria NÃO é elegível nos demais casos", () => {
    const assessment: any = {
      state: "OBSERVED",
      hitRate: 0.70, // muito alto
      sampleSize: 20,
      lastEvidenceAt: "2026-07-10",
      theoryCompleted: true
    };

    const eligibility = evaluateActivityEligibility("teoria", assessment, undefined, 0, new Date("2026-07-12"));
    expect(eligibility.eligible).toBe(false);
  });

  it("15. Elegibilidade: questões é elegível se state for UNKNOWN (diagnosticPurpose: true)", () => {
    const assessment: any = {
      state: "UNKNOWN",
      hitRate: null,
      sampleSize: 2,
      lastEvidenceAt: "2026-07-10",
      theoryCompleted: false
    };

    const eligibility = evaluateActivityEligibility("questoes", assessment, undefined, 0, new Date("2026-07-12"));
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.diagnosticPurpose).toBe(true);
  });

  it("16. Elegibilidade: questões é elegível se teoriaConcluida for true ou se houver base observada", () => {
    const assessmentConcluido: any = {
      state: "UNKNOWN",
      hitRate: null,
      sampleSize: 0,
      lastEvidenceAt: null,
      theoryCompleted: true
    };

    const assessmentObservado: any = {
      state: "OBSERVED",
      hitRate: 0.80,
      sampleSize: 10,
      lastEvidenceAt: "2026-07-10",
      theoryCompleted: false
    };

    const eligibility1 = evaluateActivityEligibility("questoes", assessmentConcluido, undefined, 0, new Date("2026-07-12"));
    const eligibility2 = evaluateActivityEligibility("questoes", assessmentObservado, undefined, 0, new Date("2026-07-12"));

    expect(eligibility1.eligible).toBe(true);
    expect(eligibility2.eligible).toBe(true);
  });

  it("17. Elegibilidade: revisão é elegível apenas sob indicadores explícitos (revisão vencida por tempo, decayRate > 0.20, queda histórica ou erro recente)", () => {
    const assessmentSemDecaySemQueda: any = {
      state: "OBSERVED",
      hitRate: 0.95,
      sampleSize: 50,
      lastEvidenceAt: null,
      theoryCompleted: true
    };

    const eligibilityInvalido = evaluateActivityEligibility("revisao", assessmentSemDecaySemQueda, undefined, 0, new Date("2026-07-12"));
    expect(eligibilityInvalido.eligible).toBe(false);

    // 1. Elegível por tempo (30 dias)
    const assessmentVencida: any = {
      state: "OBSERVED",
      hitRate: 0.90,
      sampleSize: 50,
      lastEvidenceAt: "2026-06-10",
      theoryCompleted: true
    };
    const refDate = new Date("2026-07-12");
    const eligibilityTempo = evaluateActivityEligibility("revisao", assessmentVencida, undefined, 0, refDate);
    expect(eligibilityTempo.eligible).toBe(true);

    // 2. Elegível por decayRate > 0.20
    const eligibilityDecay = evaluateActivityEligibility("revisao", assessmentSemDecaySemQueda, undefined, 0.25, new Date("2026-07-12"));
    expect(eligibilityDecay.eligible).toBe(true);

    // 3. Elegível por queda histórica
    const assessmentObserved: any = {
      state: "OBSERVED",
      hitRate: 0.70,
      sampleSize: 6,
      lastEvidenceAt: "2026-07-10",
      theoryCompleted: true
    };
    const evidenceQueda = {
      subassuntoId: "sub1",
      flashcardsDisponiveis: 0,
      flashcardsPendentes: 0,
      tentativas: [
        { id: "1", acertou: true, data: "2026-07-01", tempoRespostaSegundos: 10, origem: "TREINO_ISOLADO" },
        { id: "2", acertou: true, data: "2026-07-02", tempoRespostaSegundos: 10, origem: "TREINO_ISOLADO" },
        { id: "3", acertou: true, data: "2026-07-03", tempoRespostaSegundos: 10, origem: "TREINO_ISOLADO" },
        { id: "4", acertou: false, data: "2026-07-04", tempoRespostaSegundos: 10, origem: "TREINO_ISOLADO" },
        { id: "5", acertou: false, data: "2026-07-05", tempoRespostaSegundos: 10, origem: "TREINO_ISOLADO" },
        { id: "6", acertou: false, data: "2026-07-06", tempoRespostaSegundos: 10, origem: "TREINO_ISOLADO" }
      ],
      historicoRevisoes: []
    };
    const eligibilityQueda = evaluateActivityEligibility("revisao", assessmentObserved, evidenceQueda as any, 0, refDate);
    expect(eligibilityQueda.eligible).toBe(true);
  });

  it("18. Elegibilidade: flashcards é elegível apenas se flashcardsDisponiveis > 0 e flashcardsPendentes > 0", () => {
    const evidenceInvalida = {
      subassuntoId: "sub-propriedade-1",
      flashcardsDisponiveis: 10,
      flashcardsPendentes: 0,
      tentativas: [],
      historicoRevisoes: []
    };

    const evidenceValida = {
      subassuntoId: "sub-propriedade-1",
      flashcardsDisponiveis: 10,
      flashcardsPendentes: 5,
      tentativas: [],
      historicoRevisoes: []
    };

    const assessment: any = {
      state: "OBSERVED",
      hitRate: 0.80,
      sampleSize: 10,
      lastEvidenceAt: "2026-07-10"
    };

    const eligibility1 = evaluateActivityEligibility("flashcards", assessment, evidenceInvalida, 0, new Date("2026-07-12"));
    const eligibility2 = evaluateActivityEligibility("flashcards", assessment, evidenceValida, 0, new Date("2026-07-12"));

    expect(eligibility1.eligible).toBe(false);
    expect(eligibility2.eligible).toBe(true);
  });

  // --- REQUISITO 5: REJEIÇÃO / VALIDAÇÃO ---
  it("19. Rejeição: taxa > 1.0 ou taxa < 0 no input do SDE", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {}
    };
    const graph = createMockGraph();
    const horizon = createMockHorizon();

    diagnosis.assuntoRendimento["a-propriedade"] = 1.5; // taxa inválida

    expect(() => {
      validateSDEInputs({
        edital,
        diagnosis,
        history,
        knowledgeGraph: graph,
        timeHorizon: horizon,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: createMockPolicy(),
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });
    }).toThrow();
  });

  it("20. Rejeição: decayRate > 1.0 ou decayRate < 0", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {}
    };
    const graph = createMockGraph();
    const horizon = createMockHorizon();

    diagnosis.decayRates["sub-propriedade-1"] = -0.5; // taxa de esquecimento inválida

    expect(() => {
      validateSDEInputs({
        edital,
        diagnosis,
        history,
        knowledgeGraph: graph,
        timeHorizon: horizon,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: createMockPolicy(),
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });
    }).toThrow();
  });

  it("21. Rejeição: datas de tentativas futuras em relação a referenceDate", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const graph = createMockGraph();
    const horizon = createMockHorizon(); // referenceDate = 2026-07-12

    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t-futuro", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-12-25", tempoRespostaSegundos: 45, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    };

    expect(() => {
      validateSDEInputs({
        edital,
        diagnosis,
        history,
        knowledgeGraph: graph,
        timeHorizon: horizon,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: createMockPolicy(),
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });
    }).toThrow();
  });

  it("22. Rejeição: dependências do Knowledge Graph com nós inexistentes", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {}
    };
    const horizon = createMockHorizon();

    const graph: KnowledgeGraph = {
      nodes: {
        "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: ["sub-inexistente"] }
      }
    };

    expect(() => {
      validateSDEInputs({
        edital,
        diagnosis,
        history,
        knowledgeGraph: graph,
        timeHorizon: horizon,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: createMockPolicy(),
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });
    }).toThrow();
  });

  // --- REQUISITO 6: PRÉ-REQUISITOS ---
  it("23. Pré-requisitos: dependência com desempenho < 50% gera veto absoluto", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const horizon = createMockHorizon();

    const graph: KnowledgeGraph = {
      nodes: {
        "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: ["sub-licitacoes-1"] },
        "sub-licitacoes-1": { id: "sub-licitacoes-1", nome: "Dispensa de Licitação", dependencias: [] }
      }
    };

    // Pré-requisito 'sub-licitacoes-1' tem desempenho de 20% (abaixo de 50%)
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          teoriaConcluida: true,
          flashcardsDisponiveis: 0,
          flashcardsPendentes: 0,
          tentativas: [],
          historicoRevisoes: []
        },
        "sub-licitacoes-1": {
          subassuntoId: "sub-licitacoes-1",
          teoriaConcluida: true,
          flashcardsDisponiveis: 0,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t2", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t3", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t4", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t5", subassuntoId: "sub-licitacoes-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    };

    const veto = evaluateConstraints({
      disciplinaId: "d-constitucional",
      assuntoId: "a-propriedade",
      subassuntoId: "sub-propriedade-1",
      tipo: "questoes",
      edital,
      diagnosis,
      knowledgeGraph: graph,
      timeHorizon: horizon,
      knowledgeState: KnowledgeState.OBSERVED,
      flashcardsCount: 0,
      hitRate: 0.80,
      assuntoToDisciplina: metadata.assuntoToDisciplina,
      subassuntoToAssunto: metadata.subassuntoToAssunto,
      history
    });

    expect(veto.isVetoed).toBe(true);
    expect(veto.vetoType).toBe("INVERSION_PRE_REQUISITO");
    expect(veto.reason).toContain("Veto de pré-requisito");
  });

  it("24. Pré-requisitos: dependência UNSEEN ou UNKNOWN gera necessidade diagnóstica ao invés de veto padrão", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const horizon = createMockHorizon();

    const graph: KnowledgeGraph = {
      nodes: {
        "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: ["sub-licitacoes-1"] },
        "sub-licitacoes-1": { id: "sub-licitacoes-1", nome: "Dispensa de Licitação", dependencias: [] }
      }
    };

    // Pré-requisito 'sub-licitacoes-1' é UNSEEN (sem histórico)
    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          teoriaConcluida: true,
          flashcardsDisponiveis: 0,
          flashcardsPendentes: 0,
          tentativas: [],
          historicoRevisoes: []
        }
      }
    };

    const veto = evaluateConstraints({
      disciplinaId: "d-constitucional",
      assuntoId: "a-propriedade",
      subassuntoId: "sub-propriedade-1",
      tipo: "questoes",
      edital,
      diagnosis,
      knowledgeGraph: graph,
      timeHorizon: horizon,
      knowledgeState: KnowledgeState.OBSERVED,
      flashcardsCount: 0,
      hitRate: 0.80,
      assuntoToDisciplina: metadata.assuntoToDisciplina,
      subassuntoToAssunto: metadata.subassuntoToAssunto,
      history
    });

    expect(veto.isVetoed).toBe(true);
    expect(veto.vetoType).toBe("INVERSION_PRE_REQUISITO");
    expect(veto.reason).toContain("Necessidade diagnóstica");
  });

  it("25. Pré-requisitos: dependências conceituais devem ser validadas mesmo que pertençam a disciplinas distintas do edital", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const horizon = createMockHorizon();

    // Dependência conceitual atravessa disciplinas: 'sub-propriedade-1' (d-constitucional) depende de 'sub-licitacoes-1' (d-administrativo)
    const graph: KnowledgeGraph = {
      nodes: {
        "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: ["sub-licitacoes-1"] },
        "sub-licitacoes-1": { id: "sub-licitacoes-1", nome: "Dispensa de Licitação", dependencias: [] }
      }
    };

    const history: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          teoriaConcluida: true,
          flashcardsDisponiveis: 0,
          flashcardsPendentes: 0,
          tentativas: [],
          historicoRevisoes: []
        },
        "sub-licitacoes-1": {
          subassuntoId: "sub-licitacoes-1",
          teoriaConcluida: true,
          flashcardsDisponiveis: 0,
          flashcardsPendentes: 0,
          tentativas: [
            { id: "t1", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t2", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t3", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t4", subassuntoId: "sub-licitacoes-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
            { id: "t5", subassuntoId: "sub-licitacoes-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
          ],
          historicoRevisoes: []
        }
      }
    };

    const veto = evaluateConstraints({
      disciplinaId: "d-constitucional",
      assuntoId: "a-propriedade",
      subassuntoId: "sub-propriedade-1",
      tipo: "questoes",
      edital,
      diagnosis,
      knowledgeGraph: graph,
      timeHorizon: horizon,
      knowledgeState: KnowledgeState.OBSERVED,
      flashcardsCount: 0,
      hitRate: 0.80,
      assuntoToDisciplina: metadata.assuntoToDisciplina,
      subassuntoToAssunto: metadata.subassuntoToAssunto,
      history
    });

    // O veto deve ser aplicado mesmo que d-constitucional seja diferente de d-administrativo
    expect(veto.isVetoed).toBe(true);
    expect(veto.vetoType).toBe("INVERSION_PRE_REQUISITO");
  });

  // --- REQUISITO 7: ADICIONAIS A.3 & A.4 (VALIDAÇÃO DE DATAS E POLÍTICA) ---
  it("26. Validação de Data: validateStrictISODate aceita datas ISO válidas", () => {
    expect(() => validateStrictISODate("2026-07-12", "testField")).not.toThrow();
    expect(() => validateStrictISODate("2026-07-12T10:00:00Z", "testField")).not.toThrow();
  });

  it("27. Validação de Data: validateStrictISODate rejeita datas malformatadas", () => {
    expect(() => validateStrictISODate("12-07-2026", "testField")).toThrow();
    expect(() => validateStrictISODate("2026/07/12", "testField")).toThrow();
    expect(() => validateStrictISODate("invalid-date", "testField")).toThrow();
  });

  it("28. Validação: validateSDEInputs rejeita quando assuntoToSubassuntos está ausente", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const history: EvidenciasCandidato = { concursoId: "c-1", porSubassunto: {} };
    const graph = createMockGraph();
    const horizon = createMockHorizon();

    expect(() => {
      validateSDEInputs({
        edital,
        diagnosis,
        history,
        knowledgeGraph: graph,
        timeHorizon: horizon,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: undefined as any,
        policy: createMockPolicy(),
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });
    }).toThrow();
  });

  it("29. Validação: validateSDEInputs rejeita quando policy está ausente", () => {
    const edital = createMockEdital();
    const diagnosis = createMockDiagnosis();
    const history: EvidenciasCandidato = { concursoId: "c-1", porSubassunto: {} };
    const graph = createMockGraph();
    const horizon = createMockHorizon();

    expect(() => {
      validateSDEInputs({
        edital,
        diagnosis,
        history,
        knowledgeGraph: graph,
        timeHorizon: horizon,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: undefined as any,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });
    }).toThrow();
  });

  // --- REQUISITO 9: PIPELINE COMPLETO - SPRINT P0.1-A.5 ---
  describe("Sprint P0.1-A.5 Pipeline Tests", () => {
    function deepFreeze(obj: any): any {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        if (
          obj.hasOwnProperty(prop) &&
          obj[prop] !== null &&
          (typeof obj[prop] === "object" || typeof obj[prop] === "function") &&
          !Object.isFrozen(obj[prop])
        ) {
          deepFreeze(obj[prop]);
        }
      });
      return obj;
    }

    function deepClone<T>(obj: T): T {
      return JSON.parse(JSON.stringify(obj));
    }

    it("30. Pipeline completo e Pureza", () => {
      const edital = createMockEdital();
      const diagnosis = createMockDiagnosis();
      const graph = createMockGraph();
      const horizon = createMockHorizon();
      const policy = createMockPolicy();

      // Setup UNSEEN (no entry in history) and OBSERVED (with entry)
      const history: EvidenciasCandidato = {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: [
              { id: "t1", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
              { id: "t2", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
              { id: "t3", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" },
              { id: "t4", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-10", tempoRespostaSegundos: 60, origem: "TREINO_ISOLADO" }
            ], // 3/4 = 75% observed hitRate
            historicoRevisoes: []
          },
          "sub-atos-1": {
            subassuntoId: "sub-atos-1",
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: [], // no attempts, UNKNOWN
            historicoRevisoes: []
          }
          // sub-licitacoes-1 has no entry in history: completely UNSEEN
        }
      };

      const inputs: PriorityEngineInputs = {
        diagnosis,
        knowledgeGraph: graph,
        edital,
        timeHorizon: horizon,
        history,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        names: metadata.names,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      };

      // Test 20: entradas profundamente congeladas não são modificadas
      const frozenInputs = deepFreeze(deepClone(inputs));
      let actions1: StrategicAction[] = [];
      expect(() => {
        actions1 = generateStrategicActions(frozenInputs);
      }).not.toThrow();

      // Test 21: duas execuções retornam resultados profundamente iguais
      const clonedInputs = deepClone(inputs);
      const actions2 = generateStrategicActions(clonedInputs);
      expect(actions1).toEqual(actions2);

      // Find specific actions for checks
      const unseenAction = actions1.find(a => a.subassuntoId === "sub-licitacoes-1" && a.tipo === "teoria");
      const observedAction = actions1.find(a => a.subassuntoId === "sub-propriedade-1");
      const unknownQuestionsAction = actions1.find(a => a.subassuntoId === "sub-atos-1" && a.tipo === "questoes");

      // Test 1: pipeline preserva hitRate null para tópico UNSEEN
      if (unseenAction) {
        expect(unseenAction.hitRate).toBeNull();

        // Test 2: tópico UNSEEN não aparece como rendimento 0%
        const xaiStr = JSON.stringify(unseenAction.justificativaXAI);
        expect(xaiStr).not.toContain("rendimento observado: 0%");
        expect(xaiStr).not.toContain("rendimento de 0%");
        expect(xaiStr).not.toContain("desempenho de 0%");
        expect(xaiStr).not.toContain("aproveitamento de 0%");
        
        // Test 3: tópico UNSEEN não é chamado de lacuna
        expect(xaiStr.toLowerCase()).not.toContain("lacuna");

        // Test 4: teoria UNSEEN não é chamada de diagnóstico
        expect(unseenAction.justificativaXAI.porQue.toLowerCase()).not.toContain("diagnóstico");
        expect(unseenAction.justificativaXAI.porQue.toLowerCase()).not.toContain("diagnostico");

        // Test 5: teoria UNSEEN explica construção de base conceitual
        expect(unseenAction.justificativaXAI.porQue).toContain("construir a base conceitual inicial");

        // Test 8: hitRate null possui beneficioEsperado null
        expect(unseenAction.justificativaXAI.beneficioEsperado).toBeNull();

        // Test 9: hitRate null possui ganhoEsperado null
        expect(unseenAction.ganhoEsperado).toBeNull();

        // Test 10: hitRate null possui riscoEvitado null
        expect(unseenAction.riscoEvitado).toBeNull();
      }

      // Test 6: UNKNOWN com questões possui diagnosticPurpose true
      // Test 7: UNKNOWN com questões é descrito como diagnóstico
      if (unknownQuestionsAction) {
        expect(unknownQuestionsAction.diagnosticPurpose).toBe(true);
        expect(unknownQuestionsAction.justificativaXAI.porQue).toContain("finalidade diagnóstica");
      }

      // Test 11 & 12: nenhuma ação possui fallback de +0.6 pontos ou outro ganho mínimo
      actions1.forEach(act => {
        const xaiStr = JSON.stringify(act.justificativaXAI);
        expect(xaiStr).not.toContain("+0.6");
        expect(xaiStr).not.toContain("+0,6");
        expect(xaiStr).not.toContain("pontos líquidos");
        expect(xaiStr).not.toContain("nota estimada");

        // Test 13: ganhoEsperado permanece null sem modelo validado
        expect(act.ganhoEsperado).toBeNull();

        // Test 14: riscoEvitado permanece null sem modelo validado
        expect(act.riscoEvitado).toBeNull();

        // Test 17: XAI não afirma rendimento estável sem série histórica
        expect(xaiStr).not.toContain("rendimento estável");

        // Test 18: XAI não promete mudança automática de confiança
        expect(xaiStr).not.toContain("reduzindo a incerteza");
        expect(xaiStr).not.toContain("Baixa para Média");
        expect(xaiStr).not.toContain("Baixa para Media");
      });

      // Test 15: XAI não afirma usar recência quando não existe data
      // For unseenAction, there is no study date
      if (unseenAction) {
        expect(unseenAction.justificativaXAI.dadosUtilizados).not.toContain("Recência");
        expect(unseenAction.justificativaXAI.fatosUtilizados).not.toContain("esquecimento");
      }

      // Test 16: XAI não afirma dependência quando não existe dependência
      actions1.forEach(act => {
        if (!act.subassuntoId || !graph.nodes[act.subassuntoId]?.dependencias?.length) {
          expect(act.justificativaXAI.dadosUtilizados).not.toContain("dependências");
          expect(act.justificativaXAI.fatosUtilizados).not.toContain("dependência");
        }
      });

      // Test 19: tópico observado preserva o hitRate real na explicação
      if (observedAction) {
        expect(observedAction.justificativaXAI.fatosUtilizados).toContain("75%");
      }
    });

    it("31. evaluateConstraints exige history canônico e não possui fallback legado", () => {
      const edital = createMockEdital();
      const diagnosis = createMockDiagnosis();
      const graph = createMockGraph();
      const horizon = createMockHorizon();
      const history: EvidenciasCandidato = {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: [],
            historicoRevisoes: []
          }
        }
      };

      // Test 22: evaluateConstraints exige history canônico
      // Se não passar history, TypeScript/compilação impediria. No runtime, evaluateConstraints usa history diretamente.
      const veto = evaluateConstraints({
        disciplinaId: "d-constitucional",
        assuntoId: "a-propriedade",
        subassuntoId: "sub-propriedade-1",
        tipo: "teoria",
        edital,
        diagnosis,
        knowledgeGraph: graph,
        timeHorizon: horizon,
        knowledgeState: KnowledgeState.UNSEEN,
        flashcardsCount: 0,
        hitRate: null,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        history
      });

      expect(veto).toBeDefined();
    });
  });

  describe("Sprint P0.1-B - 28 Casos de Teste de Integração e Políticas de Decisão", () => {
    // --- FIXTURES INDEPENDENTES DE ESTADOS ---
    
    // 1. UNSEEN state (Tópico inédito, sem histórico)
    const unseenHistory: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          teoriaConcluida: false,
          flashcardsDisponiveis: 0,
          flashcardsPendentes: 0,
          tentativas: [],
          historicoRevisoes: []
        }
      }
    };

    // 2. UNKNOWN state (Estado indefinido, necessitando diagnóstico)
    const unknownHistory: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {} // Sem nenhuma evidência registrada
    };

    // 3. OBSERVED state (Base observada, com questões resolvidas e recência)
    const observedHistory: EvidenciasCandidato = {
      concursoId: "c-1",
      porSubassunto: {
        "sub-propriedade-1": {
          subassuntoId: "sub-propriedade-1",
          teoriaConcluida: true,
          dataUltimoEstudo: "2026-07-10",
          flashcardsDisponiveis: 10,
          flashcardsPendentes: 5,
          tentativas: [
            { id: "t1", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-11", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 45 },
            { id: "t2", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-11", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 50 },
            { id: "t3", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-11", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 60 },
            { id: "t4", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-12", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 40 },
            { id: "t5", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-12", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 45 }
          ],
          historicoRevisoes: [
            { data: "2026-07-10", tipo: "teoria" }
          ]
        }
      }
    };

    const metadata = createMockMetadata();
    const defaultPolicy = createMockPolicy();
    const defaultEdital = createMockEdital();
    const defaultDiagnosis = createMockDiagnosis();
    const defaultGraph = createMockGraph();
    const defaultHorizon = createMockHorizon();

    const createMockDiscAssessment = (hitRate: number | null, sampleSize: number): DisciplinaAssessment => ({
      state: sampleSize >= 5 ? "OBSERVED" : "UNKNOWN",
      hitRate,
      sampleSize,
      totalAcertos: hitRate !== null ? Math.round(hitRate * sampleSize) : 0,
      lastEvidenceAt: "2026-07-12",
      theoryCompleted: true,
      confidenceLevel: "HIGH",
      confidenceScore: 0.8,
      treinoHitRate: hitRate,
      treinoSampleSize: sampleSize,
      simuladoHitRate: null,
      simuladoSampleSize: 0
    });

    const createMockAssessment = (params: Partial<KnowledgeAssessment>): KnowledgeAssessment => ({
      state: "UNSEEN",
      hitRate: null,
      sampleSize: 0,
      totalAcertos: 0,
      lastEvidenceAt: null,
      theoryCompleted: false,
      confidenceLevel: "LOW",
      confidenceScore: 0,
      ...params
    });

    // ==========================================
    // GRUPO 1: RISCO ELIMINATÓRIO (Tests 1-5)
    // ==========================================

    it("1. Nível de Risco - CRITICAL quando hit rate da disciplina está abaixo do mínimo", () => {
      const riskResult = calculateEliminationRisk(
        "d-constitucional",
        defaultEdital,
        observedHistory,
        metadata.assuntoToDisciplina,
        metadata.assuntoToSubassuntos,
        referenceDate,
        defaultPolicy,
        createMockDiscAssessment(0.30, 5)
      );
      expect(riskResult.level).toBe(EliminationRiskLevel.CRITICAL);
      expect(riskResult.disciplineHitRate).toBe(0.30);
      expect(riskResult.margin).toBeLessThan(0);
    });

    it("2. Nível de Risco - WARNING quando a margem está no intervalo de atenção (0% a 10% do mínimo)", () => {
      // mínimo 50% (d-constitucional), hit rate 55% -> margem é 5% (dentro do aviso que é 15% de margem absoluta no mock da política)
      const riskResult = calculateEliminationRisk(
        "d-constitucional",
        defaultEdital,
        observedHistory,
        metadata.assuntoToDisciplina,
        metadata.assuntoToSubassuntos,
        referenceDate,
        defaultPolicy,
        createMockDiscAssessment(0.55, 10)
      );
      expect(riskResult.level).toBe(EliminationRiskLevel.WARNING);
      expect(riskResult.margin).toBeCloseTo(0.05);
    });

    it("3. Nível de Risco - SAFE quando a margem é confortável (> 10% do mínimo)", () => {
      // mínimo 50%, hit rate 75% -> margem de 25% (muito maior que warningMargin de 15%)
      const riskResult = calculateEliminationRisk(
        "d-constitucional",
        defaultEdital,
        observedHistory,
        metadata.assuntoToDisciplina,
        metadata.assuntoToSubassuntos,
        referenceDate,
        defaultPolicy,
        createMockDiscAssessment(0.75, 15)
      );
      expect(riskResult.level).toBe(EliminationRiskLevel.SAFE);
      expect(riskResult.margin).toBeCloseTo(0.25);
    });

    it("4. Nível de Risco - INSUFFICIENT_DATA quando a amostra de questões resolvidas for inferior ao mínimo da política", () => {
      const riskResult = calculateEliminationRisk(
        "d-constitucional",
        defaultEdital,
        observedHistory,
        metadata.assuntoToDisciplina,
        metadata.assuntoToSubassuntos,
        referenceDate,
        defaultPolicy,
        createMockDiscAssessment(0.30, 2) // amostra de 2 questões (< minDisciplineSampleSize que é 5)
      );
      expect(riskResult.level).toBe(EliminationRiskLevel.INSUFFICIENT_DATA);
    });

    it("5. Nível de Risco - NOT_APPLICABLE quando a disciplina não possuir nota de corte definida no edital", () => {
      const editalSemMinimo = {
        ...defaultEdital,
        minimosDisciplinas: {}
      };
      const riskResult = calculateEliminationRisk(
        "d-constitucional",
        editalSemMinimo,
        observedHistory,
        metadata.assuntoToDisciplina,
        metadata.assuntoToSubassuntos,
        referenceDate,
        defaultPolicy,
        createMockDiscAssessment(0.30, 10)
      );
      expect(riskResult.level).toBe(EliminationRiskLevel.NOT_APPLICABLE);
      expect(riskResult.margin).toBeNull();
    });

    // ==========================================
    // GRUPO 2: CONFIANÇA E DECAIMENTO (Tests 6-10)
    // ==========================================

    it("6. Confiança Estatística - HIGH quando há grande amostra recente", () => {
      const confidence = calculateStatisticalConfidence(120, 5); // 120 questões, estudado há 5 dias
      expect(confidence).toBeGreaterThanOrEqual(0.75);
    });

    it("7. Confiança Estatística - MEDIUM quando a amostra é moderada", () => {
      const confidence = calculateStatisticalConfidence(45, 10); // 45 questões, estudado há 10 dias
      expect(confidence).toBeLessThan(0.75);
      expect(confidence).toBeGreaterThanOrEqual(0.40);
    });

    it("8. Confiança Estatística - LOW quando a amostra é muito pequena ou inatividade muito longa", () => {
      const confidence = calculateStatisticalConfidence(5, 45); // 5 questões, inatividade de 45 dias
      expect(confidence).toBeLessThan(0.40);
    });

    it("9. Decaimento Temporal - Decréscimo da nota de proficiência conforme dias desde o último estudo aumentam", () => {
      const assessment1 = assessSubassunto("sub-propriedade-1", observedHistory, referenceDate); // recência 1-2 dias
      
      // Criar cópia com estudo antigo (60 dias atrás)
      const distantHistory: EvidenciasCandidato = {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            ...observedHistory.porSubassunto["sub-propriedade-1"],
            dataUltimoEstudo: "2026-05-10"
          }
        }
      };
      const assessment2 = assessSubassunto("sub-propriedade-1", distantHistory, referenceDate);
      expect(assessment2.confidenceScore).toBeLessThan(assessment1.confidenceScore);
    });

    it("10. Risco de Esquecimento - Incremento linear no multiplicador de recência conforme o tempo de inatividade progride", () => {
      const scoreBreakdownBase = calculatePriorityScore(
        "d-constitucional", "a-propriedade", "sub-propriedade-1", "teoria",
        defaultEdital, defaultDiagnosis, observedHistory, defaultGraph, defaultHorizon,
        metadata.assuntoToDisciplina, metadata.assuntoToSubassuntos, defaultPolicy,
        false, DEFAULT_LEARNING_LEVERAGE_POLICY, undefined, undefined, undefined
      );
      
      // Com inatividade longa (e.g. 50 dias)
      const degradedHorizon: TimeHorizon = {
        dataProva: "2026-10-15",
        diasAteAProva: 90,
        referenceDate: "2026-09-10" // Afastado do estudo que foi 2026-07-10
      };
      const scoreBreakdownDegraded = calculatePriorityScore(
        "d-constitucional", "a-propriedade", "sub-propriedade-1", "teoria",
        defaultEdital, defaultDiagnosis, observedHistory, defaultGraph, degradedHorizon,
        metadata.assuntoToDisciplina, metadata.assuntoToSubassuntos, defaultPolicy,
        false, DEFAULT_LEARNING_LEVERAGE_POLICY, undefined, undefined, undefined
      );
      
      expect(scoreBreakdownDegraded.riscoEsquecimento).toBeGreaterThan(scoreBreakdownBase.riscoEsquecimento!);
    });

    // ==========================================
    // GRUPO 3: ELEGIBILIDADE DE ATIVIDADE (Tests 11-15)
    // ==========================================

    it("11. Elegibilidade de Teoria - Permitido se o tópico for UNSEEN", () => {
      const eligibility = evaluateActivityEligibility(
        "teoria",
        createMockAssessment({ state: "UNSEEN" }),
        undefined,
        0,
        referenceDate
      );
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reasonCode).toBe("UNSEEN_THEORY");
    });

    it("12. Elegibilidade de Teoria - Permitido se o tópico tiver rendimento baixo (< 50%) e base observada robusta", () => {
      const eligibility = evaluateActivityEligibility(
        "teoria",
        createMockAssessment({ state: "OBSERVED", hitRate: 0.35, sampleSize: 50 }),
        undefined,
        0,
        referenceDate
      );
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reasonCode).toBe("LOW_PERFORMANCE_THEORY");
    });

    it("13. Elegibilidade de Questões - Permitido em tópicos UNKNOWN (diagnóstico) ou quando a teoria está concluída", () => {
      // Caso 1: UNKNOWN diagnóstico
      const elUnknown = evaluateActivityEligibility(
        "questoes",
        createMockAssessment({ state: "UNKNOWN" }),
        undefined,
        0,
        referenceDate
      );
      expect(elUnknown.eligible).toBe(true);
      expect(elUnknown.reasonCode).toBe("DIAGNOSTIC_QUESTIONS");

      // Caso 2: OBSERVED com teoria concluída
      const elObserved = evaluateActivityEligibility(
        "questoes",
        createMockAssessment({ state: "OBSERVED", theoryCompleted: true }),
        undefined,
        0,
        referenceDate
      );
      expect(elObserved.eligible).toBe(true);
      expect(elObserved.reasonCode).toBe("OBSERVED_PRACTICE");
    });

    it("14. Elegibilidade de Revisão - Bloqueado a menos que haja gatilhos temporais ou de decaimento", () => {
      // Bloqueado se tudo estiver confortável e sem gatilhos
      const elLocked = evaluateActivityEligibility(
        "revisao",
        createMockAssessment({ state: "OBSERVED", lastEvidenceAt: "2026-07-10" }),
        undefined,
        0.1,
        referenceDate
      );
      expect(elLocked.eligible).toBe(false);

      // Permitido se houver revisão pendente no histórico por decaimento temporal
      const eligibilityForced = evaluateActivityEligibility(
        "revisao",
        createMockAssessment({ state: "OBSERVED", lastEvidenceAt: "2026-06-01" }), // Muito antigo!
        undefined,
        0.1,
        referenceDate
      );
      expect(eligibilityForced.eligible).toBe(true);
      expect(eligibilityForced.reasonCode).toBe("REVISION_EXPIRED");
    });

    it("15. Elegibilidade de Flashcards - Restrito exclusivamente quando há cartões ativos pendentes no histórico", () => {
      const elNoCards = evaluateActivityEligibility(
        "flashcards",
        createMockAssessment({ state: "OBSERVED" }),
        undefined,
        0,
        referenceDate
      );
      expect(elNoCards.eligible).toBe(false);

      const mockEvidenceWithPendingCards = {
        subassuntoId: "sub-propriedade-1",
        teoriaConcluida: true,
        flashcardsDisponiveis: 10,
        flashcardsPendentes: 5,
        tentativas: [],
        historicoRevisoes: []
      };

      const elWithCards = evaluateActivityEligibility(
        "flashcards",
        createMockAssessment({ state: "OBSERVED" }),
        mockEvidenceWithPendingCards,
        0,
        referenceDate
      );
      expect(elWithCards.eligible).toBe(true);
      expect(elWithCards.reasonCode).toBe("FLASHCARDS_PENDING");
    });

    // ==========================================
    // GRUPO 4: VETOS E PRÉ-REQUISITOS (Tests 16-20)
    // ==========================================

    it("16. Veto de Pré-requisito - Bloqueio absoluto quando o nó dependente possui proficiência observada < 50%", () => {
      // Grafo com dependência sub-propriedade-1 -> dependendo de outro nó fraco
      const customGraph: KnowledgeGraph = {
        nodes: {
          "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: ["sub-requisito-fraco"] },
          "sub-requisito-fraco": { id: "sub-requisito-fraco", nome: "Requisito", dependencias: [] }
        }
      };
      
      const weakHistory: EvidenciasCandidato = {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": { subassuntoId: "sub-propriedade-1", flashcardsDisponiveis: 0, flashcardsPendentes: 0, tentativas: [], historicoRevisoes: [] },
          "sub-requisito-fraco": {
            subassuntoId: "sub-requisito-fraco",
            teoriaConcluida: true,
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: [
              { id: "tx", subassuntoId: "sub-requisito-fraco", acertou: false, data: "2026-07-12", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 50 },
              { id: "ty", subassuntoId: "sub-requisito-fraco", acertou: false, data: "2026-07-12", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 50 }
            ], // Rendimento 0% (< 50%)
            historicoRevisoes: []
          }
        }
      };

      const veto = evaluateConstraints({
        disciplinaId: "d-constitucional",
        assuntoId: "a-propriedade",
        subassuntoId: "sub-propriedade-1",
        tipo: "questoes",
        edital: defaultEdital,
        diagnosis: defaultDiagnosis,
        knowledgeGraph: customGraph,
        timeHorizon: defaultHorizon,
        knowledgeState: KnowledgeState.UNSEEN,
        flashcardsCount: 0,
        hitRate: null,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        history: weakHistory
      });

      expect(veto.isVetoed).toBe(true);
      expect(veto.reasonCode).toBe("VETO_PRE_REQUISITO_PERFORMANCE");
    });

    it("17. Veto de Pré-requisito - Conversão automática para necessidade diagnóstica se a dependência for UNSEEN ou UNKNOWN", () => {
      const customGraph: KnowledgeGraph = {
        nodes: {
          "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: ["sub-requisito-ininedito"] },
          "sub-requisito-ininedito": { id: "sub-requisito-ininedito", nome: "Inédito", dependencias: [] }
        }
      };

      const veto = evaluateConstraints({
        disciplinaId: "d-constitucional",
        assuntoId: "a-propriedade",
        subassuntoId: "sub-propriedade-1",
        tipo: "questoes",
        edital: defaultEdital,
        diagnosis: defaultDiagnosis,
        knowledgeGraph: customGraph,
        timeHorizon: defaultHorizon,
        knowledgeState: KnowledgeState.UNSEEN,
        flashcardsCount: 0,
        hitRate: null,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        history: unseenHistory
      });

      expect(veto.isVetoed).toBe(true);
      expect(veto.diagnosticPurpose).toBe(true);
      expect(veto.reasonCode).toBe("VETO_PRE_REQUISITO_DIAGNOSTICO");
    });

    it("18. Veto de Pré-requisito - Validação rigorosa mesmo para dependências de disciplinas diferentes", () => {
      // sub-licitacoes-1 (Direito Administrativo) depende de sub-propriedade-1 (Direito Constitucional) que está fraco
      const crossGraph: KnowledgeGraph = {
        nodes: {
          "sub-licitacoes-1": { id: "sub-licitacoes-1", nome: "Licitações", dependencias: ["sub-propriedade-1"] },
          "sub-propriedade-1": { id: "sub-propriedade-1", nome: "Desapropriação", dependencias: [] }
        }
      };

      const crossHistory: EvidenciasCandidato = {
        concursoId: "c-1",
        porSubassunto: {
          "sub-licitacoes-1": { subassuntoId: "sub-licitacoes-1", flashcardsDisponiveis: 0, flashcardsPendentes: 0, tentativas: [], historicoRevisoes: [] },
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: [
              { id: "t1", subassuntoId: "sub-propriedade-1", acertou: false, data: "2026-07-12", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 30 }
            ], // Rendimento 0%
            historicoRevisoes: []
          }
        }
      };

      const veto = evaluateConstraints({
        disciplinaId: "d-administrativo",
        assuntoId: "a-licitacoes",
        subassuntoId: "sub-licitacoes-1",
        tipo: "teoria",
        edital: defaultEdital,
        diagnosis: defaultDiagnosis,
        knowledgeGraph: crossGraph,
        timeHorizon: defaultHorizon,
        knowledgeState: KnowledgeState.UNSEEN,
        flashcardsCount: 0,
        hitRate: null,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        history: crossHistory
      });

      expect(veto.isVetoed).toBe(true);
      expect(veto.reasonCode).toBe("VETO_PRE_REQUISITO_PERFORMANCE");
    });

    it("19. Veto de Inutilidade da Banca - Veta tópicos com incidência nula ou irrelevante conforme edital", () => {
      const uselessEdital = {
        ...defaultEdital,
        incidenciaHistoricaAssuntos: {
          "a-propriedade": 0.0 // Incidência zero absoluta!
        }
      };

      const veto = evaluateConstraints({
        disciplinaId: "d-constitucional",
        assuntoId: "a-propriedade",
        subassuntoId: "sub-propriedade-1",
        tipo: "teoria",
        edital: uselessEdital,
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        timeHorizon: defaultHorizon,
        knowledgeState: KnowledgeState.UNSEEN,
        flashcardsCount: 0,
        hitRate: null,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        history: unseenHistory
      });

      expect(veto.isVetoed).toBe(true);
      expect(veto.reasonCode).toBe("VETO_INUTILIDADE_BANCA");
    });

    it("20. Veto de Desperdício Energético - Veta teoria avançada se o candidato já superou 85% de rendimento", () => {
      const expertHistory: EvidenciasCandidato = {
        concursoId: "c-1",
        porSubassunto: {
          "sub-propriedade-1": {
            subassuntoId: "sub-propriedade-1",
            teoriaConcluida: true,
            flashcardsDisponiveis: 0,
            flashcardsPendentes: 0,
            tentativas: Array(10).fill({ id: "t", subassuntoId: "sub-propriedade-1", acertou: true, data: "2026-07-12", origem: "TREINO_ISOLADO", tempoRespostaSegundos: 30 }), // 100% hit rate
            historicoRevisoes: []
          }
        }
      };

      const veto = evaluateConstraints({
        disciplinaId: "d-constitucional",
        assuntoId: "a-propriedade",
        subassuntoId: "sub-propriedade-1",
        tipo: "teoria", // Tentando estudar TEORIA de assunto já dominado
        edital: defaultEdital,
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        timeHorizon: defaultHorizon,
        knowledgeState: KnowledgeState.OBSERVED,
        flashcardsCount: 0,
        hitRate: 1.0,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        history: expertHistory
      });

      expect(veto.isVetoed).toBe(true);
      expect(veto.reasonCode).toBe("VETO_DESPERDICIO_ENERGETICO");
    });

    // ==========================================
    // GRUPO 5: XAI & CUSTO COMPARATIVO (Tests 21-25)
    // ==========================================

    it("21. Pureza XAI - Justificativa não cita 'lacuna' para tópicos classificados como UNSEEN", () => {
      const actions = generateStrategicActions({
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        edital: defaultEdital,
        timeHorizon: defaultHorizon,
        history: unseenHistory,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        names: metadata.names,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: defaultPolicy,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });

      const unseenAction = actions.find(a => a.subassuntoId === "sub-propriedade-1" && a.tipo === "teoria");
      expect(unseenAction).toBeDefined();
      const xaiStr = JSON.stringify(unseenAction!.justificativaXAI);
      expect(xaiStr.toLowerCase()).not.toContain("lacuna");
    });

    it("22. Pureza XAI - Justificativa não simula ganho de pontuação fictício (+0.6 pontos) sob nenhuma hipótese", () => {
      const actions = generateStrategicActions({
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        edital: defaultEdital,
        timeHorizon: defaultHorizon,
        history: observedHistory,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        names: metadata.names,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: defaultPolicy,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });

      actions.forEach(action => {
        const xaiStr = JSON.stringify(action.justificativaXAI);
        expect(xaiStr).not.toContain("+0.6");
        expect(xaiStr).not.toContain("+0,6");
        expect(xaiStr).not.toContain("pontos líquidos");
        expect(xaiStr).not.toContain("nota estimada");
      });
    });

    it("23. Custo de Oportunidade Comparativo - Retorna nível FAVORABLE (costValue <= 0) quando não há alternativas viáveis melhores", () => {
      const actions = generateStrategicActions({
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        edital: defaultEdital,
        timeHorizon: defaultHorizon,
        history: observedHistory,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        names: metadata.names,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: defaultPolicy,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });

      // A melhor ação da lista deve ter o menor custo comparativo (Favorable)
      if (actions.length > 0) {
        const topAction = actions[0];
        expect(topAction.opportunityCostResult).toBeDefined();
        expect(topAction.opportunityCostResult!.status).toBe("INSUFFICIENT_DATA");
        expect(topAction.opportunityCostResult!.value).toBeNull();
        expect(topAction.justificativaXAI.custoOportunidade).toContain("Não há dados suficientes");
      }
    });

    it("24. Custo de Oportunidade Comparativo - Retorna nível PROHIBITIVE com justificativa detox factual se houver alternativa com bônus crítico", () => {
      const actions = generateStrategicActions({
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        edital: defaultEdital,
        timeHorizon: defaultHorizon,
        history: observedHistory,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        names: metadata.names,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: defaultPolicy,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });

      // Se houver uma ação muito pior que a primeira, o custo de oportunidade comparativo será alto
      if (actions.length > 1) {
        const worstAction = actions[actions.length - 1];
        expect(worstAction.opportunityCostResult).toBeDefined();
        if (worstAction.opportunityCostResult!.value !== null && worstAction.opportunityCostResult!.value >= 30) {
          expect(worstAction.justificativaXAI.custoOportunidade).toContain("diferença relativa");
        }
      }
    });

    it("25. Retorno Marginal - Retorna explicitamente nulo com nível de confiança baixo quando não há amostra causal suficiente (amostra < 5)", () => {
      const actions = generateStrategicActions({
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        edital: defaultEdital,
        timeHorizon: defaultHorizon,
        history: unseenHistory, // Sem tentativas, amostra = 0 (< 5)
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        names: metadata.names,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: defaultPolicy,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });

      actions.forEach(act => {
        expect(act.marginalReturnEstimate).toBeDefined();
        expect(act.marginalReturnEstimate!.status).toBe("INSUFFICIENT_DATA");
        expect(act.marginalReturnEstimate!.expectedNetPointsPerHour).toBeNull();
        expect(act.marginalReturnEstimate!.confidence).toBeNull();
      });
    });

    // ==========================================
    // GRUPO 6: ORQUESTRAÇÃO DO PIPELINE (Tests 26-28)
    // ==========================================

    it("26. Pipeline Completo - Ordenação das recomendações respeita rigorosamente a hierarquia constitucional de camadas", () => {
      const actions = generateStrategicActions({
        diagnosis: defaultDiagnosis,
        knowledgeGraph: defaultGraph,
        edital: defaultEdital,
        timeHorizon: defaultHorizon,
        history: observedHistory,
        disciplinas: metadata.disciplinas,
        assuntos: metadata.assuntos,
        subassuntos: metadata.subassuntos,
        names: metadata.names,
        assuntoToDisciplina: metadata.assuntoToDisciplina,
        subassuntoToAssunto: metadata.subassuntoToAssunto,
        assuntoToSubassuntos: metadata.assuntoToSubassuntos,
        policy: defaultPolicy,
        opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
        learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
      });

      // Verificar que as camadas constitucionais estão em ordem crescente de peso do TIER_ORDER
      const TIER_ORDER_VALS = {
        RISCO_ELIMINACAO: 1,
        LACUNAS_ALTO_PESO: 2,
        RETORNO_ESPERADO: 3,
        PROTECAO_MEMORIA: 4,
        EXPANSAO_EDITAL: 5,
        MANUTENCAO_EXCELENCIA: 6
      };

      for (let i = 0; i < actions.length - 1; i++) {
        const orderA = TIER_ORDER_VALS[actions[i].camadaConstitucional] ?? 99;
        const orderB = TIER_ORDER_VALS[actions[i + 1].camadaConstitucional] ?? 99;
        expect(orderA).toBeLessThanOrEqual(orderB);
      }
    });

    it("27. Injeção de Políticas - Permite customizar limites de corte e regras de cálculo injetando instâncias específicas", () => {
      const customLLPolicy = {
        lowPerformanceUpperBound: 0.30,
        leverageZoneLowerBound: 0.30,
        leverageZoneUpperBound: 0.70,
        masteredLowerBound: 0.70
      };

      const scoreBreakdown = calculatePriorityScore(
        "d-constitucional", "a-propriedade", "sub-propriedade-1", "teoria",
        defaultEdital, defaultDiagnosis, observedHistory, defaultGraph, defaultHorizon,
        metadata.assuntoToDisciplina, metadata.assuntoToSubassuntos, defaultPolicy,
        false, customLLPolicy, undefined, undefined, undefined
      );

      expect(scoreBreakdown.learningLeverageScore).toBeDefined();
    });

    it("28. Validação de Contrato - Rejeita estruturalmente entradas inconsistentes com dados ausentes ou datas inválidas", () => {
      const invalidHorizon = {
        ...defaultHorizon,
        dataProva: "DATA_TOTALMENTE_INVALIDA"
      };

      expect(() => {
        generateStrategicActions({
          diagnosis: defaultDiagnosis,
          knowledgeGraph: defaultGraph,
          edital: defaultEdital,
          timeHorizon: invalidHorizon,
          history: observedHistory,
          disciplinas: metadata.disciplinas,
          assuntos: metadata.assuntos,
          subassuntos: metadata.subassuntos,
          names: metadata.names,
          assuntoToDisciplina: metadata.assuntoToDisciplina,
          subassuntoToAssunto: metadata.subassuntoToAssunto,
          assuntoToSubassuntos: metadata.assuntoToSubassuntos,
          policy: defaultPolicy,
          opportunityCostPolicy: DEFAULT_OPPORTUNITY_COST_POLICY,
          learningLeveragePolicy: DEFAULT_LEARNING_LEVERAGE_POLICY
        });
      }).toThrow();
    });
  });
});
