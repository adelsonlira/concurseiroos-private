import { describe, expect, it } from "vitest";
import { DATAPREV_2026_PROFILE_3_PACKAGE } from "../../../config/concursos/dataprev-2026-perfil-3/officialData";
import { buildCanonicalTaxonomy, calculateTaxonomyCoverage } from "../index";

describe("canonical taxonomy", () => {
  it("preserva todos os IDs oficiais e a hierarquia do pacote", () => {
    const taxonomy = buildCanonicalTaxonomy({
      competition: DATAPREV_2026_PROFILE_3_PACKAGE,
      generatedAt: "2026-07-16T10:00:00-03:00",
    });
    expect(taxonomy.shadowMode).toBe(true);
    expect(taxonomy.nodes.filter((node) => node.kind === "DISCIPLINE")).toHaveLength(6);
    expect(new Set(taxonomy.nodes.map((node) => node.id)).size).toBe(taxonomy.nodes.length);
    expect(taxonomy.nodes.filter((node) => node.kind === "SUBTOPIC").length).toBe(DATAPREV_2026_PROFILE_3_PACKAGE.sde.subassuntos.length);
  });

  it("distingue cobertura pedagógica de questão revisada", () => {
    const taxonomy = buildCanonicalTaxonomy({ competition: DATAPREV_2026_PROFILE_3_PACKAGE, generatedAt: "2026-07-16T10:00:00-03:00" });
    const firstSubtopic = taxonomy.nodes.find((node) => node.kind === "SUBTOPIC")!;
    const coverage = calculateTaxonomyCoverage({
      taxonomy,
      materials: [{
        id: "m1", schemaVersion: "1", concursoId: taxonomy.competitionId, sourceGroup: "x", sourceFileName: "x.pdf", sourceRelativePath: "x.pdf", sourceSha256: "a".repeat(64), sourcePortalCourseId: null, lessonLabel: "Aula", courseTitle: "Curso", displayTitle: "Material", totalPages: 10, textLayer: "NATIVE_TEXT", disciplineId: null, topicId: null,
        sections: [{ ordinal: 1, title: "Seção", startPage: 1, endPage: 2, contentKind: "THEORY", questionBank: null, disciplineId: null, topicId: firstSubtopic.parentId, subtopicIds: [firstSubtopic.id], mappingStatus: "AUTO_HIGH_CONFIDENCE", confidence: 1, matchedTerms: [] }],
        rights: { classification: "PRIVATE_LICENSED_USER_COPY", sharingAllowed: false, contentExportAllowed: false, metadataExportAllowed: true, containsPersonalWatermark: false, retentionPolicy: "DERIVED_METADATA_ONLY" },
      }],
      questionEvidenceBySubtopic: { [firstSubtopic.id]: 4 },
      humanReviewedQuestionEvidenceBySubtopic: { [firstSubtopic.id]: 0 },
    });
    expect(coverage.records.find((item) => item.subtopicId === firstSubtopic.id)?.status).toBe("MATERIAL_ONLY");
  });
});
