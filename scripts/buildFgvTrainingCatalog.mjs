import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "data", "training-fgv", "source");
const publicAssetsDir = path.join(root, "static", "fgv-training", "assets");
const jsonlPath = path.join(sourceDir, "CUR-BD-BANCO-OPERACIONAL-v2-FGV-DATAPREV-797.jsonl");
const manifestPath = path.join(sourceDir, "CUR-BD-BANCO-OPERACIONAL-v2-MANIFESTO.json");
const publicCatalogPath = path.join(root, "src", "features", "fgvTraining", "data", "trainingPublicCatalog.json");
const privateCatalogPath = path.join(root, "src", "server", "training", "data", "trainingPrivateCatalog.json");
const reportPath = path.join(root, "data", "training-fgv", "derived", "training-import-report.json");
const derivedManifestPath = path.join(root, "data", "training-fgv", "derived", "training-catalog-manifest.json");

const LABELS = ["A", "B", "C", "D", "E"];
const ABSOLUTE_LOCAL_PATH = /^(?:[A-Za-z]:[\\/]|\\\\|\/home\/|\/Users\/|\/var\/|\/tmp\/|file:)/i;

const SELECTION_AREA_BY_ITEM_ID = Object.freeze({
  "dp26-p3-esp-bd-estruturados": "Dados estruturados, não estruturados ou Big Data",
  "dp26-p3-esp-bd-datalake-bigdata": "Dados estruturados, não estruturados ou Big Data",
  "dp26-p3-esp-bd-nosql": "NoSQL",
  "dp26-p3-esp-bd-integracao-ingestao": "Integração de dados, ETL ou ingestão",
  "dp26-p3-esp-bi-fontes": "Integração de dados, ETL ou ingestão",
  "dp26-p3-esp-bd-sgbd": "SGBD e administração",
  "dp26-p3-esp-bd-modelagem": "Modelagem de dados",
  "dp26-p3-esp-bd-integridade": "Modelagem de dados",
  "dp26-p3-esp-bd-dimensional": "Modelagem dimensional, Data Warehouse ou OLAP",
  "dp26-p3-esp-bd-relacional-multidimensional": "Modelagem dimensional, Data Warehouse ou OLAP",
  "dp26-p3-esp-bd-propriedades": "Transações e concorrência",
  "dp26-p3-esp-bd-normalizacao": "Normalização",
  "dp26-p3-esp-bd-sql": "SQL",
  "dp26-p3-esp-bd-ddl": "SQL",
  "dp26-p3-esp-bd-dml": "SQL",
  "dp26-p3-esp-bd-metadados": "Metadados ou qualidade de dados",
  "dp26-p3-esp-codificacao": "Correspondências parciais interdisciplinares adicionais",
  "dp26-p3-esp-linguagens-frameworks": "Correspondências parciais interdisciplinares adicionais",
  "dp26-p3-ia-machine-learning": "Correspondências parciais interdisciplinares adicionais",
  "dp26-p3-esp-ux-cms": "Correspondências parciais interdisciplinares adicionais",
});

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertRelativeSourceAsset(assetPath) {
  if (!assetPath || ABSOLUTE_LOCAL_PATH.test(assetPath) || path.isAbsolute(assetPath) || assetPath.includes("..")) {
    throw new Error(`Caminho de asset inválido: ${assetPath || "(vazio)"}`);
  }
  if (!assetPath.startsWith("assets/")) {
    throw new Error(`Asset fora do diretório operacional: ${assetPath}`);
  }
}

function resolveSourceAlternative(record, label) {
  const recovered = record.recuperacao_direcionada_v2?.alternativas_recuperadas?.[label];
  const text = typeof record.options?.[label] === "string" ? record.options[label].trim() : "";
  const sourceAsset = typeof recovered?.arquivo === "string" ? recovered.arquivo.trim() : "";
  if (sourceAsset) assertRelativeSourceAsset(sourceAsset);
  return {
    label,
    text,
    ...(sourceAsset ? { assetPath: `fgv-training/${sourceAsset}` } : {}),
  };
}

function resolveStem(record) {
  const recovered = record.recuperacao_direcionada_v2?.enunciado_recuperado;
  if (typeof recovered === "string" && recovered.trim()) return recovered.trim();
  return typeof record.stem === "string" ? record.stem.trim() : "";
}

function resolveStatementAssets(record) {
  const sourceAsset = record.recuperacao_direcionada_v2?.arquivo_renderizacao_questao;
  if (typeof sourceAsset !== "string" || !sourceAsset.trim()) return [];
  assertRelativeSourceAsset(sourceAsset.trim());
  return [`fgv-training/${sourceAsset.trim()}`];
}

function buildQuestionId(record) {
  const payload = `CUR-BD-BANCO-OPERACIONAL-v2:${record.ordinal}:${record.platform_id}`;
  return `fgv-bd-${createHash("sha256").update(payload).digest("hex").slice(0, 16)}`;
}

function exclusionReasons(record) {
  const reasons = [];
  const bank = record.banco_operacional ?? {};
  const integrity = bank.integridade ?? {};
  const duplication = bank.duplicacao ?? {};
  const alternatives = LABELS.map((label) => resolveSourceAlternative(record, label));

  if (bank.apta_para_estudo !== true) reasons.push("NOT_FIT_FOR_STUDY");
  if (duplication.e_registro_principal !== true) reasons.push("DUPLICATE_REFERENCE");
  if (!resolveStem(record)) reasons.push("UNUSABLE_STEM");
  if (alternatives.some((alternative) => !alternative.text && !alternative.assetPath)) reasons.push("MISSING_OPTION");
  if (integrity.anulada_oficialmente === true) reasons.push("OFFICIALLY_ANNULLED");
  if (integrity.resposta_conflitante === true) reasons.push("ANSWER_CONFLICT");
  if (bank.inapta_operacionalmente === true || integrity.extracao_suficiente !== true) reasons.push("OPERATIONALLY_UNFIT");
  if (!LABELS.includes(integrity.resposta_operacional)) reasons.push("MISSING_OPERATIONAL_ANSWER");
  return [...new Set(reasons)];
}

function validateManifest(manifest) {
  if (manifest.version !== 2) throw new Error("Manifesto operacional incompatível.");
  for (const deliverable of manifest.deliverables ?? []) {
    const filePath = path.join(sourceDir, deliverable.file);
    if (!fs.existsSync(filePath)) throw new Error(`Entregável ausente: ${deliverable.file}`);
    const stat = fs.statSync(filePath);
    if (stat.size !== deliverable.size_bytes) throw new Error(`Tamanho divergente: ${deliverable.file}`);
    if (sha256File(filePath) !== deliverable.sha256) throw new Error(`Hash divergente: ${deliverable.file}`);
  }
  const assetFiles = manifest.recovery_assets?.files ?? [];
  if (assetFiles.length !== 301) throw new Error("Manifesto não contém os 301 assets esperados.");
  for (const asset of assetFiles) {
    assertRelativeSourceAsset(asset.path);
    const filePath = path.join(root, "static", "fgv-training", asset.path);
    if (!fs.existsSync(filePath)) throw new Error(`Asset ausente: ${asset.path}`);
    const stat = fs.statSync(filePath);
    if (stat.size !== asset.size_bytes) throw new Error(`Tamanho divergente no asset: ${asset.path}`);
    if (sha256File(filePath) !== asset.sha256) throw new Error(`Hash divergente no asset: ${asset.path}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
validateManifest(manifest);
const sourceLines = fs.readFileSync(jsonlPath, "utf8").split(/\r?\n/).filter(Boolean);
const records = sourceLines.map((line, index) => {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`JSONL inválido na linha ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
  }
});

if (records.length !== manifest.counts.records_total) {
  throw new Error(`Quantidade de origem divergente: ${records.length}.`);
}

const exclusions = new Map();
const eligibleRecords = [];
for (const record of records) {
  const reasons = exclusionReasons(record);
  if (reasons.length === 0) eligibleRecords.push(record);
  else exclusions.set(record.ordinal, reasons);
}

const publicQuestions = eligibleRecords.map((record) => {
  const item = record.item_edital_primario ?? {};
  const selectionArea = SELECTION_AREA_BY_ITEM_ID[item.id];
  if (!selectionArea) throw new Error(`Item primário sem agrupamento operacional: ${item.id || "(vazio)"}.`);
  const adherence = record.banco_operacional.classe_aderencia === "ADERENTE_DIRETA" ? "DIRECT" : "PARTIAL";
  return {
    questionId: buildQuestionId(record),
    stem: resolveStem(record),
    statementAssetPaths: resolveStatementAssets(record),
    alternatives: LABELS.map((label) => resolveSourceAlternative(record, label)),
    selectionArea,
    primaryItem: {
      id: item.id,
      name: item.name,
    },
    adherence,
  };
});

const privateQuestions = eligibleRecords.map((record, index) => ({
  questionId: publicQuestions[index].questionId,
  operationalAnswer: record.banco_operacional.integridade.resposta_operacional,
  answerOrigin: record.banco_operacional.integridade.gabarito_origem,
  corpusOrdinal: record.ordinal,
  platformId: record.platform_id,
  principalRecord: record.banco_operacional.duplicacao.registro_principal,
  recordFingerprint: createHash("sha256").update(JSON.stringify({
    ordinal: record.ordinal,
    platformId: record.platform_id,
    answer: record.banco_operacional.integridade.resposta_operacional,
    itemId: record.item_edital_primario.id,
  })).digest("hex"),
}));

const publicIds = new Set(publicQuestions.map((question) => question.questionId));
if (publicIds.size !== publicQuestions.length) throw new Error("Identificadores derivados não são únicos.");
const principalOrdinals = new Set();
for (const record of eligibleRecords) {
  const principal = record.banco_operacional.duplicacao.registro_principal;
  if (principalOrdinals.has(principal)) throw new Error(`Referência principal duplicada no catálogo: ${principal}.`);
  principalOrdinals.add(principal);
}

const publicCatalog = {
  catalogId: "cur-bd-banco-operacional-fgv-dataprev-v2-training",
  version: 1,
  trainingType: "thematic_fgv",
  sourceRecordCount: records.length,
  eligibleQuestionCount: publicQuestions.length,
  assetCount: manifest.recovery_assets.file_count,
  allowedQuantities: [5, 10, 15, 20],
  affectsSde: false,
  countsAsOfficialSimulation: false,
  questions: publicQuestions,
};

const privateCatalog = {
  catalogId: publicCatalog.catalogId,
  version: publicCatalog.version,
  sourceRecordCount: records.length,
  eligibleQuestionCount: privateQuestions.length,
  affectsSde: false,
  countsAsOfficialSimulation: false,
  questions: privateQuestions,
};

const exclusionCounts = {};
for (const reasons of exclusions.values()) {
  for (const reason of reasons) exclusionCounts[reason] = (exclusionCounts[reason] ?? 0) + 1;
}

const importReport = {
  schemaVersion: "1.0.0",
  generatedAt: manifest.generated_at_utc,
  source: "CUR-BD-BANCO-OPERACIONAL-FGV-DATAPREV-v2",
  sourceRecordCount: records.length,
  eligibleQuestionCount: publicQuestions.length,
  excludedRecordCount: records.length - publicQuestions.length,
  exclusionCounts,
  duplicateReferenceOrdinals: [...exclusions.entries()].filter(([, reasons]) => reasons.includes("DUPLICATE_REFERENCE")).map(([ordinal]) => ordinal),
  irrecoverableOrdinals: manifest.irrecoverable_ordinals,
  assetCount: manifest.recovery_assets.file_count,
  questionAssetCount: manifest.counts.asset_counts.question_images,
  optionAssetCount: manifest.counts.asset_counts.option_images,
  selectionAreas: [...new Set(publicQuestions.map((question) => question.selectionArea))].sort(),
  primaryItems: [...new Map(publicQuestions.map((question) => [question.primaryItem.id, question.primaryItem])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  constraints: {
    sourceModified: false,
    historicalFrequencyUsed: false,
    subjectUsedAsPrimaryDimension: false,
    newCurationPerformed: false,
  },
};

fs.mkdirSync(path.dirname(publicCatalogPath), { recursive: true });
fs.mkdirSync(path.dirname(privateCatalogPath), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(publicCatalogPath, stableJson(publicCatalog));
fs.writeFileSync(privateCatalogPath, stableJson(privateCatalog));
fs.writeFileSync(reportPath, stableJson(importReport));

const derivedManifest = {
  schemaVersion: "1.0.0",
  generatedAt: manifest.generated_at_utc,
  sourceManifestSha256: sha256File(manifestPath),
  sourceJsonlSha256: sha256File(jsonlPath),
  publicCatalog: {
    path: path.relative(root, publicCatalogPath).replaceAll(path.sep, "/"),
    sizeBytes: fs.statSync(publicCatalogPath).size,
    sha256: sha256File(publicCatalogPath),
    questionCount: publicQuestions.length,
  },
  privateCatalog: {
    path: path.relative(root, privateCatalogPath).replaceAll(path.sep, "/"),
    sizeBytes: fs.statSync(privateCatalogPath).size,
    sha256: sha256File(privateCatalogPath),
    questionCount: privateQuestions.length,
  },
  importReport: {
    path: path.relative(root, reportPath).replaceAll(path.sep, "/"),
    sizeBytes: fs.statSync(reportPath).size,
    sha256: sha256File(reportPath),
  },
};
fs.writeFileSync(derivedManifestPath, stableJson(derivedManifest));

console.log(`Treino FGV: ${records.length} registros preservados; ${publicQuestions.length} questões elegíveis; ${manifest.recovery_assets.file_count} assets validados.`);
