/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicAction } from "../prioritization/types";
import { getPlannerActionId } from "./blockBuilder";
import { PlannerPolicy, StudyActivityType } from "./plannerTypes";
import { ActivityTimeAllocation, TimeAllocationPlan } from "./timeAllocator";

function cloneAllocations(allocations: ActivityTimeAllocation[]): ActivityTimeAllocation[] {
  return allocations.map((item) => ({ ...item }));
}

function orderedActions(actions: readonly StrategicAction[]): StrategicAction[] {
  return actions
    .map((action, index) => ({ action, index }))
    .sort((left, right) =>
      left.action.prioridade - right.action.prioridade ||
      right.action.score - left.action.score ||
      left.index - right.index
    )
    .map(({ action }) => action);
}

function firstPriorityByType(
  actions: readonly StrategicAction[]
): Partial<Record<StudyActivityType, number>> {
  const result: Partial<Record<StudyActivityType, number>> = {};
  for (const action of orderedActions(actions)) {
    if (result[action.tipo] === undefined) result[action.tipo] = action.prioridade;
  }
  return result;
}

/**
 * Reserves one executable unseen-theory action whenever the validated daily window
 * can fit it without removing the minimum session of another represented activity.
 * This is an operational anti-starvation guard, not a claim that a fixed share of
 * theory is universally optimal.
 */
export function allocateNewContentProgressGuard(
  plan: TimeAllocationPlan,
  actions: readonly StrategicAction[],
  policy: PlannerPolicy
): TimeAllocationPlan {
  const guard = policy.progressionGuard;
  if (!guard?.enabled) return plan;

  const ordered = orderedActions(actions);
  const unseenIndex = ordered.findIndex(
    (action) =>
      action.tipo === "teoria" &&
      action.reasonCode === "UNSEEN_THEORY" &&
      Number.isFinite(action.tempoEstimadoMinutos) &&
      action.tempoEstimadoMinutos >= policy.minSessionMinutes.teoria
  );
  if (unseenIndex < 0) return plan;
  const unseen = ordered[unseenIndex];
  const protectedPriorTheoryMinutes = ordered
    .slice(0, unseenIndex)
    .filter(
      (action) =>
        action.tipo === "teoria" &&
        Number.isFinite(action.tempoEstimadoMinutos) &&
        action.tempoEstimadoMinutos >= policy.minSessionMinutes.teoria
    )
    .reduce(
      (sum, action) =>
        sum + Math.min(action.tempoEstimadoMinutos, policy.minSessionMinutes.teoria),
      0
    );

  const allocations = cloneAllocations(plan.allocations);
  let theory = allocations.find((item) => item.tipo === "teoria");
  if (!theory) {
    theory = { tipo: "teoria", tempoMinutos: 0 };
    allocations.push(theory);
  }

  const requested = Math.min(
    unseen.tempoEstimadoMinutos,
    Math.max(policy.minSessionMinutes.teoria, guard.minNewContentSessionMinutes)
  );
  const requiredTheoryBudget = protectedPriorTheoryMinutes + requested;
  let needed = Math.max(0, requiredTheoryBudget - theory.tempoMinutos);
  const priorities = firstPriorityByType(actions);
  const donors = allocations
    .filter((item) => item.tipo !== "teoria")
    .sort((left, right) =>
      (priorities[right.tipo] ?? Number.MAX_SAFE_INTEGER) -
        (priorities[left.tipo] ?? Number.MAX_SAFE_INTEGER) ||
      right.tempoMinutos - left.tempoMinutos ||
      left.tipo.localeCompare(right.tipo)
    );

  let moved = 0;
  for (const donor of donors) {
    const protectedMinimum = Math.min(
      policy.minSessionMinutes[donor.tipo],
      donor.tempoMinutos
    );
    const transferable = Math.max(0, donor.tempoMinutos - protectedMinimum);
    const transfer = Math.min(needed, transferable);
    donor.tempoMinutos -= transfer;
    theory.tempoMinutos += transfer;
    moved += transfer;
    needed -= transfer;
    if (needed === 0) break;
  }

  const reservable = Math.min(
    Math.max(0, theory.tempoMinutos - protectedPriorTheoryMinutes),
    unseen.tempoEstimadoMinutos
  );
  if (reservable < policy.minSessionMinutes.teoria) {
    return {
      ...plan,
      allocations: allocations.filter((item) => item.tempoMinutos > 0),
      adjustments: [
        ...plan.adjustments,
        {
          code: "NEW_CONTENT_PROGRESS_GUARD_NOT_APPLIED",
          reason:
            "Existe conteúdo novo validado, mas a janela não comporta uma sessão mínima sem retirar o mínimo de uma ação de prioridade superior ou de outra atividade representada.",
          actionId: getPlannerActionId(unseen),
          minutes: reservable
        }
      ]
    };
  }

  const reserved = Math.max(
    policy.minSessionMinutes.teoria,
    Math.min(requested, reservable)
  );
  return {
    ...plan,
    allocations: allocations.filter((item) => item.tempoMinutos > 0),
    reservedActionMinimums: {
      ...plan.reservedActionMinimums,
      [getPlannerActionId(unseen)]: reserved
    },
    adjustments: [
      ...plan.adjustments,
      {
        code: "NEW_CONTENT_PROGRESS_GUARD",
        reason:
          "Foi protegida uma sessão executável de conteúdo ainda não estudado para impedir que o acúmulo de revisões congele a expansão do edital.",
        actionId: getPlannerActionId(unseen),
        minutes: reserved
      }
    ]
  };
}
