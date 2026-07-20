import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../../../config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";
import { buildOptionalStudyRecommendation, findOptionalStudyMaterial, validateOptionalStudyExecutionOption } from "../../optionalStudy";
import type { OptionalStudyRecommendationOption } from "../../optionalStudy/types";

const seed = buildDataprev2026Profile3AppSeed();
const portuguese = seed.disciplinas.find((item) => item.id === "dp26-p3-portugues")!;
const interpretation = seed.assuntos.find((item) => item.id === "dp26-p3-por-interpretacao")!;
const interpretationSubtopic = seed.subassuntos.find((item) => item.id === "dp26-p3-por-interpretacao-generos")!;
const specific = seed.disciplinas.find((item) => item.id === "dp26-p3-conhecimentos-especificos")!;
const database = seed.assuntos.find((item) => item.id === "dp26-p3-esp-banco-dados")!;
const dbMaterial = DATAPREV_2026_PRIVATE_STUDY_MATERIALS.find((material) => material.sections.some((section) => section.topicId === database.id && section.subtopicIds.length > 0))!;
const dbSection = dbMaterial.sections.find((section) => section.topicId === database.id && section.subtopicIds.length > 0)!;
const dbSubtopic = seed.subassuntos.find((item) => item.id === dbSection.subtopicIds[0])!;

function optionalInput(context: "rest_day_optional" | "extra_after_required_plan") {
  return {
    now: "2026-07-19T12:00:00.000Z",
    localDate: "2026-07-19",
    context,
    scheduledMinutes: context === "rest_day_optional" ? 0 : 120,
    completedMinutes: context === "rest_day_optional" ? 0 : 120,
    remainingMinutes: 0,
    weeklyStudiedMinutes: 300,
    examDate: seed.concurso.dataProva,
    effectiveDecision: null,
    disciplines: seed.disciplinas,
    topics: seed.assuntos,
    subtopics: seed.subassuntos,
    sessions: [],
    reviews: [],
    errorCases: [],
    materials: seed.biblioteca,
    materialCatalog: DATAPREV_2026_PRIVATE_STUDY_MATERIALS,
    evidence: [],
  } as Parameters<typeof buildOptionalStudyRecommendation>[0];
}

function option(overrides: Partial<OptionalStudyRecommendationOption> = {}): OptionalStudyRecommendationOption {
  return {
    optionId: "manual-option",
    disciplineId: portuguese.id,
    disciplineName: portuguese.nome,
    topicId: interpretation.id,
    topicName: interpretation.nome,
    subtopicId: interpretationSubtopic.id,
    subtopicName: interpretationSubtopic.nome,
    method: "theory_notebooklm",
    environment: "notebooklm",
    durationMinutes: 30,
    objective: "Estudar o conteúdo prescrito.",
    completionCriterion: "Registrar recuperação ativa e dúvidas.",
    rationale: "Escolha manual.",
    expectedPedagogicalEffect: "Aprendizagem.",
    warnings: [],
    supportSignals: ["escolha manual"],
    origin: "manual",
    sdeVersion: "1.0",
    ...overrides,
  };
}

describe("v3.35.3 optional and mandatory gate integration", () => {
  it("applies the gate on Sunday and never exposes the incompatible orthography material", () => {
    const recommendation = buildOptionalStudyRecommendation(optionalInput("rest_day_optional"))!;
    expect(recommendation.primary.executionStatus).toBe("READY");
    expect(recommendation.primary.executionPacket).toBeTruthy();
    expect(recommendation.primary.executionPacket?.materialTitle ?? "").not.toMatch(/Noções Iniciais De Ortografia/i);
    expect(recommendation.primary.executionPacket?.contentScope).toMatch(/Compreensão e Interpretação/i);
    expect(recommendation.primary.executionPacket?.sectionsOrPages).toMatch(/Páginas 86–144/);
    expect(recommendation.primary.executionPacket?.environment).toBe("notebooklm");
  });

  it("applies the same gate after the required plan is completed", () => {
    const recommendation = buildOptionalStudyRecommendation(optionalInput("extra_after_required_plan"))!;
    expect(recommendation.context).toBe("extra_after_required_plan");
    expect(recommendation.primary.executionPacket).toBeTruthy();
  });

  it("uses the configured Portuguese theory-only NotebookLM without FGV-style teaching", () => {
    const match = findOptionalStudyMaterial(seed.biblioteca, portuguese.id, interpretation.id, interpretationSubtopic.id, DATAPREV_2026_PRIVATE_STUDY_MATERIALS);
    const result = validateOptionalStudyExecutionOption(option(), "manual_optional", match, DATAPREV_2026_PRIVATE_STUDY_MATERIALS);
    expect(result.executionStatus).toBe("READY");
    expect(result.environment).toBe("notebooklm");
    expect(result.method).toBe("theory_notebooklm");
    expect(result.executionPacket?.notebook).toMatchObject({
      status: "READY_THEORY_ONLY",
      fgvEvidenceStatus: "PENDING",
      fgvStyleTeaching: "DISABLED",
    });
  });

  it("allows a manual Banco de Dados NotebookLM choice", () => {
    const match = findOptionalStudyMaterial(seed.biblioteca, specific.id, database.id, dbSubtopic.id, DATAPREV_2026_PRIVATE_STUDY_MATERIALS);
    const result = validateOptionalStudyExecutionOption(option({ disciplineId: specific.id, disciplineName: specific.nome, topicId: database.id, topicName: database.nome, subtopicId: dbSubtopic.id, subtopicName: dbSubtopic.nome }), "manual_optional", match, DATAPREV_2026_PRIVATE_STUDY_MATERIALS);
    expect(result.executionStatus).toBe("READY");
    expect(result.executionPacket?.notebook?.name).toBe("DATAPREV 2026 — Banco de Dados — Tutor FGV");
  });

  it("keeps only executable alternatives in the user-facing list", () => {
    const recommendation = buildOptionalStudyRecommendation(optionalInput("rest_day_optional"))!;
    expect([recommendation.primary, ...recommendation.alternatives].every((item) => item.executionStatus === "READY" && item.executionPacket)).toBe(true);
  });

  it("does not expose a blocked option when an executable method fallback exists", () => {
    const recommendation = buildOptionalStudyRecommendation(optionalInput("rest_day_optional"))!;
    expect(recommendation.primary.executionStatus).toBe("READY");
    expect(recommendation.primary.executionPacket?.environment).toBe("notebooklm");
    expect(recommendation.primary.executionPacket?.notebook?.fgvStyleTeaching).toBe("DISABLED");
    expect(recommendation.blockedOptions ?? []).toHaveLength(0);
  });

  it("preserves the SDE v1 recommendation as effective", () => {
    const recommendation = buildOptionalStudyRecommendation(optionalInput("rest_day_optional"))!;
    expect(recommendation.primary.sdeVersion).toBe("1.0");
    expect(recommendation.snapshot.sdeV1Effective).toBe(true);
  });

  it("keeps SDE v2 only in shadow", () => {
    const recommendation = buildOptionalStudyRecommendation(optionalInput("rest_day_optional"))!;
    expect(recommendation.snapshot.sdeV2ExecutionMode).toBe("shadow");
    expect(recommendation.snapshot.sdeV2AffectsPrescription).toBe(false);
  });

  it("does not alter the 120-minute availability seed", () => {
    expect(seed.configuracao.metaHorariaDiariaMinutos).toBe(120);
    expect(seed.configuracao.disponibilidadeEstudo.weekly.filter((day) => day.enabled).every((day) => day.totalMinutes === 120)).toBe(true);
  });

  it("keeps the Sunday rest day unavailable", () => {
    expect(seed.configuracao.disponibilidadeEstudo.weekly.find((day) => day.dayOfWeek === 0)).toMatchObject({ enabled: false, totalMinutes: 0 });
  });
});
