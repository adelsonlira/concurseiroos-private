export type DecisionWarningKind = "OFFICIAL_LIMIT" | "SHADOW_RESEARCH" | "CALIBRATION" | "OPERATIONAL_NOTE";

export interface PresentedDecisionWarning {
  kind: DecisionWarningKind;
  label: string;
  blocksStudy: false;
  text: string;
}

export function presentDecisionWarning(text: string): PresentedDecisionWarning {
  const normalized = text.toLocaleLowerCase("pt-BR");
  if (normalized.includes("edital") && normalized.includes("não informa")) {
    return { kind: "OFFICIAL_LIMIT", label: "Limite do edital", blocksStudy: false, text };
  }
  if (normalized.includes("matriz histórica") || normalized.includes("shadow")) {
    return { kind: "SHADOW_RESEARCH", label: "Pesquisa em shadow mode", blocksStudy: false, text };
  }
  if (normalized.includes("retorno marginal") || normalized.includes("pontos por hora")) {
    return { kind: "CALIBRATION", label: "Calibração futura", blocksStudy: false, text };
  }
  return { kind: "OPERATIONAL_NOTE", label: "Nota operacional", blocksStudy: false, text };
}
