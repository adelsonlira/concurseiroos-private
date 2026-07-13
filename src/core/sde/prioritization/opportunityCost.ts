/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConstitutionalTier,
  OpportunityCostPolicy,
  OpportunityCostResult
} from "./types";

export interface ComparableAction {
  id: string;
  finalScore: number;
  name: string;
  estimatedDurationMinutes: number | null;
  tier: ConstitutionalTier;
}

/**
 * The current evidence model does not support an isolated economic cost estimate.
 * The function is intentionally conservative and returns insufficient data until
 * a real duration and a comparable alternative are available.
 */
export function calculateOpportunityCost(
  estimatedDurationMinutes: number | null
): OpportunityCostResult {
  const missingData: string[] = [];

  if (estimatedDurationMinutes === null || estimatedDurationMinutes <= 0) {
    missingData.push("estimatedDurationMinutes");
  }

  missingData.push("bestComparableAlternative");

  return {
    status: "INSUFFICIENT_DATA",
    value: null,
    unit: null,
    consideredFactors: [],
    missingData,
    bestAlternativeActionId: null,
    bestAlternativeValue: null
  };
}

/**
 * Computes only a relative score difference between actions in the same
 * constitutional tier and with comparable known durations.
 *
 * This is not an estimate of points, hours saved, or approval probability.
 */
export function calculateComparativeOpportunityCost(params: {
  actionId: string;
  actionValue: number;
  estimatedDurationMinutes: number | null;
  tier: ConstitutionalTier;
  eligibleActions: ComparableAction[];
  policy: OpportunityCostPolicy;
}): OpportunityCostResult {
  const {
    actionId,
    actionValue,
    estimatedDurationMinutes,
    tier,
    eligibleActions,
    policy
  } = params;

  if (estimatedDurationMinutes === null || estimatedDurationMinutes <= 0) {
    return {
      status: "INSUFFICIENT_DATA",
      value: null,
      unit: null,
      consideredFactors: [],
      missingData: ["estimatedDurationMinutes"],
      bestAlternativeActionId: null,
      bestAlternativeValue: null
    };
  }

  const compatibleAlternatives = eligibleActions.filter((alternative) => {
    if (alternative.id === actionId) return false;
    if (alternative.tier !== tier) return false;
    if (
      alternative.estimatedDurationMinutes === null ||
      alternative.estimatedDurationMinutes <= 0
    ) {
      return false;
    }

    const durationDifference = Math.abs(
      alternative.estimatedDurationMinutes - estimatedDurationMinutes
    );
    const allowedDifference =
      estimatedDurationMinutes * policy.durationToleranceRatio;

    return durationDifference <= allowedDifference;
  });

  const comparableCount = compatibleAlternatives.length + 1;
  if (
    comparableCount < policy.minimumComparableActions ||
    compatibleAlternatives.length === 0
  ) {
    return {
      status: "INSUFFICIENT_DATA",
      value: null,
      unit: null,
      consideredFactors: [
        "SAME_CONSTITUTIONAL_TIER",
        "KNOWN_COMPARABLE_DURATION"
      ],
      missingData: ["bestComparableAlternative"],
      bestAlternativeActionId: null,
      bestAlternativeValue: null
    };
  }

  const bestAlternative = compatibleAlternatives.reduce((best, current) => {
    if (current.finalScore > best.finalScore) return current;
    if (current.finalScore < best.finalScore) return best;
    return current.id.localeCompare(best.id) < 0 ? current : best;
  });

  const relativeDifference = bestAlternative.finalScore - actionValue;

  return {
    status: "CALCULATED",
    value: Number(relativeDifference.toFixed(2)),
    unit: "RELATIVE_SCORE",
    consideredFactors: [
      "SAME_CONSTITUTIONAL_TIER",
      "KNOWN_COMPARABLE_DURATION",
      "RELATIVE_PRIORITY_SCORE"
    ],
    missingData: [],
    bestAlternativeActionId: bestAlternative.id,
    bestAlternativeValue: Number(bestAlternative.finalScore.toFixed(2)),
    bestAlternativeName: bestAlternative.name
  };
}
