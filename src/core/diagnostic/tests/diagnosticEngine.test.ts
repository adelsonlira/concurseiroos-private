import { describe, expect, it } from "vitest";
import { buildEvidenceCoverageReport } from "../diagnosticEngine";

const disciplines = [
  { id: "d-specific", nome: "Específicos", officialMaxPoints: 75, ordem: 2 },
  { id: "d-general", nome: "Português", officialMaxPoints: 12, ordem: 1 }
];
const topics = [
  { id: "t-specific", disciplinaId: "d-specific", nome: "Desenvolvimento", ordem: 1 },
  { id: "t-general", disciplinaId: "d-general", nome: "Português", ordem: 1 }
];
const subtopics = [
  { id: "s-new", assuntoId: "t-specific", nome: "Novo", ordem: 1, completado: false },
  { id: "s-theory", assuntoId: "t-specific", nome: "Teoria", ordem: 2, completado: true },
  { id: "s-error", assuntoId: "t-general", nome: "Erro", ordem: 1, completado: true },
  { id: "s-repeat", assuntoId: "t-general", nome: "Repetido", ordem: 2, completado: true }
];

describe("diagnostic evidence coverage", () => {
  it("separates absence of evidence, theory-only, active error and repeated evidence", () => {
    const report = buildEvidenceCoverageReport({
      generatedAt: "2026-07-13T12:00:00.000Z",
      disciplines,
      topics,
      subtopics,
      attempts: [
        {
          id: "e1",
          disciplinaId: "d-general",
          assuntoId: "t-general",
          subassuntoId: "s-error",
          acertou: false,
          respondidaEm: "2026-07-10T10:00:00.000Z"
        },
        {
          id: "r1",
          disciplinaId: "d-general",
          assuntoId: "t-general",
          subassuntoId: "s-repeat",
          acertou: true,
          respondidaEm: "2026-07-10T10:00:00.000Z"
        },
        {
          id: "r2",
          disciplinaId: "d-general",
          assuntoId: "t-general",
          subassuntoId: "s-repeat",
          acertou: false,
          respondidaEm: "2026-07-11T10:00:00.000Z"
        },
        {
          id: "r3",
          disciplinaId: "d-general",
          assuntoId: "t-general",
          subassuntoId: "s-repeat",
          acertou: true,
          respondidaEm: "2026-07-12T10:00:00.000Z"
        },
        {
          id: "r4",
          disciplinaId: "d-general",
          assuntoId: "t-general",
          subassuntoId: "s-repeat",
          acertou: true,
          respondidaEm: "2026-07-13T10:00:00.000Z"
        }
      ],
      reviewSchedules: []
    });

    expect(report.countsByState.NO_LEARNING_EVIDENCE).toBe(1);
    expect(report.countsByState.THEORY_WITHOUT_RETRIEVAL).toBe(1);
    expect(report.countsByState.ACTIVE_ERROR).toBe(1);
    expect(report.countsByState.RECOVERY_REPEATED).toBe(1);
    expect(report.descriptiveCoverage.withQuestionEvidence).toBe(2);
    expect(report.descriptiveCoverage.activeErrorWithoutRecovery).toBe(1);
  });

  it("treats independent reviews as retrieval evidence without inventing question accuracy", () => {
    const report = buildEvidenceCoverageReport({
      generatedAt: "2026-07-13T12:00:00.000Z",
      disciplines,
      topics,
      subtopics: [subtopics[1]],
      attempts: [],
      reviewSchedules: [
        {
          id: "rev",
          disciplinaId: "d-specific",
          assuntoId: "t-specific",
          subassuntoId: "s-theory",
          desabilitada: false,
          historicoTentativas: [
            { revisadoEm: "2026-07-10T10:00:00.000Z", recuperacaoIndependente: true },
            { revisadoEm: "2026-07-12T10:00:00.000Z", recuperacaoIndependente: true }
          ]
        }
      ]
    });

    const profile = report.profiles[0];
    expect(profile.state).toBe("REPEATED_RETRIEVAL_EVIDENCE");
    expect(profile.observedAccuracy).toBeNull();
    expect(report.descriptiveCoverage.withQuestionEvidence).toBe(0);
  });

  it("orders active errors before diagnostics and uses official discipline points only as a transparent tie-break", () => {
    const report = buildEvidenceCoverageReport({
      generatedAt: "2026-07-13T12:00:00.000Z",
      disciplines,
      topics,
      subtopics,
      attempts: [
        {
          id: "e1",
          disciplinaId: "d-general",
          assuntoId: "t-general",
          subassuntoId: "s-error",
          acertou: false,
          respondidaEm: "2026-07-10T10:00:00.000Z"
        }
      ],
      reviewSchedules: []
    });

    expect(report.roadmap[0]).toMatchObject({ kind: "RECOVERY", subassuntoId: "s-error" });
    expect(report.roadmap[1]).toMatchObject({ kind: "DIAGNOSTIC_QUESTIONS", subassuntoId: "s-theory" });
    expect(report.roadmap.find((item) => item.subassuntoId === "s-new")).toMatchObject({
      kind: "NEW_CONTENT"
    });
  });

  it("does not mutate source collections", () => {
    const input = {
      generatedAt: "2026-07-13T12:00:00.000Z",
      disciplines: structuredClone(disciplines),
      topics: structuredClone(topics),
      subtopics: structuredClone(subtopics),
      attempts: [],
      reviewSchedules: []
    };
    const before = structuredClone(input);
    buildEvidenceCoverageReport(input);
    expect(input).toEqual(before);
  });
});
