import { PILOT_DIAGNOSTIC_CATALOG } from "./catalog";
import type {
  ActivePilotDiagnosticAttempt,
  DiagnosticAnswerRecord,
  DiagnosticOptionLabel,
  FinalizePilotDiagnosticRequest,
  FinalizedPilotDiagnosticAttempt,
} from "./types";

function assertKnownQuestion(questionId: string): void {
  if (!PILOT_DIAGNOSTIC_CATALOG.questions.some((question) => question.questionId === questionId)) {
    throw new Error("Questão não pertence ao diagnóstico piloto.");
  }
}

function assertActive(attempt: ActivePilotDiagnosticAttempt): void {
  if (attempt.status !== "ACTIVE") throw new Error("A tentativa não está ativa.");
}

export function createPilotDiagnosticAttempt(attemptId: string, nowIso: string): ActivePilotDiagnosticAttempt {
  if (!attemptId.trim()) throw new Error("Identificador da tentativa é obrigatório.");
  if (Number.isNaN(Date.parse(nowIso))) throw new Error("Data de início inválida.");

  return {
    attemptId,
    diagnosticId: PILOT_DIAGNOSTIC_CATALOG.diagnosticId,
    version: PILOT_DIAGNOSTIC_CATALOG.version,
    status: "ACTIVE",
    startedAt: nowIso,
    updatedAt: nowIso,
    currentPosition: 1,
    answers: {},
    reviewQuestionIds: [],
    affectsSde: false,
  };
}

export function answerPilotDiagnosticQuestion(
  attempt: ActivePilotDiagnosticAttempt,
  questionId: string,
  selectedAnswer: DiagnosticOptionLabel,
  nowIso: string,
): ActivePilotDiagnosticAttempt {
  assertActive(attempt);
  assertKnownQuestion(questionId);
  if (!(["A", "B", "C", "D", "E"] as const).includes(selectedAnswer)) {
    throw new Error("Alternativa inválida.");
  }

  return {
    ...attempt,
    answers: { ...attempt.answers, [questionId]: selectedAnswer },
    updatedAt: nowIso,
  };
}

export function togglePilotDiagnosticReview(
  attempt: ActivePilotDiagnosticAttempt,
  questionId: string,
  nowIso: string,
): ActivePilotDiagnosticAttempt {
  assertActive(attempt);
  assertKnownQuestion(questionId);
  const current = new Set(attempt.reviewQuestionIds);
  if (current.has(questionId)) current.delete(questionId);
  else current.add(questionId);

  return {
    ...attempt,
    reviewQuestionIds: PILOT_DIAGNOSTIC_CATALOG.questions
      .filter((question) => current.has(question.questionId))
      .map((question) => question.questionId),
    updatedAt: nowIso,
  };
}

export function navigatePilotDiagnostic(
  attempt: ActivePilotDiagnosticAttempt,
  position: number,
  nowIso: string,
): ActivePilotDiagnosticAttempt {
  assertActive(attempt);
  if (!Number.isInteger(position) || position < 1 || position > PILOT_DIAGNOSTIC_CATALOG.questionCount) {
    throw new Error("Posição inválida.");
  }
  return { ...attempt, currentPosition: position, updatedAt: nowIso };
}

export function buildPilotDiagnosticAnswers(
  attempt: ActivePilotDiagnosticAttempt,
): DiagnosticAnswerRecord[] {
  assertActive(attempt);
  return PILOT_DIAGNOSTIC_CATALOG.questions.map((question) => ({
    questionId: question.questionId,
    position: question.position,
    selectedAnswer: attempt.answers[question.questionId] ?? null,
  }));
}

export function buildPilotDiagnosticFinalizationRequest(
  attempt: ActivePilotDiagnosticAttempt,
): FinalizePilotDiagnosticRequest {
  return {
    attemptId: attempt.attemptId,
    diagnosticId: attempt.diagnosticId,
    version: attempt.version,
    startedAt: attempt.startedAt,
    answers: buildPilotDiagnosticAnswers(attempt),
  };
}

export function countPilotDiagnosticProgress(attempt: ActivePilotDiagnosticAttempt): {
  answered: number;
  blank: number;
  review: number;
} {
  const answered = PILOT_DIAGNOSTIC_CATALOG.questions.filter(
    (question) => attempt.answers[question.questionId] !== undefined,
  ).length;
  return {
    answered,
    blank: PILOT_DIAGNOSTIC_CATALOG.questionCount - answered,
    review: attempt.reviewQuestionIds.length,
  };
}

export function validateActivePilotDiagnosticAttempt(value: unknown): value is ActivePilotDiagnosticAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ActivePilotDiagnosticAttempt>;
  if (
    candidate.status !== "ACTIVE" ||
    candidate.diagnosticId !== PILOT_DIAGNOSTIC_CATALOG.diagnosticId ||
    candidate.version !== PILOT_DIAGNOSTIC_CATALOG.version ||
    candidate.affectsSde !== false ||
    typeof candidate.attemptId !== "string" ||
    Number.isNaN(Date.parse(candidate.startedAt ?? "")) ||
    !Number.isInteger(candidate.currentPosition) ||
    (candidate.currentPosition ?? 0) < 1 ||
    (candidate.currentPosition ?? 0) > PILOT_DIAGNOSTIC_CATALOG.questionCount ||
    !candidate.answers ||
    typeof candidate.answers !== "object" ||
    !Array.isArray(candidate.reviewQuestionIds)
  ) {
    return false;
  }

  const knownIds = new Set(PILOT_DIAGNOSTIC_CATALOG.questions.map((question) => question.questionId));
  return Object.entries(candidate.answers).every(
    ([questionId, answer]) => knownIds.has(questionId) && ["A", "B", "C", "D", "E"].includes(String(answer)),
  ) && candidate.reviewQuestionIds.every((questionId) => knownIds.has(questionId));
}

export function validateFinalizedPilotDiagnosticAttempt(value: unknown): value is FinalizedPilotDiagnosticAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FinalizedPilotDiagnosticAttempt>;
  return (
    candidate.status === "FINALIZED" &&
    candidate.diagnosticId === PILOT_DIAGNOSTIC_CATALOG.diagnosticId &&
    candidate.version === PILOT_DIAGNOSTIC_CATALOG.version &&
    candidate.affectsSde === false &&
    candidate.totalQuestions === 24 &&
    Array.isArray(candidate.answers) && candidate.answers.length === 24 &&
    Array.isArray(candidate.corrections) && candidate.corrections.length === 24 &&
    Array.isArray(candidate.traceability) && candidate.traceability.length === 24
  );
}
