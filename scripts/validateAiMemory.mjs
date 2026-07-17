import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const requiredFiles = [
  ".ai/README.md",
  ".ai/memory/CURRENT_STATE.md",
  ".ai/memory/NEXT_STEPS.md",
  ".ai/memory/OPEN_QUESTIONS.md",
  ".ai/memory/DEVELOPMENT_HISTORY.md",
  `.ai/sprints/SPRINT-${pkg.version}.md`
];

const requiredNonEmptyFiles = [
  ".ai/context/CONSTITUICAO.md",
  ".ai/context/PRODUCT.md",
  ".ai/context/UX.md",
  ".ai/context/ARCHITECT.md",
  ".ai/context/DOMAIN.md",
  ".ai/context/KNOWLEDGE_GRAPH.md",
  ".ai/context/SDE.md",
  ".ai/context/ROADMAP.md",
  ".ai/agents/principal_architect.md",
  ".ai/agents/frontend_engineer.md",
  ".ai/agents/backend_engineer.md",
  ".ai/agents/sde_engineer.md",
  ".ai/agents/knowledge_engineer.md",
  ".ai/agents/qa_engineer.md",
  ".ai/agents/ai_engineer.md"
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  throw new Error(`Memória institucional incompleta: ${missing.join(", ")}`);
}

const emptyFiles = requiredNonEmptyFiles.filter((file) => {
  const fullPath = path.join(root, file);
  return !fs.existsSync(fullPath) || fs.readFileSync(fullPath, "utf8").trim().length < 80;
});
if (emptyFiles.length > 0) {
  throw new Error(`Contexto institucional vazio ou insuficiente: ${emptyFiles.join(", ")}`);
}

const currentState = fs.readFileSync(path.join(root, ".ai/memory/CURRENT_STATE.md"), "utf8");
const history = fs.readFileSync(path.join(root, ".ai/memory/DEVELOPMENT_HISTORY.md"), "utf8");
const sprint = fs.readFileSync(path.join(root, `.ai/sprints/SPRINT-${pkg.version}.md`), "utf8");

for (const [name, content] of [
  ["CURRENT_STATE.md", currentState],
  ["DEVELOPMENT_HISTORY.md", history],
  [`SPRINT-${pkg.version}.md`, sprint]
]) {
  if (!content.includes(pkg.version)) {
    throw new Error(`${name} não registra a versão atual ${pkg.version}.`);
  }
}

const requiredCurrentStateSections = [
  "## Projeto",
  "## Fase atual",
  "## Implementado",
  "## Validado",
  "## Problemas conhecidos",
  "## Próxima tarefa"
];
for (const section of requiredCurrentStateSections) {
  if (!currentState.includes(section)) {
    throw new Error(`CURRENT_STATE.md não contém a seção obrigatória '${section}'.`);
  }
}

console.log(`Memória institucional sincronizada com a versão ${pkg.version}.`);
