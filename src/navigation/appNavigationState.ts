import { PILOT_DIAGNOSTIC_LANDING_ROUTE, parsePilotDiagnosticHash, type PilotDiagnosticRoute } from "../features/pilotDiagnostic/navigation";
import { FGV_TRAINING_LANDING_ROUTE, parseFgvTrainingHash, type FgvTrainingRoute } from "../features/fgvTraining/navigation";
import { getNavigationItem } from "./navigationModel";

export interface AppNavigationState { activeTab: string; diagnosticRoute: PilotDiagnosticRoute; trainingRoute: FgvTrainingRoute; }
export interface AppHistoryNavigationState { activeTab?: string; }

export function resolveAppNavigationFromLocation(hash: string, historyState?: AppHistoryNavigationState | null): AppNavigationState {
  const trainingRoute = parseFgvTrainingHash(hash);
  if (trainingRoute) return { activeTab: "training-fgv", diagnosticRoute: PILOT_DIAGNOSTIC_LANDING_ROUTE, trainingRoute };
  const diagnosticRoute = parsePilotDiagnosticHash(hash);
  if (diagnosticRoute) return { activeTab: "diagnostic", diagnosticRoute, trainingRoute: FGV_TRAINING_LANDING_ROUTE };
  const historyTab = historyState?.activeTab;
  return { activeTab: historyTab && getNavigationItem(historyTab) ? historyTab : "dashboard", diagnosticRoute: PILOT_DIAGNOSTIC_LANDING_ROUTE, trainingRoute: FGV_TRAINING_LANDING_ROUTE };
}

export function resolveSidebarNavigation(tab: string): AppNavigationState {
  return { activeTab: getNavigationItem(tab) ? tab : "dashboard", diagnosticRoute: PILOT_DIAGNOSTIC_LANDING_ROUTE, trainingRoute: FGV_TRAINING_LANDING_ROUTE };
}
