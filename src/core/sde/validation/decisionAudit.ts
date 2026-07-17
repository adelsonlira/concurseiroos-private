import { ConstitutionalTier, type StrategicAction } from "../prioritization/types";
import type { ScoreBreakdown } from "../prioritization/priorityScore";
import { buildActionId } from "../prioritization/priorityEngine";

export interface DecisionAuditIssue {
  code: string;
  message: string;
  actionId?: string;
}

export interface DecisionAuditResult {
  valid: boolean;
  issues: DecisionAuditIssue[];
}

const TIER_ORDER: Record<ConstitutionalTier, number> = {
  [ConstitutionalTier.RISCO_ELIMINACAO]: 1,
  [ConstitutionalTier.LACUNAS_ALTO_PESO]: 2,
  [ConstitutionalTier.RETORNO_ESPERADO]: 3,
  [ConstitutionalTier.PROTECAO_MEMORIA]: 4,
  [ConstitutionalTier.EXPANSAO_EDITAL]: 5,
  [ConstitutionalTier.MANUTENCAO_EXCELENCIA]: 6
};

export function auditScoreBreakdown(breakdown: ScoreBreakdown): DecisionAuditResult {
  const issues: DecisionAuditIssue[] = [];
  const recomposed = Number((
    breakdown.pesoEdital +
    breakdown.incidenciaHistorica +
    (breakdown.deficienciaUsuario ?? 0) +
    (breakdown.riscoEsquecimento ?? 0) +
    (breakdown.learningLeverageScore ?? 0) +
    (breakdown.riscoEliminacao ?? 0) +
    breakdown.dependenciasBonus +
    breakdown.confidenceAdjustment +
    breakdown.activitySuitabilityAdjustment
  ).toFixed(2));

  if (!Number.isFinite(breakdown.finalScore) || breakdown.finalScore < 0) {
    issues.push({ code: "INVALID_FINAL_SCORE", message: "O score final deve ser finito e não negativo." });
  }
  if (Math.abs(recomposed - breakdown.unclampedFinalScore) > 0.001) {
    issues.push({
      code: "BREAKDOWN_RECOMPOSITION_MISMATCH",
      message: `A recomposição ${recomposed} difere do score não truncado ${breakdown.unclampedFinalScore}.`
    });
  }
  if (breakdown.finalScore !== Math.max(0, breakdown.unclampedFinalScore)) {
    issues.push({ code: "FINAL_SCORE_CLAMP_MISMATCH", message: "O score final não corresponde ao truncamento em zero." });
  }
  if (
    breakdown.historicalIncidenceSource === "UNAVAILABLE" &&
    (breakdown.incidenciaHistorica !== 0 || breakdown.historicalIncidenceRate !== 0)
  ) {
    issues.push({ code: "SHADOW_INCIDENCE_LEAK", message: "Incidência indisponível alterou o breakdown decisório." });
  }
  return { valid: issues.length === 0, issues };
}

export function auditStrategicActions(actions: readonly StrategicAction[]): DecisionAuditResult {
  const issues: DecisionAuditIssue[] = [];
  const ids = new Set<string>();

  actions.forEach((action, index) => {
    const id = buildActionId(action);
    if (ids.has(id)) issues.push({ code: "DUPLICATE_ACTION_ID", message: "Ação duplicada.", actionId: id });
    ids.add(id);
    if (action.prioridade !== index + 1) {
      issues.push({ code: "NON_SEQUENTIAL_PRIORITY", message: `Prioridade esperada ${index + 1}, recebida ${action.prioridade}.`, actionId: id });
    }
    if (!Number.isFinite(action.score) || action.score < 0) {
      issues.push({ code: "INVALID_ACTION_SCORE", message: "Score de ação inválido.", actionId: id });
    }
    if (action.justificativaXAI.camadaConstitucional !== action.camadaConstitucional) {
      issues.push({ code: "XAI_TIER_MISMATCH", message: "A explicação não corresponde à camada constitucional.", actionId: id });
    }
    if (
      action.decisionEvidence.historicalIncidenceSource === "UNAVAILABLE" &&
      action.decisionEvidence.historicalIncidenceRate !== null
    ) {
      issues.push({ code: "UNAVAILABLE_INCIDENCE_EXPOSED", message: "Ação expôs taxa histórica não validada.", actionId: id });
    }
    if (
      action.decisionEvidence.historicalIncidenceSource === "UNAVAILABLE" &&
      /incidência histórica informada para/i.test(action.justificativaXAI.fatosUtilizados)
    ) {
      issues.push({ code: "UNSUPPORTED_XAI_CLAIM", message: "A explicação alegou incidência histórica sem evidência.", actionId: id });
    }

    if (index > 0) {
      const previous = actions[index - 1];
      const previousTier = TIER_ORDER[previous.camadaConstitucional];
      const currentTier = TIER_ORDER[action.camadaConstitucional];
      const previousSafetyFront = previous.decisionEvidence.disciplineSafetyCoverageFront === true;
      const currentSafetyFront = action.decisionEvidence.disciplineSafetyCoverageFront === true;
      if (currentTier < previousTier) {
        issues.push({ code: "TIER_ORDER_VIOLATION", message: "Camadas constitucionais fora de ordem.", actionId: id });
      } else if (currentTier === previousTier && currentSafetyFront && !previousSafetyFront) {
        issues.push({ code: "DISCIPLINE_SAFETY_FRONT_VIOLATION", message: "A frente de proteção contra zero deve permanecer antes das demais ações da mesma camada.", actionId: id });
      } else if (
        currentTier === previousTier &&
        !previousSafetyFront &&
        !currentSafetyFront &&
        action.score > previous.score
      ) {
        issues.push({ code: "SCORE_ORDER_VIOLATION", message: "Scores fora de ordem dentro da camada.", actionId: id });
      } else if (
        currentTier === previousTier &&
        !previousSafetyFront &&
        !currentSafetyFront &&
        action.score === previous.score
      ) {
        const previousId = buildActionId(previous);
        if (id.localeCompare(previousId) < 0) {
          issues.push({ code: "TIE_BREAK_VIOLATION", message: "Desempate determinístico fora de ordem.", actionId: id });
        }
      }
    }
  });

  return { valid: issues.length === 0, issues };
}
