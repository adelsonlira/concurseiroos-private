import { beforeEach, describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { useConcurseiroStore } from "../../../store";
import { StudySessionType } from "../../../types";

function installLocalStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
      clear: () => data.clear()
    }
  });
}

describe("Rastreabilidade da sessão de estudo", () => {
  beforeEach(() => {
    installLocalStorage();
    const seed = buildDataprev2026Profile3AppSeed();
    useConcurseiroStore.setState({
      concursos: [seed.concurso],
      editais: [seed.edital],
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      configuracao: seed.configuracao,
      estatisticas: structuredClone(seed.estatisticas),
      sessoesEstudo: [],
      historicoAtividades: [],
      isTimerRunning: true,
      timerSecondsElapsed: 1800,
      timerType: StudySessionType.STOPWATCH,
      ultimaDecisaoSDE: {
        status: "SUCCESS",
        referenceDate: "2026-07-13",
        availability: null,
        actions: [],
        planner: null,
        prescription: null,
        warnings: [],
        errors: []
      }
    });
  });

  it("preserva a atividade cognitiva e a origem da decisão SDE", () => {
    useConcurseiroStore.getState().finishStudySession(
      "dp26-p3-portugues",
      "dp26-p3-por-interpretacao",
      "dp26-p3-por-interpretacao-generos",
      "Leitura inicial do tópico.",
      {
        atividadeEstudo: "teoria",
        sdeReferenceDate: "2026-07-13",
        sdePrioridade: 1,
        sdeReasonCode: "UNSEEN_THEORY",
        sdeDiagnosticPurpose: false,
        duracaoPlanejadaMinutos: 40,
        prescriptionId: "prescription-session-1",
        targetQuestionCount: 12,
        stretchQuestionCount: 13,
        materialId: "material-portugues-1",
        materialStartPage: 72,
        materialEndPage: 80
      }
    );

    const state = useConcurseiroStore.getState();
    expect(state.sessoesEstudo).toHaveLength(1);
    expect(state.sessoesEstudo[0].atividadeEstudo).toBe("teoria");
    expect(state.sessoesEstudo[0].decisaoSDE).toEqual({
      sdeReferenceDate: "2026-07-13",
      sdePrioridade: 1,
      sdeReasonCode: "UNSEEN_THEORY",
      sdeDiagnosticPurpose: false,
      duracaoPlanejadaMinutos: 40,
      prescriptionId: "prescription-session-1",
      targetQuestionCount: 12,
      stretchQuestionCount: 13,
      materialId: "material-portugues-1",
      materialStartPage: 72,
      materialEndPage: 80
    });
    expect(state.historicoAtividades[0].metadata).toMatchObject({
      atividadeEstudo: "teoria",
      sdeReasonCode: "UNSEEN_THEORY",
      sdePrioridade: 1,
      prescriptionId: "prescription-session-1",
      targetQuestionCount: 12,
      stretchQuestionCount: 13,
      materialId: "material-portugues-1",
      materialStartPage: 72,
      materialEndPage: 80
    });
    expect(state.ultimaDecisaoSDE).toBeNull();
  });


  it("descarta integralmente o tempo ao cancelar uma sessão", () => {
    useConcurseiroStore.getState().stopStudyTimer();

    const state = useConcurseiroStore.getState();
    expect(state.isTimerRunning).toBe(false);
    expect(state.timerSecondsElapsed).toBe(0);
  });

  it("preserva qual plataforma executou a bateria prescrita", () => {
    useConcurseiroStore.getState().finishStudySession(
      "dp26-p3-portugues",
      "dp26-p3-por-interpretacao",
      "dp26-p3-por-interpretacao-generos",
      "Bateria no banco externo.",
      {
        atividadeEstudo: "questoes",
        prescriptionId: "prescription-questions-1",
        targetQuestionCount: 8,
        stretchQuestionCount: 9,
        questionSourceId: "external:qconcursos",
        questionSourceLabel: "Qconcursos",
        questionSourceKind: "EXTERNAL_BANK"
      }
    );

    const state = useConcurseiroStore.getState();
    expect(state.sessoesEstudo[0].decisaoSDE).toMatchObject({
      questionSourceId: "external:qconcursos",
      questionSourceLabel: "Qconcursos",
      questionSourceKind: "EXTERNAL_BANK"
    });
    expect(state.historicoAtividades[0].metadata).toMatchObject({
      questionSourceLabel: "Qconcursos",
      questionSourceKind: "EXTERNAL_BANK"
    });
  });

  it("só marca teoria como concluída mediante confirmação explícita do usuário", () => {
    const subtopicId = "dp26-p3-por-interpretacao-generos";
    expect(
      useConcurseiroStore.getState().subassuntos.find((item) => item.id === subtopicId)?.completado
    ).toBe(false);

    useConcurseiroStore.getState().finishStudySession(
      "dp26-p3-portugues",
      "dp26-p3-por-interpretacao",
      subtopicId,
      "Cobertura concluída e confirmada.",
      {
        atividadeEstudo: "teoria",
        sdeReferenceDate: "2026-07-13",
        sdePrioridade: 1,
        sdeReasonCode: "UNSEEN_THEORY",
        sdeDiagnosticPurpose: false,
        duracaoPlanejadaMinutos: 40,
        markTheoryCompleted: true
      }
    );

    const state = useConcurseiroStore.getState();
    expect(state.subassuntos.find((item) => item.id === subtopicId)?.completado).toBe(true);
    expect(state.historicoAtividades[0].metadata).toMatchObject({
      markTheoryCompleted: true
    });
    expect(state.cronogramasRevisao).toHaveLength(1);
    expect(state.cronogramasRevisao[0]).toMatchObject({
      subassuntoId: subtopicId,
      gatilhoOrigem: "TEORIA_CONCLUIDA"
    });
  });
});
