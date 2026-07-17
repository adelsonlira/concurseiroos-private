import { beforeEach, describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { useConcurseiroStore } from "../../../store";

const seed = buildDataprev2026Profile3AppSeed();
const subtopic = seed.subassuntos[0];
const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
const discipline = seed.disciplinas.find((item) => item.id === topic.disciplinaId)!;

beforeEach(() => {
  useConcurseiroStore.setState({
    concursos: [seed.concurso],
    disciplinas: seed.disciplinas,
    assuntos: seed.assuntos,
    subassuntos: seed.subassuntos.map((item) => ({ ...item, completado: false })),
    configuracao: seed.configuracao,
    sessoesEstudo: [{
      id: "session-guided",
      disciplinaId: discipline.id,
      assuntoId: topic.id,
      subassuntoId: subtopic.id,
      tipo: "STOPWATCH" as never,
      atividadeEstudo: "teoria",
      decisaoSDE: { prescriptionId: "prescription-guided" },
      tempoGastoSegundos: 1200,
      concluidaComSucesso: true,
      dataInicio: "2026-07-16T09:00:00-03:00",
      dataFim: "2026-07-16T09:20:00-03:00",
      createdAt: "2026-07-16T09:20:00-03:00",
    }],
    cronogramasRevisao: [],
    evidenciasAprendizagemGuiada: [],
  });
});

describe("guided learning store integration", () => {
  it("confirma teoria e agenda revisão somente após recuperação suficiente", () => {
    const result = useConcurseiroStore.getState().registrarEvidenciaAprendizagemGuiada({
      prescriptionId: "prescription-guided",
      recordedAt: "2026-07-16T09:25:00-03:00",
      preStudyResponses: [{ questionIndex: 0, state: "DONT_KNOW" }],
      postStudyResponses: [{ questionIndex: 0, state: "CORRECT" }],
      usedMaterialDuringFinalRecall: false,
      remainingDoubts: [],
      selfReportedFatigue: "LOW",
    });

    expect(result.assessment?.status).toBe("MASTERED_FOR_NOW");
    expect(useConcurseiroStore.getState().subassuntos.find((item) => item.id === subtopic.id)?.completado).toBe(true);
    expect(useConcurseiroStore.getState().cronogramasRevisao.some((item) => item.subassuntoId === subtopic.id)).toBe(true);
  });

  it("remove conclusão presumida e agenda reaprendizagem quando a recuperação falha", () => {
    useConcurseiroStore.setState((state) => ({
      subassuntos: state.subassuntos.map((item) => item.id === subtopic.id ? { ...item, completado: true } : item),
    }));
    const result = useConcurseiroStore.getState().registrarEvidenciaAprendizagemGuiada({
      prescriptionId: "prescription-guided",
      recordedAt: "2026-07-16T09:25:00-03:00",
      preStudyResponses: [{ questionIndex: 0, state: "DONT_KNOW" }],
      postStudyResponses: [{ questionIndex: 0, state: "INCORRECT" }],
      usedMaterialDuringFinalRecall: false,
      remainingDoubts: ["Não consigo diferenciar os conceitos."],
      selfReportedFatigue: "MEDIUM",
    });

    expect(result.assessment?.status).toBe("RELEARN_REQUIRED");
    expect(useConcurseiroStore.getState().subassuntos.find((item) => item.id === subtopic.id)?.completado).toBe(false);
    expect(useConcurseiroStore.getState().cronogramasRevisao.find((item) => item.subassuntoId === subtopic.id)?.requerReaprendizagemImediata).toBe(true);
  });
});
