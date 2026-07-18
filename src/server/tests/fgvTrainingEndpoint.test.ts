import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCheckFgvTrainingRequest, buildFinalizeFgvTrainingRequest, createFgvTrainingAttempt, answerFgvTrainingQuestion } from "../../features/fgvTraining/engine";
import type { FgvTrainingFilters } from "../../features/fgvTraining/types";
let server: Server | null = null;
const filters: FgvTrainingFilters = { selectionArea: null, primaryItemId: null, adherence: "BOTH", quantity: 5 };
async function startApp() {
  vi.resetModules(); process.env.AUTH_MODE = "disabled"; const { default: app } = await import("../httpApp");
  server = app.listen(0, "127.0.0.1"); await new Promise<void>((resolve) => server!.once("listening", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Servidor sem porta"); return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); server = null; });
describe("Treino FGV endpoints", () => {
  it("não expõe correção por GET e corrige uma resposta somente por POST", async () => {
    const base = await startApp();
    const get = await fetch(`${base}/api/training-fgv/check`); expect(get.status).toBe(405); expect(await get.text()).not.toContain("operationalAnswer");
    let active = createFgvTrainingAttempt("endpoint-check", "2026-07-18T18:00:00.000Z", filters, "seed-endpoint");
    active = answerFgvTrainingQuestion(active, active.questionOrder[0], "A", "2026-07-18T18:01:00.000Z");
    const response = await fetch(`${base}/api/training-fgv/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildCheckFgvTrainingRequest(active, active.questionOrder[0])) });
    const payload = await response.json(); expect(response.status).toBe(200); expect(payload.questionId).toBe(active.questionOrder[0]); expect(payload.operationalAnswer).toMatch(/^[A-E]$/);
  });
  it("finaliza tentativa com brancos e marcadores de isolamento", async () => {
    const base = await startApp();
    const active = createFgvTrainingAttempt("endpoint-final", "2026-07-18T18:00:00.000Z", filters, "seed-final");
    const response = await fetch(`${base}/api/training-fgv/finalize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildFinalizeFgvTrainingRequest(active)) });
    const payload = await response.json(); expect(response.status).toBe(200); expect(payload.blankCount).toBe(5); expect(payload.corrections).toHaveLength(5); expect(payload.affectsSde).toBe(false); expect(payload.countsAsOfficialSimulation).toBe(false);
  });
});
