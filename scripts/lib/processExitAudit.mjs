import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function processGroupExists(pid) {
  if (process.platform === "win32") return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function signalProcessGroup(pid, signal) {
  if (process.platform === "win32") return;
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

export async function runCommandWithExitAudit({
  label,
  command,
  args = [],
  cwd = process.cwd(),
  timeoutMs,
  outputPath,
  requirePatterns = [],
  forbiddenPatterns = [],
  echo = true,
}) {
  const startedAt = new Date();
  const startedNs = process.hrtime.bigint();
  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const child = spawn(command, args, {
    cwd,
    env: process.env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdout += text;
    if (echo) process.stdout.write(text);
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    if (echo) process.stderr.write(text);
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    signalProcessGroup(child.pid, "SIGTERM");
    setTimeout(() => signalProcessGroup(child.pid, "SIGKILL"), 2_000).unref();
  }, timeoutMs);
  timeout.unref();

  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timeout);

  const quiescenceStartedAt = Date.now();
  let descendantProcessGroupRemaining = processGroupExists(child.pid);
  while (descendantProcessGroupRemaining && Date.now() - quiescenceStartedAt < 2_000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    descendantProcessGroupRemaining = processGroupExists(child.pid);
  }
  const quiescenceWaitMs = Date.now() - quiescenceStartedAt;
  if (descendantProcessGroupRemaining) signalProcessGroup(child.pid, "SIGKILL");

  const endedAt = new Date();
  const durationMs = Number(process.hrtime.bigint() - startedNs) / 1_000_000;
  const combined = stripAnsi(`${stdout}\n${stderr}`);
  const missingPatterns = requirePatterns.filter((pattern) => !pattern.test(combined)).map(String);
  const matchedForbiddenPatterns = forbiddenPatterns.filter((pattern) => pattern.test(combined)).map(String);

  const audit = {
    schemaVersion: "1.0.0",
    label,
    command: [command, ...args],
    cwd,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: Math.round(durationMs),
    timeoutMs,
    timedOut,
    exitCode: result.code,
    signal: result.signal,
    descendantProcessGroupRemaining,
    quiescenceWaitMs,
    missingPatterns,
    matchedForbiddenPatterns,
    naturalExit:
      !timedOut &&
      result.code === 0 &&
      result.signal === null &&
      !descendantProcessGroupRemaining &&
      missingPatterns.length === 0 &&
      matchedForbiddenPatterns.length === 0,
  };

  if (outputPath) {
    const absolute = path.resolve(cwd, outputPath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  }

  if (!audit.naturalExit) {
    const error = new Error(`Falha de encerramento natural em ${label}: ${JSON.stringify(audit)}`);
    error.audit = audit;
    throw error;
  }
  return { ...audit, stdout, stderr };
}
