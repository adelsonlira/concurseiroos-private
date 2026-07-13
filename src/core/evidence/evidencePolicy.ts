/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EvidenceActivationPolicy,
  StrategicEvidencePackage,
  StrategicEvidenceSource,
  TopicIncidenceEvidence,
  ValidatedIncidenceResolution
} from "./types";

const NEUTRAL_PRIOR = 0.5;

function assertRate(value: number, field: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${field} deve ser uma taxa finita entre 0 e 1.`);
  }
}

export function validateEvidenceActivationPolicy(policy: EvidenceActivationPolicy): void {
  if (
    !Number.isInteger(policy.minimumManuallyReviewedQuestionsPerTopic) ||
    policy.minimumManuallyReviewedQuestionsPerTopic <= 0
  ) {
    throw new Error("minimumManuallyReviewedQuestionsPerTopic deve ser inteiro positivo.");
  }
}

export function canSourceInfluenceHistoricalIncidence(source: StrategicEvidenceSource): boolean {
  return (
    source.kind === "OFFICIAL_QUESTION_CORPUS" &&
    source.validationStatus === "VALIDATED" &&
    source.allowedUses.includes("SDE_HISTORICAL_INCIDENCE") &&
    !source.forbiddenUses.includes("SDE_HISTORICAL_INCIDENCE")
  );
}

export function isIncidenceEvidenceActivatable(
  evidence: TopicIncidenceEvidence,
  sources: StrategicEvidenceSource[],
  policy: EvidenceActivationPolicy
): boolean {
  validateEvidenceActivationPolicy(policy);

  if (evidence.status !== "VALIDATED") return false;
  if (evidence.incidenceRate === null) return false;
  assertRate(evidence.incidenceRate, "incidenceRate");
  if (evidence.matchedQuestionCount === null || evidence.eligibleCorpusQuestionCount === null) return false;
  if (!Number.isInteger(evidence.matchedQuestionCount) || evidence.matchedQuestionCount < 0) return false;
  if (!Number.isInteger(evidence.eligibleCorpusQuestionCount) || evidence.eligibleCorpusQuestionCount <= 0) return false;
  if (evidence.matchedQuestionCount > evidence.eligibleCorpusQuestionCount) return false;
  if (evidence.manuallyReviewedQuestionCount < policy.minimumManuallyReviewedQuestionsPerTopic) return false;
  if (policy.requireDeduplication && !evidence.deduplicated) return false;
  if (policy.requireReproducibleInclusionCriteria && evidence.inclusionCriteria.length === 0) return false;
  if (policy.requireReproducibleExclusionCriteria && evidence.exclusionCriteria.length === 0) return false;

  return evidence.sourceIds.length > 0 && evidence.sourceIds.every((sourceId) => {
    const source = sources.find((candidate) => candidate.id === sourceId);
    return source ? canSourceInfluenceHistoricalIncidence(source) : false;
  });
}

export function resolveHistoricalIncidence(
  topicId: string,
  evidencePackage: StrategicEvidencePackage
): ValidatedIncidenceResolution {
  const candidates = evidencePackage.incidenceEvidence.filter((item) => item.topicId === topicId);
  const validated = candidates.find((item) =>
    isIncidenceEvidenceActivatable(item, evidencePackage.sources, evidencePackage.activationPolicy)
  );

  if (!validated || validated.incidenceRate === null) {
    return {
      value: NEUTRAL_PRIOR,
      source: "UNAVAILABLE",
      evidenceId: null,
      note:
        "Não há matriz empírica validada para este tópico. O valor 0,5 é um prior neutro de estabilidade e não representa frequência histórica."
    };
  }

  return {
    value: validated.incidenceRate,
    source: "EMPIRICAL",
    evidenceId: validated.id,
    note: `Incidência ativada a partir da evidência validada ${validated.id}.`
  };
}

export function buildHistoricalIncidenceMap(
  topicIds: string[],
  evidencePackage: StrategicEvidencePackage
): Record<string, ValidatedIncidenceResolution> {
  return Object.fromEntries(
    topicIds.map((topicId) => [topicId, resolveHistoricalIncidence(topicId, evidencePackage)])
  );
}
