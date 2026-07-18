import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data", "training-fgv", "source", "CUR-BD-BANCO-OPERACIONAL-v2-MANIFESTO.json"), "utf8"));
const privateCatalog = JSON.parse(fs.readFileSync(path.join(root, "src", "server", "training", "data", "trainingPrivateCatalog.json"), "utf8"));
const sha = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
for (const asset of manifest.recovery_assets.files) {
  const p = path.join(root, "public", "fgv-training", asset.path);
  if (!fs.existsSync(p) || fs.statSync(p).size !== asset.size_bytes || sha(p) !== asset.sha256) throw new Error(`Asset de produção inválido: ${asset.path}`);
}
const js = fs.readdirSync(path.join(root, "public", "assets")).filter((name) => name.endsWith(".js")).map((name) => fs.readFileSync(path.join(root, "public", "assets", name), "utf8")).join("\n");
for (const sample of privateCatalog.questions.slice(0, 8)) {
  if (js.includes(sample.platformId) || js.includes(sample.recordFingerprint)) throw new Error("Metadado privado encontrado no bundle web.");
}
console.log("Treino FGV: 301 assets emitidos e bundle web sem metadados privados amostrados.");
