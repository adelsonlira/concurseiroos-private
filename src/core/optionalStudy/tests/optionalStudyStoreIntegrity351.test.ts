import { beforeEach, describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../../../config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";
import { useConcurseiroStore } from "../../../store";
import type { OptionalStudyMethod, OptionalStudyRecommendationOption, OptionalStudyResultInput } from "../types";

const seed = buildDataprev2026Profile3AppSeed();

const specificDiscipline = seed.disciplinas.find((item) => item.id === "dp26-p3-conhecimentos-especificos")!;
const databaseTopic = seed.assuntos.find((item) => item.id === "dp26-p3-esp-banco-dados")!;
const databaseMaterial = DATAPREV_2026_PRIVATE_STUDY_MATERIALS.find((material) =>
  material.sections.some((section) => section.topicId === databaseTopic.id && section.subtopicIds.length > 0),
)!;
const databaseSection = databaseMaterial.sections.find((section) => section.topicId === databaseTopic.id && section.subtopicIds.length > 0)!;
const databaseSubtopic = seed.subassuntos.find((item) => item.id === databaseSection.subtopicIds[0])!;

function executableOverrides(method: OptionalStudyMethod, environment: OptionalStudyRecommendationOption["environment"]): Partial<OptionalStudyRecommendationOption> {
  if (method === "theory_notebooklm") {
    return {
      disciplineId: specificDiscipline.id, disciplineName: specificDiscipline.nome,
      topicId: databaseTopic.id, topicName: databaseTopic.nome,
      subtopicId: databaseSubtopic.id, subtopicName: databaseSubtopic.nome,
      environment: "notebooklm", materialId: databaseMaterial.id, materialLabel: databaseMaterial.displayTitle,
      objective: `Estudar ${databaseSubtopic.nome}.`, completionCriterion: "Registrar recuperação ativa e dúvidas restantes.",
    };
  }
  if (environment === "manual") {
    return { environment: "qconcursos", suggestedSource: "qconcursos" };
  }
  if (["active_recall", "technical_practice", "light_organization"].includes(method)) {
    return { environment: "concurseiroos", materialId: undefined, materialLabel: undefined };
  }
  return {};
}

function resetStore() {
  useConcurseiroStore.setState({
    concursos: [seed.concurso], editais: [seed.edital], disciplinas: structuredClone(seed.disciplinas),
    assuntos: structuredClone(seed.assuntos), subassuntos: structuredClone(seed.subassuntos), biblioteca: structuredClone(seed.biblioteca),
    configuracao: structuredClone(seed.configuracao), estatisticas: structuredClone(seed.estatisticas),
    tentativasQuestoes: [], sessoesEstudo: [], historicoAtividades: [], cronogramasRevisao: [],
    casosRecuperacaoErro: [], externalEvidenceLedger: [], sdeDecisionLedger: [], sdeCalibrationLedger: [],
    optionalStudyLedger: [], flashcards: [], simulados: [], questoes: [], ultimaDecisaoSDE: null,
  });
}

function recommendation() {
  const result = useConcurseiroStore.getState().gerarRecomendacaoEstudoOpcional("2026-07-19", "rest_day_optional");
  if (!result.recommendation) throw new Error("recommendation unavailable");
  return result.recommendation;
}

function startManual(method: OptionalStudyMethod, environment: OptionalStudyRecommendationOption["environment"] = "concurseiroos", extra: Partial<OptionalStudyRecommendationOption> = {}) {
  const rec = recommendation();
  const manual: OptionalStudyRecommendationOption = {
    ...rec.primary,
    optionId: `manual-${method}`,
    method,
    environment,
    origin: "manual",
    sdeVersion: "1.0",
    ...executableOverrides(method, environment),
    ...extra,
  };
  const accepted = useConcurseiroStore.getState().aceitarEstudoOpcional({ recommendationId: rec.recommendationId, manualOption: manual });
  if (!accepted.success || !accepted.sessionId) throw new Error(accepted.error ?? "session unavailable");
  return { sessionId: accepted.sessionId, option: manual };
}

function complete(method: OptionalStudyMethod, result: OptionalStudyResultInput, environment?: OptionalStudyRecommendationOption["environment"], extra?: Partial<OptionalStudyRecommendationOption>) {
  const { sessionId } = startManual(method, environment, extra);
  return useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, result);
}

describe("v3.35.1 optional result accounting", () => {
  beforeEach(resetStore);

  it("records QConcursos as source without inventing a bank", () => {
    const result = complete("short_question_batch", { kind: "questions", actualMinutes: 12, source: "qconcursos", totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0, consultedMaterial: "no" }, "qconcursos");
    expect(result.success).toBe(true);
    expect(useConcurseiroStore.getState().externalEvidenceLedger[0]).toMatchObject({ source: "qconcursos", examiningBoard: undefined, totalQuestions: 5 });
  });

  it("records FGV only for the compatible FGV method", () => {
    complete("fgv_questions", { kind: "questions", actualMinutes: 12, source: "qconcursos", totalQuestions: 5, correctAnswers: 4, wrongAnswers: 1, blankAnswers: 0, consultedMaterial: "no" }, "qconcursos");
    expect(useConcurseiroStore.getState().externalEvidenceLedger[0]).toMatchObject({ source: "qconcursos", examiningBoard: "FGV" });
  });

  it("records Treino FGV source and bank", () => {
    complete("short_question_batch", { kind: "questions", actualMinutes: 12, source: "treino_fgv", totalQuestions: 5, correctAnswers: 4, wrongAnswers: 1, blankAnswers: 0, consultedMaterial: "no" }, "treino_fgv");
    expect(useConcurseiroStore.getState().externalEvidenceLedger[0]).toMatchObject({ source: "treino_fgv", examiningBoard: "FGV" });
  });

  it("preserves a non-FGV bank in a manual batch", () => {
    complete("short_question_batch", { kind: "questions", actualMinutes: 12, source: "outra", examiningBoard: "CESPE", totalQuestions: 5, correctAnswers: 4, wrongAnswers: 1, blankAnswers: 0, consultedMaterial: "no" }, "manual");
    expect(useConcurseiroStore.getState().externalEvidenceLedger[0]).toMatchObject({ source: "outra", examiningBoard: "CESPE" });
  });

  it("creates exactly one aggregate evidence and no synthetic attempts", () => {
    complete("short_question_batch", { kind: "questions", actualMinutes: 12, source: "qconcursos", totalQuestions: 10, correctAnswers: 7, wrongAnswers: 2, blankAnswers: 1, consultedMaterial: "no" }, "qconcursos");
    expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(1);
    expect(useConcurseiroStore.getState().tentativasQuestoes).toHaveLength(0);
  });

  it("theory remains structured and never auto-completes the subtopic", () => {
    const { sessionId, option } = startManual("theory_notebooklm", "notebooklm");
    const before = useConcurseiroStore.getState().subassuntos.find((item) => item.id === option.subtopicId)?.completado;
    const result = useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "theory", actualMinutes: 20, materialId: option.materialId, pagesOrSection: "p. 10-15", activeRecallPerformed: true, objectiveCriteriaMet: true, completionCriterionReported: "Expliquei os conceitos", remainingDoubts: "Uma dúvida" });
    expect(result.success).toBe(true);
    expect(useConcurseiroStore.getState().subassuntos.find((item) => item.id === option.subtopicId)?.completado).toBe(before);
    expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(0);
    expect(useConcurseiroStore.getState().optionalStudyLedger.at(-1)?.payload).toMatchObject({ structured: true, result: { pagesOrSection: "p. 10-15", activeRecallPerformed: true } });
  });

  it("self-perception and time alone do not alter mastery", () => {
    const { sessionId, option } = startManual("theory_notebooklm", "notebooklm");
    const before = structuredClone(useConcurseiroStore.getState().subassuntos.find((item) => item.id === option.subtopicId));
    useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "theory", actualMinutes: 60, objectiveCriteriaMet: true, activeRecallPerformed: true });
    const after = useConcurseiroStore.getState().subassuntos.find((item) => item.id === option.subtopicId);
    expect(after).toEqual(before);
  });

  it("classifies theory, questions, review, simulation and technical practice correctly", () => {
    complete("theory_notebooklm", { kind: "theory", actualMinutes: 10 }, "notebooklm");
    resetStore(); complete("short_question_batch", { kind: "questions", actualMinutes: 10, source: "qconcursos", totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0 }, "qconcursos");
    expect(useConcurseiroStore.getState().historicoAtividades[0].tipoAtividade).toBe("RESOLUCAO_QUESTAO");
    resetStore(); complete("active_recall", { kind: "review", actualMinutes: 10, reviewPerformance: "intermediate" });
    expect(useConcurseiroStore.getState().historicoAtividades[0].tipoAtividade).toBe("REVISAO_PROGRAMADA");
    resetStore(); complete("mini_simulation", { kind: "simulation", actualMinutes: 20, source: "simulado_externo", totalQuestions: 10, correctAnswers: 6, wrongAnswers: 3, blankAnswers: 1 });
    expect(useConcurseiroStore.getState().historicoAtividades[0].tipoAtividade).toBe("SIMULADO");
    resetStore(); complete("technical_practice", { kind: "technical_practice", actualMinutes: 20, technicalTask: "Modelar esquema", observableResult: "Diagrama criado", taskCompleted: true, technicalDifficulty: "medium" });
    expect(useConcurseiroStore.getState().historicoAtividades[0].tipoAtividade).toBe("PRATICA_TECNICA");
  });

  it("preserves an unfinished technical result without marking the session successful", () => {
    const result = complete("technical_practice", { kind: "technical_practice", actualMinutes: 12, technicalTask: "Modelar uma tabela", observableResult: "Modelo parcial", taskCompleted: false, technicalDifficulty: "high", helpNeeded: true });
    expect(result.success).toBe(true);
    expect(useConcurseiroStore.getState().sessoesEstudo[0]).toMatchObject({ concluidaComSucesso: false, atividadeEstudo: "pratica" });
    expect(useConcurseiroStore.getState().optionalStudyLedger.at(-1)?.payload).toMatchObject({ result: { taskCompleted: false, observableResult: "Modelo parcial" } });
  });

  it("classifies theory history correctly", () => {
    complete("theory_notebooklm", { kind: "theory", actualMinutes: 10 }, "notebooklm");
    expect(useConcurseiroStore.getState().historicoAtividades[0].tipoAtividade).toBe("ESTUDO_TEORIA");
  });

  it("organization is operational and creates no cognitive evidence", () => {
    const result = complete("light_organization", { kind: "organization", actualMinutes: 8, operationalAction: "Organizei os filtros do próximo lote" });
    expect(result.success).toBe(true);
    expect(useConcurseiroStore.getState().historicoAtividades[0].tipoAtividade).toBe("ATIVIDADE_OPERACIONAL");
    expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(0);
  });

  it("structured results survive backup and restore with their IDs", () => {
    const { sessionId } = startManual("technical_practice");
    useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "technical_practice", actualMinutes: 15, technicalTask: "Consulta SQL", observableResult: "Resultado conferido", taskCompleted: true });
    const before = structuredClone(useConcurseiroStore.getState().optionalStudyLedger);
    const backup = useConcurseiroStore.getState().exportBackup();
    resetStore();
    expect(useConcurseiroStore.getState().importBackup(backup).success).toBe(true);
    expect(useConcurseiroStore.getState().optionalStudyLedger).toEqual(before);
  });
});

describe("v3.35.1 interrupted optional sessions", () => {
  beforeEach(resetStore);

  it("accounts global, discipline and topic time and writes coherent history", () => {
    const { sessionId, option } = startManual("technical_practice");
    const beforeGlobal = useConcurseiroStore.getState().estatisticas.tempoTotalGeralMinutos;
    const beforeDiscipline = useConcurseiroStore.getState().disciplinas.find((item) => item.id === option.disciplineId)!.tempoTotalEstudoMinutos;
    const beforeTopic = useConcurseiroStore.getState().assuntos.find((item) => item.id === option.topicId)!.tempoEstudadoMinutos;
    expect(useConcurseiroStore.getState().interromperEstudoOpcional(sessionId, 13).success).toBe(true);
    const state = useConcurseiroStore.getState();
    expect(state.estatisticas.tempoTotalGeralMinutos).toBe(beforeGlobal + 13);
    expect(state.disciplinas.find((item) => item.id === option.disciplineId)!.tempoTotalEstudoMinutos).toBe(beforeDiscipline + 13);
    expect(state.assuntos.find((item) => item.id === option.topicId)!.tempoEstudadoMinutos).toBe(beforeTopic + 13);
    expect(state.historicoAtividades[0]).toMatchObject({ tipoAtividade: "PRATICA_TECNICA", tempoGastoSegundos: 780, metadata: { interrupted: true, noPenalty: true, noNegativeEvidence: true } });
  });

  it("is terminal, creates no negative evidence and prevents double counting", () => {
    const { sessionId } = startManual("short_question_batch", "qconcursos");
    expect(useConcurseiroStore.getState().interromperEstudoOpcional(sessionId, 10).success).toBe(true);
    const afterFirst = useConcurseiroStore.getState().estatisticas.tempoTotalGeralMinutos;
    expect(useConcurseiroStore.getState().interromperEstudoOpcional(sessionId, 10).success).toBe(false);
    expect(useConcurseiroStore.getState().estatisticas.tempoTotalGeralMinutos).toBe(afterFirst);
    expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(0);
    expect(useConcurseiroStore.getState().sessoesEstudo[0]).toMatchObject({ concluidaComSucesso: false, isOptional: true });
  });
});
