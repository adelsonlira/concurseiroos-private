import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { answerFgvTrainingQuestion, buildCheckFgvTrainingRequest, buildFinalizeFgvTrainingRequest, createFgvTrainingAttempt } from "../../features/fgvTraining/engine";
import { FGV_TRAINING_CATALOG } from "../../features/fgvTraining/catalog";
import type { CheckFgvTrainingAnswerRequest, FgvTrainingFilters } from "../../features/fgvTraining/types";

let server: Server;
let base = "";
const filters: FgvTrainingFilters = { selectionArea: null, primaryItemId: null, adherence: "DIRECT", quantity: 5 };

function checkedRequest(): CheckFgvTrainingAnswerRequest {
  let active = createFgvTrainingAttempt("endpoint-check", "2026-07-18T18:00:00.000Z", filters, "seed-endpoint");
  active = answerFgvTrainingQuestion(active, active.questionOrder[0], "A", "2026-07-18T18:01:00.000Z");
  return buildCheckFgvTrainingRequest(active, active.questionOrder[0]);
}

async function postCheck(body: unknown) {
  const response = await fetch(`${base}/api/training-fgv/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, payload: await response.json() as Record<string, unknown> };
}

beforeAll(async () => {
  vi.resetModules();
  process.env.AUTH_MODE = "disabled";
  const { default: app } = await import("../httpApp");
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor sem porta");
  base = `http://127.0.0.1:${address.port}`;
}, 15_000);

afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Treino FGV endpoints", () => {
  it("não expõe correção por GET", async () => {
    const response = await fetch(`${base}/api/training-fgv/check`);
    expect(response.status).toBe(405);
    expect(await response.text()).not.toContain("operationalAnswer");
  });

  it("corrige questão válida por POST com HTTP 200", async () => {
    const request = checkedRequest();
    const { response, payload } = await postCheck(request);
    expect(response.status).toBe(200);
    expect(payload.questionId).toBe(request.questionId);
    expect(payload.operationalAnswer).toMatch(/^[A-E]$/);
  });

  it("rejeita tentativa inexistente ou inválida", async () => {
    const request = checkedRequest();
    const { response, payload } = await postCheck({ ...request, attemptId: "", questionOrder: [] });
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/tentativa|Identificador/i);
  });

  it("rejeita questão fora da tentativa", async () => {
    const request = checkedRequest();
    const outside = FGV_TRAINING_CATALOG.questions.find((question) => !request.questionOrder.includes(question.questionId))!;
    const { response, payload } = await postCheck({ ...request, questionId: outside.questionId });
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/fora da tentativa/i);
  });

  it("rejeita alternativa inválida", async () => {
    const request = checkedRequest();
    const { response, payload } = await postCheck({ ...request, selectedAnswer: "Z" });
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Alternativa inválida/i);
  });

  it("finaliza tentativa com brancos e marcadores de isolamento", async () => {
    const active = createFgvTrainingAttempt("endpoint-final", "2026-07-18T18:00:00.000Z", filters, "seed-final");
    const response = await fetch(`${base}/api/training-fgv/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildFinalizeFgvTrainingRequest(active)),
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.blankCount).toBe(5);
    expect(payload.corrections).toHaveLength(5);
    expect(payload.affectsSde).toBe(false);
    expect(payload.countsAsOfficialSimulation).toBe(false);
  });
});
