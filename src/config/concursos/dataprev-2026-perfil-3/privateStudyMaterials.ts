import strategyCatalogJson from "../../../../data/evidence/dataprev-2026-perfil-3/private-study-materials/strategy-private-material-catalog.json";
import strategySummaryJson from "../../../../data/evidence/dataprev-2026-perfil-3/private-study-materials/strategy-private-material-summary.json";
import tiTotalCatalogJson from "../../../../data/evidence/dataprev-2026-perfil-3/private-study-materials/titotal-private-material-catalog.json";
import tiTotalSummaryJson from "../../../../data/evidence/dataprev-2026-perfil-3/private-study-materials/titotal-private-material-summary.json";
import tiTotalInvalidManifestJson from "../../../../data/evidence/dataprev-2026-perfil-3/private-study-materials/titotal-invalid-source-manifest.json";
import { ItemBiblioteca } from "../../../types";
import { PrivateStudyMaterial } from "../../../core/materials/types";

const STRATEGY_MATERIALS = strategyCatalogJson.materials as PrivateStudyMaterial[];
const TI_TOTAL_MATERIALS = tiTotalCatalogJson.materials as PrivateStudyMaterial[];

export const DATAPREV_2026_PRIVATE_STUDY_MATERIALS: PrivateStudyMaterial[] = [
  ...STRATEGY_MATERIALS,
  ...TI_TOTAL_MATERIALS
];

export const DATAPREV_2026_PRIVATE_STUDY_MATERIAL_SUMMARY = {
  schemaVersion: "1.1.0",
  concursoId: "dataprev-2026-perfil-3",
  materialCount: DATAPREV_2026_PRIVATE_STUDY_MATERIALS.length,
  totalPages:
    Number(strategySummaryJson.totalPages ?? 0) +
    Number(tiTotalSummaryJson.totalPages ?? 0),
  providers: {
    ESTRATEGIA_CONCURSOS: strategySummaryJson,
    TI_TOTAL: tiTotalSummaryJson
  },
  pendingInvalidSources: tiTotalInvalidManifestJson.invalidFiles
};

const CREATED_AT = "2026-07-15T00:00:00-03:00";

function providerLabel(material: PrivateStudyMaterial): string {
  switch (material.sourceProvider) {
    case "TI_TOTAL":
      return "TI Total";
    case "ESTRATEGIA_CONCURSOS":
      return "Estratégia Concursos";
    default:
      return "Material privado";
  }
}

export function buildPrivateStudyMaterialLibraryItems(): ItemBiblioteca[] {
  return DATAPREV_2026_PRIVATE_STUDY_MATERIALS.map((material) => ({
    id: `lib-${material.id}`,
    concursoId: material.concursoId,
    disciplinaId: material.disciplineId ?? undefined,
    assuntoId: material.topicId ?? undefined,
    titulo: material.displayTitle,
    descricao:
      `${providerLabel(material)} · material privado da assinatura do usuário · ` +
      `${material.totalPages} páginas. O aplicativo conserva somente metadados e ` +
      "localizadores pedagógicos; o PDF não é incorporado nem compartilhado.",
    categoria: "BIBLIOGRAFIA",
    linkAcesso: `private-material://${material.id}`,
    isFavorito: false,
    tags: [
      "material-privado",
      material.sourceProvider === "TI_TOTAL" ? "ti-total" : "estrategia-concursos",
      material.sourceRole === "COMPLEMENTARY" ? "fonte-complementar" : "fonte-principal",
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
