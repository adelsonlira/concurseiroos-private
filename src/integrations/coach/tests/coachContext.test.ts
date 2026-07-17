import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { runDataprevDecisionForDate } from "../../sde/dataprevDecisionAdapter";
import { buildCoachGroundingContext } from "../coachContext";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../../../config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";

function base() {
  const seed = buildDataprev2026Profile3AppSeed();
  const snapshot = {
    configuracao: seed.configuracao,
    subassuntos: seed.subassuntos,
    tentativasQuestoes: [],
    sessoesEstudo: [],
    flashcards: [],
    cronogramasRevisao: []
  };
  return { seed, snapshot };
}

describe("Coach grounding context", () => {
  it("não converte ausência de tentativas em rendimento zero", () => {
    const { seed, snapshot } = base();
    const decision = runDataprevDecisionForDate(snapshot, "2026-07-13");
    const context = buildCoachGroundingContext({
      referenceDate: "2026-07-13",
      configuracao: seed.configuracao,
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      cronogramasRevisao: [],
      decision
    });

    expect(context.evidencias.tentativasReais).toBe(0);
    expect(context.evidencias.taxaAcertoObservada).toBeNull();
    expect(
      context.evidencias.porDisciplina.every(
        (item) => item.taxaAcertoObservada === null
      )
    ).toBe(true);
    expect(context.evidencias.mapaEvidencias.totalSubtopics).toBeGreaterThan(0);
    expect(context.evidencias.mapaEvidencias.withQuestionEvidence).toBe(0);
    expect(context.evidencias.mapaEvidencias.roadmap[0].kind).toBe("NEW_CONTENT");
  });

  it("expõe ao coach a mesma prioridade e o mesmo plano do SDE", () => {
    const { seed, snapshot } = base();
    const decision = runDataprevDecisionForDate(snapshot, "2026-07-13");
    expect(decision.status).toBe("SUCCESS");

    const context = buildCoachGroundingContext({
      referenceDate: "2026-07-13",
      configuracao: seed.configuracao,
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      cronogramasRevisao: [],
      decision
    });

    expect(context.decisaoSDE.acoesPrioritarias[0].prioridade).toBe(
      decision.actions[0].prioridade
    );
    expect(context.decisaoSDE.acoesPrioritarias[0].assunto).toBe(
      decision.actions[0].assuntoNome
    );
    expect(context.decisaoSDE.plano).not.toBeNull();
    expect(context.decisaoSDE.prescricaoAtual).toMatchObject({
      activity: decision.prescription?.current?.activity,
      topic: decision.prescription?.current?.topicName,
      decisionReliability: decision.prescription?.current?.decisionReliability,
      executionReadiness: decision.prescription?.current?.executionReadiness,
      nextAction: decision.prescription?.current?.nextAction
    });
  });

  it("preserva para o coach a transparência de empates estratégicos", () => {
    const { seed, snapshot } = base();
    const decision = runDataprevDecisionForDate(snapshot, "2026-07-13");
    const context = buildCoachGroundingContext({
      referenceDate: "2026-07-13",
      configuracao: seed.configuracao,
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      cronogramasRevisao: [],
      decision
    });

    const topAction = context.decisaoSDE.acoesPrioritarias[0];
    expect(topAction).toBeDefined();
    expect(topAction.ranking.isTied).toBe(true);
    expect(topAction.ranking.tiedActionCount).toBeGreaterThan(1);
    expect(topAction.ranking.note).toMatch(/desempate operacional/i);
  });

  it("preserva status sem tempo e não fabrica plano", () => {
    const { seed, snapshot } = base();
    const decision = runDataprevDecisionForDate(snapshot, "2026-07-12");
    const context = buildCoachGroundingContext({
      referenceDate: "2026-07-12",
      configuracao: seed.configuracao,
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      cronogramasRevisao: [],
      decision
    });

    expect(context.decisaoSDE.status).toBe("NO_TIME_AVAILABLE");
    expect(context.decisaoSDE.plano).toBeNull();
    expect(context.decisaoSDE.acoesPrioritarias).toEqual([]);
  });
  it("exposes private material only as a pedagogical locator", () => {
    const { seed, snapshot } = base();
    const decision = runDataprevDecisionForDate(snapshot, "2026-07-13");
    const context = buildCoachGroundingContext({
      referenceDate: "2026-07-13",
      configuracao: seed.configuracao,
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      cronogramasRevisao: [],
      decision,
      privateMaterialCatalog: DATAPREV_2026_PRIVATE_STUDY_MATERIALS
    });

    const located = context.decisaoSDE.acoesPrioritarias
      .map((action) => action.materialSugerido)
      .find((material) => material !== null);
    expect(located).toBeDefined();
    expect(located?.strategicUse).toBe("PEDAGOGICAL_ROUTING_ONLY");
    expect(located?.accessMode).toBe("USER_PRIVATE_LOCAL_COPY");
    expect(JSON.stringify(located)).not.toMatch(/textoExtraido|conteudoMarkdown|rawText/i);
  });

  it("expõe erros e revisões como evidência descritiva, sem declarar domínio", () => {
    const { seed, snapshot } = base();
    const subtopic = seed.subassuntos[0];
    const subject = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const discipline = seed.disciplinas.find((item) => item.id === subject.disciplinaId)!;
    const attempts = [
      {
        id: "attempt-error",
        questaoId: "external-1",
        concursoId: seed.concurso.id,
        disciplinaId: discipline.id,
        assuntoId: subject.id,
        subassuntoId: subtopic.id,
        opcaoSelecionadaId: "MANUAL_ERRO",
        acertou: false,
        origem: "TREINO_ISOLADO" as const,
        tempoRespostaSegundos: 60,
        respondidaEm: "2026-07-11T10:00:00.000Z",
        erroCausa: "LACUNA_CONTEUDO" as const
      },
      {
        id: "attempt-correct",
        questaoId: "external-2",
        concursoId: seed.concurso.id,
        disciplinaId: discipline.id,
        assuntoId: subject.id,
        subassuntoId: subtopic.id,
        opcaoSelecionadaId: "MANUAL_ACERTO",
        acertou: true,
        origem: "TREINO_ISOLADO" as const,
        tempoRespostaSegundos: 50,
        respondidaEm: "2026-07-12T10:00:00.000Z"
      }
    ];
    const schedules = [
      {
        id: `review-${subtopic.id}`,
        subassuntoId: subtopic.id,
        assuntoId: subject.id,
        disciplinaId: discipline.id,
        metodoRevisao: "SA" as const,
        passosCicloAtuais: 0,
        historicoTentativas: [],
        proximaRevisaoData: "2026-07-13",
        desabilitada: false,
        gatilhoOrigem: "ERRO_QUESTAO" as const,
        createdAt: "2026-07-11T10:00:00.000Z",
        updatedAt: "2026-07-11T10:00:00.000Z"
      }
    ];
    const decision = runDataprevDecisionForDate(
      { ...snapshot, tentativasQuestoes: attempts, cronogramasRevisao: schedules },
      "2026-07-13"
    );
    const context = buildCoachGroundingContext({
      referenceDate: "2026-07-13",
      configuracao: seed.configuracao,
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: attempts,
      sessoesEstudo: [],
      cronogramasRevisao: schedules,
      decision
    });

    expect(context.evidencias.recuperacao.topicosComErro).toBe(1);
    expect(context.evidencias.recuperacao.errosPorTopico[0]).toMatchObject({
      estadoRecuperacao: "UM_ACERTO_POSTERIOR",
      errosRegistrados: 1,
      acertosAposUltimoErro: 1
    });
    expect(context.evidencias.recuperacao.revisoesVencidas).toHaveLength(1);
  });

});
