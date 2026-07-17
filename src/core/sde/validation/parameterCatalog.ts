import {
  DEFAULT_LEARNING_LEVERAGE_POLICY,
  DEFAULT_OPPORTUNITY_COST_POLICY,
  SDE_CONFIG
} from "../config/sdeConfig";

export type SDEParameterClassification = "HEURISTIC" | "OPERATIONAL";
export type SDEParameterValidationStatus =
  | "PROPERTY_TESTED"
  | "SCENARIO_TESTED"
  | "PENDING_CALIBRATION";

export interface SDEParameterCatalogEntry {
  path: string;
  value: number;
  classification: SDEParameterClassification;
  validationStatus: SDEParameterValidationStatus;
  rationale: string;
  expectedProperties: string[];
}

const ROOTS = {
  SDE_CONFIG,
  DEFAULT_OPPORTUNITY_COST_POLICY,
  DEFAULT_LEARNING_LEVERAGE_POLICY
} as const;

function flattenNumericLeaves(value: unknown, prefix: string): Array<{ path: string; value: number }> {
  if (typeof value === "number") return [{ path: prefix, value }];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenNumericLeaves(child, prefix ? `${prefix}.${key}` : key)
  );
}

function describe(path: string): Omit<SDEParameterCatalogEntry, "path" | "value"> {
  if (path.includes("EVIDENCE")) {
    return {
      classification: "OPERATIONAL",
      validationStatus: "PROPERTY_TESTED",
      rationale: "Classifica suficiência, confiança e recência das evidências sem declarar domínio do conteúdo.",
      expectedProperties: ["determinismo", "confiança não diminui ao aumentar a amostra", "confiança decai com evidência mais antiga"]
    };
  }
  if (path.includes("ELIGIBILITY") || path.includes("CONSTRAINTS")) {
    return {
      classification: "OPERATIONAL",
      validationStatus: "SCENARIO_TESTED",
      rationale: "Controla transições cognitivas e vetos para impedir ações impossíveis, prematuras ou desperdiçadoras.",
      expectedProperties: ["nenhum bloqueio cognitivo sem rota de recuperação", "limites finitos", "mesma entrada produz mesma elegibilidade"]
    };
  }
  if (path.includes("PRIORITY_SCORE")) {
    return {
      classification: "HEURISTIC",
      validationStatus: "SCENARIO_TESTED",
      rationale: "Ordena ações elegíveis; não representa probabilidade de aprovação nem ganho causal de pontos.",
      expectedProperties: ["score finito e não negativo", "componentes auditáveis", "incidência indisponível não altera a decisão"]
    };
  }
  if (path.includes("RECOMMENDATION")) {
    return {
      classification: "OPERATIONAL",
      validationStatus: "SCENARIO_TESTED",
      rationale: "Converte o resultado do motor em explicações e escalas de apresentação.",
      expectedProperties: ["explicação coerente com o cálculo", "ausência de alegações sem evidência"]
    };
  }
  if (path.includes("OPPORTUNITY_COST")) {
    return {
      classification: "HEURISTIC",
      validationStatus: "PENDING_CALIBRATION",
      rationale: "Define comparabilidade operacional entre ações; ainda depende de calibração prospectiva com uso real.",
      expectedProperties: ["comparar somente durações compatíveis", "não inventar retorno quando faltam dados"]
    };
  }
  return {
    classification: "HEURISTIC",
    validationStatus: "PENDING_CALIBRATION",
    rationale: "Parâmetro de alavancagem pedagógica que exige validação prospectiva antes de interpretação causal.",
    expectedProperties: ["faixas ordenadas", "resultado determinístico", "não prometer ganho causal"]
  };
}

export function buildSDEParameterCatalog(): SDEParameterCatalogEntry[] {
  return Object.entries(ROOTS)
    .flatMap(([root, value]) => flattenNumericLeaves(value, root))
    .map(({ path, value }) => ({ path, value, ...describe(path) }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function listConfiguredNumericParameters(): Array<{ path: string; value: number }> {
  return Object.entries(ROOTS)
    .flatMap(([root, value]) => flattenNumericLeaves(value, root))
    .sort((left, right) => left.path.localeCompare(right.path));
}
