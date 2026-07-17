import type { ClassificationEligibility, QuestionClassificationProposal } from "./types";

export function validateClassificationProposal(proposal: QuestionClassificationProposal): string[] {
  const errors: string[] = [];
  if (!proposal.questionId.trim()) errors.push("questionId é obrigatório.");
  if (proposal.confidence < 0 || proposal.confidence > 1) errors.push("confidence deve ficar entre 0 e 1.");
  if (proposal.evidenceSourceIds.length === 0) errors.push("A classificação exige fonte de evidência.");
  if (!proposal.rationale.trim()) errors.push("A classificação exige justificativa.");
  if (proposal.equivalenceStrength === "NONE" && proposal.targetTaxonomyNodeId !== null) {
    errors.push("Equivalência NONE não pode apontar para nó-alvo.");
  }
  if (proposal.equivalenceStrength !== "NONE" && !proposal.targetTaxonomyNodeId) {
    errors.push("Equivalência diferente de NONE exige nó-alvo.");
  }
  if (proposal.method !== "HUMAN" && ["HUMAN_APPROVED", "HUMAN_CORRECTED"].includes(proposal.status)) {
    errors.push("Somente revisão humana pode aprovar ou corrigir classificação.");
  }
  return errors;
}

export function evaluateClassificationEligibility(
  proposal: QuestionClassificationProposal,
): ClassificationEligibility {
  const validationErrors = validateClassificationProposal(proposal);
  const reasons = [...validationErrors];
  const humanReviewed = proposal.status === "HUMAN_APPROVED" || proposal.status === "HUMAN_CORRECTED";
  const mapped = Boolean(proposal.sourceTaxonomyNodeId && proposal.targetTaxonomyNodeId);

  if (!humanReviewed) reasons.push("A classificação ainda não foi aprovada por curadoria humana.");
  if (!mapped) reasons.push("Classificação de origem e equivalência de destino precisam estar completas.");
  if (proposal.equivalenceStrength === "APPROXIMATE") reasons.push("Equivalência aproximada não compõe incidência.");
  if (proposal.confidence < 0.8) reasons.push("Confiança abaixo do portão conservador de 0,80.");

  const descriptive = validationErrors.length === 0
    && proposal.status !== "REJECTED"
    && proposal.status !== "INSUFFICIENT_EVIDENCE"
    && proposal.confidence >= 0.65;
  const historical = validationErrors.length === 0
    && humanReviewed
    && mapped
    && proposal.confidence >= 0.8
    && (proposal.equivalenceStrength === "EXACT" || proposal.equivalenceStrength === "PARTIAL");

  return {
    eligibleForDescriptiveShadowAnalytics: descriptive,
    eligibleForHistoricalIncidence: historical,
    reasons: historical ? [] : [...new Set(reasons)],
  };
}
