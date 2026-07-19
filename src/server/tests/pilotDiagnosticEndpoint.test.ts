import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPilotDiagnosticFinalizationRequest,
  createPilotDiagnosticAttempt,
} from "../../features/pilotDiagnostic/engine";
import {
  startManagedHttpTestServer,
  type ManagedHttpTestServer,
} from "../testing/httpTestHarness";

let managedServer: ManagedHttpTestServer | null = null;

async function startApp() {
  vi.resetModules();
  process.env.AUTH_MODE = "disabled";
  const { default: app } = await import("../httpApp");
  managedServer = await startManagedHttpTestServer(createServer(app));
  return managedServer;
}

afterEach(async () => {
  await managedServer?.close();
  managedServer = null;
});

describe("pilot diagnostic endpoint", () => {
  it("não fornece gabarito por GET e corrige somente após POST de finalização", async () => {
    const appServer = await startApp();
    const before = await appServer.request("/api/diagnostic-finalize");
    expect(before.status).toBe(405);
    expect(before.text).not.toContain("operationalAnswer");

    const request = buildPilotDiagnosticFinalizationRequest(
      createPilotDiagnosticAttempt("endpoint", "2026-07-18T15:00:00.000Z"),
    );
    const response = await appServer.request("/api/diagnostic-finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = response.json<Record<string, any>>();
    expect(response.status).toBe(200);
    expect(payload.corrections).toHaveLength(24);
    expect(payload.traceability).toHaveLength(24);
    expect(payload.affectsSde).toBe(false);
  });
});
