import rawConfig from "./config/sde-v2-weights.json";
import rawGraph from "./config/dataprev-knowledge-graph-v1.json";
import type { SdeV2RuntimeConfig, VersionedKnowledgeGraph } from "./types";

export const SDE_V2_CONFIG = rawConfig as SdeV2RuntimeConfig;
export const DATAPREV_KNOWLEDGE_GRAPH_V2 = rawGraph as VersionedKnowledgeGraph;

export function validateSdeV2Configuration(config: SdeV2RuntimeConfig = SDE_V2_CONFIG): void {
  const coefficients = Object.values(config.score.components);
  if (coefficients.length === 0) throw new Error("SDE v2 exige componentes de score configurados.");
  if (coefficients.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Coeficientes do SDE v2 devem ser finitos e não negativos.");
  }
  if (coefficients.some((value) => value > config.score.componentCap)) {
    throw new Error("Um componente do SDE v2 excede o limite de dominância configurado.");
  }
  const total = coefficients.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`Coeficientes do SDE v2 devem somar 1; soma atual ${total}.`);
  }
  if (config.evidence.recencyHalfLifeDays <= 0) {
    throw new Error("A meia-vida de recência deve ser positiva.");
  }
}
