export type CurationTargetKind =
  | "EXAM"
  | "ANSWER_KEY_LINK"
  | "QUESTION_EXTRACTION"
  | "DUPLICATE_GROUP"
  | "SOURCE_CLASSIFICATION"
  | "TARGET_EQUIVALENCE";

export type CurationDecision =
  | "APPROVED"
  | "CORRECTED"
  | "REJECTED"
  | "INSUFFICIENT_EVIDENCE";

export interface CurationActor {
  id: string;
  role: "HUMAN_CURATOR" | "SYSTEM_MIGRATION";
}

export interface CurationPayload {
  decision: CurationDecision;
  reason: string;
  sourceIds: string[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
  patch?: Record<string, unknown>;
}

export interface CurationEvent {
  id: string;
  schemaVersion: "1.0.0";
  sequence: number;
  targetKind: CurationTargetKind;
  targetId: string;
  actor: CurationActor;
  occurredAt: string;
  previousEventHash: string | null;
  eventHash: string;
  payload: CurationPayload;
}

export interface CurationLedgerState {
  events: CurationEvent[];
  currentByTarget: Record<string, CurationEvent>;
  integrity: {
    valid: boolean;
    errors: string[];
  };
}

export interface ReviewQueueCandidate {
  id: string;
  targetKind: CurationTargetKind;
  targetId: string;
  contestSlug?: string | null;
  examYear?: number | null;
  roleLabel?: string | null;
  issueKinds: Array<"ANSWER_KEY" | "EXTRACTION" | "DUPLICATE" | "CLASSIFICATION" | "EQUIVALENCE">;
  technicalProximity?: "TARGET" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  unresolvedCount?: number;
}

export interface PrioritizedReviewQueueItem extends ReviewQueueCandidate {
  priorityScore: number;
  priorityBand: "P0_TARGET" | "P1_HIGH" | "P2_MEDIUM" | "P3_BACKLOG";
  reasons: string[];
}
