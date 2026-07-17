import { describe, expect, it } from "vitest";
import type { ItemBiblioteca } from "../../../types";
import { buildDynamicPrivateMaterialCatalog } from "../dynamicLibraryCatalog";

const item: ItemBiblioteca = {
  id: "lib-1",
  concursoId: "c1",
  disciplinaId: "d1",
  assuntoId: "a1",
  titulo: "Aula nova de Engenharia de Software",
  categoria: "BIBLIOGRAFIA",
  linkAcesso: "private-cloud://u/path.pdf",
  isFavorito: false,
  tags: ["teoria"],
  tipoMaterial: "PDF",
  dadosPDF: {
    totalPaginas: 100,
    indexStatus: "USER_CONFIRMED",
    indice: [
      {
        titulo: "Requisitos",
        paginaInicial: 10,
        paginaFinal: 30,
        disciplinaId: "d1",
        assuntoId: "a1",
        confianca: 0.95,
        status: "USER_CONFIRMED"
      }
    ]
  },
  privateMaterial: {
    catalogMaterialId: "user-material-1",
    accessMode: "USER_PRIVATE_CLOUD_COPY",
    rightsClassification: "PRIVATE_LICENSED_USER_COPY",
    sharingAllowed: false,
    contentExportAllowed: false,
    metadataExportAllowed: true,
    strategicUse: "PEDAGOGICAL_ROUTING_ONLY",
    sourceFileName: "aula.pdf",
    sourceGroup: "Estratégia",
    courseTitle: "DATAPREV",
    lessonLabel: "Aula nova",
    storageProvider: "SUPABASE",
    storagePath: "u/path.pdf",
    storageStatus: "AVAILABLE"
  },
  createdAt: "2026-07-16T00:00:00.000Z",
  updatedAt: "2026-07-16T00:00:00.000Z"
};

describe("dynamic private material catalog", () => {
  it("turns a user-indexed library PDF into a routable material", () => {
    const result = buildDynamicPrivateMaterialCatalog([item], "c1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("user-material-1");
    expect(result[0].sections[0]).toMatchObject({
      title: "Requisitos",
      startPage: 10,
      endPage: 30,
      mappingStatus: "AUTO_HIGH_CONFIDENCE"
    });
  });
});
