import publicCatalogJson from "../../features/fgvTraining/data/trainingPublicCatalog.json" with { type: "json" };
import privateCatalogJson from "./data/trainingPrivateCatalog.json" with { type: "json" };
import type {
  CheckFgvTrainingAnswerRequest,
  FgvTrainingAggregateResult,
  FgvTrainingCheckedCorrection,
  FgvTrainingQuestionCorrection,
  FgvTrainingPublicCatalog,
  FinalizeFgvTrainingRequest,
  FinalizedFgvTrainingAttempt,
} from "../../features/fgvTraining/types.js";

interface PrivateQuestion {
  questionId: string;
  operationalAnswer: "A" | "B" | "C" | "D" | "E";
  answerOrigin: string;
  corpusOrdinal: number;
  platformId: string;
  principalRecord: number;
  recordFingerprint: string;
}
interface PrivateCatalog { catalogId: string; version: number; questions: PrivateQuestion[]; }
const PUBLIC_CATALOG = publicCatalogJson as unknown as FgvTrainingPublicCatalog;
const PRIVATE_CATALOG = privateCatalogJson as PrivateCatalog;
const PUBLIC_BY_ID = new Map(PUBLIC_CATALOG.questions.map((question) => [question.questionId, question]));
const PRIVATE_BY_ID = new Map(PRIVATE_CATALOG.questions.map((question) => [question.questionId, question]));
const LABELS = new Set(["A", "B", "C", "D", "E"]);

function round(value: number): number { return Math.round(value * 100) / 100; }
function percentage(correct: number, total: number): number { return total === 0 ? 0 : round((correct / total) * 100); }
function assertBase(request: { attemptId: string; catalogId: string; catalogVersion: number }): void {
  if (!request?.attemptId?.trim()) throw new Error("Identificador da tentativa ausente.");
  if (request.catalogId !== PRIVATE_CATALOG.catalogId || request.catalogVersion !== 1) throw new Error("Catálogo de treino incompatível.");
}

export function checkFgvTrainingAnswer(request: CheckFgvTrainingAnswerRequest): FgvTrainingCheckedCorrection {
  assertBase(request);
  if (!LABELS.has(request.selectedAnswer)) throw new Error("Alternativa inválida.");
  const question = PRIVATE_BY_ID.get(request.questionId);
  if (!question) throw new Error("Questão desconhecida.");
  return {
    questionId: request.questionId,
    selectedAnswer: request.selectedAnswer,
    operationalAnswer: question.operationalAnswer,
    status: request.selectedAnswer === question.operationalAnswer ? "CORRECT" : "INCORRECT",
  };
}

function buildAggregate(
  request: FinalizeFgvTrainingRequest,
  corrections: FgvTrainingQuestionCorrection[],
  dimension: "area" | "item" | "adherence",
): FgvTrainingAggregateResult[] {
  const groups = new Map<string, FgvTrainingAggregateResult>();
  for (const correction of corrections) {
    const question = PUBLIC_BY_ID.get(correction.questionId)!;
    const key = dimension === "area" ? question.selectionArea : dimension === "item" ? question.primaryItem.id : question.adherence;
    const label = dimension === "area" ? question.selectionArea : dimension === "item" ? question.primaryItem.name : question.adherence === "DIRECT" ? "Aderência direta" : "Aderência parcial";
    const current = groups.get(key) ?? { key, label, total: 0, correct: 0, wrong: 0, blank: 0, percentage: 0 };
    current.total += 1;
    if (correction.status === "CORRECT") current.correct += 1;
    if (correction.status === "INCORRECT") current.wrong += 1;
    if (correction.status === "BLANK") current.blank += 1;
    groups.set(key, current);
  }
  return [...groups.values()].map((result) => ({ ...result, percentage: percentage(result.correct, result.total) }));
}

function validateFinalization(request: FinalizeFgvTrainingRequest): void {
  assertBase(request);
  if (Number.isNaN(Date.parse(request.startedAt))) throw new Error("Data de início inválida.");
  if (!request.seed?.trim()) throw new Error("Seed ausente.");
  if (!Array.isArray(request.questionOrder) || request.questionOrder.length < 1 || request.questionOrder.length > 20) throw new Error("Ordem de questões inválida.");
  if (new Set(request.questionOrder).size !== request.questionOrder.length) throw new Error("A tentativa contém questão repetida.");
  if (!request.questionOrder.every((id) => PRIVATE_BY_ID.has(id))) throw new Error("A tentativa contém questão desconhecida.");
  if (!Array.isArray(request.answers) || request.answers.length !== request.questionOrder.length) throw new Error("Respostas incompletas.");
  if (request.answers.some((answer, index) => answer.questionId !== request.questionOrder[index])) throw new Error("Ordem das respostas divergente.");
  if (request.answers.some((answer) => answer.selectedAnswer !== null && !LABELS.has(answer.selectedAnswer))) throw new Error("Alternativa inválida.");
}

export function finalizeFgvTrainingAttempt(request: FinalizeFgvTrainingRequest, endedAt = new Date().toISOString()): FinalizedFgvTrainingAttempt {
  validateFinalization(request);
  if (Number.isNaN(Date.parse(endedAt))) throw new Error("Data de término inválida.");
  const corrections: FgvTrainingQuestionCorrection[] = request.answers.map((answer, index) => {
    const privateQuestion = PRIVATE_BY_ID.get(answer.questionId)!;
    return {
      questionId: answer.questionId,
      position: index + 1,
      selectedAnswer: answer.selectedAnswer,
      operationalAnswer: privateQuestion.operationalAnswer,
      status: answer.selectedAnswer === null ? "BLANK" : answer.selectedAnswer === privateQuestion.operationalAnswer ? "CORRECT" : "INCORRECT",
    };
  });
  const correctCount = corrections.filter((item) => item.status === "CORRECT").length;
  const wrongCount = corrections.filter((item) => item.status === "INCORRECT").length;
  const blankCount = corrections.filter((item) => item.status === "BLANK").length;
  const durationSeconds = Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(request.startedAt)) / 1000));
  return {
    attemptId: request.attemptId,
    catalogId: PUBLIC_CATALOG.catalogId,
    catalogVersion: 1,
    trainingType: "thematic_fgv",
    status: "FINALIZED",
    startedAt: request.startedAt,
    endedAt,
    durationSeconds,
    seed: request.seed,
    questionOrder: [...request.questionOrder],
    filters: { ...request.filters },
    answers: request.answers.map((answer) => ({ ...answer })),
    correctCount,
    wrongCount,
    blankCount,
    totalQuestions: request.questionOrder.length,
    percentage: percentage(correctCount, request.questionOrder.length),
    areaResults: buildAggregate(request, corrections, "area"),
    itemResults: buildAggregate(request, corrections, "item"),
    adherenceResults: buildAggregate(request, corrections, "adherence"),
    corrections,
    traceability: request.questionOrder.map((questionId, index) => ({
      questionId,
      position: index + 1,
      recordFingerprint: PRIVATE_BY_ID.get(questionId)!.recordFingerprint,
    })),
    affectsSde: false,
    countsAsOfficialSimulation: false,
  };
}

export function validateFgvTrainingServerCatalog(): void {
  if (PUBLIC_CATALOG.questions.length !== PRIVATE_CATALOG.questions.length) throw new Error("Catálogos público e privado divergentes.");
  if (PUBLIC_CATALOG.questions.some((question) => !PRIVATE_BY_ID.has(question.questionId))) throw new Error("Questão pública sem chave privada.");
}
