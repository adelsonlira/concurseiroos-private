import type {
  Assunto,
  Disciplina,
  EditalConfig,
  Subassunto,
} from "../sde/prioritization/types";
import type { PrivateStudyMaterial } from "../materials/types";
import { SDE_V2_CONFIG, DATAPREV_KNOWLEDGE_GRAPH_V2, validateSdeV2Configuration } from "./config";
import { assessAllKnowledgeStates } from "./knowledgeState";
import { calculateHierarchicalNodeWeights } from "./hierarchicalWeights";
import { buildHistoricalIncidenceSignal, type HistoricalIncidenceSourceRecord } from "./historicalIncidence";
import { prerequisiteStateForTaxonomyNode, validateKnowledgeGraph } from "./knowledgeGraph";
import { selectStudyMethod } from "./methodSelector";
import { buildScoreComponents, evaluateHardRules, scoreFromComponents } from "./scoreEngine";
import type {
  DecisionRecord,
  NormalizedEvidence,
  SdeV2CandidateDecision,
  SdeV2DecisionOutput,
} from "./types";

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function materialAvailableFor(params: {
  materials: readonly PrivateStudyMaterial[];
  disciplineId: string;
  topicId: string;
  subtopicId: string;
}): boolean {
  return params.materials.some((material) =>
    material.disciplineId === params.disciplineId &&
    material.sections.some((section) =>
      section.disciplineId === params.disciplineId &&
      (section.subtopicIds.includes(params.subtopicId) || section.topicId === params.topicId),
    ),
  );
}

function decisionId(referenceDate: string, selected: SdeV2CandidateDecision): string {
  const evidenceSignature = [...selected.evidenceIds].sort().join(",");
  const stable = `${referenceDate}:${selected.nodeId}:${selected.method.method}:${selected.score.toFixed(6)}:${evidenceSignature}:2.0`;
  let hash = 2166136261;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `decision-v2-${referenceDate}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function buildDecisionRecord(params: {
  referenceDate: string;
  selected: SdeV2CandidateDecision;
  candidates: readonly SdeV2CandidateDecision[];
  availableMinutes: number;
}): DecisionRecord {
  return {
    decisionId: decisionId(params.referenceDate, params.selected),
    sdeVersion: "2.0",
    createdAt: `${params.referenceDate}T12:00:00.000Z`,
    referenceDate: params.referenceDate,
    selectedAction: `${params.selected.method.method}:${params.selected.subtopicId}`,
    selectedNodeId: params.selected.nodeId,
    selectedMethod: params.selected.method.method,
    availableMinutes: params.availableMinutes,
    hardRules: params.selected.hardRules,
    scoreComponents: params.selected.scoreComponents,
    evidenceIds: [...params.selected.evidenceIds],
    prerequisiteState: params.selected.prerequisiteState,
    historicalIncidenceShadow: params.selected.historicalIncidenceShadow,
    alternativesConsidered: params.candidates.slice(0, 10).map((candidate) => ({
      nodeId: candidate.nodeId,
      score: candidate.score,
      method: candidate.method.method,
      excludedBy: candidate.hardRules.find((rule) => rule.result === "BLOCKED")?.condition,
    })),
    fallbackUsed: false,
  };
}

export interface SdeV2DecisionInput {
  referenceDate: string;
  examDate: string;
  availableMinutes: number;
  edital: EditalConfig;
  disciplinas: readonly Disciplina[];
  assuntos: readonly Assunto[];
  subassuntos: readonly Subassunto[];
  evidence: readonly NormalizedEvidence[];
  materials: readonly PrivateStudyMaterial[];
  historicalSignals?: readonly HistoricalIncidenceSourceRecord[];
  recentDecisionNodeIds?: readonly string[];
}

export function runSdeV2Decision(input: SdeV2DecisionInput): SdeV2DecisionOutput {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    validateSdeV2Configuration();
    if (!Number.isFinite(input.availableMinutes) || input.availableMinutes <= 0) {
      throw new Error("Tempo disponível deve ser positivo para o SDE v2.");
    }
    const taxonomyIds = new Set(input.subassuntos.map((item) => item.id));
    const graphValidation = validateKnowledgeGraph(DATAPREV_KNOWLEDGE_GRAPH_V2, taxonomyIds);
    if (!graphValidation.valid) throw new Error(graphValidation.errors.join(" "));

    const knowledgeStates = assessAllKnowledgeStates(input.subassuntos.map((item) => item.id), input.evidence);
    const nodeWeights = calculateHierarchicalNodeWeights({
      edital: input.edital,
      disciplinas: input.disciplinas,
      assuntos: input.assuntos,
      subassuntos: input.subassuntos,
    });
    const disciplineMax = Math.max(...Object.values(input.edital.pesosDisciplinas), 1);
    const daysToExam = Math.max(
      0,
      Math.ceil((new Date(`${input.examDate}T00:00:00.000Z`).getTime() - new Date(`${input.referenceDate}T00:00:00.000Z`).getTime()) / 86_400_000),
    );
    const examProximity = clamp(1 - daysToExam / 180);
    const historicalByNode = new Map((input.historicalSignals ?? []).map((item) => [item.nodeId, item] as const));
    const recentCounts = new Map<string, number>();
    for (const nodeId of input.recentDecisionNodeIds ?? []) recentCounts.set(nodeId, (recentCounts.get(nodeId) ?? 0) + 1);

    const disciplineEvidence = new Map<string, { attempts: number; correct: number }>();
    for (const item of input.evidence.filter((evidence) => evidence.decisionEligible && evidence.effectiveSampleSize > 0)) {
      const current = disciplineEvidence.get(item.disciplineId) ?? { attempts: 0, correct: 0 };
      current.attempts += item.totalItems ?? 0;
      current.correct += item.correctItems ?? 0;
      disciplineEvidence.set(item.disciplineId, current);
    }

    const candidates: SdeV2CandidateDecision[] = [];
    for (const subtopic of input.subassuntos) {
      const topic = input.assuntos.find((item) => item.id === subtopic.assuntoId);
      if (!topic) continue;
      const discipline = input.disciplinas.find((item) => item.id === topic.disciplinaId);
      if (!discipline) continue;
      const knowledgeState = knowledgeStates[subtopic.id];
      const weight = nodeWeights[subtopic.id];
      if (!weight) continue;
      const prerequisiteState = prerequisiteStateForTaxonomyNode({
        graph: DATAPREV_KNOWLEDGE_GRAPH_V2,
        taxonomyNodeId: subtopic.id,
        knowledgeStates,
        acceptableRequiredStates: SDE_V2_CONFIG.safeguards.requiredPrerequisiteMinimumState,
      });
      const materialAvailable = materialAvailableFor({
        materials: input.materials,
        disciplineId: discipline.id,
        topicId: topic.id,
        subtopicId: subtopic.id,
      });
      const method = selectStudyMethod({
        knowledgeState,
        prerequisiteBlocked: prerequisiteState.requiredBlocked,
        materialAvailable,
        availableMinutes: input.availableMinutes,
      });
      const estimatedMinutes = method.executionSequence.reduce((sum, step) => sum + step.minutes, 0);
      const disciplineStats = disciplineEvidence.get(discipline.id) ?? { attempts: 0, correct: 0 };
      const eliminationRisk = input.edital.eliminaAoZerarDisciplina
        ? disciplineStats.attempts === 0 || disciplineStats.correct === 0
          ? 1
          : disciplineStats.attempts < 5
            ? 0.7
            : 0
        : 0;
      const recentCount = recentCounts.get(subtopic.id) ?? 0;
      const excessiveRecentRepetition = recentCount >= SDE_V2_CONFIG.safeguards.maxRecentSameNodeSelections;
      const evidenceQuality = clamp(knowledgeState.effectiveSampleSize / SDE_V2_CONFIG.evidence.stableEffectiveSample);
      const coverageGap = knowledgeState.theoryCoverage === "NONE" ? 1 : knowledgeState.theoryCoverage === "PARTIAL" ? 0.5 : 0;
      const expectedReturnPerMinute = clamp(
        ((knowledgeState.weightedAccuracy === null ? 0.65 : 1 - knowledgeState.weightedAccuracy) + coverageGap * 0.5) /
          Math.max(1, estimatedMinutes / 30),
      );
      const historical = buildHistoricalIncidenceSignal(subtopic.id, historicalByNode.get(subtopic.id));
      const hardRules = evaluateHardRules({
        inActiveSyllabus: true,
        eliminationRisk,
        reviewUrgent: knowledgeState.reviewPending,
        requiredPrerequisiteBlocked: prerequisiteState.requiredBlocked,
        availableMinutes: input.availableMinutes,
        estimatedMinutes,
        materialAvailable,
        evidenceSufficientForMethod: knowledgeState.effectiveSampleSize >= SDE_V2_CONFIG.evidence.minimumEffectiveSample,
        excessiveRecentRepetition,
        nodeId: subtopic.id,
      });
      const scoreComponents = buildScoreComponents({
        officialWeightNormalized: clamp(weight.effectiveNodeWeight / disciplineMax),
        knowledgeState,
        coverageGap,
        eliminationRisk,
        reviewUrgency: knowledgeState.reviewPending ? 1 : 0,
        prerequisiteValue: prerequisiteState.recommendedNodeIds.length > 0 || prerequisiteState.requiredBlocked ? 1 : 0,
        transferValue: prerequisiteState.transferValue,
        evidenceQuality,
        examProximity,
        expectedReturnPerMinute,
        materialAvailable,
        recentDiversity: recentCount === 0 ? 1 : recentCount === 1 ? 0.5 : 0,
        historicalIncidenceShadow: historical,
      });
      const blocked = hardRules.some((rule) => rule.result === "BLOCKED");
      const score = blocked ? 0 : scoreFromComponents(scoreComponents);
      candidates.push({
        nodeId: subtopic.id,
        disciplineId: discipline.id,
        topicId: topic.id,
        subtopicId: subtopic.id,
        disciplineName: discipline.nome,
        topicName: topic.nome,
        subtopicName: subtopic.nome,
        score,
        hardRules,
        scoreComponents,
        knowledgeState,
        prerequisiteState,
        method,
        historicalIncidenceShadow: historical,
        availableMinutes: input.availableMinutes,
        estimatedMinutes,
        materialAvailable,
        evidenceIds: [...knowledgeState.evidenceIds],
      });
    }

    candidates.sort((left, right) =>
      right.score - left.score || left.nodeId.localeCompare(right.nodeId),
    );
    const selected = candidates.find((candidate) => candidate.score > 0) ?? null;
    if (!selected) {
      return {
        status: "NO_EXECUTABLE_ACTION",
        selected: null,
        candidates,
        normalizedEvidence: [...input.evidence],
        knowledgeStates,
        nodeWeights,
        decisionRecord: null,
        errors: ["Nenhuma ação do SDE v2 passou simultaneamente pelos portões de segurança."],
        warnings,
      };
    }
    warnings.push("Inferência histórica em validação — shadow mode; decisionWeight = 0.");
    return {
      status: "SUCCESS",
      selected,
      candidates,
      normalizedEvidence: [...input.evidence],
      knowledgeStates,
      nodeWeights,
      decisionRecord: buildDecisionRecord({
        referenceDate: input.referenceDate,
        selected,
        candidates,
        availableMinutes: input.availableMinutes,
      }),
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Falha desconhecida no SDE v2.");
    return {
      status: "INVALID_INPUT",
      selected: null,
      candidates: [],
      normalizedEvidence: [...input.evidence],
      knowledgeStates: {},
      nodeWeights: {},
      decisionRecord: null,
      errors,
      warnings,
    };
  }
}
