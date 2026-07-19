import { describe, expect, it } from "vitest";
import { generateStrategicActions } from "../../../../core/sde/prioritization/priorityEngine";
import { validateSDEInputs } from "../../../../core/sde/validation/validator";
import {
  DATAPREV_2026_PROFILE_3_ID,
  DATAPREV_2026_PROFILE_3_PACKAGE
} from "../officialData";
import { buildDataprev2026Profile3AppSeed } from "../appSeed";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIAL_SUMMARY } from "../privateStudyMaterials";
import { DATAPREV_2026_ANSWER_KEY_EVIDENCE, ANSWER_KEY_EVIDENCE_POLICY } from "../answerKeyEvidence";
import { DATAPREV_2026_QUESTION_BANK_READINESS } from "../questionBankReadiness";

const pkg = DATAPREV_2026_PROFILE_3_PACKAGE;

function baseInputs() {
  return {
    diagnosis: {
      disciplinasCriticasIds: [],
      swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
      assuntoRendimento: {},
      subassuntoRendimento: {},
      decayRates: {},
      tempoDisponivelMinutos: 180
    },
    knowledgeGraph: pkg.sde.knowledgeGraph,
    edital: pkg.sde.edital,
    timeHorizon: {
      dataProva: "2026-10-11",
      diasAteAProva: 91,
      horasDisponiveisPorDia: 3,
      referenceDate: "2026-07-12"
    },
    history: {
      concursoId: DATAPREV_2026_PROFILE_3_ID,
      porSubassunto: {}
    },
    disciplinas: pkg.sde.disciplinas,
    assuntos: pkg.sde.assuntos,
    subassuntos: pkg.sde.subassuntos,
    names: pkg.sde.names,
    assuntoToDisciplina: pkg.sde.assuntoToDisciplina,
    subassuntoToAssunto: pkg.sde.subassuntoToAssunto,
    assuntoToSubassuntos: pkg.sde.assuntoToSubassuntos,
    policy: pkg.sde.eliminationRiskPolicy,
    opportunityCostPolicy: pkg.sde.opportunityCostPolicy,
    learningLeveragePolicy: pkg.sde.learningLeveragePolicy
  };
}

describe("DATAPREV 2026 — Perfil 3 official configuration", () => {
  it("representa 70 questões e 115 pontos sem inventar distribuição específica", () => {
    const questionTotal = Object.values(pkg.sde.edital.quantidadeQuestoesProva)
      .reduce((sum, value) => sum + value, 0);
    const pointsTotal = Object.entries(pkg.sde.edital.quantidadeQuestoesProva)
      .reduce((sum, [disciplineId, questions]) =>
        sum + questions * pkg.sde.edital.pontosPorQuestao[disciplineId], 0);

    expect(questionTotal).toBe(70);
    expect(pointsTotal).toBe(115);
    expect(pkg.officialRules.minimumTotalPoints).toBe(57.5);
  });

  it("registra Natal/RN como prova e lotação", () => {
    expect(pkg.testLocality).toBe("Natal/RN");
    expect(pkg.workLocality).toBe("Natal/RN");
    expect(pkg.vacancies.immediate.total).toBe(20);
    expect(pkg.vacancies.reserve.total).toBe(80);
  });

  it("registra seis disciplinas oficiais e o conteúdo do Perfil 3", () => {
    expect(pkg.sde.disciplinas).toHaveLength(6);
    expect(pkg.sde.names.disciplinas["dp26-p3-conhecimentos-especificos"])
      .toBe("Conhecimentos Específicos");
    expect(pkg.sde.assuntos.map((item) => item.nome)).toContain("Desenvolvimento de Sistemas");
    expect(pkg.sde.assuntos.map((item) => item.nome)).toContain("Banco de Dados");
    expect(pkg.sde.assuntos.map((item) => item.nome)).toContain("Gestão e Governança de Tecnologia da Informação");
  });

  it("usa prior neutro e declara indisponibilidade da incidência histórica", () => {
    for (const assunto of pkg.sde.assuntos) {
      expect(pkg.sde.edital.pesosAssuntos[assunto.id]).toBe(1);
      expect(pkg.sde.edital.assuntoModelMetadata?.[assunto.id]).toMatchObject({
        topicWeightSource: "NEUTRAL_PRIOR",
        historicalIncidenceSource: "UNAVAILABLE"
      });
    }
  });

  it("valida integralmente o pacote no contrato do SDE", () => {
    const input = baseInputs();
    expect(() => validateSDEInputs({
      edital: input.edital,
      diagnosis: input.diagnosis,
      history: input.history,
      knowledgeGraph: input.knowledgeGraph,
      timeHorizon: input.timeHorizon,
      disciplinas: input.disciplinas,
      assuntos: input.assuntos,
      subassuntos: input.subassuntos,
      assuntoToDisciplina: input.assuntoToDisciplina,
      subassuntoToAssunto: input.subassuntoToAssunto,
      assuntoToSubassuntos: input.assuntoToSubassuntos,
      policy: input.policy,
      opportunityCostPolicy: input.opportunityCostPolicy,
      learningLeveragePolicy: input.learningLeveragePolicy
    })).not.toThrow();
  });

  it("não apresenta o prior neutro como incidência empírica da FGV", () => {
    const actions = generateStrategicActions(baseInputs());
    expect(actions.length).toBeGreaterThan(0);
    const first = actions[0];
    expect(first.justificativaXAI.fatosUtilizados).not.toMatch(/Incidência histórica informada/i);
    expect(first.justificativaXAI.dadosAusentes.join(" ")).toMatch(/incidência histórica empírica/i);
  });


  it("registra os corpora FGV como evidência bruta sem ativá-los no SDE", () => {
    const corpusSources = pkg.strategicEvidence.sources.filter(
      (source) => source.kind === "OFFICIAL_QUESTION_CORPUS"
    );
    expect(corpusSources).toHaveLength(11);
    expect(corpusSources.every((source) => source.validationStatus === "RAW_UNCURATED")).toBe(true);
    expect(corpusSources.every((source) => source.forbiddenUses.includes("SDE_HISTORICAL_INCIDENCE"))).toBe(true);

    const annualExports = corpusSources.filter((source) => source.id.startsWith("fgv-question-corpus-"));
    expect(annualExports).toHaveLength(6);
    expect(annualExports.reduce((sum, source) => sum + (source.questionCount ?? 0), 0)).toBe(3352);

    const examArchive = corpusSources.find(
      (source) => source.id === "fgv-exam-corpus-37-development-oriented"
    );
    expect(examArchive).toMatchObject({
      validationStatus: "RAW_UNCURATED",
      documentName: "Provas FGV.zip",
      sha256: "312fec3c3cf7a21b49ab05e04b9a9049e42f6190826c19647fa7d800c2e64872"
    });

    const dataprevReference = corpusSources.find(
      (source) => source.id === "fgv-dataprev-development-software-reference-exam"
    );
    expect(dataprevReference).toMatchObject({
      questionCount: 70,
      uniqueQuestionCount: 70,
      documentName: "analista_de_tecnologia_da_informacao_desenvolvimento_de_software.pdf"
    });
    const wave1 = corpusSources.find(
      (source) => source.id === "fgv-exam-corpus-37-wave1-auto-classified"
    );
    expect(wave1).toMatchObject({
      validationStatus: "RAW_UNCURATED",
      questionCount: 1090,
      uniqueQuestionCount: 1090
    });
    const wave2 = corpusSources.find(
      (source) => source.id === "fgv-exam-corpus-37-wave2-auto-classified"
    );
    expect(wave2).toMatchObject({
      validationStatus: "RAW_UNCURATED",
      questionCount: 860,
      uniqueQuestionCount: 860
    });
    expect(wave2?.forbiddenUses).toContain("SDE_HISTORICAL_INCIDENCE");

    const wave3 = corpusSources.find(
      (source) => source.id === "fgv-exam-corpus-37-wave3-auto-classified"
    );
    expect(wave3).toMatchObject({
      validationStatus: "RAW_UNCURATED",
      questionCount: 572,
      uniqueQuestionCount: 413
    });
    expect(wave3?.forbiddenUses).toContain("SDE_HISTORICAL_INCIDENCE");
    expect(pkg.strategicEvidence.version).toBe("1.6.0");

    expect(pkg.strategicEvidence.incidenceEvidence).toHaveLength(8);
    expect(pkg.strategicEvidence.incidenceEvidence.every(
      (evidence) => evidence.status === "AUTO_CLASSIFIED_UNREVIEWED"
    )).toBe(true);
    expect(pkg.strategicEvidence.incidenceEvidence.every(
      (evidence) => evidence.deduplicated
    )).toBe(true);
  });

  it("mantém a matriz experimental da onda A1/A2 bloqueada para o SDE", () => {
    const developmentEvidence = pkg.strategicEvidence.incidenceEvidence.find(
      (evidence) => evidence.topicId === "dp26-p3-esp-desenvolvimento-sistemas"
    );
    expect(developmentEvidence).toMatchObject({
      status: "AUTO_CLASSIFIED_UNREVIEWED",
      matchedQuestionCount: 97,
      eligibleCorpusQuestionCount: 186,
      manuallyReviewedQuestionCount: 52,
      deduplicated: true
    });

    expect(pkg.sde.edital.assuntoModelMetadata?.["dp26-p3-esp-desenvolvimento-sistemas"]).toMatchObject({
      historicalIncidenceSource: "UNAVAILABLE"
    });
    expect(pkg.sde.edital.incidenciaHistoricaAssuntos["dp26-p3-esp-desenvolvimento-sistemas"]).toBe(0.5);
  });

  it("mantém as estimativas externas fora da prioridade matemática", () => {
    expect(pkg.strategicEvidence.externalEstimates.length).toBeGreaterThan(0);
    expect(pkg.strategicEvidence.externalEstimates.every(
      (estimate) => estimate.status === "UNVERIFIED_EXTERNAL_ESTIMATE"
    )).toBe(true);
    expect(Object.values(pkg.sde.edital.assuntoModelMetadata ?? {}).every(
      (metadata) => metadata.historicalIncidenceSource === "UNAVAILABLE"
    )).toBe(true);
  });

  it("cataloga os vídeos especialistas como fontes pendentes de transcrição", () => {
    const seed = buildDataprev2026Profile3AppSeed();
    const videos = seed.biblioteca.filter((item) => item.tipoMaterial === "VIDEO");
    expect(videos).toHaveLength(3);
    expect(videos.every((item) => item.tags.includes("pendente-transcricao"))).toBe(true);
  });

  it("gera seed do aplicativo sem desempenho ou prioridade inventada", () => {
    const seed = buildDataprev2026Profile3AppSeed();
    expect(seed.concurso.id).toBe(DATAPREV_2026_PROFILE_3_ID);
    expect(seed.configuracao.metaHorariaDiariaMinutos).toBe(120);
    expect(seed.configuracao.localProva).toBe("Natal/RN");
    expect(seed.assuntos.every((item) => item.prioridadeEdital === "NAO_INFORMADA")).toBe(true);
    expect(seed.disciplinas.every((item) => item.percentualAcertosAlvo === null)).toBe(true);
    expect(seed.estatisticas.questoesRespondidas).toBe(0);
  });
  it("cataloga os materiais privados sem incorporar conteúdo licenciado", () => {
    const seed = buildDataprev2026Profile3AppSeed();
    const privateItems = seed.biblioteca.filter((item) => item.privateMaterial);
    expect(privateItems).toHaveLength(126);
    expect(DATAPREV_2026_PRIVATE_STUDY_MATERIAL_SUMMARY.totalPages).toBe(11114);
    expect(DATAPREV_2026_PRIVATE_STUDY_MATERIAL_SUMMARY.providers.ESTRATEGIA_CONCURSOS.materialCount).toBe(109);
    expect(DATAPREV_2026_PRIVATE_STUDY_MATERIAL_SUMMARY.providers.TI_TOTAL.materialCount).toBe(17);
    expect(DATAPREV_2026_PRIVATE_STUDY_MATERIAL_SUMMARY.pendingInvalidSources).toHaveLength(4);
    expect(privateItems.every((item) => item.linkAcesso.startsWith("private-material://"))).toBe(true);
    expect(privateItems.every((item) => !item.dadosPDF?.textoExtraido)).toBe(true);
    expect(privateItems.every((item) => item.privateMaterial?.strategicUse === "PEDAGOGICAL_ROUTING_ONLY")).toBe(true);
  });

  it("registra gabaritos exatos para correção sem convertê-los em incidência", () => {
    expect(DATAPREV_2026_ANSWER_KEY_EVIDENCE).toMatchObject({
      answerKeyDocuments: 48,
      answerKeySections: 1344,
      highConfidenceExamLinks: 44,
      candidateExamLinks: 2,
      ambiguousExamLinks: 36,
      unresolvedExamLinks: 11,
      definitiveQuestionLinks: 2840,
      humanReviewedExamLinks: 0,
      shadowMode: true,
      eligibleForSDEHistoricalIncidence: false
    });
    expect(ANSWER_KEY_EVIDENCE_POLICY.automaticHighConfidenceStillRequiresReview).toBe(true);
    expect(ANSWER_KEY_EVIDENCE_POLICY.mayDriveStrategicIncidence).toBe(false);
  });

  it("bloqueia questões incompletas no banco interno mesmo quando há gabarito", () => {
    expect(DATAPREV_2026_QUESTION_BANK_READINESS).toMatchObject({
      totalCorpusRecords: 6462,
      canonicalQuestionRecords: 5324,
      definitiveAnswerKeyRecords: 2840,
      manuallyReviewedAnalyticEligibleRecords: 0,
      uniqueAnalyticEligibleRecords: 0,
      inAppPracticeEligibleRecords: 0,
      reviewQueueItems: 646
    });
    expect(DATAPREV_2026_QUESTION_BANK_READINESS.policy.completeQuestionAndOptionsRequiredForPractice).toBe(true);
    expect(DATAPREV_2026_QUESTION_BANK_READINESS.policy.mayDriveStrategicIncidence).toBe(false);
  });

});
