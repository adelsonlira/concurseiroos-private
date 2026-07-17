import type { ProductReadinessAssessment, ReadinessCheck } from "./types.js";

export function assessProductReadiness(checks: readonly ReadinessCheck[]): ProductReadinessAssessment {
  const blockingChecks = checks
    .filter((item) => item.requiredForDailyUse && item.status === "FAIL")
    .map((item) => item.label);
  const warnings = checks
    .filter((item) => item.status === "WARN" || item.status === "NOT_TESTED")
    .map((item) => `${item.label}: ${item.detail}`);

  if (blockingChecks.length > 0) {
    return { status: "NOT_READY", confidence: "LOW", blockingChecks, warnings, checks: [...checks] };
  }
  const criticalNotTested = checks.some((item) => item.requiredForDailyUse && item.status === "NOT_TESTED");
  if (criticalNotTested || warnings.length > 0) {
    return { status: "READY_WITH_LIMITATIONS", confidence: "MEDIUM", blockingChecks: [], warnings, checks: [...checks] };
  }
  return { status: "READY_FOR_LOCAL_DAILY_USE", confidence: "HIGH", blockingChecks: [], warnings: [], checks: [...checks] };
}
