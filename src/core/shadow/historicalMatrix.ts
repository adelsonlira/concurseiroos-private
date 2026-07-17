import type {
  HistoricalTopicShadowMetric,
  ReviewedHistoricalQuestionSignal,
  ShadowDecisionComparison,
} from "./types";

export function buildHistoricalShadowMatrix(params: {
  signals: readonly ReviewedHistoricalQuestionSignal[];
  eligibleExamIds: readonly string[];
}): HistoricalTopicShadowMetric[] {
  const examSet = new Set(params.eligibleExamIds);
  const eligibleSignals = params.signals.filter(
    (signal) => signal.humanReviewed
      && signal.definitiveAnswerLinked
      && signal.duplicateRepresentative
      && signal.confidence >= 0.8
      && examSet.has(signal.examId),
  );
  const byTopic = new Map<string, ReviewedHistoricalQuestionSignal[]>();
  for (const signal of eligibleSignals) {
    const existing = byTopic.get(signal.targetNodeId) ?? [];
    existing.push(signal);
    byTopic.set(signal.targetNodeId, existing);
  }

  return [...byTopic.entries()]
    .map(([targetNodeId, topicSignals]) => {
      const eligibleExams = new Set(topicSignals.map((item) => item.examId)).size;
      const years = [...new Set(topicSignals.map((item) => item.examYear))].sort();
      const denominator = params.eligibleExamIds.length;
      const sampleAdequacy: HistoricalTopicShadowMetric["sampleAdequacy"] = eligibleExams >= 5 && years.length >= 3
        ? "DESCRIPTIVE"
        : eligibleExams >= 2
          ? "LIMITED"
          : "INSUFFICIENT";
      return {
        targetNodeId,
        matchedQuestions: topicSignals.length,
        eligibleExams,
        years,
        sampleAdequacy,
        incidenceRate: denominator > 0 ? topicSignals.length / denominator : null,
        eligibleForSDE: false as const,
        caveats: [
          "Métrica descritiva em shadow mode; não altera a prioridade do SDE.",
          sampleAdequacy === "DESCRIPTIVE"
            ? "Amostra suficiente apenas para descrição, não para previsão causal."
            : "Amostra pequena ou temporalmente limitada.",
        ],
      };
    })
    .sort((a, b) => b.matchedQuestions - a.matchedQuestions || a.targetNodeId.localeCompare(b.targetNodeId));
}

export function compareShadowRanking(params: {
  currentTopicOrder: readonly string[];
  simulatedTopicOrder: readonly string[];
}): ShadowDecisionComparison[] {
  const simulatedIndex = new Map(params.simulatedTopicOrder.map((id, index) => [id, index + 1]));
  return params.currentTopicOrder.map((topicId, index) => {
    const currentRank = index + 1;
    const simulatedRank = simulatedIndex.get(topicId) ?? currentRank;
    return {
      topicId,
      currentRank,
      simulatedRank,
      delta: currentRank - simulatedRank,
      status: currentRank === simulatedRank ? "STABLE" : "CHANGED",
      activationAllowed: false,
    };
  });
}
