import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkFgvTrainingAnswer, FgvTrainingApiError } from "../api";
import type { CheckFgvTrainingAnswerRequest } from "../types";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("../../../integrations/cloud/authenticatedFetch", () => ({ authenticatedFetch: fetchMock }));

const request: CheckFgvTrainingAnswerRequest = {
  attemptId: "api-hotfix",
  catalogId: "cur-bd-banco-operacional-fgv-dataprev-v2-training",
  catalogVersion: 1,
  questionOrder: ["question-1"],
  questionId: "question-1",
  selectedAnswer: "A",
};

beforeEach(() => fetchMock.mockReset());

describe("cliente seguro de correção do Treino FGV", () => {
  it("informa rota ausente com status específico sem descartar a requisição", async () => {
    fetchMock.mockResolvedValueOnce(new Response("The page could not be found\nNOT_FOUND", { status: 404, headers: { "Content-Type": "text/plain" } }));
    try {
      await checkFgvTrainingAnswer(request);
      throw new Error("Era esperado erro.");
    } catch (error) {
      expect(error).toMatchObject({ name: "FgvTrainingApiError", status: 404 });
      expect((error as Error).message).toMatch(/não foi encontrado.*HTTP 404/i);
    }
  });

  it("preserva mensagem JSON específica do servidor", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Questão fora da tentativa." }, { status: 400 }));
    await expect(checkFgvTrainingAnswer(request)).rejects.toThrow("Questão fora da tentativa.");
  });

  it("aceita payload de correção somente após HTTP 200", async () => {
    const payload = { questionId: "question-1", selectedAnswer: "A", operationalAnswer: "B", status: "INCORRECT" };
    fetchMock.mockResolvedValueOnce(Response.json(payload));
    await expect(checkFgvTrainingAnswer(request)).resolves.toEqual(payload);
  });

  it("expõe corpo e status somente no erro técnico controlado", async () => {
    fetchMock.mockResolvedValueOnce(new Response("upstream unavailable", { status: 503 }));
    try {
      await checkFgvTrainingAnswer(request);
      throw new Error("Era esperado erro.");
    } catch (error) {
      expect(error).toBeInstanceOf(FgvTrainingApiError);
      expect((error as FgvTrainingApiError).status).toBe(503);
      expect((error as FgvTrainingApiError).responseBody).toBe("upstream unavailable");
      expect((error as Error).message).toMatch(/temporariamente indisponível/i);
    }
  });
});
