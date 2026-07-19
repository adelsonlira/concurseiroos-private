import { SDE_V2_CONFIG } from "./config";
import type {
  HardRuleResult,
  HistoricalIncidenceSignal,
  KnowledgeStateAssessment,
  ScoreComponent,
} from "./types";

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function component(params: {
  key: string;
  label: string;
  value: number;
  source: string;
  fallbackUsed?: boolean;
  explanation: string;
}): ScoreComponent {
  const coefficient = SDE_V2_CONFIG.score.components[params.key] ?? 0;
  const normalizedValue = clamp(params.value);
  return {
    key: params.key,
    label: params.label,
    normalizedValue,
    coefficient,
    contribution: normalizedValue * coefficient * 100,
    source: params.source,
    fallbackUsed: params.fallbackUsed ?? false,
    explanation: params.explanation,
  };
}

export interface ScoreCandidateInput {
  officialWeightNormalized: number;
  knowledgeState: KnowledgeStateAssessment;
  coverageGap: number;
  eliminationRisk: number;
  reviewUrgency: number;
  prerequisiteValue: number;
  transferValue: number;
  evidenceQuality: number;
  examProximity: number;
  expectedReturnPerMinute: number;
  materialAvailable: boolean;
  recentDiversity: number;
  historicalIncidenceShadow: HistoricalIncidenceSignal;
}

export function buildScoreComponents(input: ScoreCandidateInput): ScoreComponent[] {
  const accuracy = input.knowledgeState.weightedAccuracy;
  const deficiency = accuracy === null ? 0.65 : 1 - accuracy;
  const forgettingRisk = input.knowledgeState.ageInDays === null
    ? 0
    : clamp(input.knowledgeState.ageInDays / (SDE_V2_CONFIG.evidence.decayDays * 2));
  const worsening = input.knowledgeState.trend === "WORSENING" ? 1 : input.knowledgeState.trend === "UNKNOWN" ? 0.25 : 0;
  return [
    component({
      key: "officialWeight",
      label: "Peso oficial hierárquico",
      value: input.officialWeightNormalized,
      source: "Edital + participação interna explícita",
      explanation: "O peso da disciplina foi distribuído entre assuntos e subassuntos, sem repetição integral.",
    }),
    component({
      key: "personalDeficiency",
      label: "Deficiência pessoal",
      value: deficiency,
      source: accuracy === null ? "Fallback explícito por ausência de medição" : "Taxa ponderada de acerto",
      fallbackUsed: accuracy === null,
      explanation: accuracy === null
        ? "Sem medição objetiva, foi usado um déficit moderado para permitir diagnóstico sem presumir domínio."
        : `Déficit calculado a partir de ${(accuracy * 100).toFixed(1)}% ponderados.`,
    }),
    component({
      key: "coverageGap",
      label: "Ausência de cobertura",
      value: input.coverageGap,
      source: "Cobertura teórica e sessões concluídas",
      explanation: "Conteúdo sem cobertura recebe prioridade de expansão controlada.",
    }),
    component({
      key: "forgettingRisk",
      label: "Risco de esquecimento",
      value: forgettingRisk,
      source: "Idade da última evidência",
      explanation: "O risco cresce gradualmente com a idade da evidência, sem substituir medição objetiva.",
    }),
    component({
      key: "worseningTrend",
      label: "Tendência de piora",
      value: worsening,
      source: "Comparação determinística entre evidências antigas e recentes",
      explanation: "Queda recente favorece intervenção antes de nova expansão.",
    }),
    component({
      key: "eliminationRisk",
      label: "Risco eliminatório",
      value: input.eliminationRisk,
      source: "Regra oficial de nota zero e cobertura disciplinar",
      explanation: "Protege disciplinas ainda sem acerto ou com evidência crítica.",
    }),
    component({
      key: "reviewUrgency",
      label: "Urgência de revisão",
      value: input.reviewUrgency,
      source: "Cronograma de revisão",
      explanation: "Revisões vencidas são tratadas antes da repetição irrestrita de conteúdo novo.",
    }),
    component({
      key: "prerequisiteValue",
      label: "Valor de pré-requisito",
      value: input.prerequisiteValue,
      source: "Grafo de conhecimento versionado",
      explanation: "Bases que destravam conteúdo avançado recebem reforço explícito.",
    }),
    component({
      key: "transferValue",
      label: "Valor de transferência",
      value: input.transferValue,
      source: "Relações de transferência aprovadas",
      explanation: "Conhecimentos com utilidade transversal recebem bônus limitado.",
    }),
    component({
      key: "evidenceQuality",
      label: "Qualidade das evidências",
      value: input.evidenceQuality,
      source: "Autoridade, consulta, recência e amostra efetiva",
      explanation: "Evidência forte aumenta a confiança da intervenção, sem transformar qualidade em domínio.",
    }),
    component({
      key: "examProximity",
      label: "Proximidade da prova",
      value: input.examProximity,
      source: "Data oficial da prova",
      explanation: "A proximidade aumenta a preferência por ações executáveis e verificáveis.",
    }),
    component({
      key: "returnPerMinute",
      label: "Retorno esperado por minuto",
      value: input.expectedReturnPerMinute,
      source: "Heurística operacional explicada",
      fallbackUsed: true,
      explanation: "Sem série causal suficiente, usa-se aproximação conservadora baseada em déficit e duração.",
    }),
    component({
      key: "materialAvailability",
      label: "Material disponível",
      value: input.materialAvailable ? 1 : 0,
      source: "Catálogo de materiais e fontes externas",
      explanation: "Ação com recurso executável disponível é favorecida, mas falta de material não inventa conteúdo.",
    }),
    component({
      key: "recentDiversity",
      label: "Diversidade recente",
      value: input.recentDiversity,
      source: "Histórico recente de decisões",
      explanation: "Reduz repetição excessiva do mesmo subassunto dentro da janela configurada.",
    }),
  ];
}

export function scoreFromComponents(components: readonly ScoreComponent[]): number {
  const total = components.reduce((sum, item) => sum + item.contribution, 0);
  return Math.round(Math.min(100, Math.max(0, total)) * 100) / 100;
}

export function evaluateHardRules(params: {
  inActiveSyllabus: boolean;
  eliminationRisk: number;
  reviewUrgent: boolean;
  requiredPrerequisiteBlocked: boolean;
  availableMinutes: number;
  estimatedMinutes: number;
  materialAvailable: boolean;
  evidenceSufficientForMethod: boolean;
  excessiveRecentRepetition: boolean;
  nodeId: string;
}): HardRuleResult[] {
  const rules: HardRuleResult[] = [];
  rules.push({
    condition: "ACTIVE_SYLLABUS",
    result: params.inActiveSyllabus ? "PASSED" : "BLOCKED",
    justification: params.inActiveSyllabus ? "O nó pertence ao edital ativo." : "O nó não pertence ao edital ativo.",
    affectedAction: params.nodeId,
  });
  rules.push({
    condition: "ELIMINATION_OR_ZERO_RISK",
    result: params.eliminationRisk > 0.7 ? "FAVORED" : "NOT_APPLICABLE",
    justification: params.eliminationRisk > 0.7 ? "Risco de nota zero ou eliminação exige cobertura prioritária." : "Não há risco eliminatório crítico identificado neste nó.",
    affectedAction: params.nodeId,
  });
  rules.push({
    condition: "URGENT_REVIEW",
    result: params.reviewUrgent ? "FAVORED" : "NOT_APPLICABLE",
    justification: params.reviewUrgent ? "Existe revisão vencida ou urgente." : "Não há revisão urgente neste nó.",
    affectedAction: params.nodeId,
  });
  rules.push({
    condition: "REQUIRED_PREREQUISITE",
    result: params.requiredPrerequisiteBlocked ? "BLOCKED" : "PASSED",
    justification: params.requiredPrerequisiteBlocked ? "Pré-requisito obrigatório inadequado; o conteúdo avançado é bloqueado." : "Pré-requisitos obrigatórios não bloqueiam a ação.",
    affectedAction: params.nodeId,
  });
  rules.push({
    condition: "AVAILABLE_TIME",
    result: params.availableMinutes >= params.estimatedMinutes ? "PASSED" : "BLOCKED",
    justification: params.availableMinutes >= params.estimatedMinutes ? "A ação cabe integralmente na janela disponível." : "A ação não cabe integralmente na janela disponível.",
    affectedAction: params.nodeId,
  });
  rules.push({
    condition: "USABLE_MATERIAL",
    result: params.materialAvailable ? "PASSED" : "NOT_APPLICABLE",
    justification: params.materialAvailable ? "Existe material ou fonte utilizável." : "Não há material localizado; somente métodos sem dependência de conteúdo privado podem prosseguir.",
    affectedAction: params.nodeId,
  });
  rules.push({
    condition: "METHOD_EVIDENCE_FIT",
    result: params.evidenceSufficientForMethod ? "PASSED" : "FAVORED",
    justification: params.evidenceSufficientForMethod ? "A evidência sustenta a escolha do método." : "Evidência insuficiente favorece diagnóstico ou teoria, não prática avançada.",
    affectedAction: params.nodeId,
  });
  rules.push({
    condition: "RECENT_REPETITION",
    result: params.excessiveRecentRepetition ? "BLOCKED" : "PASSED",
    justification: params.excessiveRecentRepetition ? "A mesma atividade foi repetida excessivamente na janela recente." : "Não há repetição excessiva recente.",
    affectedAction: params.nodeId,
  });
  return rules;
}
