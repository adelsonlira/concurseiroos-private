/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  runCompetitionDecisionForDate,
  type CompetitionDecisionSnapshot
} from "./competitionDecisionAdapter";
import type { SDEApplicationResult } from "./types";

export * from "./competitionDecisionAdapter";

/** @deprecated Use CompetitionDecisionSnapshot. */
export type DataprevDecisionSnapshot = CompetitionDecisionSnapshot;

/** @deprecated Compatibility wrapper for the original single-competition API. */
export function runDataprevDecisionForDate(
  snapshot: CompetitionDecisionSnapshot,
  referenceDate: string
): SDEApplicationResult {
  return runCompetitionDecisionForDate(snapshot, referenceDate);
}
