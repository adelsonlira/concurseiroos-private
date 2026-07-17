import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPETITION_ID,
  findCompetitionRuntimeDefinition,
  getActiveCompetitionPackage,
  getCompetitionRuntimeDefinition,
  listCompetitionRuntimeDefinitions
} from "../registry";

const DATAPREV_ID = "dataprev-2026-perfil-3";

describe("competition package registry", () => {
  it("exposes DATAPREV as the default installed package without coupling consumers to its module", () => {
    expect(DEFAULT_COMPETITION_ID).toBe(DATAPREV_ID);
    expect(listCompetitionRuntimeDefinitions().map((item) => item.id)).toContain(DATAPREV_ID);

    const runtime = getCompetitionRuntimeDefinition(DATAPREV_ID);
    const seed = runtime.buildAppSeed();
    expect(runtime.package.id).toBe(DATAPREV_ID);
    expect(seed.configuracao.concursoAlvoId).toBe(DATAPREV_ID);
    expect(runtime.privateStudyMaterials).toHaveLength(126);
    expect(runtime.externalQuestionBanks.map((item) => item.displayName)).toEqual([
      "Estratégia Questões",
      "Qconcursos"
    ]);
  });

  it("resolves the active package through the generic contract", () => {
    expect(getActiveCompetitionPackage(DATAPREV_ID).profileName).toContain(
      "Desenvolvimento de Software"
    );
  });

  it("keeps unknown imported contests separate from installed decision packages", () => {
    expect(findCompetitionRuntimeDefinition("concurso-importado")).toBeNull();
    expect(() => getCompetitionRuntimeDefinition("concurso-importado")).toThrow(
      "não possui um pacote de configuração instalado"
    );
  });
});
