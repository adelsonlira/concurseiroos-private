import fs from "node:fs";
import path from "node:path";
import { DATAPREV_2026_PROFILE_3_PACKAGE } from "../src/config/concursos/dataprev-2026-perfil-3";
import {
  analyzeSimulation,
  buildSimulationBlueprint,
  composeSimulationPlan,
} from "../src/core/simulations/simulationEngine";
import { SIMULATION_POLICY_VERSION } from "../src/core/simulations/types";

const blueprint = buildSimulationBlueprint(DATAPREV_2026_PROFILE_3_PACKAGE);
const source = {
  id: "audit-external-source",
  label: "Fonte externa identificada",
  kind: "EXTERNAL_BANK" as const,
  reference: "Fonte de auditoria sem conteúdo incorporado",
};
const fullPlan = composeSimulationPlan(blueprint, { kind: "FULL", source });
const partialPlan = composeSimulationPlan(blueprint, {
  kind: "PARTIAL",
  selectedDisciplineIds: blueprint.disciplines.slice(0, 2).map((item) => item.disciplineId),
  source,
});
const sampleAnalysis = analyzeSimulation(
  fullPlan,
  fullPlan.disciplines.map((discipline, index) => ({
    disciplineId: discipline.disciplineId,
    correct: index === 0 ? 0 : discipline.questionCount - 1,
    wrong: index === 0 ? discipline.questionCount - 1 : 1,
    blank: index === 0 ? 1 : 0,
    elapsedSeconds: discipline.questionCount * 180,
  })),
);

const errors: string[] = [];
if (fullPlan.totalQuestions !== 70) errors.push("Simulado completo não possui 70 questões.");
if (fullPlan.maximumPoints !== 115) errors.push("Simulado completo não possui 115 pontos.");
if (fullPlan.durationMinutes !== 240) errors.push("Simulado completo não possui 240 minutos.");
if (fullPlan.disciplines.some((item) => item.questionIds.length > 0)) {
  errors.push("Fonte externa não pode criar IDs de questões locais.");
}
if (partialPlan.kind !== "PARTIAL" || partialPlan.disciplines.length !== 2) {
  errors.push("Composição parcial inválida.");
}
if (sampleAnalysis.eligibilityStatus !== "ZERO_SCORE_DISCIPLINE") {
  errors.push("Regra de zero por disciplina não foi detectada.");
}
if (sampleAnalysis.correctionPlan[0]?.priority !== "ZERO_SCORE_RISK") {
  errors.push("Correção não priorizou o risco eliminatório.");
}

const report = {
  schemaVersion: "1.0.0",
  policyVersion: SIMULATION_POLICY_VERSION,
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? "PASS" : "FAIL",
  blueprint: {
    competitionId: blueprint.competitionId,
    officialDocument: blueprint.officialDocument,
    disciplines: blueprint.disciplines.length,
    totalQuestions: fullPlan.totalQuestions,
    maximumPoints: fullPlan.maximumPoints,
    durationMinutes: fullPlan.durationMinutes,
    minimumTotalPoints: fullPlan.minimumTotalPoints,
    eliminatesOnZeroDiscipline: fullPlan.eliminatesOnZeroDiscipline,
  },
  safeguards: {
    identifiedSourceRequired: true,
    generatedQuestionsAllowed: false,
    generatedAnswerKeysAllowed: false,
    historicalIncidenceChanged: false,
    sdeRankingChangedByAggregateResult: false,
    blanksRecordedSeparately: true,
    partialGlobalEligibilityEvaluated: false,
  },
  sample: {
    zeroScoreDisciplineIds: sampleAnalysis.zeroScoreDisciplineIds,
    correctionPriority: sampleAnalysis.correctionPlan[0]?.priority ?? null,
  },
  errors,
};

const outputPath = path.resolve("data/quality/simulation-contract.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
