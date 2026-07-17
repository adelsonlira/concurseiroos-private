import type { ItemBiblioteca } from "../../types";
import type {
  MaterialContentKind,
  PrivateStudyMaterial,
  PrivateStudyMaterialSection
} from "./types";

function inferContentKind(item: ItemBiblioteca, title: string): MaterialContentKind {
  const text = `${item.titulo} ${title} ${item.tags.join(" ")}`.toLocaleLowerCase("pt-BR");
  if (/quest(ão|oes|ões)|exerc[ií]cio|simulado/.test(text)) return "QUESTION_LIST";
  if (/resumo|revis[aã]o|mapa mental/.test(text)) return "SUMMARY";
  return "THEORY";
}

function inferQuestionBank(item: ItemBiblioteca, title: string): string | null {
  const text = `${item.titulo} ${title} ${item.tags.join(" ")}`.toLocaleLowerCase("pt-BR");
  if (text.includes("fgv")) return "FGV";
  return null;
}

function toSection(
  item: ItemBiblioteca,
  section: NonNullable<ItemBiblioteca["dadosPDF"]>["indice"][number],
  ordinal: number
): PrivateStudyMaterialSection {
  return {
    ordinal,
    title: section.titulo,
    startPage: section.paginaInicial,
    endPage: section.paginaFinal,
    contentKind: inferContentKind(item, section.titulo),
    questionBank: inferQuestionBank(item, section.titulo),
    disciplineId: section.disciplinaId ?? item.disciplinaId ?? null,
    topicId: section.assuntoId ?? item.assuntoId ?? null,
    subtopicIds: section.subassuntoIds ?? [],
    mappingStatus: section.status === "USER_CONFIRMED" ? "AUTO_HIGH_CONFIDENCE" : "AUTO_REVIEWABLE",
    confidence: section.status === "USER_CONFIRMED" ? Math.max(section.confianca, 0.9) : section.confianca,
    matchedTerms: []
  };
}

export function buildDynamicPrivateMaterialCatalog(
  items: readonly ItemBiblioteca[],
  concursoId: string
): PrivateStudyMaterial[] {
  const result: PrivateStudyMaterial[] = [];

  for (const item of items) {
    const metadata = item.privateMaterial;
    const totalPages = item.dadosPDF?.totalPaginas ?? 0;
    if (
      item.isDeleted ||
      item.tipoMaterial !== "PDF" ||
      !metadata ||
      item.concursoId !== concursoId ||
      !item.disciplinaId ||
      !item.assuntoId ||
      totalPages <= 0
    ) continue;

    const rawSections = item.dadosPDF?.indice ?? [];
    const sections = rawSections.length
      ? rawSections.map((section, index) => toSection(item, section, index + 1))
      : [{
          ordinal: 1,
          title: item.titulo,
          startPage: 1,
          endPage: totalPages,
          contentKind: inferContentKind(item, item.titulo),
          questionBank: inferQuestionBank(item, item.titulo),
          disciplineId: item.disciplinaId,
          topicId: item.assuntoId,
          subtopicIds: [],
          mappingStatus: "TOPIC_ONLY" as const,
          confidence: 0.6,
          matchedTerms: []
        }];

    result.push({
      id: metadata.catalogMaterialId,
      schemaVersion: "1.0.0",
      concursoId,
      sourceGroup: metadata.sourceGroup,
      sourceProvider: "OTHER_PRIVATE",
      sourceRole: "COMPLEMENTARY",
      sourcePriority: 45,
      sourceFileName: metadata.sourceFileName,
      sourceRelativePath: metadata.storagePath ?? metadata.sourceFileName,
      sourceSha256: metadata.sourceSha256 ?? `metadata-${metadata.catalogMaterialId}`,
      sourcePortalCourseId: null,
      lessonLabel: metadata.lessonLabel,
      courseTitle: metadata.courseTitle,
      displayTitle: item.titulo,
      totalPages,
      textLayer: "NATIVE_TEXT",
      disciplineId: item.disciplinaId,
      topicId: item.assuntoId,
      sections,
      rights: {
        classification: "PRIVATE_LICENSED_USER_COPY",
        sharingAllowed: false,
        contentExportAllowed: false,
        metadataExportAllowed: true,
        containsPersonalWatermark: true,
        retentionPolicy: "DERIVED_METADATA_ONLY"
      }
    });
  }

  return result;
}

export function mergePrivateMaterialCatalogs(
  official: readonly PrivateStudyMaterial[],
  dynamic: readonly PrivateStudyMaterial[]
): PrivateStudyMaterial[] {
  const byId = new Map(official.map((material) => [material.id, material] as const));
  for (const material of dynamic) {
    if (!byId.has(material.id)) byId.set(material.id, material);
  }
  return [...byId.values()];
}
