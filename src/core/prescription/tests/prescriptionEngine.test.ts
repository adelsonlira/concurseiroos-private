import { describe, expect, it } from "vitest";
import type { PrivateStudyMaterial } from "../../materials/types";
import type { PlannerResponse, StudySession } from "../../sde/planner/plannerTypes";
import { ConstitutionalTier, type StrategicAction } from "../../sde/prioritization/types";
import { buildDailyStudyPrescription } from "../prescriptionEngine";
import { auditDailyStudyPrescription } from "../prescriptionAudit";

const action: StrategicAction = {
  prioridade: 1,
  score: 50,
  tempoEstimadoMinutos: 45,
  estimatedDurationMinutes: 45,
  disciplinaId: "d1",
  disciplinaNome: "Conhecimentos Específicos",
  assuntoId: "a1",
  assuntoNome: "Banco de Dados",
  subassuntoId: "s1",
  subassuntoNome: "Normalização",
  tipo: "questoes",
  ganhoEsperado: null,
  riscoEvitado: null,
  hitRate: null,
  custoOportunidade: null,
  justificativaXAI: {
    porQue: "É necessária uma pequena amostra diagnóstica.",
    dadosUtilizados: "Edital e ausência de tentativas.",
    beneficioEsperado: null,
    custoIgnorar: "Continuar sem evidência de aplicação.",
    camadaConstitucional: ConstitutionalTier.EXPANSAO_EDITAL,
    fatosUtilizados: "Subassunto previsto no edital.",
    inferencias: "Amostra diagnóstica necessária.",
    dadosAusentes: ["desempenho observado"],
    nivelConfianca: "MEDIA",
    custoOportunidade: "Não calculado.",
    vetosConsiderados: [],
    diagnosticPurpose: true
  },
  camadaConstitucional: ConstitutionalTier.EXPANSAO_EDITAL,
  diagnosticPurpose: true,
  reasonCode: "DIAGNOSTIC_QUESTIONS",
  decisionEvidence: {
    knowledgeState: "UNKNOWN" as never,
    sampleSize: 0,
    confidenceScore: 0,
    confidenceLevel: "LOW",
    topicWeightSource: "OFFICIAL",
    historicalIncidenceSource: "UNAVAILABLE",
    historicalIncidenceRate: null
  }
};

const session: StudySession = {
  id: "session-1",
  sequencia: 1,
  actionId: "d1-a1-s1-questoes",
  strategicPriority: 1,
  sourceScore: 50,
  disciplinaId: "d1",
  disciplinaNome: "Conhecimentos Específicos",
  assuntoId: "a1",
  assuntoNome: "Banco de Dados",
  subassuntoId: "s1",
  subassuntoNome: "Normalização",
  tipo: "questoes",
  tempoMinutos: 45,
  objetivos: [{ descricao: "Coletar evidência real", indicadorMeta: "Registrar resultado" }],
  passosExecucao: [
    { passo: 1, phase: "SETUP", descricao: "Preparar", tempoMinutos: 4 },
    { passo: 2, phase: "QUESTION_PRACTICE", descricao: "Resolver", tempoMinutos: 20 },
    { passo: 3, phase: "CORRECTION", descricao: "Corrigir", tempoMinutos: 14 },
    { passo: 4, phase: "RETRY", descricao: "Refazer", tempoMinutos: 7 }
  ]
};

const planner: PlannerResponse = {
  status: "SUCCESS",
  plan: {
    id: "plan-1",
    estrategiaId: "NORMAL",
    estrategiaNome: "Normal",
    tempoDisponivelMinutos: 45,
    tempoTotalPlanejadoMinutos: 45,
    tempoNaoAlocadoMinutos: 0,
    blocos: [{ id: "b1", nome: "Questões", tempoTotalMinutos: 45, sessões: [session] }],
    metaGeral: "Coletar evidência",
    justificativaEstrategica: "Teste",
    adjustments: [],
    deferredActions: []
  }
};

const catalog: PrivateStudyMaterial[] = [
  {
    id: "m1",
    schemaVersion: "1",
    concursoId: "c1",
    sourceGroup: "curso",
    sourceFileName: "aula.pdf",
    sourceRelativePath: "aula.pdf",
    sourceSha256: "hash",
    sourcePortalCourseId: null,
    lessonLabel: "Aula 01",
    courseTitle: "Banco de Dados",
    displayTitle: "Aula 01 — Banco de Dados",
    totalPages: 100,
    textLayer: "NATIVE_TEXT",
    disciplineId: "d1",
    topicId: "a1",
    sections: [
      {
        ordinal: 1,
        title: "Normalização - Teoria",
        startPage: 5,
        endPage: 19,
        contentKind: "THEORY",
        questionBank: null,
        disciplineId: "d1",
        topicId: "a1",
        subtopicIds: ["s1"],
        mappingStatus: "AUTO_HIGH_CONFIDENCE",
        confidence: 0.95,
        matchedTerms: ["normalização"]
      },
      {
        ordinal: 2,
        title: "Normalização - Questões Comentadas",
        startPage: 20,
        endPage: 35,
        contentKind: "COMMENTED_QUESTIONS",
        questionBank: "FGV",
        disciplineId: "d1",
        topicId: "a1",
        subtopicIds: ["s1"],
        mappingStatus: "AUTO_HIGH_CONFIDENCE",
        confidence: 0.95,
        matchedTerms: ["normalização"]
      },
      {
        ordinal: 3,
        title: "Normalização - Lista de Questões",
        startPage: 36,
        endPage: 50,
        contentKind: "QUESTION_LIST",
        questionBank: "FGV",
        disciplineId: "d1",
        topicId: "a1",
        subtopicIds: ["s1"],
        mappingStatus: "AUTO_HIGH_CONFIDENCE",
        confidence: 0.95,
        matchedTerms: ["normalização"]
      }
    ],
    rights: {
      classification: "PRIVATE_LICENSED_USER_COPY",
      sharingAllowed: false,
      contentExportAllowed: false,
      metadataExportAllowed: true,
      containsPersonalWatermark: false,
      retentionPolicy: "DERIVED_METADATA_ONLY"
    }
  }
];

function build(attempts: Array<{ disciplineId: string; topicId: string; subtopicId?: string; seconds: number }> = []) {
  return buildDailyStudyPrescription({
    concursoId: "c1",
    referenceDate: "2026-07-15",
    planner,
    actions: [action],
    materialCatalog: catalog,
    externalQuestionBanks: [
      {
        id: "qconcursos",
        provider: "QCONCURSOS",
        displayName: "Qconcursos",
        accessMode: "USER_SUBSCRIPTION",
        enabled: true
      }
    ],
    banca: "FGV",
    attempts,
    examPacing: { durationMinutes: 240, totalQuestions: 70 },
    questionPolicy: {
      minimumObservedSamples: 3,
      mediumConfidenceSamples: 5,
      highConfidenceSamples: 20,
      stretchQuestions: 1,
      diagnosticMinimumQuestions: 10
    }
  });
}

describe("daily study prescription", () => {
  it("combina sessão, material, páginas e meta conservadora de questões", () => {
    const result = build();
    expect(result.status).toBe("READY");
    expect(result.current?.material).toMatchObject({
      materialTitle: "Aula 01 — Banco de Dados",
      sectionTitle: "Normalização - Lista de Questões",
      startPage: 36,
      endPage: 50,
      questionBank: "FGV"
    });
    expect(result.current?.questionPractice).toMatchObject({
      targetQuestions: 10,
      stretchTargetQuestions: 11,
      practiceMinutes: 20,
      correctionMinutes: 21,
      paceSource: "OFFICIAL_EXAM_GROSS_PACE",
      sampleSize: 0,
      confidence: "LOW"
    });
    expect(result.current?.questionPractice?.externalSourcePlan).toMatchObject({
      need: "OPTIONAL_ADDITIONAL_VOLUME",
      recommendations: [{ displayName: "Qconcursos", usage: "FALLBACK" }]
    });
    expect(result.current?.diagnosticFollowUp).toMatchObject({
      minimumQuestions: 10,
      minimumHitRatePercent: 85,
      theoryMaterial: {
        sectionTitle: "Normalização - Teoria",
        startPage: 5,
        endPage: 19
      }
    });
  });

  it("usa a mediana real do subassunto quando existe amostra mínima", () => {
    const result = build([
      { disciplineId: "d1", topicId: "a1", subtopicId: "s1", seconds: 80 },
      { disciplineId: "d1", topicId: "a1", subtopicId: "s1", seconds: 100 },
      { disciplineId: "d1", topicId: "a1", subtopicId: "s1", seconds: 120 }
    ]);
    expect(result.current?.questionPractice).toMatchObject({
      targetQuestions: 12,
      stretchTargetQuestions: 13,
      paceSecondsPerQuestion: 100,
      paceSource: "CANDIDATE_SUBTOPIC_MEDIAN",
      sampleSize: 3,
      confidence: "LOW"
    });
  });

  it("prescreve bancos externos como fonte principal quando não existe bateria local", () => {
    const result = buildDailyStudyPrescription({
      concursoId: "c1",
      referenceDate: "2026-07-15",
      planner,
      actions: [action],
      materialCatalog: [],
      externalQuestionBanks: [
        {
          id: "estrategia-questoes",
          provider: "ESTRATEGIA_QUESTOES",
          displayName: "Estratégia Questões",
          accessMode: "USER_SUBSCRIPTION",
          enabled: true
        }
      ],
      banca: "FGV",
      attempts: [],
      examPacing: { durationMinutes: 240, totalQuestions: 70 },
      questionPolicy: {
        minimumObservedSamples: 3,
        mediumConfidenceSamples: 5,
        highConfidenceSamples: 20,
        stretchQuestions: 1,
      diagnosticMinimumQuestions: 10
      }
    });

    expect(result.current?.material).toBeNull();
    expect(result.current?.questionPractice?.externalSourcePlan).toMatchObject({
      need: "NO_LOCAL_QUESTION_SET",
      recommendations: [{ displayName: "Estratégia Questões", usage: "PRIMARY" }]
    });
  });

  it("recua para o assunto quando o subassunto ainda não possui amostra suficiente", () => {
    const result = build([
      { disciplineId: "d1", topicId: "a1", subtopicId: "s1", seconds: 90 },
      { disciplineId: "d1", topicId: "a1", subtopicId: "s2", seconds: 100 },
      { disciplineId: "d1", topicId: "a1", subtopicId: "s2", seconds: 110 }
    ]);
    expect(result.current?.questionPractice).toMatchObject({
      paceSecondsPerQuestion: 100,
      paceSource: "CANDIDATE_TOPIC_MEDIAN",
      sampleSize: 3
    });
  });

  it("expõe prontidão, confiabilidade e próxima ação sem alegar incidência histórica", () => {
    const result = build();
    expect(result.current?.executionReadiness).toMatchObject({ status: "READY", requiredResource: "NONE" });
    expect(result.current?.decisionReliability).toMatchObject({
      level: "LOW",
      mode: "DIAGNOSTIC",
      historicalIncidenceUsed: false
    });
    expect(result.current?.decisionReliability.caveats.join(" ")).toMatch(/shadow mode/i);
    expect(result.current?.nextAction.afterCompletion).toMatch(/recalculará a próxima ação/i);
    expect(auditDailyStudyPrescription(result)).toEqual({ valid: true, issues: [] });
  });

  it("mantém a decisão executável com fallback explícito quando falta fonte de questões", () => {
    const result = buildDailyStudyPrescription({
      concursoId: "c1",
      referenceDate: "2026-07-15",
      planner,
      actions: [action],
      materialCatalog: [],
      externalQuestionBanks: [],
      banca: "FGV",
      attempts: [],
      examPacing: { durationMinutes: 240, totalQuestions: 70 },
      questionPolicy: { minimumObservedSamples: 3, mediumConfidenceSamples: 5, highConfidenceSamples: 20, stretchQuestions: 1, diagnosticMinimumQuestions: 10 }
    });
    expect(result.current?.executionReadiness).toMatchObject({
      status: "READY_WITH_FALLBACK",
      requiredResource: "QUESTION_SOURCE"
    });
  });

  it("não fabrica sessão quando o planner não possui plano executável", () => {
    const result = buildDailyStudyPrescription({
      concursoId: "c1",
      referenceDate: "2026-07-15",
      planner: { status: "NO_VALID_ACTIONS", plan: null, reasons: ["sem ação"] },
      actions: [action],
      materialCatalog: catalog,
      externalQuestionBanks: [],
      banca: "FGV",
      attempts: [],
      examPacing: { durationMinutes: 240, totalQuestions: 70 },
      questionPolicy: {
        minimumObservedSamples: 3,
        mediumConfidenceSamples: 5,
        highConfidenceSamples: 20,
        stretchQuestions: 1,
      diagnosticMinimumQuestions: 10
      }
    });
    expect(result).toMatchObject({
      status: "NO_EXECUTABLE_SESSION",
      current: null,
      upcoming: []
    });
  });
});
