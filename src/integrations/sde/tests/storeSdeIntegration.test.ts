import { beforeEach, describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { useConcurseiroStore } from "../../../store";
import { StudySessionType } from "../../../types";

function seedStore() {
  const seed = buildDataprev2026Profile3AppSeed();
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
    ultimaDecisaoSDE: null,
    activeConcursoId: seed.concurso.id
  });
  return seed;
}

describe("Zustand → SDE integration", () => {
  beforeEach(() => {
    seedStore();
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
      erroNota: "Confundi a finalidade dos conceitos."
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
      erroNota: "Confundi a finalidade dos conceitos."
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
    expect(result.availability?.remainingMinutes).toBe(120);
  });
});
