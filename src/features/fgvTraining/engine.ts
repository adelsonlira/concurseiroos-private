import { FGV_TRAINING_CATALOG, FGV_TRAINING_QUESTION_BY_ID } from "./catalog";
import type {
  ActiveFgvTrainingAttempt,
  CheckFgvTrainingAnswerRequest,
  FgvTrainingCheckedCorrection,
  FgvTrainingFilters,
  FgvTrainingOptionLabel,
  FgvTrainingQuestion,
  FinalizeFgvTrainingRequest,
  FinalizedFgvTrainingAttempt,
} from "./types";

const LABELS = ["A", "B", "C", "D", "E"] as const;

function assertDate(value: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error("Data inválida.");
}

function seedToUint32(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string): () => number {
  let state = seedToUint32(seed) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function filterFgvTrainingQuestions(filters: FgvTrainingFilters): FgvTrainingQuestion[] {
  return FGV_TRAINING_CATALOG.questions.filter((question) => {
    if (filters.selectionArea && question.selectionArea !== filters.selectionArea) return false;
    if (filters.primaryItemId && question.primaryItem.id !== filters.primaryItemId) return false;
    if (filters.adherence !== "BOTH" && question.adherence !== filters.adherence) return false;
    return true;
  });
}

export function selectFgvTrainingQuestionIds(filters: FgvTrainingFilters, seed: string): string[] {
  const candidates = [...filterFgvTrainingQuestions(filters)];
  const random = createRandom(seed);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  return candidates.slice(0, Math.min(filters.quantity, candidates.length)).map((question) => question.questionId);
}

export function createFgvTrainingAttempt(
  attemptId: string,
  nowIso: string,
  filters: FgvTrainingFilters,
  seed: string,
): ActiveFgvTrainingAttempt {
  if (!attemptId.trim() || !seed.trim()) throw new Error("Identificadores do treino são obrigatórios.");
  assertDate(nowIso);
  const questionOrder = selectFgvTrainingQuestionIds(filters, seed);
  if (questionOrder.length === 0) throw new Error("Nenhuma questão disponível para os filtros selecionados.");
  return {
    attemptId,
    catalogId: FGV_TRAINING_CATALOG.catalogId,
    catalogVersion: 1,
    trainingType: "thematic_fgv",
    status: "ACTIVE",
    startedAt: nowIso,
    updatedAt: nowIso,
    currentIndex: 0,
    seed,
    questionOrder,
    filters: { ...filters },
    answers: {},
    checkedCorrections: {},
    reviewQuestionIds: [],
    affectsSde: false,
    countsAsOfficialSimulation: false,
  };
}

export function answerFgvTrainingQuestion(
  attempt: ActiveFgvTrainingAttempt,
  questionId: string,
  answer: FgvTrainingOptionLabel,
  nowIso: string,
): ActiveFgvTrainingAttempt {
  if (!attempt.questionOrder.includes(questionId)) throw new Error("Questão fora da tentativa.");
  if (attempt.checkedCorrections[questionId]) throw new Error("Resposta já conferida e bloqueada.");
  if (!LABELS.includes(answer)) throw new Error("Alternativa inválida.");
  return { ...attempt, answers: { ...attempt.answers, [questionId]: answer }, updatedAt: nowIso };
}

export function buildCheckFgvTrainingRequest(
  attempt: ActiveFgvTrainingAttempt,
  questionId: string,
): CheckFgvTrainingAnswerRequest {
  const selectedAnswer = attempt.answers[questionId];
  if (!selectedAnswer) throw new Error("Marque uma alternativa antes de conferir.");
  if (attempt.checkedCorrections[questionId]) throw new Error("Questão já conferida.");
  return {
    attemptId: attempt.attemptId,
    catalogId: attempt.catalogId,
    catalogVersion: 1,
    questionId,
    selectedAnswer,
  };
}

export function applyCheckedFgvTrainingCorrection(
  attempt: ActiveFgvTrainingAttempt,
  correction: FgvTrainingCheckedCorrection,
  nowIso: string,
): ActiveFgvTrainingAttempt {
  if (!attempt.questionOrder.includes(correction.questionId)) throw new Error("Correção fora da tentativa.");
  if (attempt.checkedCorrections[correction.questionId]) throw new Error("Questão já conferida.");
  if (attempt.answers[correction.questionId] !== correction.selectedAnswer) throw new Error("Correção não corresponde à resposta marcada.");
  return {
    ...attempt,
    checkedCorrections: { ...attempt.checkedCorrections, [correction.questionId]: correction },
    updatedAt: nowIso,
  };
}

export function navigateFgvTraining(attempt: ActiveFgvTrainingAttempt, index: number, nowIso: string): ActiveFgvTrainingAttempt {
  if (!Number.isInteger(index) || index < 0 || index >= attempt.questionOrder.length) throw new Error("Posição inválida.");
  return { ...attempt, currentIndex: index, updatedAt: nowIso };
}

export function toggleFgvTrainingReview(attempt: ActiveFgvTrainingAttempt, questionId: string, nowIso: string): ActiveFgvTrainingAttempt {
  if (!attempt.questionOrder.includes(questionId)) throw new Error("Questão fora da tentativa.");
  const ids = new Set(attempt.reviewQuestionIds);
  if (ids.has(questionId)) ids.delete(questionId); else ids.add(questionId);
  return { ...attempt, reviewQuestionIds: attempt.questionOrder.filter((id) => ids.has(id)), updatedAt: nowIso };
}

export function countFgvTrainingProgress(attempt: ActiveFgvTrainingAttempt) {
  const answered = attempt.questionOrder.filter((id) => attempt.answers[id]).length;
  const checked = attempt.questionOrder.filter((id) => attempt.checkedCorrections[id]).length;
  return { answered, checked, blank: attempt.questionOrder.length - answered, review: attempt.reviewQuestionIds.length };
}

export function buildFinalizeFgvTrainingRequest(attempt: ActiveFgvTrainingAttempt): FinalizeFgvTrainingRequest {
  return {
    attemptId: attempt.attemptId,
    catalogId: attempt.catalogId,
    catalogVersion: 1,
    startedAt: attempt.startedAt,
    seed: attempt.seed,
    questionOrder: [...attempt.questionOrder],
    filters: { ...attempt.filters },
    answers: attempt.questionOrder.map((questionId) => ({ questionId, selectedAnswer: attempt.answers[questionId] ?? null })),
  };
}

export function validateActiveFgvTrainingAttempt(value: unknown): value is ActiveFgvTrainingAttempt {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ActiveFgvTrainingAttempt>;
  if (item.status !== "ACTIVE" || item.catalogId !== FGV_TRAINING_CATALOG.catalogId || item.catalogVersion !== 1
    || item.trainingType !== "thematic_fgv" || item.affectsSde !== false || item.countsAsOfficialSimulation !== false
    || typeof item.attemptId !== "string" || typeof item.seed !== "string" || !Array.isArray(item.questionOrder)
    || item.questionOrder.length < 1 || item.questionOrder.length > 20 || new Set(item.questionOrder).size !== item.questionOrder.length
    || !item.questionOrder.every((id) => FGV_TRAINING_QUESTION_BY_ID.has(id)) || !Number.isInteger(item.currentIndex)
    || (item.currentIndex ?? -1) < 0 || (item.currentIndex ?? 99) >= item.questionOrder.length
    || Number.isNaN(Date.parse(item.startedAt ?? "")) || !item.answers || !item.checkedCorrections || !Array.isArray(item.reviewQuestionIds)) return false;
  return Object.entries(item.answers).every(([id, answer]) => item.questionOrder!.includes(id) && LABELS.includes(answer as FgvTrainingOptionLabel))
    && Object.entries(item.checkedCorrections).every(([id, correction]) => item.questionOrder!.includes(id) && correction?.questionId === id)
    && item.reviewQuestionIds.every((id) => item.questionOrder!.includes(id));
}

export function validateFinalizedFgvTrainingAttempt(value: unknown): value is FinalizedFgvTrainingAttempt {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FinalizedFgvTrainingAttempt>;
  return item.status === "FINALIZED" && item.catalogId === FGV_TRAINING_CATALOG.catalogId && item.catalogVersion === 1
    && item.trainingType === "thematic_fgv" && item.affectsSde === false && item.countsAsOfficialSimulation === false
    && typeof item.attemptId === "string" && Array.isArray(item.questionOrder) && item.questionOrder.length === item.totalQuestions
    && Array.isArray(item.answers) && item.answers.length === item.totalQuestions && Array.isArray(item.corrections)
    && item.corrections.length === item.totalQuestions && Array.isArray(item.traceability) && item.traceability.length === item.totalQuestions;
}
