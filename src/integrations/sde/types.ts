/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyAvailabilityResult } from "../../core/availability/types";
import { PlannerResponse } from "../../core/sde/planner/plannerTypes";
import { StrategicAction } from "../../core/sde/prioritization/types";
import type { DailyStudyPrescription } from "../../core/prescription/types";

export interface SDEApplicationResult {
  status: "SUCCESS" | "NO_TIME_AVAILABLE" | "INVALID_INPUT";
  referenceDate: string;
  availability: DailyAvailabilityResult | null;
  actions: StrategicAction[];
  planner: PlannerResponse | null;
  prescription: DailyStudyPrescription | null;
  warnings: string[];
  errors: string[];
}
