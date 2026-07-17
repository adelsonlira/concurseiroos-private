export interface QuestionBatchSessionEvidence {
  sessionId: string;
  endedAt: string;
  disciplineId: string;
  topicId?: string;
  subtopicId?: string;
  prescriptionId?: string;
  targetQuestionCount?: number | null;
  stretchQuestionCount?: number | null;
  diagnosticPurpose?: boolean;
}

export interface QuestionBatchAttemptEvidence {
  attemptedAt: string;
  disciplineId: string;
  topicId: string;
  subtopicId?: string;
  contextId?: string;
}

export interface QuestionBatchProgress {
  sessionId: string;
  prescriptionId?: string;
  disciplineId: string;
  topicId?: string;
  subtopicId?: string;
  targetQuestionCount: number;
  stretchQuestionCount: number;
  diagnosticPurpose: boolean;
  completedQuestionCount: number;
  remainingQuestionCount: number;
  isTargetComplete: boolean;
  isStretchComplete: boolean;
}

function sameScope(
  session: QuestionBatchSessionEvidence,
  attempt: QuestionBatchAttemptEvidence
): boolean {
  if (attempt.disciplineId !== session.disciplineId) return false;
  if (session.topicId && attempt.topicId !== session.topicId) return false;
  if (session.subtopicId && attempt.subtopicId !== session.subtopicId) return false;
  return true;
}

export function resolveLatestQuestionBatchProgress(input: {
  sessions: readonly QuestionBatchSessionEvidence[];
  attempts: readonly QuestionBatchAttemptEvidence[];
}): QuestionBatchProgress | null {
  const session = [...input.sessions]
    .filter(
      (item) =>
        Number.isInteger(item.targetQuestionCount) &&
        (item.targetQuestionCount ?? 0) > 0
    )
    .sort((left, right) => right.endedAt.localeCompare(left.endedAt))[0];

  if (!session || !session.targetQuestionCount) return null;

  const completedQuestionCount = input.attempts.filter((attempt) => {
    if (!sameScope(session, attempt)) return false;
    if (session.prescriptionId && attempt.contextId === session.prescriptionId) return true;
    if (attempt.contextId && attempt.contextId !== session.prescriptionId) return false;
    return attempt.attemptedAt >= session.endedAt;
  }).length;

  const targetQuestionCount = session.targetQuestionCount;
  const stretchQuestionCount = Math.max(
    targetQuestionCount,
    session.stretchQuestionCount ?? targetQuestionCount
  );

  return {
    sessionId: session.sessionId,
    prescriptionId: session.prescriptionId,
    disciplineId: session.disciplineId,
    topicId: session.topicId,
    subtopicId: session.subtopicId,
    targetQuestionCount,
    stretchQuestionCount,
    diagnosticPurpose: session.diagnosticPurpose === true,
    completedQuestionCount,
    remainingQuestionCount: Math.max(0, targetQuestionCount - completedQuestionCount),
    isTargetComplete: completedQuestionCount >= targetQuestionCount,
    isStretchComplete: completedQuestionCount >= stretchQuestionCount
  };
}
