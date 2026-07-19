import { SDE_V2_CONFIG } from "./config";
import type {
  KnowledgeStateAssessment,
  NormalizedEvidence,
} from "./types";

function weightedRate(items: readonly NormalizedEvidence[]): number | null {
  let weightedCorrect = 0;
  let weightedTotal = 0;
  for (const item of items) {
    if (!item.decisionEligible || item.effectiveSampleSize <= 0) continue;
    const total = item.totalItems ?? 0;
    const correct = item.correctItems ?? 0;
    if (total <= 0) continue;
    const itemRate = correct / total;
    weightedCorrect += itemRate * item.effectiveSampleSize;
    weightedTotal += item.effectiveSampleSize;
  }
  return weightedTotal > 0 ? weightedCorrect / weightedTotal : null;
}

function trendFor(items: readonly NormalizedEvidence[]): KnowledgeStateAssessment["trend"] {
  const objective = items
    .filter((item) => item.decisionEligible && item.effectiveSampleSize > 0 && (item.totalItems ?? 0) > 0)
    .slice()
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  if (objective.length < 2) return "UNKNOWN";
  const split = Math.ceil(objective.length / 2);
  const older = weightedRate(objective.slice(0, split));
  const newer = weightedRate(objective.slice(split));
  if (older === null || newer === null) return "UNKNOWN";
  const delta = newer - older;
  if (delta >= 0.1) return "IMPROVING";
  if (delta <= -0.1) return "WORSENING";
  return "STABLE";
}

function primaryErrorCause(items: readonly NormalizedEvidence[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.decisionEligible) continue;
    for (const cause of item.errorCauses) {
      counts.set(cause, (counts.get(cause) ?? 0) + Math.max(1, item.effectiveSampleSize));
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;
}

function confidenceFor(sample: number): KnowledgeStateAssessment["confidence"] {
  if (sample >= SDE_V2_CONFIG.evidence.highConfidenceSample) return "HIGH";
  if (sample >= SDE_V2_CONFIG.evidence.mediumConfidenceSample) return "MEDIUM";
  return "LOW";
}

export function assessKnowledgeState(
  nodeId: string,
  evidence: readonly NormalizedEvidence[],
): KnowledgeStateAssessment {
  const items = evidence.filter((item) => item.subtopicId === nodeId);
  const invalid = items.some((item) => {
    const total = item.totalItems;
    if (total === undefined) return false;
    return total < 0 || (item.correctItems ?? 0) + (item.wrongItems ?? 0) + (item.blankItems ?? 0) !== total;
  });
  const objective = items.filter((item) => item.decisionEligible && item.effectiveSampleSize > 0);
  const effectiveSampleSize = objective.reduce((sum, item) => sum + item.effectiveSampleSize, 0);
  const weightedAccuracy = weightedRate(items);
  const lastEvidenceAt = items.length > 0
    ? items.map((item) => item.occurredAt).sort().at(-1) ?? null
    : null;
  const ageInDays = items.length > 0 ? Math.min(...items.map((item) => item.ageInDays)) : null;
  const consultedWeight = objective.reduce(
    (sum, item) => sum + (item.consultedMaterial === true ? item.effectiveSampleSize : 0),
    0,
  );
  const theoryCompleted = items.some((item) => item.theoryCompleted === true);
  const reviewPending = items.some((item) => item.reviewPending === true);
  const trend = trendFor(items);
  const reasons: string[] = [];

  let state: KnowledgeStateAssessment["state"];
  if (invalid) {
    state = "INVALID";
    reasons.push("Existe evidência com contagens incompatíveis.");
  } else if (items.length === 0) {
    state = "UNSEEN";
    reasons.push("Nenhuma evidência foi registrada para o subassunto.");
  } else if (effectiveSampleSize === 0 && theoryCompleted) {
    state = "LEARNING";
    reasons.push("Há cobertura teórica, mas ainda não existe medição objetiva elegível.");
  } else if (effectiveSampleSize < SDE_V2_CONFIG.evidence.minimumEffectiveSample) {
    state = theoryCompleted ? "LEARNING" : "INSUFFICIENT_EVIDENCE";
    reasons.push(`Amostra efetiva ${effectiveSampleSize.toFixed(2)} abaixo do mínimo ${SDE_V2_CONFIG.evidence.minimumEffectiveSample}.`);
  } else if (weightedAccuracy !== null && weightedAccuracy < SDE_V2_CONFIG.evidence.criticalAccuracy) {
    state = "CRITICAL";
    reasons.push(`Taxa ponderada ${(weightedAccuracy * 100).toFixed(1)}% abaixo do limiar crítico.`);
  } else if (
    weightedAccuracy !== null &&
    weightedAccuracy >= SDE_V2_CONFIG.evidence.stableAccuracy &&
    effectiveSampleSize >= SDE_V2_CONFIG.evidence.stableEffectiveSample
  ) {
    if ((ageInDays ?? 0) > SDE_V2_CONFIG.evidence.decayDays || trend === "WORSENING" || reviewPending) {
      state = "DECAYING";
      reasons.push("Evidência previamente estável apresenta envelhecimento, piora ou revisão pendente.");
    } else {
      state = "STABLE";
      reasons.push("Amostra e desempenho ponderado sustentam estabilidade operacional.");
    }
  } else {
    state = "PRACTICING";
    reasons.push("Existe medição objetiva suficiente, mas o critério de estabilidade ainda não foi alcançado.");
  }

  if (reviewPending) reasons.push("Há revisão vencida ou urgente.");
  if (trend === "WORSENING") reasons.push("A tendência recente é de piora.");
  if (consultedWeight > 0) reasons.push("Parte da medição ocorreu com consulta e recebeu desconto.");

  return {
    nodeId,
    state,
    weightedAccuracy,
    effectiveSampleSize: Math.round(effectiveSampleSize * 1000) / 1000,
    lastEvidenceAt,
    ageInDays,
    consultedEvidenceRatio: effectiveSampleSize > 0 ? consultedWeight / effectiveSampleSize : 0,
    trend,
    confidence: confidenceFor(effectiveSampleSize),
    primaryErrorCause: primaryErrorCause(items),
    theoryCoverage: theoryCompleted ? "CONFIRMED" : items.some((item) => item.granularity === "session") ? "PARTIAL" : "NONE",
    reviewPending,
    evidenceIds: items.map((item) => item.evidenceId),
    reasons,
  };
}

export function assessAllKnowledgeStates(
  subtopicIds: readonly string[],
  evidence: readonly NormalizedEvidence[],
): Record<string, KnowledgeStateAssessment> {
  return Object.fromEntries(subtopicIds.map((id) => [id, assessKnowledgeState(id, evidence)]));
}
