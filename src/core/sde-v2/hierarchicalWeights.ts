import type {
  HierarchicalNodeWeight,
} from "./types";
import type {
  Assunto,
  Disciplina,
  EditalConfig,
  Subassunto,
} from "../sde/prioritization/types";

export function calculateHierarchicalNodeWeights(params: {
  edital: EditalConfig;
  disciplinas: readonly Disciplina[];
  assuntos: readonly Assunto[];
  subassuntos: readonly Subassunto[];
  configuredTopicParticipation?: Record<string, number>;
  participationConfidence?: Record<string, number>;
}): Record<string, HierarchicalNodeWeight> {
  const result: Record<string, HierarchicalNodeWeight> = {};
  for (const discipline of params.disciplinas) {
    const topics = params.assuntos.filter((topic) => topic.disciplinaId === discipline.id);
    const configured = topics.map((topic) => params.configuredTopicParticipation?.[topic.id]);
    const hasCompleteConfigured = configured.every(
      (value) => typeof value === "number" && Number.isFinite(value) && value! >= 0,
    );
    const configuredSum = hasCompleteConfigured
      ? configured.reduce((sum, value) => sum + (value ?? 0), 0)
      : 0;
    if (hasCompleteConfigured && Math.abs(configuredSum - 1) > 1e-6) {
      throw new Error(`Participações internas da disciplina ${discipline.id} devem somar 1.`);
    }
    const topicParticipation = Object.fromEntries(
      topics.map((topic, index) => [
        topic.id,
        hasCompleteConfigured ? configured[index]! : topics.length > 0 ? 1 / topics.length : 0,
      ]),
    );

    for (const topic of topics) {
      const subtopics = params.subassuntos.filter((subtopic) => subtopic.assuntoId === topic.id);
      const subtopicShare = subtopics.length > 0 ? 1 / subtopics.length : 0;
      const confidence = params.participationConfidence?.[topic.id] ?? (hasCompleteConfigured ? 1 : 0.5);
      for (const subtopic of subtopics) {
        const officialDisciplineWeight = params.edital.pesosDisciplinas[discipline.id] ?? 0;
        result[subtopic.id] = {
          disciplineId: discipline.id,
          topicId: topic.id,
          subtopicId: subtopic.id,
          officialDisciplineWeight,
          topicParticipation: topicParticipation[topic.id],
          subtopicParticipation: subtopicShare,
          participationConfidence: confidence,
          effectiveNodeWeight:
            officialDisciplineWeight * topicParticipation[topic.id] * subtopicShare * confidence,
          source: hasCompleteConfigured
            ? "CONFIGURED_INTERNAL_PARTICIPATION"
            : "OFFICIAL_DISCIPLINE_NEUTRAL_INTERNAL",
        };
      }
    }
  }
  return result;
}

export function sumTopicParticipationsByDiscipline(
  weights: Record<string, HierarchicalNodeWeight>,
): Record<string, number> {
  const seenTopics = new Set<string>();
  const sums: Record<string, number> = {};
  for (const weight of Object.values(weights)) {
    if (seenTopics.has(weight.topicId)) continue;
    seenTopics.add(weight.topicId);
    sums[weight.disciplineId] = (sums[weight.disciplineId] ?? 0) + weight.topicParticipation;
  }
  return sums;
}
