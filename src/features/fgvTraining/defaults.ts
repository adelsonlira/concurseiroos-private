import type { FgvTrainingAdherenceFilter, FgvTrainingFilters } from "./types";

export const DEFAULT_FGV_TRAINING_FILTERS: FgvTrainingFilters = Object.freeze({
  selectionArea: null,
  primaryItemId: null,
  adherence: "DIRECT",
  quantity: 10,
});

export function normalizeFgvTrainingAdherenceFilter(value: unknown): FgvTrainingAdherenceFilter {
  return value === "PARTIAL" || value === "BOTH" || value === "DIRECT" ? value : "DIRECT";
}
