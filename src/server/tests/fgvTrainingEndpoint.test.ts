import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  answerFgvTrainingQuestion,
  buildCheckFgvTrainingRequest,
  buildFinalizeFgvTrainingRequest,
  createFgvTrainingAttempt,
} from "../../features/fgvTraining/engine";
import { FGV_TRAINING_CATALOG } from "../../features/fgvTraining/catalog";
import type {
  CheckFgvTrainingAnswerRequest,
  FgvTrainingFilters,
} from "../../features/fgvTraining/types";
import {
  startManagedHttpTestServer,
  type ManagedHttpTestServer,
} from "../testing/httpTestHarness";

let managedServer: ManagedHttpTestServer;
const filters: FgvTrainingFilters = {
  selectionArea: null,
  primaryItemId: null,
  adherence: "DIRECT",
  quantity: 5,
};

function checkedRequest(): CheckFgvTrainingAnswerRequest {
  let active = createFgvTrainingAttempt(
    "endpoint-check",
    "2026-07-18T18:00:00.000Z",
    filters,
    "seed-endpoint",
  );
  active = answerFgvTrainingQuestion(
    active,
    active.questionOrder[0],
    "A",
    "2026-07-18T18:01:00.000Z",
  );
  return buildCheckFgvTrainingRequest(active, active.questionOrder[0]);
}

async function postCheck(body: unknown) {
  const response = await managedServer.request("/api/training-fgv/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, payload: response.json<Record<string, unknown>>() };
}

beforeAll(async () => {
  vi.resetModules();
  process.env.AUTH_MODE = "disabled";
  const { default: app } = await import("../httpApp");
  managedServer = await startManagedHttpTestServer(createServer(app));
}, 15_000);

afterAll(async () => {
  await managedServer?.close();
});

describe("Treino FGV endpoints", () => {
  it("não expõe correção por GET", async () => {
    const response = await managedServer.request("/api/training-fgv/check");
    expect(response.status).toBe(405);
    expect(response.text).not.toContain("operationalAnswer");
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
    const { response, payload } = await postCheck({
      ...request,
      attemptId: "",
      questionOrder: [],
    });
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/tentativa|Identificador/i);
  });

  it("rejeita questão fora da tentativa", async () => {
    const request = checkedRequest();
    const outside = FGV_TRAINING_CATALOG.questions.find(
      (question) => !request.questionOrder.includes(question.questionId),
    )!;
    const { response, payload } = await postCheck({
      ...request,
      questionId: outside.questionId,
    });
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/fora da tentativa/i);
  });

  it("rejeita alternativa inválida", async () => {
    const request = checkedRequest();
    const { response, payload } = await postCheck({
      ...request,
      selectedAnswer: "Z",
    });
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Alternativa inválida/i);
  });

  it("finaliza tentativa com brancos e marcadores de isolamento", async () => {
    const active = createFgvTrainingAttempt(
      "endpoint-final",
      "2026-07-18T18:00:00.000Z",
      filters,
      "seed-final",
    );
    const response = await managedServer.request("/api/training-fgv/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildFinalizeFgvTrainingRequest(active)),
    });
    const payload = response.json<Record<string, any>>();
    expect(response.status).toBe(200);
    expect(payload.blankCount).toBe(5);
    expect(payload.corrections).toHaveLength(5);
    expect(payload.affectsSde).toBe(false);
    expect(payload.countsAsOfficialSimulation).toBe(false);
  });
});
