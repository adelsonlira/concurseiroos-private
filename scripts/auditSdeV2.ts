import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import packageMetadata from "../package.json";
import { buildDataprev2026Profile3AppSeed } from "../src/config/concursos/dataprev-2026-perfil-3/index";
import { createExternalEvidenceRecord } from "../src/core/externalEvidence/ledger";
import type { ExternalEvidenceTaxonomy } from "../src/core/externalEvidence/types";
import { DATAPREV_KNOWLEDGE_GRAPH_V2, validateSdeV2Configuration } from "../src/core/sde-v2/config";
import { countDecisionEligibleEvidence } from "../src/core/sde-v2/evidenceAdapter";
import { validateKnowledgeGraph } from "../src/core/sde-v2/knowledgeGraph";
import { runCompetitionDecisionForDate, runCompetitionDecisionForDateV1 } from "../src/integrations/sde/competitionDecisionAdapter";

const referenceDate = "2026-07-13";
const seed = buildDataprev2026Profile3AppSeed();
const subtopic = seed.subassuntos[0];
const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId);
if (!topic) throw new Error("Assunto da amostra SDE v2 não encontrado.");
const taxonomy: ExternalEvidenceTaxonomy = {
  disciplineIds: new Set(seed.disciplinas.map((item) => item.id)),
  topicToDiscipline: new Map(seed.assuntos.map((item) => [item.id, item.disciplinaId] as const)),
  subtopicToTopic: new Map(seed.subassuntos.map((item) => [item.id, item.assuntoId] as const)),
};
const created = createExternalEvidenceRecord({
  evidenceId: "audit-sde-v2-evidence-1",
  now: "2026-07-12T12:00:00.000Z",
  taxonomy,
  input: {
    evidenceType: "aggregate_question_batch",
    source: "qconcursos",
    disciplineId: topic.disciplinaId,
    topicId: topic.id,
    subtopicId: subtopic.id,
    syllabusItemId: subtopic.id,
    examiningBoard: "FGV",
    totalQuestions: 20,
    correctAnswers: 12,
    wrongAnswers: 7,
    blankAnswers: 1,
    durationMinutes: 30,
    consultedMaterial: "no",
    perceivedConfidence: "not_informed",
    primaryErrorCause: "application",
    granularity: "aggregate",
  },
});
if (!created.record) throw new Error(JSON.stringify(created.validation.fieldErrors));

validateSdeV2Configuration();
const graphValidation = validateKnowledgeGraph(
  DATAPREV_KNOWLEDGE_GRAPH_V2,
  new Set(seed.subassuntos.map((item) => item.id)),
);
seed.configuracao.activeSdeVersion = "v1";
const snapshot = {
  configuracao: seed.configuracao,
  subassuntos: seed.subassuntos,
  tentativasQuestoes: [],
  sessoesEstudo: [],
  flashcards: [],
  cronogramasRevisao: [],
  externalEvidenceLedger: [created.record],
  simulados: [],
  questoes: [],
  decisionLedger: [],
};
const v1 = runCompetitionDecisionForDateV1(snapshot, referenceDate);
const v2 = runCompetitionDecisionForDate(snapshot, referenceDate);
const fallback = runCompetitionDecisionForDate(snapshot, "2026-07-12");
const eligibleEvidence = v2.v2 ? countDecisionEligibleEvidence(v2.v2.output.normalizedEvidence) : 0;
const selected = v2.v2?.output.selected ?? null;
const failures: string[] = [];
if (!graphValidation.valid) failures.push(...graphValidation.errors);
if (v2.status !== "SUCCESS" || v2.sdeVersionUsed !== "1.0" || v2.executionMode !== "shadow" || v2.affectsPrescription !== false || !selected) failures.push("SDE v2 shadow não executou em paralelo com o SDE v1 efetivo.");
if (eligibleEvidence !== 1) failures.push(`Esperada 1 evidência elegível; obtidas ${eligibleEvidence}.`);
if (selected?.historicalIncidenceShadow.decisionWeight !== 0) failures.push("Incidência histórica recebeu peso decisório diferente de zero.");
if (fallback.calibrationRecord?.fallbackUsed !== true || fallback.sdeVersionUsed !== "1.0") failures.push("Fallback do comparador shadow não foi observado.");
if (!v2.v2?.decisionRecord) failures.push("Ledger de decisão SDE v2 não foi produzido.");
if (!v2.calibrationRecord) failures.push("Ledger de calibração v1 × v2 não foi produzido.");
if (v2.prescription?.current?.id !== v1.prescription?.current?.id) failures.push("A prescrição efetiva divergiu do SDE v1.");

const report = {
  schemaVersion: "1.1.0",
  projectVersion: packageMetadata.version,
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "PASS" : "FAIL",
  graph: {
    version: DATAPREV_KNOWLEDGE_GRAPH_V2.version,
    nodes: DATAPREV_KNOWLEDGE_GRAPH_V2.nodes.length,
    relations: DATAPREV_KNOWLEDGE_GRAPH_V2.edges.length,
    valid: graphValidation.valid,
    requiredCycles: graphValidation.requiredCyclePaths.length,
  },
  evidence: {
    sourceRecords: 1,
    normalizedRecords: v2.v2?.output.normalizedEvidence.length ?? 0,
    eligibleRecords: eligibleEvidence,
    aggregateExpandedIntoSyntheticAttempts: false,
  },
  activation: {
    activeSdeVersion: v2.activeSdeVersion ?? null,
    effectiveSdeVersion: v2.sdeVersionUsed ?? null,
    executionMode: v2.executionMode ?? null,
    affectsPrescription: v2.affectsPrescription ?? null,
  },
  comparison: {
    v1Status: v1.status,
    v1SelectedNode: v1.actions[0]?.subassuntoId ?? null,
    v1SelectedActivity: v1.actions[0]?.tipo ?? null,
    v2Status: v2.status,
    v2SelectedNode: selected?.subtopicId ?? null,
    v2SelectedMethod: selected?.method.method ?? null,
    sameNode: v2.v2?.comparisonWithV1.sameNode ?? null,
    sameActivity: v2.v2?.comparisonWithV1.sameActivity ?? null,
    divergenceReasons: v2.v2?.comparisonWithV1.divergenceReasons ?? [],
    divergences: v2.calibrationRecord?.divergences ?? [],
    isEqual: v2.calibrationRecord?.isEqual ?? null,
  },
  decision: {
    sdeVersion: v2.v2?.decisionRecord?.sdeVersion ?? null,
    score: selected?.score ?? null,
    hardRules: selected?.hardRules.length ?? 0,
    scoreComponents: selected?.scoreComponents.length ?? 0,
    historicalIncidenceDecisionWeight: selected?.historicalIncidenceShadow.decisionWeight ?? null,
    decisionRecordId: v2.v2?.decisionRecord?.decisionId ?? null,
  },
  fallback: {
    scenariosObserved: fallback.calibrationRecord?.fallbackUsed ? 1 : 0,
    reason: fallback.calibrationRecord?.fallbackReason ?? null,
    selectedVersion: fallback.sdeVersionUsed ?? null,
  },
  futurePromotionCriteria: {
    decisionsCompared: v2.calibrationRecord ? 1 : 0,
    decisionsWithDivergence: v2.calibrationRecord && !v2.calibrationRecord.isEqual ? 1 : 0,
    topicDivergences: v2.calibrationRecord?.divergences.filter((item) => item.field === "topic").length ?? 0,
    methodDivergences: v2.calibrationRecord?.divergences.filter((item) => item.field === "method").length ?? 0,
    fallbacks: fallback.calibrationRecord?.fallbackUsed ? 1 : 0,
    invalidDecisions: v2.v2?.output.status === "INVALID_INPUT" ? 1 : 0,
    prerequisiteCases: selected && (selected.prerequisiteState.requiredBlocked || selected.prerequisiteState.recommendedNodeIds.length > 0) ? 1 : 0,
    materialAvailable: selected?.materialAvailable ?? false,
    sessionOutcomeEvaluable: false,
    automaticPromotionEnabled: false,
  },
  failures,
};
const output = resolve("data/quality/sde-v2-audit-report.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (failures.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(`SDE v2 shadow audit PASS: ${report.graph.relations} relation(s), ${eligibleEvidence} eligible evidence(s), ${report.fallback.scenariosObserved} fallback(s).`);
