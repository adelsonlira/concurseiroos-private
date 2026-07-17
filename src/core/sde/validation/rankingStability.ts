import type { StrategicAction } from "../prioritization/types";

export interface RankingStabilityIssue {
  actionKey: string;
  previousRank: number;
  nextRank: number;
  rankDelta: number;
  message: string;
}

function actionKey(action: StrategicAction): string {
  return [action.disciplinaId, action.assuntoId, action.subassuntoId ?? "topic", action.tipo].join(":");
}

export function auditRankingStability(params: {
  previous: readonly StrategicAction[];
  next: readonly StrategicAction[];
  changedEvidenceActionKeys?: readonly string[];
  maximumUnexplainedRankDelta?: number;
}): { valid: boolean; issues: RankingStabilityIssue[] } {
  const changed = new Set(params.changedEvidenceActionKeys ?? []);
  const threshold = Math.max(0, params.maximumUnexplainedRankDelta ?? 3);
  const previousRanks = new Map(params.previous.map((action) => [actionKey(action), action.prioridade]));
  const issues: RankingStabilityIssue[] = [];
  for (const action of params.next) {
    const key = actionKey(action);
    const previousRank = previousRanks.get(key);
    if (previousRank === undefined || changed.has(key)) continue;
    const rankDelta = Math.abs(previousRank - action.prioridade);
    if (rankDelta > threshold) {
      issues.push({
        actionKey: key,
        previousRank,
        nextRank: action.prioridade,
        rankDelta,
        message: `A ação mudou ${rankDelta} posições sem evidência declarada que justificasse a alteração.`,
      });
    }
  }
  return { valid: issues.length === 0, issues };
}
