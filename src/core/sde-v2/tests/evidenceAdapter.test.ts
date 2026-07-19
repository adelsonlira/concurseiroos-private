import { describe, expect, it } from "vitest";
import { createExternalEvidenceRecord, createExternalEvidenceVoidRecord } from "../../externalEvidence/ledger";
import type { ExternalEvidenceInput, ExternalEvidenceRecord, ExternalEvidenceTaxonomy } from "../../externalEvidence/types";
import { normalizeUnifiedEvidence, countDecisionEligibleEvidence } from "../evidenceAdapter";
import type { TentativaQuestaoUsuario } from "../../../types";

const taxonomy: ExternalEvidenceTaxonomy = {
  disciplineIds: new Set(["d1"]),
  topicToDiscipline: new Map([["t1", "d1"]]),
  subtopicToTopic: new Map([["s1", "t1"]]),
};

function input(overrides: Partial<ExternalEvidenceInput> = {}): ExternalEvidenceInput {
  return {
    evidenceType: "aggregate_question_batch",
    source: "qconcursos",
    disciplineId: "d1",
    topicId: "t1",
    subtopicId: "s1",
    examiningBoard: "FGV",
    totalQuestions: 20,
    correctAnswers: 14,
    wrongAnswers: 5,
    blankAnswers: 1,
    durationMinutes: 30,
    consultedMaterial: "no",
    perceivedConfidence: "not_informed",
    primaryErrorCause: "application",
    granularity: "aggregate",
    ...overrides,
  };
}

function record(id: string, overrides: Partial<ExternalEvidenceInput> = {}, recordedAt = "2026-07-18T12:00:00.000Z"): ExternalEvidenceRecord {
  const result = createExternalEvidenceRecord({ input: input({ recordedAt, ...overrides }), taxonomy, evidenceId: id, now: recordedAt });
  if (!result.record) throw new Error(JSON.stringify(result.validation.fieldErrors));
  return result.record;
}

function normalize(params: { ledger?: ExternalEvidenceRecord[]; attempts?: TentativaQuestaoUsuario[] } = {}) {
  return normalizeUnifiedEvidence({
    referenceDate: "2026-07-18",
    legacyAttempts: params.attempts ?? [],
    externalEvidenceLedger: params.ledger ?? [],
    sessions: [],
    reviewSchedules: [],
    subtopics: [],
  });
}

describe("SDE v2 unified evidence adapter", () => {
  it("normalizes an individual legacy attempt without aggregation", () => {
    const items = normalize({ attempts: [{
      id: "a1", questaoId: "q1", concursoId: "c1", disciplinaId: "d1", assuntoId: "t1", subassuntoId: "s1",
      opcaoSelecionadaId: "A", acertou: true, origem: "TREINO_ISOLADO", tempoRespostaSegundos: 60,
      respondidaEm: "2026-07-18T10:00:00.000Z",
    }] as TentativaQuestaoUsuario[] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ granularity: "individual", totalItems: 1, correctItems: 1, decisionEligible: true });
  });

  it("normalizes one aggregate batch as exactly one evidence item", () => {
    const items = normalize({ ledger: [record("batch-1")] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ evidenceId: "batch-1", granularity: "aggregate", totalItems: 20, correctItems: 14 });
  });

  it("does not create synthetic question attempts from an aggregate batch", () => {
    const items = normalize({ ledger: [record("batch-1")] });
    expect(items.map((item) => item.evidenceId)).toEqual(["batch-1"]);
    expect(items.some((item) => item.evidenceId.includes(":question:"))).toBe(false);
  });

  it("ignores a voided event for decision eligibility while preserving its trace", () => {
    const original = record("batch-1");
    const voidEvent = createExternalEvidenceVoidRecord({ target: original, evidenceId: "void-1", now: "2026-07-18T13:00:00.000Z" });
    const items = normalize({ ledger: [original, voidEvent] });
    expect(items).toHaveLength(0);
    expect(countDecisionEligibleEvidence(items)).toBe(0);
  });

  it("uses only the active replacement when an event is superseded", () => {
    const original = record("batch-1");
    const replacement = record("batch-2", { supersedesEvidenceId: "batch-1", correctAnswers: 16, wrongAnswers: 3 });
    const items = normalize({ ledger: [original, replacement] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ evidenceId: "batch-2", correctItems: 16 });
  });

  it("discounts effective sample size when material was consulted", () => {
    const noConsult = normalize({ ledger: [record("no")] })[0];
    const consulted = normalize({ ledger: [record("yes", { consultedMaterial: "yes" })] })[0];
    expect(consulted.measurementWeight).toBeLessThan(noConsult.measurementWeight);
    expect(consulted.effectiveSampleSize).toBeLessThan(noConsult.effectiveSampleSize);
  });

  it("assigns higher authority to QConcursos FGV than a generic aggregate source", () => {
    const fgv = normalize({ ledger: [record("fgv")] })[0];
    const generic = normalize({ ledger: [record("generic", { source: "outra", examiningBoard: "Outra" })] })[0];
    expect(fgv.authorityWeight).toBeGreaterThan(generic.authorityWeight);
  });

  it("applies deterministic recency decay", () => {
    const recent = normalize({ ledger: [record("recent", {}, "2026-07-18T12:00:00.000Z")] })[0];
    const old = normalize({ ledger: [record("old", {}, "2026-04-18T12:00:00.000Z")] })[0];
    expect(old.ageInDays).toBeGreaterThan(recent.ageInDays);
    expect(old.recencyWeight).toBeLessThan(recent.recencyWeight);
  });

  it("keeps NotebookLM self-assessment non-decisional", () => {
    const item = normalize({ ledger: [record("note", { source: "notebooklm", evidenceType: "guided_retrieval", consultedMaterial: "not_applicable" })] })[0];
    expect(item.decisionEligible).toBe(false);
    expect(item.effectiveSampleSize).toBe(0);
  });

  it("does not use free notes to alter normalized numerical signals", () => {
    const first = normalize({ ledger: [record("a", { notes: "texto A" })] })[0];
    const second = normalize({ ledger: [record("b", { notes: "texto B completamente diferente" })] })[0];
    expect({ ...first, evidenceId: "same" }).toEqual({ ...second, evidenceId: "same" });
  });
});
