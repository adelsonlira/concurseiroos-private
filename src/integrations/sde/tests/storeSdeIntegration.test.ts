import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { useConcurseiroStore } from "../../../store";
import { StudySessionType } from "../../../types";
import { buildCanonicalEvidenceFromStore } from "../storeEvidenceAdapter";
import { assessSubassunto } from "../../../core/sde/prioritization/priorityScore";
import { evaluateActivityEligibility } from "../../../core/sde/prioritization/constraints";

function seedStore() {
  const seed = buildDataprev2026Profile3AppSeed();
  seed.configuracao.activeSdeVersion = "v1";
  useConcurseiroStore.setState({
    concursos: [seed.concurso],
    editais: [seed.edital],
    disciplinas: seed.disciplinas,
    assuntos: seed.assuntos,
    subassuntos: seed.subassuntos,
    configuracao: seed.configuracao,
    estatisticas: seed.estatisticas,
    historicoAtividades: [],
    tentativasQuestoes: [],
    sessoesEstudo: [],
    flashcards: [],
    cronogramasRevisao: [],
    casosRecuperacaoErro: [],
    ultimaDecisaoSDE: null,
    activeConcursoId: seed.concurso.id
  });
  return seed;
}

describe("Zustand → SDE integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00.000Z"));
    seedStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calcula e mantém a decisão apenas como estado efêmero", () => {
    const result = useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    expect(result.status).toBe("SUCCESS");
    expect(useConcurseiroStore.getState().ultimaDecisaoSDE).toEqual(result);

    const backup = useConcurseiroStore.getState().exportBackup();
    expect("ultimaDecisaoSDE" in backup.dados).toBe(false);
  });

  it("registra tentativa externa real sem armazenar enunciado ou fabricar agregados", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId);
    const discipline = seed.disciplinas.find((item) => item.id === subject?.disciplinaId);
    expect(subject).toBeDefined();
    expect(discipline).toBeDefined();

    const result = useConcurseiroStore.getState().registrarTentativaExterna({
      disciplinaId: discipline!.id,
      assuntoId: subject!.id,
      subassuntoId: subtopic.id,
      acertou: false,
      tempoRespostaSegundos: 87,
      fonteExterna: "Prova FGV consultada externamente",
      nivelConfianca: "MEDIA",
      erroCausa: "LACUNA_CONTEUDO",
      erroNota: "Confundi a finalidade dos conceitos.",
      contextId: "prescription-question-batch-1"
    });

    expect(result).toEqual({ success: true });
    const state = useConcurseiroStore.getState();
    expect(state.questoes).toHaveLength(0);
    expect(state.tentativasQuestoes).toHaveLength(1);
    expect(state.tentativasQuestoes[0]).toMatchObject({
      disciplinaId: discipline!.id,
      assuntoId: subject!.id,
      subassuntoId: subtopic.id,
      acertou: false,
      tempoRespostaSegundos: 87,
      registradaManualmente: true,
      fonteExterna: "Prova FGV consultada externamente",
      nivelConfianca: "MEDIA",
      erroCausa: "LACUNA_CONTEUDO",
      erroNota: "Confundi a finalidade dos conceitos.",
      contextoId: "prescription-question-batch-1"
    });
    expect(state.cronogramasRevisao).toHaveLength(1);
    expect(state.cronogramasRevisao[0]).toMatchObject({
      subassuntoId: subtopic.id,
      gatilhoOrigem: "ERRO_QUESTAO",
      passosCicloAtuais: 0,
      desabilitada: false
    });
    expect(state.historicoAtividades[0].metadata).toMatchObject({
      manual: true,
      contextId: "prescription-question-batch-1",
      source: "Prova FGV consultada externamente"
    });

    const scheduledDate = state.cronogramasRevisao[0].proximaRevisaoData;
    const reviewDecision = state.executarSDEParaData(scheduledDate);
    expect(
      reviewDecision.actions.some(
        (action) =>
          action.subassuntoId === subtopic.id &&
          action.tipo === "revisao" &&
          action.reasonCode === "SCHEDULED_REVIEW_DUE"
      )
    ).toBe(true);

    const decision = state.executarSDEParaData("2026-07-13");
    expect(decision.status).toBe("SUCCESS");
    expect(
      decision.actions.some(
        (action) => action.subassuntoId === subtopic.id && action.diagnosticPurpose
      )
    ).toBe(true);
  });

  it("registra uma bateria externa em lote sem exigir cinquenta lançamentos manuais", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;

    const result = useConcurseiroStore.getState().registrarBateriaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      totalQuestoes: 50,
      acertos: 38,
      emBranco: 2,
      tempoTotalSegundos: 3000,
      fonteExterna: "Qconcursos",
      nivelConfianca: "MEDIA",
      contextId: "prescription-batch-50"
    });

    expect(result).toEqual({ success: true });
    const state = useConcurseiroStore.getState();
    expect(state.tentativasQuestoes).toHaveLength(50);
    expect(state.tentativasQuestoes.filter((item) => item.acertou)).toHaveLength(38);
    expect(state.tentativasQuestoes.filter((item) => item.respostaEmBranco)).toHaveLength(2);
    expect(state.tentativasQuestoes.every((item) => item.registradaEmLote)).toBe(true);
    expect(state.tentativasQuestoes.every((item) => item.tempoRespostaEstimado)).toBe(true);
    expect(new Set(state.tentativasQuestoes.map((item) => item.loteRegistroId)).size).toBe(1);
    expect(state.tentativasQuestoes[0]).toMatchObject({
      tempoRespostaSegundos: 60,
      fonteExterna: "Qconcursos",
      contextoId: "prescription-batch-50"
    });
    expect(state.estatisticas.questoesRespondidas).toBe(50);
    expect(state.estatisticas.questoesAcertadas).toBe(38);
    expect(state.cronogramasRevisao).toHaveLength(1);
    expect(state.historicoAtividades[0].metadata).toMatchObject({
      aggregate: true,
      totalQuestions: 50,
      correctQuestions: 38,
      wrongQuestions: 10,
      blankQuestions: 2,
      source: "Qconcursos"
    });
  });

  it("usa diagnóstico confiante de 90% para adiar teoria integral sem declarar domínio", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;

    const result = useConcurseiroStore.getState().registrarBateriaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      totalQuestoes: 10,
      acertos: 9,
      acertosConfiantes: 9,
      emBranco: 0,
      tempoTotalSegundos: 600,
      diagnosticoInicial: true,
      consultouMaterial: false,
      fonteExterna: "FGV"
    });

    expect(result.success).toBe(true);
    const state = useConcurseiroStore.getState();
    expect(state.subassuntos.find((item) => item.id === subtopic.id)?.completado).toBe(false);
    expect(state.cronogramasRevisao[0]?.gatilhoOrigem).toBe("DIAGNOSTICO_APTO_SEM_TEORIA");

    const evidence = buildCanonicalEvidenceFromStore({
      concursoId: seed.concurso.id,
      referenceDate: "2026-07-13",
      timeZone: seed.configuracao.disponibilidadeEstudo.timeZone,
      subassuntos: state.subassuntos,
      tentativasQuestoes: state.tentativasQuestoes,
      sessoesEstudo: state.sessoesEstudo,
      flashcards: state.flashcards,
      cronogramasRevisao: state.cronogramasRevisao
    });
    const assessment = assessSubassunto(subtopic.id, evidence, new Date("2026-07-13"));
    expect(assessment.diagnosticPlacement?.status).toBe("THEORY_BYPASS_ELIGIBLE");
    expect(evaluateActivityEligibility("teoria", assessment, evidence.porSubassunto[subtopic.id], 0, new Date("2026-07-13")).eligible).toBe(false);
    const questionEligibility = evaluateActivityEligibility(
      "questoes",
      assessment,
      evidence.porSubassunto[subtopic.id],
      0,
      new Date("2026-07-13")
    );
    expect(questionEligibility).toMatchObject({ eligible: true, reasonCode: "OBSERVED_PRACTICE" });
    expect(questionEligibility.diagnosticPurpose).not.toBe(true);
  });

  it("exige teoria quando o diagnóstico teve consulta ou acertos sem segurança", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;

    const result = useConcurseiroStore.getState().registrarBateriaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      totalQuestoes: 10,
      acertos: 10,
      acertosConfiantes: 8,
      emBranco: 0,
      tempoTotalSegundos: 600,
      diagnosticoInicial: true,
      consultouMaterial: true
    });

    expect(result.success).toBe(true);
    const state = useConcurseiroStore.getState();
    const evidence = buildCanonicalEvidenceFromStore({
      concursoId: seed.concurso.id,
      referenceDate: "2026-07-13",
      timeZone: seed.configuracao.disponibilidadeEstudo.timeZone,
      subassuntos: state.subassuntos,
      tentativasQuestoes: state.tentativasQuestoes,
      sessoesEstudo: state.sessoesEstudo,
      flashcards: state.flashcards,
      cronogramasRevisao: state.cronogramasRevisao
    });
    const assessment = assessSubassunto(subtopic.id, evidence, new Date("2026-07-13"));
    expect(assessment.diagnosticPlacement?.status).toBe("THEORY_REQUIRED");
    expect(evaluateActivityEligibility("teoria", assessment, evidence.porSubassunto[subtopic.id], 0, new Date("2026-07-13")).eligible).toBe(true);
    expect(evaluateActivityEligibility("questoes", assessment, evidence.porSubassunto[subtopic.id], 0, new Date("2026-07-13")).eligible).toBe(false);
  });

  it("mantém o diagnóstico aberto enquanto a amostra mínima não foi concluída", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;

    useConcurseiroStore.getState().registrarBateriaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      totalQuestoes: 8,
      acertos: 8,
      acertosConfiantes: 8,
      emBranco: 0,
      tempoTotalSegundos: 480,
      diagnosticoInicial: true,
      consultouMaterial: false
    });

    const state = useConcurseiroStore.getState();
    const evidence = buildCanonicalEvidenceFromStore({
      concursoId: seed.concurso.id,
      referenceDate: "2026-07-13",
      timeZone: seed.configuracao.disponibilidadeEstudo.timeZone,
      subassuntos: state.subassuntos,
      tentativasQuestoes: state.tentativasQuestoes,
      sessoesEstudo: state.sessoesEstudo,
      flashcards: state.flashcards,
      cronogramasRevisao: state.cronogramasRevisao
    });
    const assessment = assessSubassunto(subtopic.id, evidence, new Date("2026-07-13"));
    expect(assessment.diagnosticPlacement).toMatchObject({ status: "INSUFFICIENT_SAMPLE", missingQuestions: 2 });
    expect(evaluateActivityEligibility("questoes", assessment, evidence.porSubassunto[subtopic.id], 0, new Date("2026-07-13"))).toMatchObject({
      eligible: true,
      diagnosticPurpose: true
    });
    expect(state.cronogramasRevisao).toHaveLength(0);
  });

  it("rejeita resumo de bateria matematicamente inconsistente", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;

    const result = useConcurseiroStore.getState().registrarBateriaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      totalQuestoes: 10,
      acertos: 9,
      emBranco: 2,
      tempoTotalSegundos: 600
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/não podem superar/i);
    expect(useConcurseiroStore.getState().tentativasQuestoes).toEqual([]);
  });

  it("rejeita tentativa externa com hierarquia contraditória sem alterar evidências", () => {
    const seed = seedStore();
    const firstDiscipline = seed.disciplinas[0];
    const foreignSubject = seed.assuntos.find(
      (item) => item.disciplinaId !== firstDiscipline.id
    );
    const foreignSubtopic = seed.subassuntos.find(
      (item) => item.assuntoId === foreignSubject?.id
    );
    expect(foreignSubject).toBeDefined();
    expect(foreignSubtopic).toBeDefined();

    const result = useConcurseiroStore.getState().registrarTentativaExterna({
      disciplinaId: firstDiscipline.id,
      assuntoId: foreignSubject!.id,
      subassuntoId: foreignSubtopic!.id,
      acertou: true,
      tempoRespostaSegundos: 30
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/não pertence/i);
    expect(useConcurseiroStore.getState().tentativasQuestoes).toEqual([]);
  });

  it("agenda revisão para acerto com baixa confiança sem convertê-lo em erro", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;

    const result = useConcurseiroStore.getState().registrarTentativaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      acertou: true,
      tempoRespostaSegundos: 55,
      nivelConfianca: "BAIXA"
    });

    expect(result.success).toBe(true);
    const state = useConcurseiroStore.getState();
    expect(state.tentativasQuestoes[0].acertou).toBe(true);
    expect(state.cronogramasRevisao[0].gatilhoOrigem).toBe(
      "ACERTO_BAIXA_CONFIANCA"
    );
  });

  it("registra revisão autoavaliada sem fabricar nova tentativa de questão", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const result = useConcurseiroStore
      .getState()
      .agendarRevisaoSubassunto(subtopic.id, "MANUAL");
    expect(result.success).toBe(true);

    const scheduleId = useConcurseiroStore.getState().cronogramasRevisao[0].id;
    const completion = useConcurseiroStore
      .getState()
      .concluirRevisaoProgramada(scheduleId, "MEDIUM");

    expect(completion.success).toBe(true);
    const state = useConcurseiroStore.getState();
    expect(state.tentativasQuestoes).toHaveLength(0);
    expect(state.cronogramasRevisao[0].historicoTentativas).toHaveLength(1);
    expect(state.historicoAtividades[0].tipoAtividade).toBe(
      "REVISAO_PROGRAMADA"
    );
  });

  it("registra o tempo real da revisão como sessão de estudo e evidência do método", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const scheduled = useConcurseiroStore
      .getState()
      .agendarRevisaoSubassunto(subtopic.id, "MANUAL");
    expect(scheduled.success).toBe(true);

    const scheduleId = useConcurseiroStore.getState().cronogramasRevisao[0].id;
    const beforeTotalMinutes = useConcurseiroStore.getState().estatisticas.tempoTotalGeralMinutos;
    const completion = useConcurseiroStore
      .getState()
      .concluirRevisaoProgramada(scheduleId, {
        performance: "EASY",
        tempoGastoSegundos: 305,
        duracaoFonte: "TIMER"
      });

    expect(completion.success).toBe(true);
    const state = useConcurseiroStore.getState();
    expect(state.cronogramasRevisao[0].historicoTentativas.at(-1)).toMatchObject({
      tempoGastoSegundos: 305,
      duracaoFonte: "TIMER"
    });
    expect(state.sessoesEstudo[0]).toMatchObject({
      atividadeEstudo: "revisao",
      tempoGastoSegundos: 305,
      contabilizaNaDisponibilidade: true
    });
    expect(state.estatisticas.tempoTotalGeralMinutos).toBe(beforeTotalMinutes + 6);
    expect(state.historicoAtividades[0].tempoGastoSegundos).toBe(305);
  });

  it("desconta tempo concluído antes de expor o plano no store", () => {
    useConcurseiroStore.setState({
      sessoesEstudo: [
        {
          id: "session-store-1",
          disciplinaId: "dp26-p3-portugues",
          assuntoId: "dp26-p3-por-interpretacao",
          subassuntoId: "dp26-p3-por-interpretacao-generos",
          tipo: StudySessionType.STOPWATCH,
          tempoGastoSegundos: 3600,
          concluidaComSucesso: true,
          dataInicio: "2026-07-13T08:00:00-03:00",
          dataFim: "2026-07-13T09:00:00-03:00",
          dataLocal: "2026-07-13",
          contabilizaNaDisponibilidade: true,
          createdAt: "2026-07-13T09:00:00-03:00"
        }
      ]
    });

    const result = useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    expect(result.status).toBe("SUCCESS");
    expect(result.availability?.completedMinutes).toBe(60);
    expect(result.availability?.remainingMinutes).toBe(60);
  });
  it("exige correção explícita e duas verificações independentes para estabilizar um erro", () => {
    const seed = seedStore();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;

    useConcurseiroStore.getState().registrarTentativaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      acertou: false,
      tempoRespostaSegundos: 70,
      nivelConfianca: "MEDIA",
      erroCausa: "INTERPRETACAO",
      erroNota: "Ignorei uma exceção do enunciado."
    });

    let state = useConcurseiroStore.getState();
    expect(state.casosRecuperacaoErro).toHaveLength(1);
    const caseId = state.casosRecuperacaoErro[0].id;
    const reviewId = state.cronogramasRevisao[0].id;
    expect(state.concluirRevisaoProgramada(reviewId, "EASY")).toMatchObject({
      success: false,
      error: expect.stringContaining("registre a correção")
    });
    expect(state.registrarCorrecaoErro(caseId, {
      cause: "INTERPRETACAO",
      correctionSummary: "A questão pedia a alternativa incorreta e eu respondi como se pedisse a correta.",
      preventionRule: "Antes das alternativas, reescrever o comando e destacar negações."
    })).toEqual({ success: true });

    for (const confidence of ["MEDIA", "ALTA"] as const) {
      useConcurseiroStore.getState().registrarTentativaExterna({
        disciplinaId: discipline.id,
        assuntoId: subject.id,
        subassuntoId: subtopic.id,
        acertou: true,
        tempoRespostaSegundos: 55,
        nivelConfianca: confidence,
        consultouMaterial: false
      });
    }

    state = useConcurseiroStore.getState();
    const verificationEvents = state.casosRecuperacaoErro[0].events.filter(
      (event) => event.type === "VERIFICATION_PASSED"
    );
    expect(verificationEvents).toHaveLength(2);

    useConcurseiroStore.getState().registrarTentativaExterna({
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      acertou: false,
      tempoRespostaSegundos: 50,
      nivelConfianca: "ALTA",
      erroCausa: "APLICACAO"
    });
    expect(
      useConcurseiroStore.getState().casosRecuperacaoErro[0].events.at(-1)?.type
    ).toBe("REOPENED");
  });

});
