/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicAction } from "../prioritization/types";
import {
  PlannerAdjustment,
  PlannerContext,
  PlannerStrategy,
  StudyActivityType
} from "./plannerTypes";
import { getStrategyRatio } from "./strategyTemplates";

export interface ActivityTimeAllocation {
  tipo: StudyActivityType;
  tempoMinutos: number;
}

export interface TimeAllocationPlan {
  allocations: ActivityTimeAllocation[];
  studyBudgetMinutes: number;
  breakBudgetMinutes: number;
  plannedBreakCount: number;
  adjustments: PlannerAdjustment[];
  /** Action-specific floors applied by safeguards such as continued syllabus progression. */
  reservedActionMinimums: Record<string, number>;
}

export const STUDY_ACTIVITY_TYPES: readonly StudyActivityType[] = [
  "teoria",
  "questoes",
  "revisao",
  "flashcards",
  "simulado"
] as const;

function actionOrder(actions: StrategicAction[]): StrategicAction[] {
  return actions
    .map((action, index) => ({ action, index }))
    .sort((left, right) =>
      left.action.prioridade - right.action.prioridade ||
      right.action.score - left.action.score ||
      left.index - right.index
    )
    .map(({ action }) => action);
}

export function calculatePlannedBreakCount(
  totalMinutes: number,
  context: PlannerContext
): number {
  const { maxContinuousCognitiveLoad, breakDurationMinutes } = context.policy;
  if (totalMinutes <= maxContinuousCognitiveLoad) return 0;
  const usableWindow = totalMinutes - context.policy.minStudyMinutesAfterBreak;
  if (usableWindow <= 0) return 0;
  return Math.max(
    0,
    Math.floor(usableWindow / (maxContinuousCognitiveLoad + breakDurationMinutes))
  );
}

function distributeIntegerMinutes(
  total: number,
  weightedTypes: Array<{ tipo: StudyActivityType; weight: number }>
): Record<StudyActivityType, number> {
  const result: Record<StudyActivityType, number> = {
    teoria: 0,
    questoes: 0,
    revisao: 0,
    flashcards: 0,
    simulado: 0
  };
  if (total <= 0 || weightedTypes.length === 0) return result;

  const positiveWeight = weightedTypes.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  const normalized = positiveWeight > 0
    ? weightedTypes.map((item) => ({ ...item, normalized: Math.max(0, item.weight) / positiveWeight }))
    : weightedTypes.map((item) => ({ ...item, normalized: 1 / weightedTypes.length }));

  let assigned = 0;
  for (const item of normalized) {
    const minutes = Math.floor(total * item.normalized);
    result[item.tipo] += minutes;
    assigned += minutes;
  }

  let remainder = total - assigned;
  let cursor = 0;
  while (remainder > 0) {
    const item = normalized[cursor % normalized.length];
    result[item.tipo] += 1;
    cursor += 1;
    remainder -= 1;
  }

  return result;
}

export function allocateTime(
  actions: StrategicAction[],
  strategy: PlannerStrategy,
  context: PlannerContext
): TimeAllocationPlan {
  const sortedActions = actionOrder(actions);
  const allowedActions = sortedActions.filter(
    (action) => action.tipo !== "simulado" || strategy.permiteSimulado
  );
  const presentTypes = [...new Set(allowedActions.map((action) => action.tipo))] as StudyActivityType[];

  const plannedBreakCount = calculatePlannedBreakCount(context.tempoDisponivelMinutos, context);
  const breakBudgetMinutes = plannedBreakCount * context.policy.breakDurationMinutes;
  const studyBudgetMinutes = Math.max(0, context.tempoDisponivelMinutos - breakBudgetMinutes);
  const adjustments: PlannerAdjustment[] = [];

  if (presentTypes.length === 0 || studyBudgetMinutes === 0) {
    return {
      allocations: [],
      studyBudgetMinutes,
      breakBudgetMinutes,
      plannedBreakCount,
      adjustments,
      reservedActionMinimums: {}
    };
  }

  const budgets = distributeIntegerMinutes(
    studyBudgetMinutes,
    presentTypes.map((tipo) => ({ tipo, weight: getStrategyRatio(strategy, tipo) }))
  );

  for (const tipo of STUDY_ACTIVITY_TYPES) {
    if (!presentTypes.includes(tipo) && getStrategyRatio(strategy, tipo) > 0) {
      adjustments.push({
        code: "REALLOCATED_UNUSED_TYPE",
        reason: `O tempo previsto para ${tipo} foi redistribuído porque não existe ação validada desse tipo.`
      });
    }
  }

  const typePriority = [...new Set(allowedActions.map((action) => action.tipo))] as StudyActivityType[];
  const guaranteedTypes = new Set<StudyActivityType>();

  for (const targetType of typePriority) {
    const targetMinimum = context.policy.minSessionMinutes[targetType];
    if (budgets[targetType] >= targetMinimum) {
      guaranteedTypes.add(targetType);
      continue;
    }

    let needed = targetMinimum - budgets[targetType];
    const donors = [...typePriority]
      .reverse()
      .filter((tipo) => tipo !== targetType && !guaranteedTypes.has(tipo));

    for (const donor of donors) {
      const moved = Math.min(budgets[donor], needed);
      budgets[donor] -= moved;
      budgets[targetType] += moved;
      needed -= moved;
      if (needed === 0) break;
    }

    if (budgets[targetType] >= targetMinimum) {
      guaranteedTypes.add(targetType);
      adjustments.push({
        code: "PRIORITY_OVERRIDES_RATIO",
        reason: `O tipo ${targetType} recebeu o mínimo operacional de ${targetMinimum} minutos conforme a ordem das ações estratégicas.`,
        minutes: targetMinimum
      });
    }
  }

  return {
    allocations: presentTypes
      .filter((tipo) => budgets[tipo] > 0)
      .map((tipo) => ({ tipo, tempoMinutos: budgets[tipo] })),
    studyBudgetMinutes,
    breakBudgetMinutes,
    plannedBreakCount,
    adjustments,
    reservedActionMinimums: {}
  };
}
