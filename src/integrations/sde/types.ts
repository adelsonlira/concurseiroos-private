/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyAvailabilityResult } from "../../core/availability/types";
import { PlannerResponse } from "../../core/sde/planner/plannerTypes";
import { StrategicAction } from "../../core/sde/prioritization/types";
import type { DailyStudyPrescription } from "../../core/prescription/types";
import type { DecisionRecord, SdeV2DecisionOutput } from "../../core/sde-v2/types";

export interface SDEApplicationResult {
  status: "SUCCESS" | "NO_TIME_AVAILABLE" | "INVALID_INPUT";
  referenceDate: string;
  availability: DailyAvailabilityResult | null;
  actions: StrategicAction[];
  planner: PlannerResponse | null;
  prescription: DailyStudyPrescription | null;
  warnings: string[];
  errors: string[];
  sdeVersionUsed?: "1.0" | "2.0";
  activeSdeVersion?: "v1" | "v2";
  fallbackUsed?: boolean;
  fallbackReason?: string;
  v2?: {
    output: SdeV2DecisionOutput;
    decisionRecord: DecisionRecord | null;
    comparisonWithV1: {
      sameNode: boolean;
      sameActivity: boolean;
      v1NodeId: string | null;
      v1Activity: string | null;
      divergenceReasons: string[];
    };
  };
}
