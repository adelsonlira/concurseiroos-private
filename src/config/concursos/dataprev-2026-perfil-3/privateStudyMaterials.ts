import catalogJson from "../../../../data/evidence/dataprev-2026-perfil-3/private-study-materials/strategy-private-material-catalog.json";
import summaryJson from "../../../../data/evidence/dataprev-2026-perfil-3/private-study-materials/strategy-private-material-summary.json";
import { ItemBiblioteca } from "../../../types";
import { PrivateStudyMaterial } from "../../../core/materials/types";

export const DATAPREV_2026_PRIVATE_STUDY_MATERIALS =
  catalogJson.materials as PrivateStudyMaterial[];

export const DATAPREV_2026_PRIVATE_STUDY_MATERIAL_SUMMARY = summaryJson;

const CREATED_AT = "2026-07-13T00:00:00-03:00";

export function buildPrivateStudyMaterialLibraryItems(): ItemBiblioteca[] {
  return DATAPREV_2026_PRIVATE_STUDY_MATERIALS.map((material) => ({
    id: `lib-${material.id}`,
    concursoId: material.concursoId,
    disciplinaId: material.disciplineId ?? undefined,
    assuntoId: material.topicId ?? undefined,
    titulo: material.displayTitle,
    descricao:
      `Material privado da assinatura do usuário · ${material.totalPages} páginas. ` +
      "O aplicativo conserva somente metadados e localizadores pedagógicos; o PDF não é incorporado nem compartilhado.",
    categoria: "BIBLIOGRAFIA",
    linkAcesso: `private-material://${material.id}`,
    isFavorito: false,
    tags: [
      "material-privado",
      "estrategia-concursos",
      "dataprev-2026",
      "roteamento-pedagogico",
      material.courseTitle.toLowerCase()
    ],
    tipoMaterial: "PDF",
    dadosPDF: { totalPaginas: material.totalPages },
    privateMaterial: {
      catalogMaterialId: material.id,
      accessMode: "USER_PRIVATE_LOCAL_COPY",
      rightsClassification: "PRIVATE_LICENSED_USER_COPY",
      sharingAllowed: false,
      contentExportAllowed: false,
      metadataExportAllowed: true,
      strategicUse: "PEDAGOGICAL_ROUTING_ONLY",
      sourceFileName: material.sourceFileName,
      sourceGroup: material.sourceGroup,
      courseTitle: material.courseTitle,
      lessonLabel: material.lessonLabel
    },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  }));
}
