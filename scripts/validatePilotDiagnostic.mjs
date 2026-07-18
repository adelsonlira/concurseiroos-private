import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const internalPath = resolve(root, "data/diagnostics/diag-fgv-dataprev-bd-v1/diagnostic-v1.internal.json");
const publicPath = resolve(root, "src/features/pilotDiagnostic/data/diagnosticPublicCatalog.json");
const manifestPath = resolve(root, "data/diagnostics/diag-fgv-dataprev-bd-v1/source-manifest.json");
const internal = JSON.parse(readFileSync(internalPath, "utf8"));
const publicCatalog = JSON.parse(readFileSync(publicPath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function fail(message) {
  throw new Error(`[pilot-diagnostic] ${message}`);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function isAbsoluteLocalPath(value) {
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(value) || value.includes("../") || value.includes("..\\");
}

if (internal.diagnostic_id !== "diag-fgv-dataprev-bd-v1") fail("diagnostic_id divergente");
if (internal.version !== "1" || internal.question_count !== 24 || internal.questions.length !== 24) fail("versão ou contagem inválida");
if (internal.fixed_order !== true || internal.penalty_for_wrong_answer !== false) fail("ordem fixa ou penalização alterada");
if (internal.questions.some((question, index) => question.position !== index + 1)) fail("ordem fixa não preservada");
if (new Set(internal.questions.map((question) => question.question_id)).size !== 24) fail("questões duplicadas");

const assetPaths = internal.questions.flatMap((question) => [
  ...(question.statement_assets ?? []),
  ...question.alternatives.flatMap((alternative) => alternative.asset ? [alternative.asset] : []),
]);
const uniqueAssets = [...new Set(assetPaths)];
if (uniqueAssets.length !== 6) fail(`esperados 6 assets; encontrados ${uniqueAssets.length}`);
for (const assetPath of uniqueAssets) {
  if (isAbsoluteLocalPath(assetPath)) fail(`caminho absoluto ou traversal rejeitado: ${assetPath}`);
  const sourcePath = resolve(root, "src/features/pilotDiagnostic", assetPath);
  if (!existsSync(sourcePath) || statSync(sourcePath).size <= 0) fail(`asset ausente: ${assetPath}`);
  const manifestEntry = manifest.assets.find((entry) => entry.file === assetPath);
  if (!manifestEntry) fail(`asset fora do manifesto: ${assetPath}`);
  if (manifestEntry.size_bytes !== statSync(sourcePath).size || manifestEntry.sha256 !== sha256(sourcePath)) {
    fail(`integridade divergente: ${assetPath}`);
  }
}

const controls = internal.questions.map((question) => question.traceability.corpus_ordinal);
if (!controls.includes(14) || !controls.includes(53)) fail("controles 14 e 53 ausentes");
if (internal.questions.filter((question) => question.traceability.adherence === "ADERENTE_DIRETA").length !== 20) fail("esperadas 20 aderentes diretas");
if (internal.questions.filter((question) => question.traceability.adherence === "ADERENTE_PARCIAL").length !== 4) fail("esperadas 4 aderentes parciais");

if (publicCatalog.title !== "Diagnóstico Piloto FGV-DATAPREV — Banco de Dados") fail("título público divergente");
if (publicCatalog.questionCount !== 24 || publicCatalog.questions.length !== 24) fail("catálogo público incompleto");
const serializedPublic = JSON.stringify(publicCatalog);
for (const forbidden of [
  "answer_key", "traceability", "corpus_ordinal", "platform_id", "answer_origin",
  "subject", "subsubject", "primary_edital_item", "justificativa", "principal_record",
]) {
  if (serializedPublic.includes(forbidden)) fail(`campo interno exposto no catálogo público: ${forbidden}`);
}
if (publicCatalog.questions.some((question, index) => question.position !== index + 1)) fail("ordem pública alterada");

console.log("[pilot-diagnostic] PASS — 24 questões, 6 assets, controles 14/53, catálogo público sanitizado.");
