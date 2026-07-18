import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPilotDiagnosticFinalizationRequest, createPilotDiagnosticAttempt } from "../../features/pilotDiagnostic/engine";

let server: Server | null = null;

async function startApp() {
  vi.resetModules();
  process.env.AUTH_MODE = "disabled";
  const { default: app } = await import("../httpApp");
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor de teste sem porta");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
});

describe("pilot diagnostic endpoint", () => {
  it("não fornece gabarito por GET e corrige somente após POST de finalização", async () => {
    const base = await startApp();
    const before = await fetch(`${base}/api/diagnostic-finalize`);
    expect(before.status).toBe(405);
    expect(await before.text()).not.toContain("operationalAnswer");

    const request = buildPilotDiagnosticFinalizationRequest(
      createPilotDiagnosticAttempt("endpoint", "2026-07-18T15:00:00.000Z"),
    );
    const response = await fetch(`${base}/api/diagnostic-finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.corrections).toHaveLength(24);
    expect(payload.traceability).toHaveLength(24);
    expect(payload.affectsSde).toBe(false);
  });
});
