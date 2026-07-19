import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "data", "training-fgv", "source");
const manifestPath = path.join(sourceDir, "CUR-BD-BANCO-OPERACIONAL-v2-MANIFESTO.json");
const requireGit = process.argv.includes("--require-git");
const targetFiles = [
  "CUR-BD-BANCO-OPERACIONAL-v2-APTAS-ESTUDO.csv",
  "CUR-BD-BANCO-OPERACIONAL-v2-POTENCIALMENTE-APTAS-SIMULADO.csv",
  "CUR-BD-BANCO-OPERACIONAL-v2-EXCLUIDAS-PENDENTES.csv",
  "CUR-BD-BANCO-OPERACIONAL-v2-RECUPERACAO-87.csv",
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function countLineEndings(buffer) {
  let crlf = 0;
  let bareLf = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0x0a) continue;
    if (index > 0 && buffer[index - 1] === 0x0d) crlf += 1;
    else bareLf += 1;
  }
  return { crlf, bareLf };
}

function gitBuffer(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function insideGitRepository() {
  try {
    return execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() === "true";
  } catch {
    return false;
  }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const deliverables = new Map((manifest.deliverables ?? []).map((entry) => [entry.file, entry]));
const attributes = fs.readFileSync(path.join(root, ".gitattributes"), "utf8");
for (const requiredRule of [
  "data/training-fgv/source/*.csv -text",
  "data/training-fgv/source/*.jsonl -text",
  "data/training-fgv/source/*.json -text",
  "data/training-fgv/source/*.md -text",
  "data/training-fgv/source/*.xlsx binary",
  "static/fgv-training/assets/** binary",
]) {
  if (!attributes.split(/\r?\n/).includes(requiredRule)) {
    throw new Error(`Regra obrigatória ausente em .gitattributes: ${requiredRule}`);
  }
}

const hasGit = insideGitRepository();
if (requireGit && !hasGit) {
  throw new Error("A verificação foi executada com --require-git fora de um repositório Git.");
}

const results = [];
for (const file of targetFiles) {
  const expected = deliverables.get(file);
  if (!expected) throw new Error(`Arquivo não encontrado no manifesto aprovado: ${file}`);
  const relativePath = path.posix.join("data", "training-fgv", "source", file);
  const worktree = fs.readFileSync(path.join(root, relativePath));
  const worktreeEndings = countLineEndings(worktree);
  if (worktree.length !== expected.size_bytes) {
    throw new Error(`Tamanho divergente no arquivo de trabalho: ${file}`);
  }
  if (sha256(worktree) !== expected.sha256) {
    throw new Error(`SHA-256 divergente no arquivo de trabalho: ${file}`);
  }
  if (worktreeEndings.crlf === 0 || worktreeEndings.bareLf !== 0) {
    throw new Error(`Finais de linha não canônicos no arquivo de trabalho: ${file}`);
  }

  let gitBlob = null;
  if (hasGit) {
    gitBlob = gitBuffer(["show", `HEAD:${relativePath}`]);
    const blobEndings = countLineEndings(gitBlob);
    if (gitBlob.length !== expected.size_bytes) {
      throw new Error(`Tamanho divergente no blob Git: ${file}`);
    }
    if (sha256(gitBlob) !== expected.sha256) {
      throw new Error(`SHA-256 divergente no blob Git: ${file}`);
    }
    if (blobEndings.crlf !== worktreeEndings.crlf || blobEndings.bareLf !== 0) {
      throw new Error(`Finais de linha divergentes no blob Git: ${file}`);
    }
  }

  results.push({
    file,
    expectedSize: expected.size_bytes,
    expectedSha256: expected.sha256,
    crlf: worktreeEndings.crlf,
    worktree: "PASS",
    gitBlob: hasGit ? "PASS" : "NOT_AVAILABLE",
  });
}

console.log("Integridade canônica dos CSVs do Treino FGV:");
console.table(results);
console.log(`Verificação de blobs Git: ${hasGit ? "PASS" : "não aplicável fora de repositório Git"}.`);
