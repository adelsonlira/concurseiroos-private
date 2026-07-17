import { describe, expect, it } from "vitest";
import {
  catalogContainsOnlyDerivedPrivateMetadata,
  privateMaterialMayAffectStrategicPriority,
  routePrivateStudyMaterial
} from "../materialPolicy";
import { PrivateStudyMaterial } from "../types";

const baseMaterial: PrivateStudyMaterial = {
  id: "material-1",
  schemaVersion: "1.0.0",
  concursoId: "dataprev-2026-perfil-3",
  sourceGroup: "Desenvolvimento - C",
  sourceFileName: "aula.pdf",
  sourceRelativePath: "Desenvolvimento - C/aula.pdf",
  sourceSha256: "abc",
  sourcePortalCourseId: "393315",
  lessonLabel: "05",
  courseTitle: "Desenvolvimento de Software",
  displayTitle: "Desenvolvimento de Software — Aula 05",
  totalPages: 100,
  textLayer: "NATIVE_TEXT",
  disciplineId: "dp26-p3-conhecimentos-especificos",
  topicId: "dp26-p3-esp-desenvolvimento-sistemas",
  rights: {
    classification: "PRIVATE_LICENSED_USER_COPY",
    sharingAllowed: false,
    contentExportAllowed: false,
    metadataExportAllowed: true,
    containsPersonalWatermark: true,
    retentionPolicy: "DERIVED_METADATA_ONLY"
  },
  sections: [
    {
      ordinal: 1,
      title: "Spring Boot - Teoria",
      startPage: 55,
      endPage: 71,
      contentKind: "THEORY",
      questionBank: null,
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-desenvolvimento-sistemas",
      subtopicIds: ["dp26-p3-esp-linguagens-frameworks"],
      mappingStatus: "AUTO_HIGH_CONFIDENCE",
      confidence: 0.98,
      matchedTerms: ["spring boot"]
    },
    {
      ordinal: 2,
      title: "Spring Boot - Questões Comentadas - FGV",
      startPage: 72,
      endPage: 80,
      contentKind: "COMMENTED_QUESTIONS",
      questionBank: "FGV",
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-desenvolvimento-sistemas",
      subtopicIds: ["dp26-p3-esp-linguagens-frameworks"],
      mappingStatus: "AUTO_HIGH_CONFIDENCE",
      confidence: 0.98,
      matchedTerms: ["spring boot"]
    },
    {
      ordinal: 3,
      title: "Spring Boot - Lista de Questões - FGV",
      startPage: 81,
      endPage: 90,
      contentKind: "QUESTION_LIST",
      questionBank: "FGV",
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-desenvolvimento-sistemas",
      subtopicIds: ["dp26-p3-esp-linguagens-frameworks"],
      mappingStatus: "AUTO_HIGH_CONFIDENCE",
      confidence: 0.98,
      matchedTerms: ["spring boot"]
    }
  ]
};

describe("private material policy", () => {
  it("routes theory to the theory pages without exposing source content", () => {
    const result = routePrivateStudyMaterial([baseMaterial], {
      concursoId: "dataprev-2026-perfil-3",
      activity: "teoria",
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-desenvolvimento-sistemas",
      subtopicId: "dp26-p3-esp-linguagens-frameworks"
    });

    expect(result).toMatchObject({
      sectionTitle: "Spring Boot - Teoria",
      startPage: 55,
      endPage: 71,
      strategicUse: "PEDAGOGICAL_ROUTING_ONLY",
      accessMode: "USER_PRIVATE_LOCAL_COPY"
    });
    expect(JSON.stringify(result)).not.toContain("conteudoMarkdown");
  });

  it("prefers commented FGV questions for question practice", () => {
    const result = routePrivateStudyMaterial([baseMaterial], {
      concursoId: "dataprev-2026-perfil-3",
      activity: "questoes",
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-desenvolvimento-sistemas",
      subtopicId: "dp26-p3-esp-linguagens-frameworks"
    });

    expect(result?.contentKind).toBe("COMMENTED_QUESTIONS");
    expect(result?.questionBank).toBe("FGV");
    expect(result?.startPage).toBe(72);
  });

  it("prefers a question-only list over commented solutions for initial diagnosis", () => {
    const result = routePrivateStudyMaterial([baseMaterial], {
      concursoId: "dataprev-2026-perfil-3",
      activity: "questoes",
      diagnosticPurpose: true,
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-desenvolvimento-sistemas",
      subtopicId: "dp26-p3-esp-linguagens-frameworks"
    });

    expect(result).toMatchObject({
      contentKind: "QUESTION_LIST",
      sectionTitle: "Spring Boot - Lista de Questões - FGV",
      startPage: 81,
      endPage: 90
    });
  });

  it("does not route a different subtopic", () => {
    const result = routePrivateStudyMaterial([baseMaterial], {
      concursoId: "dataprev-2026-perfil-3",
      activity: "teoria",
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-banco-dados",
      subtopicId: "dp26-p3-esp-bd-sql"
    });
    expect(result).toBeNull();
  });


  it("uses a topic-level question set as fallback when no exact subtopic locator exists", () => {
    const broadQuestionMaterial: PrivateStudyMaterial = {
      ...baseMaterial,
      id: "material-topic-fallback",
      sourceProvider: "TI_TOTAL",
      sourceRole: "COMPLEMENTARY",
      sourcePriority: 60,
      topicId: "dp26-p3-esp-banco-dados",
      sections: [
        {
          ordinal: 1,
          title: "Banco de Dados — Questões FGV",
          startPage: 1,
          endPage: 14,
          contentKind: "COMMENTED_QUESTIONS",
          questionBank: "FGV",
          disciplineId: "dp26-p3-conhecimentos-especificos",
          topicId: "dp26-p3-esp-banco-dados",
          subtopicIds: [],
          mappingStatus: "TOPIC_ONLY",
          confidence: 0.94,
          matchedTerms: ["banco de dados"]
        }
      ]
    };

    const result = routePrivateStudyMaterial([broadQuestionMaterial], {
      concursoId: "dataprev-2026-perfil-3",
      activity: "questoes",
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-banco-dados",
      subtopicId: "dp26-p3-esp-bd-normalizacao"
    });

    expect(result).toMatchObject({
      materialId: "material-topic-fallback",
      sourceProvider: "TI_TOTAL",
      sourceRole: "COMPLEMENTARY",
      questionBank: "FGV"
    });
  });

  it("prefers the primary provider when pedagogical fit and banca are equivalent", () => {
    const strategy = {
      ...baseMaterial,
      id: "strategy-primary",
      sourceProvider: "ESTRATEGIA_CONCURSOS" as const,
      sourceRole: "PRIMARY" as const,
      sourcePriority: 100
    };
    const complementary = {
      ...baseMaterial,
      id: "titotal-complementary",
      sourceProvider: "TI_TOTAL" as const,
      sourceRole: "COMPLEMENTARY" as const,
      sourcePriority: 60
    };

    const result = routePrivateStudyMaterial([complementary, strategy], {
      concursoId: "dataprev-2026-perfil-3",
      activity: "teoria",
      disciplineId: "dp26-p3-conhecimentos-especificos",
      topicId: "dp26-p3-esp-desenvolvimento-sistemas",
      subtopicId: "dp26-p3-esp-linguagens-frameworks"
    });

    expect(result?.materialId).toBe("strategy-primary");
    expect(result?.sourceRole).toBe("PRIMARY");
  });

  it("rejects catalogs containing raw text fields", () => {
    expect(catalogContainsOnlyDerivedPrivateMetadata([baseMaterial])).toBe(true);
    const unsafe = [{ ...baseMaterial, conteudoMarkdown: "copied content" }] as unknown as PrivateStudyMaterial[];
    expect(catalogContainsOnlyDerivedPrivateMetadata(unsafe)).toBe(false);
  });

  it("never promotes private course material into strategic evidence", () => {
    expect(privateMaterialMayAffectStrategicPriority()).toBe(false);
  });
});
