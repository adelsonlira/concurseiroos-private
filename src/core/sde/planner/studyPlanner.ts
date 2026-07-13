/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicAction } from "../prioritization/types";
import { validateStrictISODate } from "../validation/validator";
import {
  PlannerContext,
  PlannerPolicy,
  PlannerResponse,
  PlannerStrategy,
  StrategyMode,
  StudyActivityType,
  StudyPlan
} from "./plannerTypes";
import { selectStrategyByTimeHorizon, STRATEGY_TEMPLATES } from "./strategyTemplates";
import { allocateTime, STUDY_ACTIVITY_TYPES } from "./timeAllocator";
import { allocateReviewSafeguards } from "./reviewAllocator";
import { allocateNewContentProgressGuard } from "./progressionAllocator";
import { buildBlocks } from "./blockBuilder";
import { optimizeSessions } from "./sessionOptimizer";

export interface PlannerInputs {
  actions: StrategicAction[];
  context: PlannerContext;
  forcedStrategyId?: StrategyMode;
}

function assertFiniteInteger(value: number, field: string, minimum: number): void {
  if (!Number.isInteger(value) || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${field} deve ser um inteiro finito maior ou igual a ${minimum}.`);
  }
}

function validateTypePolicy(
  policy: PlannerPolicy,
  tipo: StudyActivityType
): void {
  const min = policy.minSessionMinutes[tipo];
  const max = policy.maxSessionMinutes[tipo];
  const weight = policy.cognitiveWeight[tipo];
  assertFiniteInteger(min, `policy.minSessionMinutes.${tipo}`, 1);
  assertFiniteInteger(max, `policy.maxSessionMinutes.${tipo}`, min);
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error(`policy.cognitiveWeight.${tipo} deve ser finito e positivo.`);
  }
}

export function validatePlannerContext(context: PlannerContext): void {
  if (!context || typeof context !== "object") {
    throw new Error("PlannerContext é obrigatório.");
  }
  assertFiniteInteger(context.tempoDisponivelMinutos, "tempoDisponivelMinutos", 1);
  assertFiniteInteger(context.diasAteAProva, "diasAteAProva", 0);
  validateStrictISODate(context.referenceDate, "planner.referenceDate");

  if (!context.bancaName || context.bancaName.trim().length === 0) {
    throw new Error("bancaName é obrigatória no contexto do planner.");
  }
  if (context.seedId !== undefined && context.seedId.trim().length === 0) {
    throw new Error("seedId, quando informado, não pode ser vazio.");
  }
  if (
    context.tempoAlvoPorQuestaoSegundos !== undefined &&
    context.tempoAlvoPorQuestaoSegundos !== null &&
    (!Number.isFinite(context.tempoAlvoPorQuestaoSegundos) || context.tempoAlvoPorQuestaoSegundos <= 0)
  ) {
    throw new Error("tempoAlvoPorQuestaoSegundos deve ser positivo quando informado.");
  }

  if (!context.policy) throw new Error("PlannerPolicy é obrigatória.");
  for (const tipo of STUDY_ACTIVITY_TYPES) validateTypePolicy(context.policy, tipo);
  assertFiniteInteger(context.policy.maxContinuousCognitiveLoad, "policy.maxContinuousCognitiveLoad", 1);
  assertFiniteInteger(context.policy.breakDurationMinutes, "policy.breakDurationMinutes", 1);
  assertFiniteInteger(context.policy.minStudyMinutesAfterBreak, "policy.minStudyMinutesAfterBreak", 0);
  if (context.policy.progressionGuard) {
    if (typeof context.policy.progressionGuard.enabled !== "boolean") {
      throw new Error("policy.progressionGuard.enabled deve ser booleano.");
    }
    assertFiniteInteger(
      context.policy.progressionGuard.minNewContentSessionMinutes,
      "policy.progressionGuard.minNewContentSessionMinutes",
      1
    );
  }
}

function validateStrategy(strategy: PlannerStrategy): void {
  const ratios = [
    strategy.teoriaRatio,
    strategy.questoesRatio,
    strategy.revisaoRatio,
    strategy.flashcardsRatio,
    strategy.simuladoRatio
  ];
  for (const ratio of ratios) {
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      throw new Error(`A estratégia ${strategy.id} contém proporção inválida.`);
    }
  }
  const sum = ratios.reduce((total, ratio) => total + ratio, 0);
  if (Math.abs(sum - 1) > 0.000001) {
    throw new Error(`As proporções da estratégia ${strategy.id} devem somar 1.`);
  }
}

function topActionGoal(action: StrategicAction): string {
  const topic = action.subassuntoNome || action.assuntoNome;
  switch (action.reasonCode) {
    case "UNSEEN_THEORY":
      return `Construir a base conceitual inicial de '${topic}' (${action.disciplinaNome}).`;
    case "DIAGNOSTIC_QUESTIONS":
      return `Coletar evidências diagnósticas sobre '${topic}' (${action.disciplinaNome}).`;
    case "REVISION_EXPIRED":
    case "HIGH_DECAY":
    case "HISTORICAL_DROP":
    case "RECENT_REGRESSION":
      return `Proteger a retenção de '${topic}' (${action.disciplinaNome}) pelo motivo validado no SDE.`;
    default:
      return `Executar a ação prioritária de ${action.tipo} em '${topic}' (${action.disciplinaNome}).`;
  }
}

function buildSeedId(
  context: PlannerContext,
  strategy: PlannerStrategy,
  actions: StrategicAction[]
): string {
  if (context.seedId) return context.seedId;
  const top = actions[0];
  const topKey = top
    ? `${top.disciplinaId}-${top.assuntoId}-${top.subassuntoId ?? "geral"}-${top.tipo}`
    : "sem-acao";
  return `seed-${strategy.id}-${context.referenceDate}-${context.tempoDisponivelMinutos}-${topKey}`;
}

export function createStudyPlan(inputs: PlannerInputs): PlannerResponse {
  const { actions, context, forcedStrategyId } = inputs;

  try {
    validatePlannerContext(context);
  } catch (error) {
    return {
      status: "INVALID_INPUT",
      plan: null,
      reasons: [error instanceof Error ? error.message : "Contexto inválido para o planner."]
    };
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    return {
      status: "NO_VALID_ACTIONS",
      plan: null,
      reasons: ["Não existem ações estratégicas validadas para montar o plano."]
    };
  }

  const strategy = forcedStrategyId
    ? STRATEGY_TEMPLATES[forcedStrategyId]
    : selectStrategyByTimeHorizon(context.diasAteAProva);

  try {
    validateStrategy(strategy);
  } catch (error) {
    return {
      status: "INVALID_INPUT",
      plan: null,
      reasons: [error instanceof Error ? error.message : "Estratégia inválida."]
    };
  }

  const sortedActions = actions
    .map((action, index) => ({ action, index }))
    .sort((left, right) =>
      left.action.prioridade - right.action.prioridade ||
      right.action.score - left.action.score ||
      left.index - right.index
    )
    .map(({ action }) => action);

  let allocationPlan = allocateTime(sortedActions, strategy, context);
  allocationPlan = allocateReviewSafeguards(allocationPlan, sortedActions, context.policy);
  allocationPlan = allocateNewContentProgressGuard(
    allocationPlan,
    sortedActions,
    context.policy
  );

  const seedId = buildSeedId(context, strategy, sortedActions);
  const buildResult = buildBlocks(
    allocationPlan.allocations,
    sortedActions,
    seedId,
    context,
    strategy.permiteSimulado,
    allocationPlan.reservedActionMinimums
  );

  if (buildResult.blocks.length === 0) {
    return {
      status: "NO_VALID_ACTIONS",
      plan: null,
      reasons: [
        "Nenhuma sessão pôde ser criada sem violar duração mínima, prioridade ou política da estratégia."
      ]
    };
  }

  const optimized = optimizeSessions(
    buildResult.blocks,
    seedId,
    context,
    allocationPlan.plannedBreakCount,
    allocationPlan.breakBudgetMinutes
  );

  const totalPlanned = optimized.blocks.reduce(
    (sum, block) => sum + block.tempoTotalMinutos,
    0
  );
  const unallocated = Math.max(0, context.tempoDisponivelMinutos - totalPlanned);
  const adjustments = [
    ...allocationPlan.adjustments,
    ...buildResult.adjustments,
    ...optimized.adjustments
  ];
  if (unallocated > 0 && !adjustments.some((item) => item.code === "UNALLOCATED_TIME")) {
    adjustments.push({
      code: "UNALLOCATED_TIME",
      reason: "A janela disponível contém minutos que não puderam ser atribuídos com segurança.",
      minutes: unallocated
    });
  }

  const topAction = sortedActions[0];
  const plan: StudyPlan = {
    id: `plan-${strategy.id}-${seedId}`,
    estrategiaId: strategy.id,
    estrategiaNome: strategy.nome,
    tempoDisponivelMinutos: context.tempoDisponivelMinutos,
    tempoTotalPlanejadoMinutos: totalPlanned,
    tempoNaoAlocadoMinutos: unallocated,
    blocos: optimized.blocks,
    metaGeral: topActionGoal(topAction),
    justificativaEstrategica:
      `O plano usa a estratégia '${strategy.nome}' como distribuição operacional, ` +
      "mas preserva a ordem das ações calculada pelo SDE. Quando existe conteúdo não estudado e a janela comporta, uma sessão mínima é protegida para impedir estagnação. As pausas fazem parte da janela total informada.",
    adjustments,
    deferredActions: buildResult.deferredActions
  };

  return { status: "SUCCESS", plan };
}
