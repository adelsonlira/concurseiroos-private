import { describe, expect, it } from "vitest";
import { DATAPREV_2026_PROFILE_3_PACKAGE } from "../../../config/concursos/dataprev-2026-perfil-3";
import {
  analyzeSimulation,
  buildSimulationBlueprint,
  compareSimulationAnalyses,
  composeSimulationPlan,
} from "../simulationEngine";

const source = {
  id: "qconcursos",
  label: "Qconcursos",
  kind: "EXTERNAL_BANK" as const,
  reference: "Plataforma Qconcursos — filtros registrados no plano",
};

describe("simulationEngine", () => {
  const blueprint = buildSimulationBlueprint(DATAPREV_2026_PROFILE_3_PACKAGE);

  it("reproduz exatamente a composição e pontuação oficiais da prova completa", () => {
    const plan = composeSimulationPlan(blueprint, { kind: "FULL", source });

    expect(plan.totalQuestions).toBe(70);
    expect(plan.durationMinutes).toBe(240);
    expect(plan.maximumPoints).toBe(115);
    expect(plan.disciplines.map((item) => item.questionCount)).toEqual([12, 12, 5, 6, 5, 30]);
    expect(plan.disciplines.map((item) => item.pointsPerQuestion)).toEqual([1, 1, 1, 1, 1, 2.5]);
  });

  it("calcula duração proporcional e mantém cotas oficiais no parcial", () => {
    const disciplineIds = blueprint.disciplines.slice(0, 2).map((item) => item.disciplineId);
    const plan = composeSimulationPlan(blueprint, {
      kind: "PARTIAL",
      selectedDisciplineIds: disciplineIds,
      source,
    });

    expect(plan.totalQuestions).toBe(24);
    expect(plan.durationMinutes).toBe(Math.ceil((240 * 24) / 70));
    expect(plan.maximumPoints).toBe(24);
  });

  it("recusa questões locais sem documento e gabarito identificados", () => {
    expect(() =>
      composeSimulationPlan(blueprint, {
        kind: "PARTIAL",
        selectedDisciplineIds: [blueprint.disciplines[0].disciplineId],
        source: {
          id: "local",
          label: "Questões locais",
          kind: "LOCAL_IDENTIFIED_QUESTIONS",
          reference: "Banco local",
        },
        availableQuestions: Array.from({ length: 12 }, (_, index) => ({
          questionId: `q-${index}`,
          disciplineId: blueprint.disciplines[0].disciplineId,
          sourceDocumentId: index === 0 ? undefined : "doc-oficial",
          hasOfficialAnswer: true,
          isCustomQuestion: false,
        })),
      }),
    ).toThrow(/11 questões locais elegíveis/);
  });

  it("seleciona questões locais deterministicamente", () => {
    const discipline = blueprint.disciplines[0];
    const availableQuestions = Array.from({ length: 20 }, (_, index) => ({
      questionId: `q-${String(index).padStart(2, "0")}`,
      disciplineId: discipline.disciplineId,
      sourceDocumentId: "doc-oficial",
      hasOfficialAnswer: true,
      isCustomQuestion: false,
    }));
    const request = {
      kind: "PARTIAL" as const,
      selectedDisciplineIds: [discipline.disciplineId],
      source: {
        id: "local",
        label: "Questões locais",
        kind: "LOCAL_IDENTIFIED_QUESTIONS" as const,
        reference: "Banco local",
      },
      availableQuestions,
      deterministicSeed: "same-seed",
    };

    expect(composeSimulationPlan(blueprint, request).disciplines[0].questionIds).toEqual(
      composeSimulationPlan(blueprint, request).disciplines[0].questionIds,
    );
  });

  it("registra brancos, pontuação oficial e risco de zero sem inferência temática", () => {
    const plan = composeSimulationPlan(blueprint, { kind: "FULL", source });
    const results = plan.disciplines.map((item, index) => ({
      disciplineId: item.disciplineId,
      correct: index === 0 ? 0 : item.questionCount - 1,
      wrong: index === 0 ? item.questionCount - 2 : 1,
      blank: index === 0 ? 2 : 0,
      elapsedSeconds: item.questionCount * 180,
    }));
    const analysis = analyzeSimulation(plan, results);

    expect(analysis.zeroScoreDisciplineIds).toEqual([plan.disciplines[0].disciplineId]);
    expect(analysis.eligibilityStatus).toBe("ZERO_SCORE_DISCIPLINE");
    expect(analysis.totalBlank).toBe(2);
    expect(analysis.correctionPlan[0].priority).toBe("ZERO_SCORE_RISK");
  });

  it("compara apenas planos equivalentes", () => {
    const plan = composeSimulationPlan(blueprint, { kind: "FULL", source });
    const makeAnalysis = (misses: number) =>
      analyzeSimulation(
        plan,
        plan.disciplines.map((item) => ({
          disciplineId: item.disciplineId,
          correct: item.questionCount - misses,
          wrong: misses,
          blank: 0,
          elapsedSeconds: item.questionCount * 180,
        })),
      );
    const comparison = compareSimulationAnalyses(plan, makeAnalysis(1), plan, makeAnalysis(2));

    expect(comparison.comparable).toBe(true);
    expect(comparison.pointsDelta).toBeGreaterThan(0);
  });
});
