import { authenticatedFetch } from "../../integrations/cloud/authenticatedFetch";
import type {
  FinalizePilotDiagnosticRequest,
  FinalizedPilotDiagnosticAttempt,
} from "./types";

export async function finalizePilotDiagnostic(
  request: FinalizePilotDiagnosticRequest,
): Promise<FinalizedPilotDiagnosticAttempt> {
  const response = await authenticatedFetch("/api/diagnostic-finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = await response.json().catch(() => null) as
    | FinalizedPilotDiagnosticAttempt
    | { error?: string }
    | null;
  if (!response.ok) {
    throw new Error(payload && "error" in payload && payload.error
      ? payload.error
      : "Não foi possível finalizar o diagnóstico.");
  }
  return payload as FinalizedPilotDiagnosticAttempt;
}
