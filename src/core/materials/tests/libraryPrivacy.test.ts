import { describe, expect, it } from "vitest";
import { ItemBiblioteca } from "../../../types";
import {
  mergeLibrarySeedItems,
  sanitizeLibraryForBackup,
  sanitizeLibraryItemForBackup
} from "../libraryPrivacy";

function privateItem(): ItemBiblioteca {
  return {
    id: "lib-private-1",
    titulo: "Aula privada",
    categoria: "BIBLIOGRAFIA",
    linkAcesso: "private-material://1",
    isFavorito: false,
    tags: ["material-privado"],
    tipoMaterial: "PDF",
    conteudoMarkdown: "trecho copiado",
    dadosMapaMental: "{\"raw\":true}",
    dadosPDF: {
      textoExtraido: "conteúdo da apostila",
      totalPaginas: 100,
      notasEstudo: [{ pagina: 2, texto: "cópia extensa" }]
    },
    privateMaterial: {
      catalogMaterialId: "1",
      accessMode: "USER_PRIVATE_LOCAL_COPY",
      rightsClassification: "PRIVATE_LICENSED_USER_COPY",
      sharingAllowed: false,
      contentExportAllowed: false,
      metadataExportAllowed: true,
      strategicUse: "PEDAGOGICAL_ROUTING_ONLY",
      sourceFileName: "aula.pdf",
      sourceGroup: "Desenvolvimento",
      courseTitle: "Desenvolvimento",
      lessonLabel: "01"
    },
    createdAt: "2026-07-13T00:00:00-03:00",
    updatedAt: "2026-07-13T00:00:00-03:00"
  };
}

describe("private library persistence policy", () => {
  it("removes licensed content fields from backups and preserves locator metadata", () => {
    const sanitized = sanitizeLibraryItemForBackup(privateItem());
    expect(sanitized.privateMaterial?.catalogMaterialId).toBe("1");
    expect(sanitized.dadosPDF).toEqual({ totalPaginas: 100 });
    expect(sanitized.conteudoMarkdown).toBeUndefined();
    expect(sanitized.dadosMapaMental).toBeUndefined();
    expect(JSON.stringify(sanitized)).not.toContain("conteúdo da apostila");
  });

  it("does not alter ordinary user library items", () => {
    const ordinary = { ...privateItem(), id: "ordinary", privateMaterial: undefined };
    const sanitized = sanitizeLibraryItemForBackup(ordinary);
    expect(sanitized.dadosPDF?.textoExtraido).toBe("conteúdo da apostila");
  });

  it("sanitizes every private item in a backup collection", () => {
    const items = sanitizeLibraryForBackup([privateItem()]);
    expect(items).toHaveLength(1);
    expect(items[0].dadosPDF?.textoExtraido).toBeUndefined();
  });

  it("adds new static locators without overwriting user changes", () => {
    const current = [{ ...privateItem(), titulo: "Título alterado" }];
    const seed = [privateItem(), { ...privateItem(), id: "lib-private-2" }];
    const merged = mergeLibrarySeedItems(current, seed);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.id === "lib-private-1")?.titulo).toBe("Título alterado");
  });
});
