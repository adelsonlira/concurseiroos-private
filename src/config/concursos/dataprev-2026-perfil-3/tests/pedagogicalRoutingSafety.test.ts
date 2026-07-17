import { describe, expect, it } from "vitest";
import { routePrivateStudyMaterial } from "../../../../core/materials/materialPolicy";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../privateStudyMaterials";

const base = {
  concursoId: "dataprev-2026-perfil-3",
  disciplineId: "dp26-p3-conhecimentos-especificos",
  topicId: "dp26-p3-esp-banco-dados"
} as const;

describe("DATAPREV pedagogical routing safety", () => {
  it("does not prescribe sibling pages for an unmapped database subtopic", () => {
    const result = routePrivateStudyMaterial(DATAPREV_2026_PRIVATE_STUDY_MATERIALS, {
      ...base,
      activity: "teoria",
      subtopicId: "dp26-p3-esp-bd-ddl"
    });
    expect(result).toBeNull();
  });

  it("maps the audited LAI file to the correct official subtopic", () => {
    const result = routePrivateStudyMaterial(DATAPREV_2026_PRIVATE_STUDY_MATERIALS, {
      concursoId: "dataprev-2026-perfil-3",
      activity: "teoria",
      disciplineId: "dp26-p3-legislacao-si-dados",
      topicId: "dp26-p3-leg-lai",
      subtopicId: "dp26-p3-leg-lai-capitulos"
    });
    expect(result).toMatchObject({
      sourceFileName: "lei-de-acesso-a-informacao-lei-n-12-5272011-grifado-f933.pdf",
      matchScope: "EXACT_SUBTOPIC",
      startPage: 1,
      endPage: 31
    });
  });

  it("never uses theory or commented solutions as the first diagnostic source", () => {
    const result = routePrivateStudyMaterial(DATAPREV_2026_PRIVATE_STUDY_MATERIALS, {
      ...base,
      activity: "questoes",
      diagnosticPurpose: true,
      subtopicId: "dp26-p3-esp-bd-avaliacao-modelos"
    });
    expect(result ? ["QUESTION_LIST", "SIMULATION"].includes(result.contentKind) : true).toBe(true);
  });
});
