import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("deterministic validation termination contract", () => {
  it("mantém o runner em dois workers e disponibiliza diagnóstico de hanging process", () => {
    const packageJson = JSON.parse(source("package.json"));
    expect(packageJson.scripts["test:run"]).toContain("--maxWorkers=2");
    expect(packageJson.scripts["test:hanging-process"]).toContain("--reporter=hanging-process");
    expect(source("scripts/runValidationPipeline.sh")).toContain("exec ./node_modules/.bin/vitest run --maxWorkers=2");
    expect(source("src/deployment/tests/serverlessEsmResolution.test.ts")).toContain("await stop()");
  });

  it("o smoke fecha conexões antes de declarar PASS", () => {
    const smoke = source("scripts/smokeFgvTrainingServerless.mjs");
    expect(smoke).not.toContain("await fetch(");
    expect(smoke).toContain('Connection: "close"');
    expect(smoke).toContain("agent: false");
    expect(smoke).toContain("server.closeIdleConnections?.()");
    expect(smoke).toContain("server.closeAllConnections?.()");
    expect(smoke).toContain("socket.destroy()");
    expect(smoke.indexOf("teardown = await closeServerNaturally()"))
      .toBeLessThan(smoke.lastIndexOf("console.log"));
  });

  it("o auditor trata timeout, sinal ou descendentes como falha", () => {
    const audit = source("scripts/lib/processExitAudit.mjs");
    expect(audit).toContain("timedOut = true");
    expect(audit).toContain("descendantProcessGroupRemaining");
    expect(audit).toContain("result.signal === null");
    expect(audit).toContain("throw error");
    expect(audit).not.toContain("process.exit(0)");
    expect(audit).not.toContain("process.exitCode = 0");
  });
});
