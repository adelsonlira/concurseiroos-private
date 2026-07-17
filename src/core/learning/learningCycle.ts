import type {
  GuidedLearningEvidence,
  GuidedQuestionResponse,
  LearningCycleAssessment,
} from "./types";

const SCORE = { CORRECT: 1, PARTIAL: 0.5, INCORRECT: 0, DONT_KNOW: 0 } as const;

function responseScore(responses: readonly GuidedQuestionResponse[]): number | null {
  if (responses.length === 0) return null;
  const unique = new Map(responses.map((item) => [item.questionIndex, item]));
  return [...unique.values()].reduce((sum, item) => sum + SCORE[item.state], 0) / unique.size;
}

export function assessGuidedLearningCycle(evidence: GuidedLearningEvidence): LearningCycleAssessment {
  const preStudyScore = responseScore(evidence.preStudyResponses);
  const postStudyScore = responseScore(evidence.postStudyResponses);
  if (postStudyScore === null) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      preStudyScore,
      postStudyScore,
      improvement: null,
      nextAction: "RECORD_EVIDENCE",
      reviewDelayDays: null,
      reasons: ["Registre a recuperação final sem consulta antes de encerrar a sessão."],
    };
  }

  const improvement = preStudyScore === null ? null : postStudyScore - preStudyScore;
  const hasDoubts = evidence.remainingDoubts.some((item) => item.trim().length > 0);
  if (evidence.usedMaterialDuringFinalRecall || postStudyScore < 0.5) {
    return {
      status: "RELEARN_REQUIRED",
      preStudyScore,
      postStudyScore,
      improvement,
      nextAction: "TARGETED_RELEARNING",
      reviewDelayDays: 0,
      reasons: [
        evidence.usedMaterialDuringFinalRecall
          ? "A recuperação final usou consulta e não confirma lembrança independente."
          : "Menos de 50% das questões-guia foram respondidas corretamente ao final.",
        "Reestude apenas as lacunas e faça nova recuperação sem consulta.",
      ],
    };
  }
  if (postStudyScore < 0.8 || hasDoubts) {
    return {
      status: "RETRY_REQUIRED",
      preStudyScore,
      postStudyScore,
      improvement,
      nextAction: "IMMEDIATE_RETRY",
      reviewDelayDays: 1,
      reasons: [
        "O critério de 80% sem consulta ainda não foi atingido ou restaram dúvidas explícitas.",
        "Corrija as lacunas e tente novamente antes de avançar definitivamente.",
      ],
    };
  }

  const reviewDelayDays = evidence.selfReportedFatigue === "HIGH" ? 1 : postStudyScore === 1 ? 3 : 2;
  return {
    status: "MASTERED_FOR_NOW",
    preStudyScore,
    postStudyScore,
    improvement,
    nextAction: "CONTINUE_PLAN",
    reviewDelayDays,
    reasons: [
      "Pelo menos 80% das questões-guia foram recuperadas sem consulta.",
      "O domínio é provisório e será verificado novamente em revisão adaptativa.",
    ],
  };
}
