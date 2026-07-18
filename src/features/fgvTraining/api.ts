import { authenticatedFetch } from "../../integrations/cloud/authenticatedFetch";
import type { CheckFgvTrainingAnswerRequest, FgvTrainingCheckedCorrection, FinalizeFgvTrainingRequest, FinalizedFgvTrainingAttempt } from "./types";

interface ErrorPayload { error?: string; code?: string; }

export class FgvTrainingApiError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(message: string, status: number, responseBody: string) {
    super(message);
    this.name = "FgvTrainingApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function fallbackForStatus(status: number, fallback: string): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente e tente conferir a resposta.";
  if (status === 403) return "Sua sessão não tem permissão para conferir esta resposta.";
  if (status === 404) return "O serviço de correção do Treino FGV não foi encontrado nesta publicação (HTTP 404). Atualize a página e tente novamente.";
  if (status === 405) return "A publicação recusou o método de correção esperado (HTTP 405).";
  if (status === 413) return "A solicitação de correção excedeu o limite aceito pelo servidor.";
  if (status >= 500) return "O serviço de correção está temporariamente indisponível. Sua alternativa foi mantida; tente novamente.";
  return `${fallback} (HTTP ${status}).`;
}

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await response.text();
  let payload: T | ErrorPayload | null = null;
  if (responseBody) {
    try { payload = JSON.parse(responseBody) as T | ErrorPayload; } catch { payload = null; }
  }
  if (!response.ok) {
    const serverMessage = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error.trim()
      : "";
    throw new FgvTrainingApiError(serverMessage || fallbackForStatus(response.status, fallback), response.status, responseBody);
  }
  if (!payload) throw new FgvTrainingApiError("O servidor retornou uma resposta vazia para a correção.", response.status, responseBody);
  return payload as T;
}

export function checkFgvTrainingAnswer(request: CheckFgvTrainingAnswerRequest) {
  return postJson<FgvTrainingCheckedCorrection>("/api/training-fgv/check", request, "Não foi possível conferir a resposta");
}

export function finalizeFgvTraining(request: FinalizeFgvTrainingRequest) {
  return postJson<FinalizedFgvTrainingAttempt>("/api/training-fgv/finalize", request, "Não foi possível finalizar o treino");
}
