/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Assunto,
  ConstraintCheck,
  Disciplina,
  EditalConfig,
  EliminationRiskPolicy,
  EvidenciasCandidato,
  KnowledgeAssessment,
  KnowledgeGraph,
  KnowledgeState,
  LearningLeveragePolicy,
  MarginalReturnEstimate,
  OpportunityCostPolicy,
  OpportunityCostResult,
  SDEDiagnosis,
  StrategicAction,
  Subassunto,
  TimeHorizon
} from "./types";
import {
  calculateComparativeOpportunityCost,
  calculateOpportunityCost
} from "./opportunityCost";
import { evaluateConstraints } from "./constraints";
import {
  assessAssunto,
  assessDisciplina,
  assessSubassunto,
  calculatePriorityScore,
  DisciplinaAssessment,
  getReferenceDate,
  ScoreBreakdown
} from "./priorityScore";
import { generateStrategicAction } from "./recommendation";
import { validateSDEInputs } from "../validation/validator";

export interface PriorityEngineInputs {
  diagnosis: SDEDiagnosis;
  knowledgeGraph: KnowledgeGraph;
  edital: EditalConfig;
  timeHorizon: TimeHorizon;
  history: EvidenciasCandidato;
  disciplinas: Disciplina[];
  assuntos: Assunto[];
  subassuntos: Subassunto[];
  names: {
    disciplinas: { [id: string]: string };
    assuntos: { [id: string]: string };
    subassuntos: { [id: string]: string };
  };
  assuntoToDisciplina: { [assuntoId: string]: string };
  subassuntoToAssunto: { [subassuntoId: string]: string };
  assuntoToSubassuntos: { [assuntoId: string]: string[] };
  policy: EliminationRiskPolicy;
  opportunityCostPolicy: OpportunityCostPolicy;
  learningLeveragePolicy: LearningLeveragePolicy;
  /**
   * Optional duration observations supplied by an external planner or user history.
   * Keys follow the deterministic action id format used by buildActionId.
   */
  estimatedDurationMinutesByAction?: { [actionId: string]: number };
}

const TIER_ORDER = {
  RISCO_ELIMINACAO: 1,
  LACUNAS_ALTO_PESO: 2,
  RETORNO_ESPERADO: 3,
  PROTECAO_MEMORIA: 4,
  EXPANSAO_EDITAL: 5,
  MANUTENCAO_EXCELENCIA: 6
} as const;

type ActivityType = "teoria" | "questoes" | "revisao" | "flashcards" | "simulado";

export function buildActionId(params: {
  disciplinaId: string;
  assuntoId: string;
  subassuntoId?: string;
  tipo: ActivityType;
}): string {
  return `${params.disciplinaId}-${params.assuntoId}-${params.subassuntoId ?? "geral"}-${params.tipo}`;
}

interface RawCandidate {
  disciplinaId: string;
  assuntoId: string;
  subassuntoId?: string;
  tipo: ActivityType;
}

interface EligibleCandidate extends RawCandidate {
  id: string;
  scoreBreakdown: ScoreBreakdown;
  estimatedDurationMinutes: number | null;
  disciplinaNome: string;
  assuntoNome: string;
  subassuntoNome?: string;
  individualOpportunityCost: OpportunityCostResult;
  hitRate: number | null;
  questionsCount: number;
  diagnosticPurpose: boolean;
  reasonCode: string;
  constraintChecks: ConstraintCheck[];
  disciplineSafetyCoverageFront?: boolean;
}

interface EvaluatedCandidate {
  candidate: EligibleCandidate;
  opportunityCostResult: OpportunityCostResult;
  marginalReturnEstimate: MarginalReturnEstimate;
}

function buildMarginalReturnEstimate(): MarginalReturnEstimate {
  return {
    status: "INSUFFICIENT_DATA",
    expectedNetPointsPerHour: null,
    confidence: null,
    evidence: [],
    missingData: [
      "episodiosDeAprendizagem",
      "duracaoDaAtividade",
      "desempenhoAntes",
      "desempenhoDepois"
    ]
  };
}

function zeroSafetySeverity(status: ScoreBreakdown["disciplineZeroSafetyStatus"]): number {
  switch (status) {
    case "NO_CORRECT_ANSWER": return 0;
    case "UNASSESSED": return 1;
    case "MINIMUM_EVIDENCE": return 2;
    default: return 3;
  }
}

function prioritizeNoZeroDisciplineCoverage(
  items: EvaluatedCandidate[],
  edital: EditalConfig
): EvaluatedCandidate[] {
  if (edital.eliminaAoZerarDisciplina !== true) return items;

  const representatives = new Map<string, EvaluatedCandidate>();
  for (const item of items) {
    const status = item.candidate.scoreBreakdown.disciplineZeroSafetyStatus;
    if (status === "NOT_APPLICABLE" || status === "PROTECTED") continue;
    if (!representatives.has(item.candidate.disciplinaId)) {
      representatives.set(item.candidate.disciplinaId, item);
    }
  }

  const safetyFront = [...representatives.values()].sort((left, right) => {
    const leftBreakdown = left.candidate.scoreBreakdown;
    const rightBreakdown = right.candidate.scoreBreakdown;
    return (
      zeroSafetySeverity(leftBreakdown.disciplineZeroSafetyStatus) -
        zeroSafetySeverity(rightBreakdown.disciplineZeroSafetyStatus) ||
      leftBreakdown.disciplineSampleSize - rightBreakdown.disciplineSampleSize ||
      rightBreakdown.finalScore - leftBreakdown.finalScore ||
      left.candidate.disciplinaId.localeCompare(right.candidate.disciplinaId)
    );
  });

  if (safetyFront.length === 0) return items;
  for (const item of safetyFront) {
    item.candidate.disciplineSafetyCoverageFront = true;
  }
  const frontIds = new Set(safetyFront.map((item) => item.candidate.id));
  return [...safetyFront, ...items.filter((item) => !frontIds.has(item.candidate.id))];
}

export function generateStrategicActions(inputs: PriorityEngineInputs): StrategicAction[] {
  const {
    diagnosis,
    knowledgeGraph,
    edital,
    timeHorizon,
    history,
    disciplinas,
    assuntos,
    subassuntos,
    names,
    assuntoToDisciplina,
    subassuntoToAssunto,
    assuntoToSubassuntos,
    policy,
    opportunityCostPolicy,
    learningLeveragePolicy,
    estimatedDurationMinutesByAction
  } = inputs;

  validateSDEInputs({
    edital,
    diagnosis,
    history,
    knowledgeGraph,
    timeHorizon,
    disciplinas,
    assuntos,
    subassuntos,
    assuntoToDisciplina,
    subassuntoToAssunto,
    assuntoToSubassuntos,
    policy,
    opportunityCostPolicy,
    learningLeveragePolicy,
    estimatedDurationMinutesByAction
  });

  const referenceDate = getReferenceDate(timeHorizon);
  const subAssessmentMap: Record<string, KnowledgeAssessment> = {};
  const assuntoAssessmentMap: Record<string, KnowledgeAssessment> = {};
  const disciplinaAssessmentMap: Record<string, DisciplinaAssessment> = {};

  for (const subassunto of subassuntos) {
    subAssessmentMap[subassunto.id] = assessSubassunto(
      subassunto.id,
      history,
      referenceDate
    );
  }

  for (const assunto of assuntos) {
    assuntoAssessmentMap[assunto.id] = assessAssunto(
      assunto.id,
      assuntoToSubassuntos[assunto.id],
      history,
      referenceDate
    );
  }

  for (const disciplina of disciplinas) {
    const disciplinaAssuntos = assuntos
      .filter((assunto) => assunto.disciplinaId === disciplina.id)
      .map((assunto) => assunto.id);
    disciplinaAssessmentMap[disciplina.id] = assessDisciplina(
      disciplina.id,
      disciplinaAssuntos,
      assuntoToSubassuntos,
      edital,
      history,
      referenceDate
    );
  }

  const rawCandidates: RawCandidate[] = [];
  for (const assunto of assuntos) {
    const disciplinaId = assuntoToDisciplina[assunto.id];
    const generalTypes: ActivityType[] = ["teoria", "questoes", "revisao"];
    for (const tipo of generalTypes) {
      rawCandidates.push({ disciplinaId, assuntoId: assunto.id, tipo });
    }

    for (const subassuntoId of assuntoToSubassuntos[assunto.id]) {
      const subTypes: ActivityType[] = ["teoria", "questoes", "revisao"];
      for (const tipo of subTypes) {
        rawCandidates.push({
          disciplinaId,
          assuntoId: assunto.id,
          subassuntoId,
          tipo
        });
      }
      const evidence = history.porSubassunto[subassuntoId];
      if (evidence && evidence.flashcardsDisponiveis > 0) {
        rawCandidates.push({
          disciplinaId,
          assuntoId: assunto.id,
          subassuntoId,
          tipo: "flashcards"
        });
      }
    }
  }

  const eligibleCandidates: EligibleCandidate[] = [];

  for (const candidate of rawCandidates) {
    const {
      disciplinaId,
      assuntoId,
      subassuntoId,
      tipo
    } = candidate;
    const actionId = buildActionId(candidate);
    const estimatedDurationMinutes =
      estimatedDurationMinutesByAction?.[actionId] ?? null;
    const individualOpportunityCost = calculateOpportunityCost(
      estimatedDurationMinutes
    );

    const subAssessment = subassuntoId
      ? subAssessmentMap[subassuntoId]
      : undefined;
    const assuntoAssessment = assuntoAssessmentMap[assuntoId];
    const disciplinaAssessment = disciplinaAssessmentMap[disciplinaId];
    const assessment = subAssessment ?? assuntoAssessment;
    const knowledgeState = assessment.state as KnowledgeState;
    const evidence = subassuntoId
      ? history.porSubassunto[subassuntoId]
      : undefined;

    const veto = evaluateConstraints({
      disciplinaId,
      assuntoId,
      subassuntoId,
      tipo,
      edital,
      diagnosis,
      knowledgeGraph,
      timeHorizon,
      knowledgeState,
      flashcardsCount: evidence?.flashcardsDisponiveis ?? 0,
      hitRate: assessment.hitRate,
      assuntoToDisciplina,
      subassuntoToAssunto,
      history,
      subAssessment,
      assAssessment: assuntoAssessment
    });

    if (veto.isVetoed) continue;

    const scoreBreakdown = calculatePriorityScore(
      disciplinaId,
      assuntoId,
      subassuntoId,
      tipo,
      edital,
      diagnosis,
      history,
      knowledgeGraph,
      timeHorizon,
      assuntoToDisciplina,
      assuntoToSubassuntos,
      policy,
      veto.diagnosticPurpose ?? false,
      learningLeveragePolicy,
      subAssessment,
      assuntoAssessment,
      disciplinaAssessment
    );

    eligibleCandidates.push({
      ...candidate,
      id: actionId,
      scoreBreakdown,
      estimatedDurationMinutes,
      disciplinaNome: names.disciplinas[disciplinaId] ?? disciplinaId,
      assuntoNome: names.assuntos[assuntoId] ?? assuntoId,
      subassuntoNome: subassuntoId
        ? names.subassuntos[subassuntoId] ?? subassuntoId
        : undefined,
      individualOpportunityCost,
      hitRate: assessment.hitRate,
      questionsCount: assessment.sampleSize,
      diagnosticPurpose: veto.diagnosticPurpose ?? false,
      reasonCode: veto.reasonCode ?? "NOT_ELIGIBLE",
      constraintChecks: veto.checksPerformed
    });
  }

  const comparableActions = eligibleCandidates.map((candidate) => ({
    id: candidate.id,
    finalScore: candidate.scoreBreakdown.finalScore,
    name: candidate.subassuntoNome ?? candidate.assuntoNome,
    estimatedDurationMinutes: candidate.estimatedDurationMinutes,
    tier: candidate.scoreBreakdown.camadaConstitucional
  }));

  const evaluated: EvaluatedCandidate[] = eligibleCandidates.map((candidate) => ({
    candidate,
    opportunityCostResult: calculateComparativeOpportunityCost({
      actionId: candidate.id,
      actionValue: candidate.scoreBreakdown.finalScore,
      estimatedDurationMinutes: candidate.estimatedDurationMinutes,
      tier: candidate.scoreBreakdown.camadaConstitucional,
      eligibleActions: comparableActions,
      policy: opportunityCostPolicy
    }),
    marginalReturnEstimate: buildMarginalReturnEstimate()
  }));

  evaluated.sort((left, right) => {
    const tierDifference =
      TIER_ORDER[left.candidate.scoreBreakdown.camadaConstitucional] -
      TIER_ORDER[right.candidate.scoreBreakdown.camadaConstitucional];
    if (tierDifference !== 0) return tierDifference;

    const scoreDifference =
      right.candidate.scoreBreakdown.finalScore -
      left.candidate.scoreBreakdown.finalScore;
    if (scoreDifference !== 0) return scoreDifference;

    return left.candidate.id.localeCompare(right.candidate.id);
  });

  const orderedEvaluated = prioritizeNoZeroDisciplineCoverage(evaluated, edital);

  const tieCounts = new Map<string, number>();
  for (const item of orderedEvaluated) {
    const key = `${item.candidate.scoreBreakdown.camadaConstitucional}|${item.candidate.scoreBreakdown.finalScore.toFixed(12)}`;
    tieCounts.set(key, (tieCounts.get(key) ?? 0) + 1);
  }

  return orderedEvaluated.map((item, index) => {
    const candidate = item.candidate;
    return generateStrategicAction({
      prioridade: index + 1,
      scoreBreakdown: candidate.scoreBreakdown,
      // Legacy compatibility field. Zero means no duration was supplied.
      tempoEstimadoMinutos: candidate.estimatedDurationMinutes ?? 0,
      estimatedDurationMinutes: candidate.estimatedDurationMinutes,
      disciplinaId: candidate.disciplinaId,
      disciplinaNome: candidate.disciplinaNome,
      assuntoId: candidate.assuntoId,
      assuntoNome: candidate.assuntoNome,
      subassuntoId: candidate.subassuntoId,
      subassuntoNome: candidate.subassuntoNome,
      tipo: candidate.tipo,
      hitRate: candidate.hitRate,
      questionsCount: candidate.questionsCount,
      bancaName: edital.banca,
      diagnosticPurpose: candidate.diagnosticPurpose,
      constraintChecks: candidate.constraintChecks,
      opportunityCostResult: item.opportunityCostResult,
      reasonCode: candidate.reasonCode,
      eliminationRiskResult: candidate.scoreBreakdown.elimRiskResult,
      marginalReturnEstimate: item.marginalReturnEstimate,
      disciplineSafetyCoverageFront: candidate.disciplineSafetyCoverageFront === true,
      rankingContext: (() => {
        const key = `${candidate.scoreBreakdown.camadaConstitucional}|${candidate.scoreBreakdown.finalScore.toFixed(12)}`;
        const tiedActionCount = tieCounts.get(key) ?? 1;
        return {
          tiedActionCount,
          isTied: tiedActionCount > 1,
          tieBreakRule:
            tiedActionCount > 1 ? "DETERMINISTIC_ACTION_ID" as const : null,
          note:
            tiedActionCount > 1
              ? `Existem ${tiedActionCount} ações com a mesma camada constitucional e o mesmo score. A ordem entre elas é um desempate operacional determinístico e não demonstra superioridade de evidência.`
              : null
        };
      })()
    });
  });
}
