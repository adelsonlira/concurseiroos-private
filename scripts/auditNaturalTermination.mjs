import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runCommandWithExitAudit } from "./lib/processExitAudit.mjs";

const root = process.cwd();
const reportDirectory = path.join(root, "reports/process-termination");
await mkdir(reportDirectory, { recursive: true });

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const testAudit = await runCommandWithExitAudit({
  label: "npm run test:run",
  command: npmCommand,
  args: ["run", "test:run"],
  cwd: root,
  timeoutMs: 120_000,
  outputPath: "reports/process-termination/test-run-exit.json",
  requirePatterns: [/Test Files\s+\d+ passed/, /Tests\s+\d+ passed/, /Duration\s+/],
  forbiddenPatterns: [/Command timed out/, /SIGKILL/, /SIGTERM/],
});

const testText = testAudit.stdout.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
const durationIndex = testText.lastIndexOf("Duration");
const postSummary = durationIndex >= 0 ? testText.slice(durationIndex).split(/\r?\n/).slice(1).filter((line) => line.trim()) : [];
if (postSummary.length > 0) {
  throw new Error(`Saída inesperada após o resumo do Vitest: ${postSummary.join(" | ")}`);
}

const smokeAudit = await runCommandWithExitAudit({
  label: "npm run training:smoke-serverless",
  command: npmCommand,
  args: ["run", "training:smoke-serverless"],
  cwd: root,
  timeoutMs: 30_000,
  outputPath: "reports/process-termination/serverless-smoke-exit.json",
  requirePatterns: [/"status"\s*:\s*"PASS"/, /"teardown"\s*:/, /"activeSocketsAfterClose"\s*:\s*0/],
  forbiddenPatterns: [/Command timed out/, /SIGKILL/, /SIGTERM/],
});

const summary = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: "PASS",
  testRun: {
    durationMs: testAudit.durationMs,
    exitCode: testAudit.exitCode,
    signal: testAudit.signal,
    naturalExit: testAudit.naturalExit,
    childProcessesRemaining: testAudit.descendantProcessGroupRemaining ? 1 : 0,
    outputAfterSummary: postSummary,
  },
  serverlessSmoke: {
    durationMs: smokeAudit.durationMs,
    exitCode: smokeAudit.exitCode,
    signal: smokeAudit.signal,
    naturalExit: smokeAudit.naturalExit,
    childProcessesRemaining: smokeAudit.descendantProcessGroupRemaining ? 1 : 0,
  },
  timeoutAsSuccess: false,
};
await writeFile(path.join(reportDirectory, "termination-audit-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
