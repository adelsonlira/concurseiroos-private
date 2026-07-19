import type {
  SdeCalibrationDivergence,
  SdeCalibrationRecord,
  SdeDecisionComparisonSnapshot,
  SdeV1V2Comparison,
} from "../../../core/sde-v2/types";
import type { SDEApplicationResult } from "../types";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

function fnv1a(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cleanText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function v1Snapshot(result: SDEApplicationResult): SdeDecisionComparisonSnapshot {
  const action = result.actions[0] ?? null;
  const prescription = result.prescription?.current ?? null;
  const advanceCriterion = prescription?.completionEvidence?.length
    ? prescription.completionEvidence.join(" | ")
    : prescription?.diagnosticFollowUp
      ? `${prescription.diagnosticFollowUp.minimumQuestions} itens; mínimo ${prescription.diagnosticFollowUp.minimumHitRatePercent}%`
      : null;
  return {
    version: "1.0",
    status: result.status,
    disciplineId: action?.disciplinaId ?? null,
    topicId: action?.assuntoId ?? null,
    subtopicId: action?.subassuntoId ?? null,
    method: action?.tipo ?? null,
    durationMinutes: prescription?.durationMinutes ?? action?.estimatedDurationMinutes ?? null,
    advanceCriterion: cleanText(advanceCriterion),
    prerequisiteSummary: null,
    score: action?.score ?? null,
    topFactors: action
      ? [
          action.justificativaXAI.porQue,
          action.justificativaXAI.custoIgnorar,
          action.justificativaXAI.fatosUtilizados,
          action.justificativaXAI.inferencias,
        ].map(cleanText).filter((item): item is string => item !== null).slice(0, 5)
      : [],
  };
}

function v2Snapshot(result: SDEApplicationResult): SdeDecisionComparisonSnapshot | null {
  const selected = result.v2?.output.selected ?? null;
  if (!selected) return null;
  const prerequisiteSummary = selected.prerequisiteState.requiredBlocked
    ? `Bloqueado por: ${selected.prerequisiteState.blockingNodeIds.join(", ") || "pré-requisito obrigatório"}`
    : selected.prerequisiteState.recommendedNodeIds.length > 0
      ? `Recomendados: ${selected.prerequisiteState.recommendedNodeIds.join(", ")}`
      : selected.prerequisiteState.rationale.length > 0
        ? selected.prerequisiteState.rationale.join(" ")
        : null;
  return {
    version: "2.0",
    status: result.v2.output.status,
    disciplineId: selected.disciplineId,
    topicId: selected.topicId,
    subtopicId: selected.subtopicId,
    method: selected.method.method,
    durationMinutes: selected.estimatedMinutes,
    advanceCriterion: cleanText(selected.method.advanceCriterion),
    prerequisiteSummary: cleanText(prerequisiteSummary),
    score: selected.score,
    topFactors: selected.scoreComponents
      .slice()
      .sort((left, right) => right.contribution - left.contribution)
      .slice(0, 5)
      .map((factor) => `${factor.label}: ${factor.explanation}`),
  };
}

function comparableNumber(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(6));
}

export function buildSdeV1V2Comparison(
  v1Result: SDEApplicationResult,
  v2Result: SDEApplicationResult,
): SdeV1V2Comparison {
  const v1 = v1Snapshot(v1Result);
  const v2 = v2Snapshot(v2Result);
  const divergences: SdeCalibrationDivergence[] = [];
  const compare = (
    field: SdeCalibrationDivergence["field"],
    left: string | number | null,
    right: string | number | null,
  ) => {
    if (left !== right) divergences.push({ field, v1Value: left, v2Value: right });
  };

  compare("discipline", v1.disciplineId, v2?.disciplineId ?? null);
  compare("topic", v1.topicId, v2?.topicId ?? null);
  compare("subtopic", v1.subtopicId, v2?.subtopicId ?? null);
  compare("method", v1.method, v2?.method ?? null);
  compare("duration", comparableNumber(v1.durationMinutes), comparableNumber(v2?.durationMinutes ?? null));
  compare("advance_criterion", v1.advanceCriterion, v2?.advanceCriterion ?? null);
  compare("prerequisite", v1.prerequisiteSummary, v2?.prerequisiteSummary ?? null);
  compare("score", comparableNumber(v1.score), comparableNumber(v2?.score ?? null));

  const divergenceReasons: string[] = divergences.map((item) => {
    switch (item.field) {
      case "discipline": return "Disciplina selecionada divergente.";
      case "topic": return "Assunto selecionado divergente.";
      case "subtopic": return "Subassunto selecionado divergente.";
      case "method": return "Método de estudo divergente.";
      case "duration": return "Duração prescrita divergente.";
      case "advance_criterion": return "Critério de avanço divergente.";
      case "prerequisite": return "Tratamento de pré-requisito divergente.";
      case "score": return "Score estratégico divergente.";
    }
  });
  if (v2Result.v2?.output.selected?.historicalIncidenceShadow.finalShadowValue) {
    divergenceReasons.push("A incidência histórica permaneceu em shadow mode com peso decisório zero.");
  }

  return {
    sameNode: v1.subtopicId === (v2?.subtopicId ?? null),
    sameActivity: v1.method === (v2?.method ?? null),
    v1NodeId: v1.subtopicId,
    v1Activity: v1.method,
    divergenceReasons,
    v1,
    v2,
    divergences,
    isEqual: divergences.length === 0,
  };
}

function inputFingerprint(params: {
  referenceDate: string;
  v1Result: SDEApplicationResult;
  v2Result: SDEApplicationResult;
}): string {
  const { referenceDate, v1Result, v2Result } = params;
  const objectiveSnapshot = {
    referenceDate,
    availability: v1Result.availability
      ? {
          total: v1Result.availability.scheduledMinutes,
          completed: v1Result.availability.completedMinutes,
          remaining: v1Result.availability.remainingMinutes,
        }
      : null,
    v1Status: v1Result.status,
    v1Actions: v1Result.actions.map((action) => ({
      disciplineId: action.disciplinaId,
      topicId: action.assuntoId,
      subtopicId: action.subassuntoId ?? null,
      method: action.tipo,
      score: comparableNumber(action.score),
      duration: action.estimatedDurationMinutes,
    })),
    v2Status: v2Result.v2?.output.status ?? "NOT_EXECUTED",
    v2Candidates: v2Result.v2?.output.candidates.map((candidate) => ({
      nodeId: candidate.nodeId,
      score: comparableNumber(candidate.score),
      method: candidate.method.method,
      materialAvailable: candidate.materialAvailable,
      estimatedMinutes: candidate.estimatedMinutes,
      evidenceIds: [...candidate.evidenceIds].sort(),
    })) ?? [],
    normalizedEvidence: v2Result.v2?.output.normalizedEvidence.map((item) => ({
      evidenceId: item.evidenceId,
      disciplineId: item.disciplineId,
      topicId: item.topicId,
      subtopicId: item.subtopicId ?? null,
      sourceType: item.sourceType,
      totalItems: item.totalItems ?? null,
      correctItems: item.correctItems ?? null,
      wrongItems: item.wrongItems ?? null,
      blankItems: item.blankItems ?? null,
      occurredAt: item.occurredAt,
      consultedMaterial: item.consultedMaterial,
      decisionEligible: item.decisionEligible,
    })) ?? [],
  };
  return `fnv1a-${fnv1a(stableStringify(objectiveSnapshot))}`;
}

export function buildSdeCalibrationRecord(params: {
  referenceDate: string;
  v1Result: SDEApplicationResult;
  v2Result: SDEApplicationResult;
  comparison: SdeV1V2Comparison;
}): SdeCalibrationRecord {
  const fingerprint = inputFingerprint(params);
  const selected = params.v2Result.v2?.output.selected ?? null;
  const evidenceIds = [...new Set(
    params.v2Result.v2?.output.normalizedEvidence
      .filter((item) => item.decisionEligible)
      .map((item) => item.evidenceId) ?? [],
  )].sort();
  const fallbackUsed = params.v2Result.fallbackUsed === true || params.v2Result.sdeVersionUsed !== "2.0";
  return {
    calibrationId: `sde-calibration-${params.referenceDate}-${fingerprint.replace("fnv1a-", "")}`,
    schemaVersion: 1,
    createdAt: `${params.referenceDate}T12:00:00.000Z`,
    referenceDate: params.referenceDate,
    inputFingerprint: fingerprint,
    activeSdeVersion: "v1",
    executionMode: "shadow",
    affectsPrescription: false,
    v1Decision: params.comparison.v1,
    v2Decision: params.comparison.v2,
    divergences: params.comparison.divergences.map((item) => ({ ...item })),
    isEqual: params.comparison.isEqual,
    fallbackUsed,
    fallbackReason: fallbackUsed
      ? params.v2Result.fallbackReason ?? `SDE v2 shadow não produziu decisão executável (${params.v2Result.status}).`
      : undefined,
    evidenceIds,
    historicalIncidenceShadow: selected?.historicalIncidenceShadow,
    sessionOutcome: null,
  };
}
