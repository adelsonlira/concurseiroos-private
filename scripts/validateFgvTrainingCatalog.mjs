import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "data", "training-fgv", "source");
const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, "CUR-BD-BANCO-OPERACIONAL-v2-MANIFESTO.json"), "utf8"));
const publicCatalogPath = path.join(root, "src", "features", "fgvTraining", "data", "trainingPublicCatalog.json");
const privateCatalogPath = path.join(root, "src", "server", "training", "data", "trainingPrivateCatalog.json");
const publicCatalog = JSON.parse(fs.readFileSync(publicCatalogPath, "utf8"));
const privateCatalog = JSON.parse(fs.readFileSync(privateCatalogPath, "utf8"));
const sourceRecords = fs.readFileSync(path.join(sourceDir, "CUR-BD-BANCO-OPERACIONAL-v2-FGV-DATAPREV-797.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const sha = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const absolute = /^(?:[A-Za-z]:[\\/]|\\\\|\/home\/|\/Users\/|\/var\/|\/tmp\/|file:)/i;
for (const item of manifest.deliverables) {
  const p = path.join(sourceDir, item.file);
  if (!fs.existsSync(p) || fs.statSync(p).size !== item.size_bytes || sha(p) !== item.sha256) throw new Error(`Entregável operacional inválido: ${item.file}`);
}
if (sourceRecords.length !== 797 || sourceRecords.length !== manifest.counts.records_total) throw new Error("Os 797 registros de origem não foram preservados.");
if (publicCatalog.eligibleQuestionCount !== publicCatalog.questions.length || privateCatalog.questions.length !== publicCatalog.questions.length) throw new Error("Quantidade elegível divergente.");
if (publicCatalog.affectsSde !== false || publicCatalog.countsAsOfficialSimulation !== false) throw new Error("Marcadores de isolamento inválidos.");
const publicIds = new Set();
const privateIds = new Set(privateCatalog.questions.map((q) => q.questionId));
const assetPaths = new Set();
const forbidden = new Set(["operationalAnswer", "answerOrigin", "corpusOrdinal", "platformId", "principalRecord", "recordFingerprint", "rationale", "subject", "subsubject"]);
function walk(value, pathLabel = "catalog") {
  if (Array.isArray(value)) return value.forEach((item, i) => walk(item, `${pathLabel}[${i}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (forbidden.has(key)) throw new Error(`Campo privado no catálogo público: ${pathLabel}.${key}`);
    walk(item, `${pathLabel}.${key}`);
  }
}
walk(publicCatalog);
for (const question of publicCatalog.questions) {
  if (publicIds.has(question.questionId)) throw new Error(`ID duplicado: ${question.questionId}`);
  publicIds.add(question.questionId);
  if (!privateIds.has(question.questionId)) throw new Error(`Questão pública sem registro privado: ${question.questionId}`);
  if (!question.stem?.trim()) throw new Error(`Enunciado vazio: ${question.questionId}`);
  if (question.alternatives.length !== 5 || question.alternatives.map((a) => a.label).join("") !== "ABCDE") throw new Error(`Alternativas inválidas: ${question.questionId}`);
  for (const alt of question.alternatives) {
    if (!alt.text?.trim() && !alt.assetPath) throw new Error(`Alternativa sem texto ou imagem: ${question.questionId}-${alt.label}`);
    if (alt.assetPath) assetPaths.add(alt.assetPath);
  }
  for (const p of question.statementAssetPaths) assetPaths.add(p);
}
for (const assetPath of assetPaths) {
  if (absolute.test(assetPath) || assetPath.startsWith("/") || assetPath.includes("..") || !assetPath.startsWith("fgv-training/assets/")) throw new Error(`Caminho de asset inválido: ${assetPath}`);
  if (!fs.existsSync(path.join(root, "static", assetPath))) throw new Error(`Asset referenciado ausente: ${assetPath}`);
}
const privateOrdinals = new Set(privateCatalog.questions.map((q) => q.corpusOrdinal));
for (const ordinal of manifest.irrecoverable_ordinals) if (privateOrdinals.has(ordinal)) throw new Error(`Irrecuperável importada: ${ordinal}`);
if (privateOrdinals.has(648)) throw new Error("Referência duplicada 648 importada.");
if (new Set(privateCatalog.questions.map((q) => q.principalRecord)).size !== privateCatalog.questions.length) throw new Error("Referências duplicadas no catálogo.");
if (manifest.recovery_assets.files.length !== 301) throw new Error("Manifesto de assets divergente.");
for (const asset of manifest.recovery_assets.files) {
  const p = path.join(root, "static", "fgv-training", asset.path);
  if (!fs.existsSync(p) || fs.statSync(p).size !== asset.size_bytes || sha(p) !== asset.sha256) throw new Error(`Asset inválido: ${asset.path}`);
}
console.log(`Treino FGV validado: 797 registros de origem, ${publicCatalog.questions.length} questões elegíveis, 301 assets íntegros.`);
