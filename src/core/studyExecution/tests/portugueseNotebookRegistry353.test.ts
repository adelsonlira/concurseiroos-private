import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { executionReadinessGate } from "../executionReadinessGate";
import { resolveStudyExecutionCapability, studyExecutionRegistry } from "../registry";
import type { StudyExecutionGateInput } from "../types";

const seed = buildDataprev2026Profile3AppSeed();
const portuguese = seed.disciplinas.find((item) => item.id === "dp26-p3-portugues")!;
const interpretation = seed.assuntos.find((item) => item.id === "dp26-p3-por-interpretacao")!;
const interpretationSubtopic = seed.subassuntos.find((item) => item.id === "dp26-p3-por-interpretacao-generos")!;
const databaseDiscipline = seed.disciplinas.find((item) => item.id === "dp26-p3-conhecimentos-especificos")!;
const database = seed.assuntos.find((item) => item.id === "dp26-p3-esp-banco-dados")!;

function input(overrides: Partial<StudyExecutionGateInput> = {}): StudyExecutionGateInput {
  return {
    competitionId: "dataprev-2026-perfil-3",
    context: "mandatory",
    disciplineId: portuguese.id,
    disciplineName: portuguese.nome,
    topicId: interpretation.id,
    topicName: interpretation.nome,
    subtopicId: interpretationSubtopic.id,
    subtopicName: interpretationSubtopic.nome,
    requestedMethod: "theory_notebooklm",
    requestedEnvironment: "notebooklm",
    durationMinutes: 40,
    objective: "Compreender e interpretar textos de gêneros variados.",
    completionCriterion: "Responder à recuperação ativa e registrar dúvidas.",
    material: null,
    allowMethodFallback: true,
    sourceDecisionId: "portuguese-registry-353",
    ...overrides,
  };
}

const realFiles = [
  "edital-dataprev_supe-versaofinal.pdf",
  "curso-392405-aula-01-ce54-grifado.pdf",
  "curso-392405-aula-02-5d07-grifado.pdf",
  "curso-392405-aula-03-43fb-grifado.pdf",
  "curso-392405-aula-04-1019-grifado.pdf",
  "curso-392405-aula-05-c93b-grifado.pdf",
  "curso-392405-aula-06-ebad-grifado.pdf",
  "curso-392405-aula-07-0dd6-grifado.pdf",
  "curso-392405-aula-08-21e4-grifado.pdf",
  "curso-392405-aula-09-e3cf-grifado.pdf",
  "curso-392405-aula-10-2915-grifado.pdf",
  "curso-392405-aula-11-0181-grifado.pdf",
  "curso-392405-aula-12-21bb-completo.pdf",
];

describe("Portuguese NotebookLM registry v3.35.3", () => {
  it("registers the exact approved notebook name", () => {
    expect(resolveStudyExecutionCapability(portuguese.id, interpretation.id).notebookName)
      .toBe("DATAPREV 2026 — Língua Portuguesa — Tutor FGV");
  });

  it("registers exactly the 13 approved physical sources", () => {
    const capability = resolveStudyExecutionCapability(portuguese.id, interpretation.id);
    expect(capability.approvedSources.map((source) => source.fileName)).toEqual(realFiles);
  });

  it("does not expose a taxonomy excerpt as a NotebookLM source", () => {
    const packet = executionReadinessGate(input()).packet!;
    expect(packet.selectedSources.join(" ")).not.toMatch(/taxonomia/i);
  });

  it("keeps the edital structural and outside FGV evidence", () => {
    const source = resolveStudyExecutionCapability(portuguese.id, interpretation.id).approvedSources[0];
    expect(source).toMatchObject({ kind: "INSTITUTIONAL", fgvEvidence: false, defaultSelected: true });
  });

  it("registers lessons 01 to 11 as private theory", () => {
    const sources = resolveStudyExecutionCapability(portuguese.id, interpretation.id).approvedSources.slice(1, 12);
    expect(sources).toHaveLength(11);
    expect(sources.every((source) => source.kind === "THEORY" && !source.fgvEvidence)).toBe(true);
  });

  it("registers lesson 12 as secondary pedagogical without FGV authority", () => {
    const source = resolveStudyExecutionCapability(portuguese.id, interpretation.id).approvedSources.at(-1)!;
    expect(source).toMatchObject({ fileName: "curso-392405-aula-12-21bb-completo.pdf", kind: "SECONDARY_PEDAGOGICAL", fgvEvidence: false });
  });

  it("selects edital and lesson 11 for interpretation", () => {
    const selected = executionReadinessGate(input()).packet!.selectedSources;
    expect(selected).toEqual(expect.arrayContaining([
      "edital-dataprev_supe-versaofinal.pdf",
      "curso-392405-aula-11-0181-grifado.pdf",
    ]));
  });

  it("can select lessons 09 and 10 when their thematic keywords are requested", () => {
    const selected = executionReadinessGate(input({
      topicName: "Coesão, coerência e relações de sentido",
      subtopicName: "Reescrita, inferência, formalidade e interpretação contextual",
    })).packet!.selectedSources;
    expect(selected).toEqual(expect.arrayContaining([
      "curso-392405-aula-09-e3cf-grifado.pdf",
      "curso-392405-aula-10-2915-grifado.pdf",
    ]));
  });

  it("does not select lesson 01 or lesson 12 by default", () => {
    const selected = executionReadinessGate(input()).packet!.selectedSources;
    expect(selected).not.toContain("curso-392405-aula-01-ce54-grifado.pdf");
    expect(selected).not.toContain("curso-392405-aula-12-21bb-completo.pdf");
    expect(selected.length).toBeLessThan(13);
  });

  it("keeps Portuguese FGV evidence pending and style teaching disabled", () => {
    const capability = resolveStudyExecutionCapability(portuguese.id, interpretation.id);
    const packet = executionReadinessGate(input()).packet!;
    expect(capability).toMatchObject({ fgvEvidenceStatus: "PENDING", fgvStyleTeaching: "DISABLED" });
    expect(packet.notebook?.fgvEvidenceBoundary).toMatch(/Não faça afirmações/i);
  });

  it("declares partial coverage for rewriting across genres and formality levels", () => {
    const rewrite = resolveStudyExecutionCapability(portuguese.id, "dp26-p3-por-reescrita");
    expect(rewrite.coverageStatus).toBe("PARTIAL");
    expect(rewrite.limitations.join(" ")).toMatch(/cobertura disponível.*parcial/i);
  });

  it("preserves Database capability and the original registry order", () => {
    const before = studyExecutionRegistry.disciplines.map((item) => item.disciplineId);
    const databaseCapability = resolveStudyExecutionCapability(databaseDiscipline.id, database.id);
    expect(databaseCapability).toMatchObject({ notebookStatus: "READY_WITH_FGV_EVIDENCE", fgvEvidenceStatus: "APPROVED" });
    expect(studyExecutionRegistry.disciplines.map((item) => item.disciplineId)).toEqual(before);
  });
});
