import { authenticatedFetch } from "../../integrations/cloud/authenticatedFetch";
import type { CheckFgvTrainingAnswerRequest, FgvTrainingCheckedCorrection, FinalizeFgvTrainingRequest, FinalizedFgvTrainingAttempt } from "./types";

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) throw new Error(payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : fallback);
  return payload as T;
}

export function checkFgvTrainingAnswer(request: CheckFgvTrainingAnswerRequest) {
  return postJson<FgvTrainingCheckedCorrection>("/api/training-fgv/check", request, "Não foi possível conferir a resposta.");
}
export function finalizeFgvTraining(request: FinalizeFgvTrainingRequest) {
  return postJson<FinalizedFgvTrainingAttempt>("/api/training-fgv/finalize", request, "Não foi possível finalizar o treino.");
}
