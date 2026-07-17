import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { useConcurseiroStore } from "../../../store";

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
    questoes: [],
    simulados: [],
    historicoAtividades: [],
    activeConcursoId: seed.concurso.id,
    activeSimuladoId: null,
  });
  return seed;
}

describe("simulation store integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));
    seedStore();
  });

  it("cria, registra e conclui simulado externo sem fabricar tentativas temáticas", () => {
    const seed = seedStore();
    const selected = seed.disciplinas.slice(0, 2).map((item) => item.id);
    const created = useConcurseiroStore.getState().createSimulationPlan({
      title: "Parcial básico",
      kind: "PARTIAL",
      selectedDisciplineIds: selected,
      source: {
        id: "qconcursos",
        label: "Qconcursos",
        kind: "EXTERNAL_BANK",
        reference: "Qconcursos — filtros registrados",
      },
    });

    expect(created.success).toBe(true);
    const simulado = useConcurseiroStore.getState().simulados[0];
    expect(simulado).toMatchObject({
      quantidadeQuestoes: 24,
      tempoLimiteSegundos: Math.ceil((240 * 24) / 70) * 60,
      questoesIds: [],
      status: "CRIADO",
      policyVersion: "OFFICIAL_BLUEPRINT_IDENTIFIED_SOURCES_V1",
    });

    for (const discipline of simulado.plano!.disciplines) {
      const result = useConcurseiroStore.getState().recordSimulationDisciplineResult(simulado.id, {
        disciplineId: discipline.disciplineId,
        correct: discipline.questionCount - 2,
        wrong: 1,
        blank: 1,
        elapsedSeconds: discipline.questionCount * 150,
      });
      expect(result.success).toBe(true);
    }

    expect(useConcurseiroStore.getState().finishSimulado(simulado.id)).toEqual({ success: true });
    const completed = useConcurseiroStore.getState().simulados[0];
    expect(completed.status).toBe("CONCLUIDO");
    expect(completed.analise?.kind).toBe("PARTIAL");
    expect(completed.analise?.totalBlank).toBe(2);
    expect(completed.analise?.eligibilityStatus).toBe("NOT_EVALUATED_PARTIAL");
    expect(useConcurseiroStore.getState().tentativasQuestoes).toHaveLength(0);
    expect(useConcurseiroStore.getState().ultimaDecisaoSDE).toBeNull();
  });

  it("impede concluir enquanto falta disciplina", () => {
    const created = useConcurseiroStore.getState().createSimulationPlan({
      title: "Completo",
      kind: "FULL",
      source: {
        id: "estrategia-questoes",
        label: "Estratégia Questões",
        kind: "EXTERNAL_BANK",
        reference: "Estratégia Questões — filtros registrados",
      },
    });
    expect(created.success).toBe(true);

    const result = useConcurseiroStore.getState().finishSimulado(created.id!);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Resultado ausente/);
  });

  it("não usa o fallback legado para questões sem fonte identificada", () => {
    const id = useConcurseiroStore.getState().createSimulado(
      "Legado",
      "dataprev-2026-perfil-3",
      10,
      1800,
    );
    expect(id).toBe("");
    expect(useConcurseiroStore.getState().simulados).toHaveLength(0);
  });
});
