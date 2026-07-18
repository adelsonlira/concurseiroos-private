import type { ActiveFgvTrainingAttempt, FinalizedFgvTrainingAttempt, FgvTrainingPersistenceSnapshot } from "./types";
export interface FgvTrainingNavigationOptions { replace?: boolean; }
export type FgvTrainingRoute = { view: "landing" } | { view: "active_training" } | { view: "finalized_training"; attemptId: string };
export type FgvTrainingResolvedScreen =
  | { view: "landing"; primaryAction: "start" | "resume"; activeAttempt: ActiveFgvTrainingAttempt | null; finalizedAttempts: FinalizedFgvTrainingAttempt[] }
  | { view: "active_training"; attempt: ActiveFgvTrainingAttempt; finalizedAttempts: FinalizedFgvTrainingAttempt[] }
  | { view: "finalized_training"; result: FinalizedFgvTrainingAttempt; activeAttempt: ActiveFgvTrainingAttempt | null; finalizedAttempts: FinalizedFgvTrainingAttempt[] };

export const FGV_TRAINING_LANDING_ROUTE: FgvTrainingRoute = Object.freeze({ view: "landing" });
export const FGV_TRAINING_ACTIVE_ROUTE: FgvTrainingRoute = Object.freeze({ view: "active_training" });
const ROOT = "#/treino-fgv";
const ACTIVE = `${ROOT}/tentativa`;
const RESULT = `${ROOT}/resultado/`;
export function buildFgvTrainingResultRoute(attemptId: string): FgvTrainingRoute { if (!attemptId.trim()) throw new Error("attemptId obrigatório"); return { view: "finalized_training", attemptId: attemptId.trim() }; }
export function buildFgvTrainingHash(route: FgvTrainingRoute): string { return route.view === "landing" ? ROOT : route.view === "active_training" ? ACTIVE : `${RESULT}${encodeURIComponent(route.attemptId)}`; }
export function parseFgvTrainingHash(hash: string): FgvTrainingRoute | null {
  if (hash === ROOT || hash === `${ROOT}/`) return FGV_TRAINING_LANDING_ROUTE;
  if (hash === ACTIVE || hash === `${ACTIVE}/`) return FGV_TRAINING_ACTIVE_ROUTE;
  if (!hash.startsWith(RESULT)) return null;
  const encoded = hash.slice(RESULT.length).replace(/\/$/, "");
  if (!encoded || encoded.includes("/")) return null;
  try { return buildFgvTrainingResultRoute(decodeURIComponent(encoded)); } catch { return null; }
}
export function resolveFgvTrainingScreen(route: FgvTrainingRoute, snapshot: FgvTrainingPersistenceSnapshot): FgvTrainingResolvedScreen {
  if (route.view === "active_training" && snapshot.activeAttempt) return { view: "active_training", attempt: snapshot.activeAttempt, finalizedAttempts: snapshot.finalizedAttempts };
  if (route.view === "finalized_training") {
    const result = snapshot.finalizedAttempts.find((item) => item.attemptId === route.attemptId);
    if (result) return { view: "finalized_training", result, activeAttempt: snapshot.activeAttempt, finalizedAttempts: snapshot.finalizedAttempts };
  }
  return { view: "landing", primaryAction: snapshot.activeAttempt ? "resume" : "start", activeAttempt: snapshot.activeAttempt, finalizedAttempts: snapshot.finalizedAttempts };
}
