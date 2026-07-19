import { createServer, request as httpRequest } from "node:http";
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

const sockets = new Set();
const onConnection = (socket) => {
  sockets.add(socket);
  socket.once("close", () => sockets.delete(socket));
};
const server = createServer((request, response) => {
  response.setHeader("Connection", "close");
  if (request.url?.startsWith("/api/training-fgv/finalize")) return finalizeModule.default(request, response);
  return checkModule.default(request, response);
});
server.on("connection", onConnection);

await new Promise((resolve, reject) => {
  const onError = (error) => {
    server.off("listening", onListening);
    reject(error);
  };
  const onListening = () => {
    server.off("error", onError);
    resolve();
  };
  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(0, "127.0.0.1");
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("Runtime serverless sem porta.");

async function requestJson(pathname, { method = "GET", body } = {}) {
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  return await new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1",
      port: address.port,
      path: pathname,
      method,
      agent: false,
      headers: {
        Connection: "close",
        ...(serialized ? {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(serialized).toString(),
        } : {}),
      },
    }, (response) => {
      response.setEncoding("utf8");
      let text = "";
      response.on("data", (chunk) => {
        text += chunk;
      });
      response.once("error", reject);
      response.once("end", () => {
        let payload;
        try {
          payload = JSON.parse(text);
        } catch (error) {
          reject(new Error(`Resposta HTTP não é JSON válido: ${text}`, { cause: error }));
          return;
        }
        resolve({ status: response.statusCode ?? 0, payload, text });
      });
    });
    request.once("error", reject);
    if (serialized) request.write(serialized);
    request.end();
  });
}

async function closeServerNaturally() {
  const activeSocketsBeforeClose = [...sockets].filter((socket) => !socket.destroyed).length;
  const closePromise = new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  for (const socket of sockets) socket.destroy();
  await closePromise;
  await new Promise((resolve) => setImmediate(resolve));
  server.off("connection", onConnection);
  const activeSocketsAfterClose = [...sockets].filter((socket) => !socket.destroyed).length;
  sockets.clear();
  if (server.listening || activeSocketsAfterClose !== 0) {
    throw new Error(`Teardown serverless incompleto: listening=${server.listening} sockets=${activeSocketsAfterClose}`);
  }
  return {
    serverListeningAfterClose: server.listening,
    activeSocketsBeforeClose,
    activeSocketsAfterClose,
    closeIdleConnectionsCalled: typeof server.closeIdleConnections === "function",
    closeAllConnectionsCalled: typeof server.closeAllConnections === "function",
  };
}

let report;
let teardown;
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
  const checkResponse = await requestJson("/api/training-fgv/check", { method: "POST", body: checkRequest });
  const checkPayload = checkResponse.payload;
  if (checkResponse.status !== 200) throw new Error(`Correção serverless falhou: HTTP ${checkResponse.status} ${checkResponse.text}`);
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
  const finalizeResponse = await requestJson("/api/training-fgv/finalize", { method: "POST", body: finalizeRequest });
  const finalized = finalizeResponse.payload;
  if (finalizeResponse.status !== 200) throw new Error(`Finalização serverless falhou: HTTP ${finalizeResponse.status} ${finalizeResponse.text}`);
  if (finalized.affectsSde !== false || finalized.countsAsOfficialSimulation !== false || finalized.totalQuestions !== 5) {
    throw new Error("Marcadores de isolamento divergentes no smoke serverless.");
  }

  report = {
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
  };
} finally {
  teardown = await closeServerNaturally();
}

console.log(JSON.stringify({ ...report, teardown }, null, 2));
