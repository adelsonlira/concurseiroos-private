import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();
process.env.AUTH_MODE = "disabled";
const publicCatalogPath = path.join(root, "src/features/fgvTraining/data/trainingPublicCatalog.json");
const publicCatalogText = readFileSync(publicCatalogPath, "utf8");
const publicCatalog = JSON.parse(publicCatalogText);
const forbidden = ["operationalAnswer", "answerOrigin", "corpusOrdinal", "platformId", "recordFingerprint"];
for (const field of forbidden) {
  if (publicCatalogText.includes(field)) throw new Error(`Campo privado exposto no catálogo público: ${field}`);
}

const checkPath = path.join(root, "dist/serverless-api/training-fgv/check.js");
const finalizePath = path.join(root, "dist/serverless-api/training-fgv/finalize.js");
const cacheBuster = `${Date.now()}-${Math.random()}`;
const checkModule = await import(`${pathToFileURL(checkPath).href}?${cacheBuster}`);
const finalizeModule = await import(`${pathToFileURL(finalizePath).href}?${cacheBuster}`);

const server = createServer((request, response) => {
  if (request.url?.startsWith("/api/training-fgv/finalize")) return finalizeModule.default(request, response);
  return checkModule.default(request, response);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Runtime serverless sem porta.");
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const questionOrder = publicCatalog.questions.slice(0, 5).map((question) => question.questionId);
  if (questionOrder.length !== 5 || new Set(questionOrder).size !== 5) throw new Error("Não foi possível iniciar tentativa mínima com cinco questões.");
  const attemptId = "serverless-smoke-attempt";
  const selectedAnswer = "A";
  const checkRequest = {
    attemptId,
    catalogId: publicCatalog.catalogId,
    catalogVersion: 1,
    questionOrder,
    questionId: questionOrder[0],
    selectedAnswer,
  };
  const checkResponse = await fetch(`${baseUrl}/api/training-fgv/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkRequest),
  });
  const checkBody = await checkResponse.text();
  const checkPayload = JSON.parse(checkBody);
  if (checkResponse.status !== 200) throw new Error(`Correção serverless falhou: HTTP ${checkResponse.status} ${checkBody}`);
  if (checkPayload.questionId !== questionOrder[0] || !/^[A-E]$/.test(checkPayload.operationalAnswer) || !/^(CORRECT|INCORRECT)$/.test(checkPayload.status)) {
    throw new Error("Payload de correção serverless inválido.");
  }

  const startedAt = new Date(Date.now() - 60_000).toISOString();
  const finalizeRequest = {
    attemptId,
    catalogId: publicCatalog.catalogId,
    catalogVersion: 1,
    startedAt,
    seed: "serverless-smoke-seed",
    questionOrder,
    filters: { selectionArea: null, primaryItemId: null, adherence: "DIRECT", quantity: 5 },
    answers: questionOrder.map((questionId, index) => ({ questionId, selectedAnswer: index === 0 ? selectedAnswer : null })),
  };
  const finalizeResponse = await fetch(`${baseUrl}/api/training-fgv/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalizeRequest),
  });
  const finalizeBody = await finalizeResponse.text();
  const finalized = JSON.parse(finalizeBody);
  if (finalizeResponse.status !== 200) throw new Error(`Finalização serverless falhou: HTTP ${finalizeResponse.status} ${finalizeBody}`);
  if (finalized.affectsSde !== false || finalized.countsAsOfficialSimulation !== false || finalized.totalQuestions !== 5) {
    throw new Error("Marcadores de isolamento divergentes no smoke serverless.");
  }

  console.log(JSON.stringify({
    status: "PASS",
    runtime: "compiled-serverless-entrypoints",
    publicCatalog: {
      urlEquivalent: "/assets/JavaScript public catalog bundle",
      questionCount: publicCatalog.eligibleQuestionCount,
      operationalAnswerPresentBeforeCheck: false,
    },
    attempt: { attemptId, totalQuestions: 5, questionOrder },
    check: {
      url: "/api/training-fgv/check",
      method: "POST",
      httpStatus: checkResponse.status,
      questionId: checkPayload.questionId,
      selectedAnswer: checkPayload.selectedAnswer,
      operationalAnswerFormatValid: /^[A-E]$/.test(checkPayload.operationalAnswer),
      resultStatus: checkPayload.status,
    },
    finalize: {
      url: "/api/training-fgv/finalize",
      method: "POST",
      httpStatus: finalizeResponse.status,
      totalQuestions: finalized.totalQuestions,
      affectsSde: finalized.affectsSde,
      countsAsOfficialSimulation: finalized.countsAsOfficialSimulation,
    },
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
