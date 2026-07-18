import type {
  ActivePilotDiagnosticAttempt,
  FinalizedPilotDiagnosticAttempt,
  PilotDiagnosticPersistenceSnapshot,
} from "./types";

export interface PilotDiagnosticNavigationOptions {
  replace?: boolean;
}

export type PilotDiagnosticRoute =
  | { view: "landing" }
  | { view: "active_attempt" }
  | { view: "finalized_result"; attemptId: string };

export type PilotDiagnosticResolvedScreen =
  | {
      view: "landing";
      primaryAction: "start" | "resume";
      activeAttempt: ActivePilotDiagnosticAttempt | null;
      finalizedAttempts: FinalizedPilotDiagnosticAttempt[];
    }
  | {
      view: "active_attempt";
      attempt: ActivePilotDiagnosticAttempt;
      finalizedAttempts: FinalizedPilotDiagnosticAttempt[];
    }
  | {
      view: "finalized_result";
      result: FinalizedPilotDiagnosticAttempt;
      activeAttempt: ActivePilotDiagnosticAttempt | null;
      finalizedAttempts: FinalizedPilotDiagnosticAttempt[];
    };

export const PILOT_DIAGNOSTIC_LANDING_ROUTE: PilotDiagnosticRoute = Object.freeze({ view: "landing" });
export const PILOT_DIAGNOSTIC_ACTIVE_ROUTE: PilotDiagnosticRoute = Object.freeze({ view: "active_attempt" });

const PILOT_DIAGNOSTIC_HASH_ROOT = "#/diagnostico";
const PILOT_DIAGNOSTIC_HASH_ACTIVE = `${PILOT_DIAGNOSTIC_HASH_ROOT}/tentativa`;
const PILOT_DIAGNOSTIC_HASH_RESULT_PREFIX = `${PILOT_DIAGNOSTIC_HASH_ROOT}/resultado/`;

export function buildPilotDiagnosticResultRoute(attemptId: string): PilotDiagnosticRoute {
  const normalizedAttemptId = attemptId.trim();
  if (!normalizedAttemptId) throw new Error("Identificador da tentativa finalizada é obrigatório.");
  return { view: "finalized_result", attemptId: normalizedAttemptId };
}

export function buildPilotDiagnosticHash(route: PilotDiagnosticRoute): string {
  if (route.view === "landing") return PILOT_DIAGNOSTIC_HASH_ROOT;
  if (route.view === "active_attempt") return PILOT_DIAGNOSTIC_HASH_ACTIVE;
  return `${PILOT_DIAGNOSTIC_HASH_RESULT_PREFIX}${encodeURIComponent(route.attemptId)}`;
}

export function parsePilotDiagnosticHash(hash: string): PilotDiagnosticRoute | null {
  if (hash === PILOT_DIAGNOSTIC_HASH_ROOT || hash === `${PILOT_DIAGNOSTIC_HASH_ROOT}/`) {
    return PILOT_DIAGNOSTIC_LANDING_ROUTE;
  }
  if (hash === PILOT_DIAGNOSTIC_HASH_ACTIVE || hash === `${PILOT_DIAGNOSTIC_HASH_ACTIVE}/`) {
    return PILOT_DIAGNOSTIC_ACTIVE_ROUTE;
  }
  if (!hash.startsWith(PILOT_DIAGNOSTIC_HASH_RESULT_PREFIX)) return null;

  const encodedAttemptId = hash.slice(PILOT_DIAGNOSTIC_HASH_RESULT_PREFIX.length).replace(/\/$/, "");
  if (!encodedAttemptId || encodedAttemptId.includes("/")) return null;
  try {
    return buildPilotDiagnosticResultRoute(decodeURIComponent(encodedAttemptId));
  } catch {
    return null;
  }
}

export function resolvePilotDiagnosticScreen(
  route: PilotDiagnosticRoute,
  snapshot: PilotDiagnosticPersistenceSnapshot,
): PilotDiagnosticResolvedScreen {
  if (route.view === "active_attempt" && snapshot.activeAttempt) {
    return {
      view: "active_attempt",
      attempt: snapshot.activeAttempt,
      finalizedAttempts: snapshot.finalizedAttempts,
    };
  }

  if (route.view === "finalized_result") {
    const result = snapshot.finalizedAttempts.find((attempt) => attempt.attemptId === route.attemptId);
    if (result) {
      return {
        view: "finalized_result",
        result,
        activeAttempt: snapshot.activeAttempt,
        finalizedAttempts: snapshot.finalizedAttempts,
      };
    }
  }

  return {
    view: "landing",
    primaryAction: snapshot.activeAttempt ? "resume" : "start",
    activeAttempt: snapshot.activeAttempt,
    finalizedAttempts: snapshot.finalizedAttempts,
  };
}
