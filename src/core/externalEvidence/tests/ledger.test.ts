import { describe, expect, it } from "vitest";
import {
  EXTERNAL_EVIDENCE_FORM_DEFAULTS,
  activeExternalEvidenceRecords,
  buildExternalEvidencePrefill,
  calculateExternalEvidenceQuality,
  countExternalEvidenceQuestionsForContext,
  createExternalEvidenceRecord,
  createExternalEvidenceVoidRecord,
  deriveExternalEvidenceViews,
  filterExternalEvidenceViews,
  summarizeExternalEvidence,
  validateExternalEvidenceInput,
  type ExternalEvidenceInput,
  type ExternalEvidenceRecord,
  type ExternalEvidenceTaxonomy,
} from "..";

const taxonomy: ExternalEvidenceTaxonomy = {
  disciplineIds: new Set(["d1", "d2"]),
  topicToDiscipline: new Map([
    ["a1", "d1"],
    ["a2", "d2"],
  ]),
  subtopicToTopic: new Map([
    ["s1", "a1"],
    ["s2", "a2"],
  ]),
};

function input(
  overrides: Partial<ExternalEvidenceInput> = {},
): ExternalEvidenceInput {
  return {
    evidenceType: "aggregate_question_batch",
    source: "qconcursos",
    disciplineId: "d1",
    topicId: "a1",
    subtopicId: "s1",
    syllabusItemId: "s1",
    examiningBoard: "FGV",
    totalQuestions: 20,
    correctAnswers: 14,
    wrongAnswers: 5,
    blankAnswers: 1,
    durationMinutes: 30,
    consultedMaterial: "no",
    perceivedConfidence: "not_informed",
    primaryErrorCause: "not_identified",
    granularity: "aggregate",
    ...overrides,
  };
}

function record(
  evidenceId: string,
  overrides: Partial<ExternalEvidenceInput> = {},
  now = "2026-07-18T12:00:00.000Z",
): ExternalEvidenceRecord {
  const result = createExternalEvidenceRecord({
    input: input(overrides),
    taxonomy,
    now,
    evidenceId,
  });
  if (!result.record)
    throw new Error(JSON.stringify(result.validation.fieldErrors));
  return result.record;
}

describe("external evidence ledger", () => {
  it("creates one aggregate evidence record for one question batch", () => {
    const created = record("e-aggregate");
    expect(created).toMatchObject({
      evidenceId: "e-aggregate",
      evidenceType: "aggregate_question_batch",
      granularity: "aggregate",
      totalQuestions: 20,
      correctAnswers: 14,
      wrongAnswers: 5,
      blankAnswers: 1,
      decisionStatus: "shadow",
      affectsSde: false,
      ledgerAction: "record",
    });
  });

  it("creates an individual evidence without inventing a batch", () => {
    const created = record("e-individual", {
      evidenceType: "individual_question",
      granularity: "individual",
      totalQuestions: 1,
      correctAnswers: 0,
      wrongAnswers: 1,
      blankAnswers: 0,
    });
    expect(created.granularity).toBe("individual");
    expect(created.totalQuestions).toBe(1);
  });

  it("requires correct, wrong and blank answers to equal the total", () => {
    const validation = validateExternalEvidenceInput(
      input({ blankAnswers: 0 }),
      taxonomy,
    );
    expect(validation.valid).toBe(false);
    expect(validation.fieldErrors.counts).toMatch(/somar exatamente/i);
  });

  it("rejects negative values and zero total", () => {
    const negative = validateExternalEvidenceInput(
      input({ wrongAnswers: -1 }),
      taxonomy,
    );
    expect(negative.fieldErrors.wrongAnswers).toMatch(
      /igual ou maior que zero/i,
    );
    const zero = validateExternalEvidenceInput(
      input({
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        blankAnswers: 0,
      }),
      taxonomy,
    );
    expect(zero.fieldErrors.totalQuestions).toMatch(/maior que zero/i);
  });

  it("rejects taxonomy identifiers outside the active hierarchy", () => {
    const validation = validateExternalEvidenceInput(
      input({ disciplineId: "missing", topicId: "a2", subtopicId: "s2" }),
      taxonomy,
    );
    expect(validation.fieldErrors.disciplineId).toBeTruthy();
    expect(validation.fieldErrors.topicId).toBeTruthy();
  });

  it("stores no synthetic question identifiers or per-question order for aggregate batches", () => {
    const created = record("e-no-synthetic");
    expect(Object.keys(created)).not.toContain("questionIds");
    expect(Object.keys(created)).not.toContain("answerOrder");
    expect(Object.keys(created)).not.toContain("individualAttempts");
  });

  it("derives append-only correction status without editing the original", () => {
    const original = record("e-original");
    const replacement = record(
      "e-replacement",
      {
        correctAnswers: 16,
        wrongAnswers: 3,
        supersedesEvidenceId: original.evidenceId,
      },
      "2026-07-18T13:00:00.000Z",
    );
    const ledger = [original, replacement];
    expect(ledger[0]).toBe(original);
    expect(
      deriveExternalEvidenceViews(ledger).map((item) => [
        item.record.evidenceId,
        item.status,
      ]),
    ).toEqual([
      ["e-original", "superseded"],
      ["e-replacement", "active"],
    ]);
  });

  it("appends a void event and preserves the original", () => {
    const original = record("e-to-void");
    const voidEvent = createExternalEvidenceVoidRecord({
      target: original,
      evidenceId: "e-void",
      now: "2026-07-18T14:00:00.000Z",
    });
    const ledger = [original, voidEvent];
    expect(ledger).toHaveLength(2);
    expect(ledger[0]).toEqual(original);
    expect(deriveExternalEvidenceViews(ledger)[0]?.status).toBe("voided");
  });

  it("summary ignores voided events", () => {
    const original = record("e-summary-void");
    const voidEvent = createExternalEvidenceVoidRecord({
      target: original,
      evidenceId: "e-summary-void-action",
    });
    expect(summarizeExternalEvidence([original, voidEvent])).toEqual([]);
  });

  it("summary uses the replacement instead of adding original and correction", () => {
    const original = record("e-summary-original", {
      correctAnswers: 10,
      wrongAnswers: 9,
    });
    const replacement = record("e-summary-replacement", {
      correctAnswers: 18,
      wrongAnswers: 1,
      supersedesEvidenceId: original.evidenceId,
    });
    const summary = summarizeExternalEvidence([original, replacement]);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      totalQuestions: 20,
      correctAnswers: 18,
      wrongAnswers: 1,
      blankAnswers: 1,
    });
  });

  it("filters history by source, discipline and topic", () => {
    const first = record("e-filter-first");
    const second = record("e-filter-second", {
      source: "notebooklm",
      disciplineId: "d2",
      topicId: "a2",
      subtopicId: "s2",
      syllabusItemId: "s2",
    });
    const views = deriveExternalEvidenceViews([first, second]);
    expect(
      filterExternalEvidenceViews(views, { source: "qconcursos" }).map(
        (item) => item.record.evidenceId,
      ),
    ).toEqual(["e-filter-first"]);
    expect(
      filterExternalEvidenceViews(views, {
        disciplineId: "d2",
        topicId: "a2",
      }).map((item) => item.record.evidenceId),
    ).toEqual(["e-filter-second"]);
  });

  it("keeps every new evidence in shadow with affectsSde false", () => {
    expect(record("e-shadow")).toMatchObject({
      decisionStatus: "shadow",
      affectsSde: false,
    });
  });

  it("rejects credentials, tokens, cookies and full external HTML", () => {
    for (const sourceReference of [
      "Authorization: Bearer secret-token",
      "password=hunter2",
      "cookie=session-id",
      "https://example.test/caderno?token=secret",
      "https://user:password@example.test/caderno",
      "<html><body>page</body></html>",
    ]) {
      const validation = validateExternalEvidenceInput(
        input({ sourceReference }),
        taxonomy,
      );
      expect(validation.fieldErrors.sourceReference).toMatch(
        /credenciais|cookies|tokens|HTML/i,
      );
    }
  });

  it("uses useful form defaults and preserves prescription/session prefill", () => {
    expect(EXTERNAL_EVIDENCE_FORM_DEFAULTS).toEqual({
      source: "qconcursos",
      examiningBoard: "FGV",
      consultedMaterial: "no",
      perceivedConfidence: "not_informed",
    });
    expect(
      buildExternalEvidencePrefill({
        prescriptionId: "p1",
        sessionId: "session1",
        disciplineId: "d1",
        topicId: "a1",
        subtopicId: "s1",
        plannedQuestions: 20,
      }),
    ).toMatchObject({
      prescriptionId: "p1",
      sessionId: "session1",
      plannedQuestions: 20,
    });
  });

  it("counts only evidence linked to the correct prescription or guided session", () => {
    const linked = record("e-linked", {
      prescriptionId: "p1",
      sessionId: "session-1",
      actualQuestions: 20,
    });
    const unrelated = record("e-unrelated", {
      prescriptionId: "p2",
      sessionId: "session-2",
      actualQuestions: 20,
    });
    expect(
      countExternalEvidenceQuestionsForContext([linked, unrelated], {
        prescriptionId: "p1",
      }),
    ).toBe(20);
    expect(
      countExternalEvidenceQuestionsForContext([linked, unrelated], {
        sessionId: "session-1",
      }),
    ).toBe(20);
    expect(
      countExternalEvidenceQuestionsForContext([linked, unrelated], {
        prescriptionId: "missing",
        sessionId: "missing",
      }),
    ).toBe(0);
  });

  it("calculates deterministic quality without converting it into mastery", () => {
    const strong = calculateExternalEvidenceQuality(input());
    const consulted = calculateExternalEvidenceQuality(
      input({ consultedMaterial: "yes" }),
    );
    const notebook = calculateExternalEvidenceQuality(
      input({ source: "notebooklm" }),
    );
    expect(strong.authority).toBe("high");
    expect(strong.measurementStrength).toBe("high");
    expect(consulted.effectiveSampleSize).toBeLessThan(
      strong.effectiveSampleSize,
    );
    expect(notebook.measurementStrength).toBe("low");
    expect(strong).not.toHaveProperty("mastery");
  });

  it("returns only active replacement records as effective evidence", () => {
    const original = record("e-effective-original");
    const replacement = record("e-effective-new", {
      supersedesEvidenceId: original.evidenceId,
    });
    expect(
      activeExternalEvidenceRecords([original, replacement]).map(
        (item) => item.evidenceId,
      ),
    ).toEqual(["e-effective-new"]);
  });
});
