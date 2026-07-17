import type { ExecutableStudyPrescription } from "../prescription/types";

export type CoachOperationalState =
  | "START_NOW"
  | "RESUME_SESSION"
  | "USE_FALLBACK"
  | "RECOVER_INTERRUPTION"
  | "WAIT_FOR_PRESCRIPTION";

export interface CoachOperationalCommand {
  state: CoachOperationalState;
  headline: string;
  instruction: string;
  primaryActionLabel: string;
  decisionRequiredFromStudent: false;
  blockingReason: string | null;
  fallbackInstruction: string | null;
}

export interface CoachOperationalInput {
  prescription: ExecutableStudyPrescription | null;
  timerRunning: boolean;
  interruptedSessionMinutes?: number;
}
