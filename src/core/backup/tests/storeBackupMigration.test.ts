import { describe, expect, it } from "vitest";
import { useConcurseiroStore } from "../../../store";
import type { BackupExportSchema } from "../../../types";

function legacySnapshot(): BackupExportSchema {
  return {
    metadata: {
      versaoBackup: "1.0.0",
      exportadoEm: "2026-07-13T19:56:00.000Z",
      estudanteNome: "",
      totalTamanhoBytes: 0,
      appSource: "ConcurseiroOS"
    },
    dados: {
      concursos: [{ id: "c1" }],
      editais: [],
      disciplinas: [{ id: "d1", concursoId: "c1" }],
      assuntos: [{ id: "a1", disciplinaId: "d1" }],
      subassuntos: [{ id: "s1", assuntoId: "a1" }],
      questoes: [],
      tentativasQuestoes: [],
      flashcards: [],
      documentos: [],
      resumos: [],
      anotacoes: [],
      planosEstudo: [],
      simulados: [],
      estatisticas: null,
      agenda: [],
      historicos: [],
      cronogramasRevisao: [],
      configuracao: null,
      conversasIA: [],
      sessoesEstudo: [],
      evidenciasAprendizagemGuiada: [],
      itensBiblioteca: []
    }
  } as unknown as BackupExportSchema;
}

describe("store backup migration", () => {
  it("imports a cloud snapshot created before guided-learning evidence existed", () => {
    const snapshot = legacySnapshot() as BackupExportSchema & {
      dados: BackupExportSchema["dados"] & { evidenciasAprendizagemGuiada?: unknown };
    };
    delete snapshot.dados.evidenciasAprendizagemGuiada;

    const result = useConcurseiroStore.getState().importBackup(snapshot);

    expect(result).toMatchObject({ success: true, migrated: true });
    expect(useConcurseiroStore.getState().evidenciasAprendizagemGuiada).toEqual([]);
  });
});
