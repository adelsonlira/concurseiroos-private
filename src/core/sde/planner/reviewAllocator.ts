/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicAction } from "../prioritization/types";
import {
  PlannerAdjustment,
  PlannerPolicy,
  StudyActivityType
} from "./plannerTypes";
import { ActivityTimeAllocation, TimeAllocationPlan } from "./timeAllocator";

function cloneAllocations(allocations: ActivityTimeAllocation[]): ActivityTimeAllocation[] {
  return allocations.map((allocation) => ({ ...allocation }));
}

function ensureAllocation(
  allocations: ActivityTimeAllocation[],
  targetType: StudyActivityType,
  policy: PlannerPolicy
): { allocations: ActivityTimeAllocation[]; moved: number } {
  const cloned = cloneAllocations(allocations);
  const existing = cloned.find((allocation) => allocation.tipo === targetType);
  const targetMinimum = policy.minSessionMinutes[targetType];

  if (existing && existing.tempoMinutos >= targetMinimum) {
    return { allocations: cloned, moved: 0 };
  }

  const current = existing?.tempoMinutos ?? 0;
  let needed = targetMinimum - current;
  const donors = cloned
    .filter((allocation) => allocation.tipo !== targetType)
    .sort((left, right) => right.tempoMinutos - left.tempoMinutos);

  for (const donor of donors) {
    const floor = Math.min(policy.minSessionMinutes[donor.tipo], donor.tempoMinutos);
    const available = Math.max(0, donor.tempoMinutos - floor);
    const moved = Math.min(needed, available);
    donor.tempoMinutos -= moved;
    needed -= moved;
    if (needed === 0) break;
  }

  const movedTotal = targetMinimum - current - needed;
  if (movedTotal > 0) {
    if (existing) existing.tempoMinutos += movedTotal;
    else cloned.push({ tipo: targetType, tempoMinutos: movedTotal });
  }

  return {
    allocations: cloned.filter((allocation) => allocation.tempoMinutos > 0),
    moved: movedTotal
  };
}

export function allocateReviewSafeguards(
  plan: TimeAllocationPlan,
  actions: StrategicAction[],
  policy: PlannerPolicy
): TimeAllocationPlan {
  let allocations = cloneAllocations(plan.allocations);
  const adjustments: PlannerAdjustment[] = [...plan.adjustments];

  const requiresReview = actions.some(
    (action) => action.tipo === "revisao" && [
      "REVISION_EXPIRED",
      "HIGH_DECAY",
      "HISTORICAL_DROP",
      "RECENT_REGRESSION"
    ].includes(action.reasonCode)
  );

  if (requiresReview) {
    const result = ensureAllocation(allocations, "revisao", policy);
    allocations = result.allocations;
    if (result.moved > 0) {
      adjustments.push({
        code: "REVIEW_SAFEGUARD",
        reason: "Foi reservado tempo mínimo para uma revisão cuja necessidade foi identificada pelas evidências processadas pelo SDE.",
        minutes: result.moved
      });
    }
  }

  const requiresFlashcards = actions.some(
    (action) => action.tipo === "flashcards" && action.reasonCode === "FLASHCARDS_PENDING"
  );

  if (requiresFlashcards) {
    const result = ensureAllocation(allocations, "flashcards", policy);
    allocations = result.allocations;
    if (result.moved > 0) {
      adjustments.push({
        code: "FLASHCARD_SAFEGUARD",
        reason: "Foi reservado tempo mínimo para flashcards pendentes já validados pelo SDE.",
        minutes: result.moved
      });
    }
  }

  return { ...plan, allocations, adjustments };
}
