import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  ERROR_RECOVERY_CONFIRMATIONS_REQUIRED,
  ERROR_RECOVERY_POLICY_VERSION,
  getErrorRecoveryProtocol,
} from "../src/core/review/errorRecovery";
import type { ErrorCause } from "../src/core/review/types";

const causes: ErrorCause[] = [
  "LACUNA_CONTEUDO",
  "INTERPRETACAO",
  "APLICACAO",
  "MEMORIA",
  "DISTRAÇÃO",
  "PRESSAO_TEMPO",
  "DESCONHECIDA",
];

const protocols = causes.map((cause) => getErrorRecoveryProtocol(cause));
const errors: string[] = [];
if (ERROR_RECOVERY_CONFIRMATIONS_REQUIRED !== 2) {
  errors.push("O contrato deve preservar duas verificações independentes antes da estabilização.");
}
for (const protocol of protocols) {
  if (protocol.steps.length < 4) errors.push(`${protocol.cause} não possui protocolo operacional completo.`);
  if (!protocol.objective.trim()) errors.push(`${protocol.cause} não possui objetivo explícito.`);
}

const artifact = {
  schemaVersion: "1.0.0",
  policyVersion: ERROR_RECOVERY_POLICY_VERSION,
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? "PASS" : "FAIL",
  confirmationsRequired: ERROR_RECOVERY_CONFIRMATIONS_REQUIRED,
  causeCount: causes.length,
  protocols: protocols.map((item) => ({
    cause: item.cause,
    label: item.label,
    stepCount: item.steps.length,
  })),
  safeguards: {
    causeIsUserConfirmed: true,
    correctionRequiredBeforeVerification: true,
    consultationDoesNotConfirmRecovery: true,
    lowConfidenceDoesNotConfirmRecovery: true,
    repeatedErrorReopensCase: true,
    changesSdeRanking: false,
    meansPermanentMastery: false,
  },
  errors,
};

const output = resolve("data/quality/error-recovery-contract.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: artifact.status, causes: artifact.causeCount, confirmationsRequired: artifact.confirmationsRequired }, null, 2));
if (errors.length > 0) process.exit(1);
