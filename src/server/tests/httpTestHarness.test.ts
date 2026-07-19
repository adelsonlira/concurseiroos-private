import { createServer, get as httpGet, type Server } from "node:http";
import { Agent } from "node:http";
import { describe, expect, it } from "vitest";
import { startManagedHttpTestServer } from "../testing/httpTestHarness";

function testServer(): Server {
  return createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true, path: request.url }));
  });
}

describe("managed HTTP test lifecycle", () => {
  it("consome integralmente a resposta e fecha a conexão do cliente", async () => {
    const managed = await startManagedHttpTestServer(testServer());
    const response = await managed.request("/health");
    expect(response.status).toBe(200);
    expect(response.json()).toEqual({ ok: true, path: "/health" });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(managed.activeSocketCount()).toBe(0);
    await managed.close();
  });

  it("encerra socket keep-alive remanescente antes de resolver o teardown", async () => {
    const managed = await startManagedHttpTestServer(testServer());
    const agent = new Agent({ keepAlive: true });
    await new Promise<void>((resolve, reject) => {
      const request = httpGet(`${managed.baseUrl}/keep-alive`, { agent }, (response) => {
        response.resume();
        response.once("end", resolve);
      });
      request.once("error", reject);
    });
    expect(managed.activeSocketCount()).toBeGreaterThanOrEqual(1);
    await managed.close();
    agent.destroy();
    expect(managed.server.listening).toBe(false);
    expect(managed.activeSocketCount()).toBe(0);
  });

  it("remove listeners temporários e permite teardown idempotente", async () => {
    const managed = await startManagedHttpTestServer(testServer());
    const listenerCountBeforeClose = managed.server.listenerCount("connection");
    expect(listenerCountBeforeClose).toBeGreaterThan(0);
    await managed.close();
    expect(managed.server.listenerCount("connection")).toBe(listenerCountBeforeClose - 1);
    await expect(managed.close()).resolves.toBeUndefined();
  });
});
