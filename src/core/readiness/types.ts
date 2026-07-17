export type ReadinessCheckStatus = "PASS" | "WARN" | "FAIL" | "NOT_TESTED";

export interface ReadinessCheck {
  id: string;
  label: string;
  status: ReadinessCheckStatus;
  requiredForDailyUse: boolean;
  detail: string;
}

export interface ProductReadinessAssessment {
  status: "READY_FOR_LOCAL_DAILY_USE" | "READY_WITH_LIMITATIONS" | "NOT_READY";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  blockingChecks: string[];
  warnings: string[];
  checks: ReadinessCheck[];
}
