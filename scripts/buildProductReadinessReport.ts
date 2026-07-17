import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { assessProductReadiness, type ReadinessCheck } from "../src/core/readiness";
import packageMetadata from "../package.json";

const knowledgeQuality = JSON.parse(readFileSync(resolve("data/knowledge/official-corpus-quality.json"), "utf8"));
const sdeReportPath = resolve("data/quality/sde-reliability-report.json");
const routingReportPath = resolve("data/quality/pedagogical-routing-report.json");
const runtimeValidationPath = resolve("data/quality/runtime-validation.json");
const errorRecoveryPath = resolve("data/quality/error-recovery-contract.json");
const sdeReport = existsSync(sdeReportPath)
  ? JSON.parse(readFileSync(sdeReportPath, "utf8"))
  : null;
const routingReport = existsSync(routingReportPath)
  ? JSON.parse(readFileSync(routingReportPath, "utf8"))
  : null;
const errorRecoveryReport = existsSync(errorRecoveryPath)
  ? JSON.parse(readFileSync(errorRecoveryPath, "utf8"))
  : null;
const runtimeValidation = existsSync(runtimeValidationPath)
  ? JSON.parse(readFileSync(runtimeValidationPath, "utf8"))
  : null;
const nodeMajor = Number(process.versions.node.split(".")[0]);
const hasSupabaseConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
const hasGeminiConfig = Boolean(process.env.GEMINI_API_KEY);

const checks: ReadinessCheck[] = [
  {
    id: "sde-audit",
    label: "Auditoria decisória do SDE",
    status: sdeReport?.status === "PASS" ? "PASS" : "FAIL",
    requiredForDailyUse: true,
    detail: sdeReport?.status === "PASS" ? `${sdeReport.executableScenario.actionCount} ações auditadas.` : "Relatório ausente ou inválido.",
  },
  {
    id: "corpus-shadow-gate",
    label: "Isolamento do corpus histórico",
    status: knowledgeQuality.shadowMode === true && knowledgeQuality.eligibleForSDEHistoricalIncidence === false ? "PASS" : "FAIL",
    requiredForDailyUse: true,
    detail: "A incidência histórica deve permanecer fora do ranking até os portões de curadoria.",
  },
  {
    id: "taxonomy",
    label: "Taxonomia oficial DATAPREV",
    status: existsSync(resolve("data/knowledge/dataprev-2026-taxonomy.json")) ? "PASS" : "FAIL",
    requiredForDailyUse: true,
    detail: "Escopo oficial e cobertura pedagógica versionados.",
  },
  {
    id: "pedagogical-routing-safety",
    label: "Roteamento pedagógico seguro",
    status:
      routingReport?.status === "PASS" &&
      routingReport?.counts?.unsafeSiblingRoutes === 0 &&
      routingReport?.counts?.noExecutableDiagnosticSource === 0
        ? "PASS"
        : "FAIL",
    requiredForDailyUse: true,
    detail:
      routingReport?.status === "PASS"
        ? `${routingReport.counts.exactTheory} localizadores teóricos exatos, ${routingReport.counts.topicTheoryFallback} fallbacks amplos explícitos e nenhum fallback entre subassuntos irmãos.`
        : "Relatório de roteamento ausente ou inválido.",
  },
  {
    id: "local-persistence",
    label: "Persistência local e backup",
    status: existsSync(resolve("src/store.ts")) && existsSync(resolve("src/components/BackupSettingsView.tsx")) ? "PASS" : "FAIL",
    requiredForDailyUse: true,
    detail: "Registros locais e exportação de backup disponíveis.",
  },
  {
    id: "private-access-gate",
    label: "Gate de acesso privado",
    status:
      existsSync(resolve("src/components/AccessGate.tsx")) &&
      existsSync(resolve("src/integrations/cloud/appAccessPolicy.ts")) &&
      existsSync(resolve("supabase/001_online_foundation.sql"))
        ? "PASS"
        : "FAIL",
    requiredForDailyUse: true,
    detail: "Interface bloqueada antes do login; RLS e bucket privado versionados.",
  },
  {
    id: "diagnostic-placement",
    label: "Diagnóstico antes da teoria",
    status: existsSync(resolve("src/core/diagnostic/diagnosticPlacement.ts")) ? "PASS" : "FAIL",
    requiredForDailyUse: true,
    detail: "Amostra, consulta, branco e confiança governam a elegibilidade para adiar teoria.",
  },
  {
    id: "error-recovery-evidence",
    label: "Correção de erros com evidência",
    status:
      errorRecoveryReport?.status === "PASS" &&
      errorRecoveryReport?.safeguards?.changesSdeRanking === false
        ? "PASS"
        : "FAIL",
    requiredForDailyUse: true,
    detail:
      errorRecoveryReport?.status === "PASS"
        ? `${errorRecoveryReport.causeCount} causas possuem protocolo; ${errorRecoveryReport.confirmationsRequired} verificações independentes são exigidas sem alterar o ranking.`
        : "Contrato de recuperação de erros ausente ou inválido.",
  },
  {
    id: "node-runtime",
    label: "Paridade Node.js 24",
    status: nodeMajor === 24 ? "PASS" : "WARN",
    requiredForDailyUse: false,
    detail: nodeMajor === 24 ? "Runtime-alvo confirmado." : `Executado em Node.js ${process.versions.node}; alvo declarado 24.x.`,
  },
  {
    id: "supabase-authenticated",
    label: "Supabase autenticado",
    status: runtimeValidation?.checks?.requiredLogin?.status === "PASS" ? "PASS" : hasSupabaseConfig ? "WARN" : "NOT_TESTED",
    requiredForDailyUse: false,
    detail: runtimeValidation?.checks?.requiredLogin?.detail ?? (hasSupabaseConfig ? "Configuração presente; o smoke autenticado ainda não foi confirmado." : "Credenciais públicas não disponíveis neste ambiente."),
  },
  {
    id: "cross-device-sync",
    label: "Sincronização entre dispositivos",
    status: runtimeValidation?.checks?.crossDeviceSync?.status === "PASS" ? "PASS" : "NOT_TESTED",
    requiredForDailyUse: false,
    detail: runtimeValidation?.checks?.crossDeviceSync?.detail ?? "Fluxo notebook–celular ainda não confirmado.",
  },
  {
    id: "gemini-live",
    label: "Gemini no backend",
    status: runtimeValidation?.checks?.geminiLive?.status === "PASS" ? "PASS" : hasGeminiConfig ? "WARN" : "NOT_TESTED",
    requiredForDailyUse: false,
    detail: runtimeValidation?.checks?.geminiLive?.detail ?? (hasGeminiConfig ? "Chave presente; resposta real ainda não confirmada." : "Sem chave no ambiente; o Coach determinístico continua operacional."),
  },
];

const assessment = assessProductReadiness(checks);
const artifact = {
  schemaVersion: "1.0.0",
  projectVersion: packageMetadata.version,
  generatedAt: new Date().toISOString(),
  ...assessment,
  guaranteePolicy: "The product may guide and reduce decision error, but it never guarantees approval.",
};
const output = resolve("data/quality/product-readiness-report.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: artifact.status, confidence: artifact.confidence, warnings: artifact.warnings.length }, null, 2));
if (artifact.status === "NOT_READY") process.exit(1);
