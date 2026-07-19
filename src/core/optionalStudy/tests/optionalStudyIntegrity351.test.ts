import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { DATAPREV_KNOWLEDGE_GRAPH_V2 } from "../../sde-v2/config";
import { applyErrorRecoveryEpisode, recordErrorCorrection } from "../../review/errorRecovery";
import { buildSdeV2DecisionInputFromSnapshot } from "../../../integrations/sde/v2/sdeV2ApplicationAdapter";
import {
  buildOptionalStudyCalibrationRecord,
  buildOptionalStudyRecommendation,
  deriveOptionalQuestionSourceAndBoard,
  optionalResultHistoryType,
  validateManualOptionalChoice,
  validateOptionalStudyResult,
} from "..";
import type { CronogramaRevisao } from "../../../types";
import type { OptionalStudyRecommendationOption, OptionalStudyResultInput } from "../types";

const seed = buildDataprev2026Profile3AppSeed();

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    now: "2026-07-19T12:00:00.000Z",
    localDate: "2026-07-19",
    context: "rest_day_optional" as const,
    scheduledMinutes: 0,
    completedMinutes: 0,
    remainingMinutes: 0,
    weeklyStudiedMinutes: 0,
    examDate: seed.concurso.dataProva,
    effectiveDecision: null,
    disciplines: seed.disciplinas,
    topics: seed.assuntos,
    subtopics: seed.subassuntos,
    sessions: [],
    reviews: [],
    errorCases: [],
    materials: seed.biblioteca,
    evidence: [],
    ...overrides,
  } as Parameters<typeof buildOptionalStudyRecommendation>[0];
}

function realV2Input() {
  return buildSdeV2DecisionInputFromSnapshot({
    snapshot: {
      configuracao: seed.configuracao,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      flashcards: [],
      cronogramasRevisao: [],
      biblioteca: seed.biblioteca,
      externalEvidenceLedger: [],
      simulados: [],
      questoes: [],
      decisionLedger: [],
    },
    referenceDate: "2026-07-19",
    availableMinutes: 30,
  });
}

function option(overrides: Partial<OptionalStudyRecommendationOption> = {}): OptionalStudyRecommendationOption {
  const discipline = seed.disciplinas[0];
  const topic = seed.assuntos.find((item) => item.disciplinaId === discipline.id)!;
  const subtopic = seed.subassuntos.find((item) => item.assuntoId === topic.id)!;
  return {
    optionId: "option",
    disciplineId: discipline.id,
    disciplineName: discipline.nome,
    topicId: topic.id,
    topicName: topic.nome,
    subtopicId: subtopic.id,
    subtopicName: subtopic.nome,
    method: "short_question_batch",
    environment: "qconcursos",
    durationMinutes: 30,
    objective: "Medir",
    completionCriterion: "Registrar",
    rationale: "Sinal real",
    expectedPedagogicalEffect: "Medição",
    warnings: [],
    supportSignals: ["sinal real"],
    origin: "sde_v1_optional",
    sdeVersion: "1.0",
    ...overrides,
  };
}

function review(date: string): CronogramaRevisao {
  const subtopic = seed.subassuntos[0];
  const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
  return {
    id: `review-${date}`,
    subassuntoId: subtopic.id,
    assuntoId: topic.id,
    disciplinaId: topic.disciplinaId,
    metodoRevisao: "SA",
    passosCicloAtuais: 0,
    historicoTentativas: [],
    proximaRevisaoData: date,
    desabilitada: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  };
}

function activeError() {
  const subtopic = seed.subassuntos[0];
  const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
  return applyErrorRecoveryEpisode([], {
    disciplinaId: topic.disciplinaId,
    assuntoId: topic.id,
    subassuntoId: subtopic.id,
    attemptIds: ["attempt-1"],
    recordedAt: "2026-07-18T10:00:00.000Z",
    correct: false,
    declaredCause: "INTERPRETACAO",
  })[0];
}

function stabilizedError() {
  const opened = [activeError()];
  const corrected = recordErrorCorrection(opened, opened[0].id, {
    cause: "INTERPRETACAO",
    correctionSummary: "Identifiquei o comando exato.",
    preventionRule: "Reler o comando antes das alternativas.",
    recordedAt: "2026-07-18T10:05:00.000Z",
  }).cases;
  const first = applyErrorRecoveryEpisode(corrected, {
    disciplinaId: opened[0].disciplinaId,
    assuntoId: opened[0].assuntoId,
    subassuntoId: opened[0].subassuntoId,
    attemptIds: ["attempt-2"],
    recordedAt: "2026-07-18T11:00:00.000Z",
    correct: true,
    confidence: "ALTA",
    consultedMaterial: false,
  });
  return applyErrorRecoveryEpisode(first, {
    disciplinaId: opened[0].disciplinaId,
    assuntoId: opened[0].assuntoId,
    subassuntoId: opened[0].subassuntoId,
    attemptIds: ["attempt-3"],
    recordedAt: "2026-07-19T11:00:00.000Z",
    correct: true,
    confidence: "ALTA",
    consultedMaterial: false,
  })[0];
}

describe("v3.35.1 optional-study decision integrity", () => {
  it("never reuses a v1 alternative as v2", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput())!;
    expect(recommendation.shadowAlternative).toBeUndefined();
    expect(recommendation.shadowExecution).toMatchObject({ executed: false, fallbackUsed: true, fallbackReason: "OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2" });
  });

  it("labels version 2.0 only when produced by the real adapter", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput({ sdeV2DecisionInput: realV2Input() }))!;
    expect(recommendation.shadowAlternative).toMatchObject({ origin: "sde_v2_real", sdeVersion: "2.0", sourceDecisionId: expect.stringMatching(/^decision-v2-/) });
    expect(recommendation.shadowExecution).toMatchObject({ executed: true, fallbackUsed: false });
  });

  it("real v2 shadow does not change the displayed v1 recommendation", () => {
    const withoutV2 = buildOptionalStudyRecommendation(baseInput())!;
    const withV2 = buildOptionalStudyRecommendation(baseInput({ sdeV2DecisionInput: realV2Input() }))!;
    expect(withV2.primary).toEqual(withoutV2.primary);
    expect(withV2.alternatives).toEqual(withoutV2.alternatives);
  });

  it("records explicit fallback without a fictitious v2 decision", () => {
    const record = buildOptionalStudyCalibrationRecord(buildOptionalStudyRecommendation(baseInput())!);
    expect(record).toMatchObject({ v2Decision: null, fallbackUsed: true, fallbackReason: "OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2", affectsPrescription: false });
  });

  it("preserves historical incidence at zero decision weight", () => {
    const record = buildOptionalStudyCalibrationRecord(buildOptionalStudyRecommendation(baseInput({ sdeV2DecisionInput: realV2Input() }))!);
    expect(record.historicalIncidenceShadow?.decisionWeight).toBe(0);
  });

  it("does not offer error review for a stabilized case", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput({ errorCases: [stabilizedError()] }))!;
    expect([recommendation.primary, ...recommendation.alternatives].some((item) => item.method === "error_review")).toBe(false);
    expect([recommendation.primary, ...recommendation.alternatives].join(" ")).not.toContain("erros recentes");
  });

  it("offers error review only for an active canonical case", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput({ errorCases: [activeError()] }))!;
    expect([recommendation.primary, ...recommendation.alternatives].some((item) => item.method === "error_review")).toBe(true);
  });

  it("does not offer review_due without a due or near review", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput({ reviews: [review("2026-08-10")] }))!;
    expect([recommendation.primary, ...recommendation.alternatives].some((item) => item.method === "review_due")).toBe(false);
  });

  it("offers review_due inside the explicit three-day window", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput({ reviews: [review("2026-07-22")] }))!;
    expect([recommendation.primary, ...recommendation.alternatives].some((item) => item.method === "review_due")).toBe(true);
  });

  it("does not invent theory material", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput({ materials: [] }))!;
    expect([recommendation.primary, ...recommendation.alternatives].some((item) => ["theory_notebooklm", "continue_theory", "guided_reading"].includes(item.method))).toBe(false);
    expect(recommendation.primary.materialId).toBeUndefined();
  });

  it("every presented alternative has a real supporting signal", () => {
    const recommendation = buildOptionalStudyRecommendation(baseInput({ reviews: [review("2026-07-19")], errorCases: [activeError()] }))!;
    for (const candidate of [recommendation.primary, ...recommendation.alternatives]) expect(candidate.supportSignals?.length).toBeGreaterThan(0);
  });

  it("detects an insufficient required prerequisite independently from v2 shadow output", () => {
    const required = DATAPREV_KNOWLEDGE_GRAPH_V2.edges.find((edge) => edge.relation === "required_prerequisite");
    expect(required).toBeTruthy();
    const targetNode = DATAPREV_KNOWLEDGE_GRAPH_V2.nodes.find((node) => node.nodeId === required!.toNodeId)!;
    const target = seed.subassuntos.find((item) => item.id === targetNode.taxonomyNodeId)!;
    const topic = seed.assuntos.find((item) => item.id === target.assuntoId)!;
    const recommendation = buildOptionalStudyRecommendation(baseInput({
      effectiveDecision: { prescription: { current: { id: "p1", disciplineId: topic.disciplinaId, topicId: topic.id, subtopicId: target.id, activity: "questoes" } } } as never,
    }))!;
    expect(recommendation.snapshot.prerequisiteBlockedSubtopicIds).toContain(target.id);
    expect(recommendation.primary.method).toBe("prerequisite_recovery");
  });

  it("manual validation uses canonical prerequisite, material, source and bank warnings", () => {
    const warnings = validateManualOptionalChoice({ durationMinutes: 30, materialMatchConfidence: "none", prerequisiteAdequate: false, weeklyStudiedMinutes: 700, method: "short_question_batch", environment: "qconcursos", sourceInformed: false, examiningBoardInformed: false });
    expect(warnings.join(" ")).toMatch(/pré-requisito/i);
    expect(warnings.join(" ")).toMatch(/carga alta/i);
    expect(warnings.join(" ")).toMatch(/fonte|plataforma/i);
    expect(warnings.join(" ")).toMatch(/banca/i);
  });
});

describe("v3.35.1 source, bank and result governance", () => {
  it("never treats QConcursos as a bank", () => {
    expect(deriveOptionalQuestionSourceAndBoard(option(), { kind: "questions", actualMinutes: 10, source: "qconcursos", totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0 })).toEqual({ source: "qconcursos", examiningBoard: undefined });
  });

  it("does not assign FGV to an arbitrary manual batch", () => {
    expect(deriveOptionalQuestionSourceAndBoard(option({ method: "short_question_batch", environment: "manual", origin: "manual" }), { kind: "questions", actualMinutes: 10, source: "outra", totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0 }).examiningBoard).toBeUndefined();
  });

  it("derives FGV for compatible fgv_questions", () => {
    expect(deriveOptionalQuestionSourceAndBoard(option({ method: "fgv_questions" }), { kind: "questions", actualMinutes: 10, source: "qconcursos", totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0 })).toEqual({ source: "qconcursos", examiningBoard: "FGV" });
  });

  it("derives source and bank for Treino FGV", () => {
    expect(deriveOptionalQuestionSourceAndBoard(option({ environment: "treino_fgv" }), { kind: "questions", actualMinutes: 10, source: "treino_fgv", totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0 })).toEqual({ source: "treino_fgv", examiningBoard: "FGV" });
  });

  it("preserves another informed bank", () => {
    expect(deriveOptionalQuestionSourceAndBoard(option({ environment: "manual" }), { kind: "questions", actualMinutes: 10, source: "outra", examiningBoard: "CESPE", totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0 })).toEqual({ source: "outra", examiningBoard: "CESPE" });
  });

  it("requires an explicit source for question results", () => {
    const result: OptionalStudyResultInput = { kind: "questions", actualMinutes: 10, totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0 };
    expect(validateOptionalStudyResult(result)).toMatch(/origem/i);
  });

  it("maps each result to the correct canonical history class", () => {
    expect(optionalResultHistoryType("theory")).toBe("ESTUDO_TEORIA");
    expect(optionalResultHistoryType("questions")).toBe("RESOLUCAO_QUESTAO");
    expect(optionalResultHistoryType("review")).toBe("REVISAO_PROGRAMADA");
    expect(optionalResultHistoryType("simulation")).toBe("SIMULADO");
    expect(optionalResultHistoryType("technical_practice")).toBe("PRATICA_TECNICA");
    expect(optionalResultHistoryType("organization")).toBe("ATIVIDADE_OPERACIONAL");
  });
});
