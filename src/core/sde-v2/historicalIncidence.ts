import type { HistoricalIncidenceSignal } from "./types";

export interface HistoricalIncidenceSourceRecord {
  nodeId: string;
  observedCount?: number;
  deduplicatedCount?: number;
  directCount?: number;
  partialCount?: number;
  recencyAdjustedValue?: number;
  roleProximityValue?: number;
  classificationConfidence?: number;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function buildHistoricalIncidenceSignal(
  nodeId: string,
  source?: HistoricalIncidenceSourceRecord,
): HistoricalIncidenceSignal {
  const observedCount = Math.max(0, source?.observedCount ?? 0);
  const deduplicatedCount = Math.max(0, source?.deduplicatedCount ?? observedCount);
  const directCount = Math.max(0, source?.directCount ?? 0);
  const partialCount = Math.max(0, source?.partialCount ?? 0);
  const recencyAdjustedValue = clamp(source?.recencyAdjustedValue ?? 0);
  const roleProximityValue = clamp(source?.roleProximityValue ?? 0);
  const classificationConfidence = clamp(source?.classificationConfidence ?? 0);
  const volume = deduplicatedCount > 0 ? Math.min(1, Math.log1p(deduplicatedCount) / Math.log(21)) : 0;
  const finalShadowValue = clamp(
    (volume * 0.3 + recencyAdjustedValue * 0.25 + roleProximityValue * 0.25 + classificationConfidence * 0.2),
  );
  return {
    nodeId,
    observedCount,
    deduplicatedCount,
    directCount,
    partialCount,
    recencyAdjustedValue,
    roleProximityValue,
    classificationConfidence,
    finalShadowValue,
    decisionWeight: 0,
    label: "Inferência histórica em validação — shadow mode",
  };
}
