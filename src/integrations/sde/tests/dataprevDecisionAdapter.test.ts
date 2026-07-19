import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { StudySessionType } from "../../../types";
import { runDataprevDecisionForDate } from "../dataprevDecisionAdapter";
import { buildCanonicalEvidenceFromStore } from "../storeEvidenceAdapter";

function snapshot() {
  const seed = buildDataprev2026Profile3AppSeed();
  seed.configuracao.activeSdeVersion = "v1";
  return {
    configuracao: seed.configuracao,
    subassuntos: seed.subassuntos,
    tentativasQuestoes: [],
    sessoesEstudo: [],
    flashcards: [],
    cronogramasRevisao: []
  };
}

describe("Store evidence adapter", () => {
  it("não cria evidências para subassunto sem contato real", () => {
    const input = snapshot();
    const evidence = buildCanonicalEvidenceFromStore({
      concursoId: input.configuracao.concursoAlvoId!,
      referenceDate: "2026-07-13",
      timeZone: "America/Fortaleza",
      subassuntos: input.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      flashcards: [],
      cronogramasRevisao: []
    });
    expect(evidence.porSubassunto).toEqual({});
  });

  it("preserva cada tentativa granular sem fabricar agregados", () => {
    const input = snapshot();
    const sub = input.subassuntos[0];
    const evidence = buildCanonicalEvidenceFromStore({
      concursoId: input.configuracao.concursoAlvoId!,
      referenceDate: "2026-07-13",
      timeZone: "America/Fortaleza",
      subassuntos: input.subassuntos,
      tentativasQuestoes: [
        {
          id: "attempt-1",
          questaoId: "q-1",
          concursoId: input.configuracao.concursoAlvoId!,
          disciplinaId: "dp26-p3-portugues",
          assuntoId: sub.assuntoId,
          subassuntoId: sub.id,
          opcaoSelecionadaId: "A",
          acertou: true,
          origem: "TREINO_ISOLADO",
          tempoRespostaSegundos: 75,
          respondidaEm: "2026-07-13T09:00:00-03:00"
        },
        {
          id: "attempt-2",
          questaoId: "q-2",
          concursoId: input.configuracao.concursoAlvoId!,
          disciplinaId: "dp26-p3-portugues",
          assuntoId: sub.assuntoId,
          subassuntoId: sub.id,
          opcaoSelecionadaId: "B",
          acertou: false,
          origem: "SIMULADO",
          contextoId: "sim-1",
          tempoRespostaSegundos: 90,
          respondidaEm: "2026-07-13T10:00:00-03:00"
        }
      ],
      sessoesEstudo: [],
      flashcards: [],
      cronogramasRevisao: []
    });

    const subEvidence = evidence.porSubassunto[sub.id];
    expect(subEvidence.tentativas).toHaveLength(2);
    expect(subEvidence.tentativas.map((item) => item.acertou)).toEqual([true, false]);
    expect(subEvidence.tentativas.map((item) => item.origem)).toEqual(["TREINO_ISOLADO", "SIMULADO"]);
  });
});

describe("DATAPREV decision integration", () => {
  it("gera ações e plano para uma segunda-feira com 180 minutos", () => {
    const result = runDataprevDecisionForDate(snapshot(), "2026-07-13");
    expect(result.status).toBe("SUCCESS");
    expect(result.availability?.remainingMinutes).toBe(180);
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.planner?.status).toBe("SUCCESS");
    expect(result.prescription?.status).toBe("READY");
    expect(result.prescription?.current).toMatchObject({
      durationMinutes: expect.any(Number),
      disciplineId: expect.any(String),
      topicId: expect.any(String),
      actionId: expect.any(String),
      completionEvidence: expect.any(Array)
    });
    expect(result.prescription?.current?.executionSteps.length).toBeGreaterThan(0);
  });

  it("protege uma frente inicial em todas as disciplinas quando o edital elimina quem zera", () => {
    const result = runDataprevDecisionForDate(snapshot(), "2026-07-13");
    expect(result.status).toBe("SUCCESS");
    const safetyFront = result.actions.filter(
      (action) => action.decisionEvidence.disciplineSafetyCoverageFront === true
    );
    expect(safetyFront).toHaveLength(6);
    expect(new Set(safetyFront.map((action) => action.disciplinaId)).size).toBe(6);
    expect(
      safetyFront.every(
        (action) => action.decisionEvidence.disciplineZeroSafetyStatus === "UNASSESSED"
      )
    ).toBe(true);
    expect(safetyFront.map((action) => action.prioridade)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("desconta sessão concluída do saldo diário antes do planner", () => {
    const input = snapshot();
    input.sessoesEstudo.push({
      id: "session-1",
      disciplinaId: "dp26-p3-portugues",
      assuntoId: "dp26-p3-por-interpretacao",
      subassuntoId: "dp26-p3-por-interpretacao-generos",
      tipo: StudySessionType.STOPWATCH,
      tempoGastoSegundos: 60 * 60,
      concluidaComSucesso: true,
      dataInicio: "2026-07-13T08:00:00-03:00",
      dataFim: "2026-07-13T09:00:00-03:00",
      dataLocal: "2026-07-13",
      contabilizaNaDisponibilidade: true,
      createdAt: "2026-07-13T09:00:00-03:00"
    });

    const result = runDataprevDecisionForDate(input, "2026-07-13");
    expect(result.status).toBe("SUCCESS");
    expect(result.availability?.completedMinutes).toBe(60);
    expect(result.availability?.remainingMinutes).toBe(120);
    if (result.planner?.status === "SUCCESS") {
      expect(result.planner.plan.tempoDisponivelMinutos).toBe(120);
    }
  });

  it("não cria plano no domingo configurado como descanso", () => {
    const result = runDataprevDecisionForDate(snapshot(), "2026-07-12");
    expect(result.status).toBe("NO_TIME_AVAILABLE");
    expect(result.actions).toEqual([]);
    expect(result.planner).toBeNull();
  });

  it("declara as limitações de incidência e retorno marginal", () => {
    const result = runDataprevDecisionForDate(snapshot(), "2026-07-13");
    expect(result.warnings.join(" ")).toMatch(/incidência/i);
    expect(result.warnings.join(" ")).toMatch(/retorno marginal/i);
    expect(result.actions[0].justificativaXAI.dadosAusentes.join(" ")).toMatch(/incidência histórica empírica/i);
    expect(result.actions[0].marginalReturnEstimate?.status).toBe("INSUFFICIENT_DATA");
  });

  it("rejeita duração operacional fora da política do planner", () => {
    const input = snapshot();
    input.configuracao.duracaoSessaoPreferidaMinutos.teoria = 5;
    const result = runDataprevDecisionForDate(input, "2026-07-13");
    expect(result.status).toBe("INVALID_INPUT");
    expect(result.errors.join(" ")).toMatch(/Duração preferida de teoria/i);
  });

  it("declara empate operacional quando ações têm a mesma camada e score", () => {
    const result = runDataprevDecisionForDate(snapshot(), "2026-07-13");
    expect(result.status).toBe("SUCCESS");
    const topAction = result.actions[0];
    expect(topAction).toBeDefined();
    expect(topAction.rankingContext?.isTied).toBe(true);
    expect(topAction.rankingContext?.tiedActionCount).toBeGreaterThan(1);
    expect(topAction.rankingContext?.tieBreakRule).toBe("DETERMINISTIC_ACTION_ID");
    expect(topAction.justificativaXAI.inferencias).toMatch(/desempate operacional/i);
  });

  it("é determinístico para o mesmo snapshot e data", () => {
    const input = snapshot();
    const first = runDataprevDecisionForDate(structuredClone(input), "2026-07-13");
    const second = runDataprevDecisionForDate(structuredClone(input), "2026-07-13");
    expect(first).toEqual(second);
  });
});
