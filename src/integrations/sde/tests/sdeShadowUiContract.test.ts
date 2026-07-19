import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(
  new URL("../../../components/DashboardView.tsx", import.meta.url),
  "utf8",
);

describe("SDE shadow calibration UI contract", () => {
  it("shows one effective v1 prescription and labels the v2 comparison as non-prescriptive", () => {
    expect(dashboardSource).toContain("SDE v2 em calibração — não altera a orientação atual");
    expect(dashboardSource).toContain("Decisão efetiva: SDE v1 · execução v2: shadow · afeta prescrição: não.");
    expect(dashboardSource).not.toContain("Executar prescrição SDE v2");
  });
});
