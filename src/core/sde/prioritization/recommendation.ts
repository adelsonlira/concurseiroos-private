/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConstraintCheck,
  ConstitutionalTier,
  EliminationRiskResult,
  MarginalReturnEstimate,
  OpportunityCostResult,
  RankingContext,
  StrategicAction,
  XAIJustification
} from "./types";
import { ScoreBreakdown } from "./priorityScore";

const REASON_CODES = [
  "UNSEEN_THEORY",
  "LOW_PERFORMANCE_THEORY",
  "DIAGNOSTIC_QUESTIONS",
  "OBSERVED_PRACTICE",
  "SCHEDULED_REVIEW_DUE",
  "REVISION_EXPIRED",
  "HIGH_DECAY",
  "HISTORICAL_DROP",
  "RECENT_REGRESSION",
  "FLASHCARDS_PENDING",
  "SIMULADO_ELIGIBLE",
  "NOT_ELIGIBLE"
] as const;

type ReasonCode = (typeof REASON_CODES)[number];

function mapReasonCode(input?: string): ReasonCode {
  return REASON_CODES.includes(input as ReasonCode)
    ? (input as ReasonCode)
    : "NOT_ELIGIBLE";
}

function formatPercent(value: number | null): string {
  return value === null ? "N/A" : `${(value * 100).toFixed(0)}%`;
}

function buildWhy(params: {
  reasonCode: ReasonCode;
  diagnosticPurpose: boolean;
  topicDisplay: string;
  disciplinaNome: string;
  hitRate: number | null;
  scoreBreakdown: ScoreBreakdown;
  eliminationRiskResult?: EliminationRiskResult;
}): string {
  const {
    reasonCode,
    diagnosticPurpose,
    topicDisplay,
    disciplinaNome,
    hitRate,
    scoreBreakdown,
    eliminationRiskResult
  } = params;

  if (scoreBreakdown.disciplineZeroSafetyStatus === "NO_CORRECT_ANSWER") {
    return `A disciplina ${disciplinaNome} ainda não possui acerto registrado. Como o edital elimina quem zera uma disciplina, o Coach protege primeiro uma base mínima antes de concentrar o restante do esforço nos conteúdos de maior pontuação.`;
  }
  if (scoreBreakdown.disciplineZeroSafetyStatus === "UNASSESSED") {
    return `A disciplina ${disciplinaNome} ainda não possui amostra diagnóstica. Como o edital elimina quem zera uma disciplina, esta ação abre uma evidência mínima sem presumir domínio.`;
  }
  if (scoreBreakdown.disciplineZeroSafetyStatus === "MINIMUM_EVIDENCE") {
    return `A disciplina ${disciplinaNome} já possui ao menos um acerto, mas a amostra ainda é pequena. O Coach mantém uma proteção mínima contra o risco de zerar antes de liberar concentração integral nos conteúdos de maior retorno.`;
  }

  if (diagnosticPurpose || reasonCode === "DIAGNOSTIC_QUESTIONS") {
    return `Existem evidências insuficientes para estimar o rendimento de '${topicDisplay}' com segurança. As questões foram recomendadas com finalidade diagnóstica.`;
  }

  switch (reasonCode) {
    case "UNSEEN_THEORY":
      return `O tópico '${topicDisplay}' ainda não possui evidências de estudo ou desempenho. A teoria foi recomendada para construir a base conceitual inicial.`;
    case "LOW_PERFORMANCE_THEORY":
      return `O rendimento observado em '${topicDisplay}' é ${formatPercent(hitRate)}, com amostra suficiente para justificar reforço teórico.`;
    case "OBSERVED_PRACTICE":
      return `O tópico '${topicDisplay}' possui base observada e a prática foi recomendada para consolidação por questões.`;
    case "SCHEDULED_REVIEW_DUE":
      return `A revisão de '${topicDisplay}' está vencida no cronograma operacional registrado pelo aplicativo.`;
    case "REVISION_EXPIRED":
      return `A revisão de '${topicDisplay}' foi recomendada porque o intervalo temporal configurado foi ultrapassado.`;
    case "HIGH_DECAY":
      return `A revisão de '${topicDisplay}' foi recomendada porque o indicador de decaimento informado está acima do limite de elegibilidade.`;
    case "HISTORICAL_DROP":
      return `A revisão de '${topicDisplay}' foi recomendada porque a série de tentativas mostra queda de desempenho recente.`;
    case "RECENT_REGRESSION":
      return `A revisão de '${topicDisplay}' foi recomendada devido a erro recente após desempenho anteriormente consolidado.`;
    case "FLASHCARDS_PENDING":
      return `A atividade foi recomendada porque existem flashcards pendentes em '${topicDisplay}'.`;
    default:
      break;
  }

  if (scoreBreakdown.camadaConstitucional === ConstitutionalTier.RISCO_ELIMINACAO) {
    if (
      eliminationRiskResult?.disciplineHitRate !== null &&
      eliminationRiskResult?.disciplineHitRate !== undefined &&
      eliminationRiskResult.minimumRequired !== null
    ) {
      return `A disciplina ${disciplinaNome} possui rendimento ponderado observado de ${formatPercent(eliminationRiskResult.disciplineHitRate)}, diante de mínimo de ${formatPercent(eliminationRiskResult.minimumRequired)}, com cobertura ponderada de ${formatPercent(eliminationRiskResult.weightedCoverage)}.`;
    }
    return `A disciplina ${disciplinaNome} está na camada de risco eliminatório, mas os dados quantitativos disponíveis ainda são insuficientes para uma descrição mais precisa.`;
  }

  if (scoreBreakdown.camadaConstitucional === ConstitutionalTier.LACUNAS_ALTO_PESO) {
    return `O tópico '${topicDisplay}' possui deficiência observada em conteúdo de relevância elevada no edital.`;
  }
  if (scoreBreakdown.camadaConstitucional === ConstitutionalTier.RETORNO_ESPERADO) {
    return `O tópico '${topicDisplay}' está em uma faixa heurística de alavancagem de aprendizagem baseada no desempenho observado.`;
  }
  if (scoreBreakdown.camadaConstitucional === ConstitutionalTier.PROTECAO_MEMORIA) {
    return `O tópico '${topicDisplay}' foi priorizado para proteção da memória com base nos indicadores de revisão disponíveis.`;
  }
  if (scoreBreakdown.camadaConstitucional === ConstitutionalTier.EXPANSAO_EDITAL) {
    return `O tópico '${topicDisplay}' foi priorizado para ampliar a cobertura do conteúdo programático.`;
  }
  return `O tópico '${topicDisplay}' foi selecionado para manutenção do desempenho observado.`;
}

function buildBenefit(
  reasonCode: ReasonCode,
  diagnosticPurpose: boolean,
  hitRate: number | null,
  tier: ConstitutionalTier
): string | null {
  if (diagnosticPurpose || reasonCode === "DIAGNOSTIC_QUESTIONS") {
    return "coletar evidências diagnósticas";
  }
  if (hitRate === null) return null;
  if (reasonCode === "SCHEDULED_REVIEW_DUE") return "executar uma revisão programada e vencida";
  if (reasonCode === "REVISION_EXPIRED") return "reativar conteúdo com revisão temporalmente vencida";
  if (reasonCode === "HIGH_DECAY") return "reduzir risco de esquecimento indicado pelo decaimento";
  if (reasonCode === "HISTORICAL_DROP") return "tratar queda observada no desempenho";
  if (reasonCode === "RECENT_REGRESSION") return "corrigir regressão recente observada";
  if (reasonCode === "FLASHCARDS_PENDING") return "processar flashcards pendentes";
  if (tier === ConstitutionalTier.RISCO_ELIMINACAO) return "reduzir risco eliminatório categórico";
  if (tier === ConstitutionalTier.LACUNAS_ALTO_PESO) return "reduzir deficiência observada em conteúdo relevante";
  if (tier === ConstitutionalTier.EXPANSAO_EDITAL) return "aumentar cobertura do edital";
  return "consolidar o desempenho observado";
}

function buildOpportunityCostText(result?: OpportunityCostResult): string {
  if (
    result?.status === "CALCULATED" &&
    result.value !== null &&
    result.bestAlternativeActionId
  ) {
    return `Entre ações da mesma camada constitucional e com duração comparável, a melhor alternativa identificada foi '${result.bestAlternativeName ?? result.bestAlternativeActionId}', com diferença relativa de ${result.value} pontos no score de prioridade.`;
  }

  return "Não há dados suficientes para identificar uma alternativa comparável, pois a duração estimada das atividades ainda não foi informada ou não existe outra ação compatível.";
}

export function generateStrategicAction(params: {
  prioridade: number;
  scoreBreakdown: ScoreBreakdown;
  tempoEstimadoMinutos: number;
  estimatedDurationMinutes: number | null;
  disciplinaId: string;
  disciplinaNome: string;
  assuntoId: string;
  assuntoNome: string;
  subassuntoId?: string;
  subassuntoNome?: string;
  tipo: "teoria" | "questoes" | "revisao" | "flashcards" | "simulado";
  hitRate: number | null;
  questionsCount: number;
  bancaName: string;
  diagnosticPurpose: boolean;
  constraintChecks: ConstraintCheck[];
  opportunityCostResult?: OpportunityCostResult;
  reasonCode?: string;
  eliminationRiskResult?: EliminationRiskResult;
  marginalReturnEstimate?: MarginalReturnEstimate;
  disciplineSafetyCoverageFront?: boolean;
  rankingContext: RankingContext;
}): StrategicAction {
  const {
    prioridade,
    scoreBreakdown,
    tempoEstimadoMinutos,
    estimatedDurationMinutes,
    disciplinaId,
    disciplinaNome,
    assuntoId,
    assuntoNome,
    subassuntoId,
    subassuntoNome,
    tipo,
    hitRate,
    questionsCount,
    bancaName,
    diagnosticPurpose,
    constraintChecks,
    opportunityCostResult,
    reasonCode,
    eliminationRiskResult,
    marginalReturnEstimate,
    disciplineSafetyCoverageFront,
    rankingContext
  } = params;

  const mappedReasonCode = mapReasonCode(reasonCode);
  const topicDisplay = subassuntoNome || assuntoNome;
  const porQue = buildWhy({
    reasonCode: mappedReasonCode,
    diagnosticPurpose,
    topicDisplay,
    disciplinaNome,
    hitRate,
    scoreBreakdown,
    eliminationRiskResult
  });

  const fatos: string[] = [`Estado do conhecimento: ${scoreBreakdown.knowledgeState}`];
  const missingData: string[] = [];

  if (scoreBreakdown.disciplineWeight !== undefined) {
    fatos.push(`Peso oficial da disciplina no modelo: ${scoreBreakdown.disciplineWeight}`);
  } else {
    fatos.push(`Componente relativo do edital: ${scoreBreakdown.pesoEdital}`);
  }

  if (scoreBreakdown.topicWeightSource === "NEUTRAL_PRIOR") {
    missingData.push("distribuição oficial de questões entre os assuntos da disciplina");
  } else if (scoreBreakdown.topicWeight !== undefined) {
    fatos.push(`Peso específico do assunto: ${scoreBreakdown.topicWeight}`);
  }

  if (scoreBreakdown.historicalIncidenceSource === "UNAVAILABLE") {
    missingData.push(`incidência histórica empírica da banca ${bancaName} para o assunto`);
  } else {
    fatos.push(`Incidência histórica informada para a banca ${bancaName}: ${formatPercent(scoreBreakdown.historicalIncidenceRate)}`);
  }

  if (hitRate !== null) fatos.push(`Rendimento observado: ${formatPercent(hitRate)}`);
  if (questionsCount > 0) fatos.push(`Questões registradas: ${questionsCount}`);
  if (scoreBreakdown.riscoEsquecimento !== null) {
    fatos.push(`Componente relativo de risco de esquecimento: ${scoreBreakdown.riscoEsquecimento}`);
  }
  if (scoreBreakdown.dependenciasBonus > 0) {
    fatos.push(`Bônus estrutural de dependências: ${scoreBreakdown.dependenciasBonus}`);
  }
  if (scoreBreakdown.disciplineZeroSafetyStatus !== "NOT_APPLICABLE") {
    fatos.push(
      `Proteção contra zero na disciplina: ${scoreBreakdown.disciplineZeroSafetyStatus}; ` +
      `${scoreBreakdown.disciplineCorrectAnswers} acerto(s) em ${scoreBreakdown.disciplineSampleSize} tentativa(s)`
    );
  }

  if (hitRate === null) missingData.push("rendimento observado");
  if (questionsCount === 0) missingData.push("questões registradas");
  if (estimatedDurationMinutes === null) missingData.push("duração estimada da atividade");
  if (marginalReturnEstimate?.status !== "CALCULATED") {
    missingData.push(...(marginalReturnEstimate?.missingData ?? ["episódios causais de aprendizagem"]));
  }

  const inferenceParts: string[] = [];
  if (rankingContext.isTied && rankingContext.note) {
    inferenceParts.push(rankingContext.note);
  }

  if (mappedReasonCode === "UNSEEN_THEORY") {
    inferenceParts.push("O estado UNSEEN indica ausência de evidências, não deficiência comprovada.");
  } else if (diagnosticPurpose) {
    inferenceParts.push("A amostra atual é insuficiente para uma estimativa estável; a ação tem finalidade diagnóstica.");
  } else if (scoreBreakdown.learningLeverageScore !== null) {
    inferenceParts.push("O score de alavancagem é uma heurística de ordenação baseada na faixa de desempenho, não uma estimativa de pontos por hora.");
  }

  let custoIgnorar: string;
  if (mappedReasonCode === "UNSEEN_THEORY") {
    custoIgnorar = `Adiar a construção da base conceitual de '${topicDisplay}' pode limitar o avanço posterior para questões e revisões.`;
  } else if (diagnosticPurpose) {
    custoIgnorar = `Sem ampliar a amostra de '${topicDisplay}', a incerteza sobre o desempenho permanecerá elevada.`;
  } else if (scoreBreakdown.camadaConstitucional === ConstitutionalTier.RISCO_ELIMINACAO) {
    custoIgnorar = `Adiar esta ação mantém o estado categórico de risco eliminatório identificado para ${disciplinaNome}.`;
  } else if (["SCHEDULED_REVIEW_DUE", "REVISION_EXPIRED", "HIGH_DECAY", "HISTORICAL_DROP", "RECENT_REGRESSION"].includes(mappedReasonCode)) {
    custoIgnorar = `Adiar a revisão mantém o indicador que originou a recomendação sem tratamento.`;
  } else {
    custoIgnorar = "O efeito de adiar esta ação não pode ser quantificado com segurança com os dados atuais.";
  }

  const confidenceMap = { HIGH: "ALTA", MEDIUM: "MEDIA", LOW: "BAIXA" } as const;
  const vetosConsiderados = constraintChecks.map(
    (check) => `${check.type}: ${check.result} — ${check.reason}`
  );

  const justificativaXAI: XAIJustification = {
    porQue,
    dadosUtilizados: fatos.join("; "),
    beneficioEsperado: buildBenefit(
      mappedReasonCode,
      diagnosticPurpose,
      hitRate,
      scoreBreakdown.camadaConstitucional
    ),
    custoIgnorar,
    camadaConstitucional: scoreBreakdown.camadaConstitucional,
    fatosUtilizados: fatos.join("; "),
    inferencias: inferenceParts.join(" "),
    dadosAusentes: [...new Set(missingData)],
    nivelConfianca: confidenceMap[scoreBreakdown.confidenceLevel],
    custoOportunidade: buildOpportunityCostText(opportunityCostResult),
    vetosConsiderados,
    diagnosticPurpose
  };

  return {
    prioridade,
    score: scoreBreakdown.finalScore,
    tempoEstimadoMinutos,
    estimatedDurationMinutes,
    disciplinaId,
    disciplinaNome,
    assuntoId,
    assuntoNome,
    subassuntoId,
    subassuntoNome,
    tipo,
    ganhoEsperado: null,
    riscoEvitado: null,
    hitRate,
    custoOportunidade:
      opportunityCostResult?.status === "CALCULATED"
        ? opportunityCostResult.value
        : null,
    justificativaXAI,
    camadaConstitucional: scoreBreakdown.camadaConstitucional,
    diagnosticPurpose,
    rankingContext,
    reasonCode: mappedReasonCode,
    opportunityCostResult,
    eliminationRiskResult,
    marginalReturnEstimate,
    decisionEvidence: {
      knowledgeState: scoreBreakdown.knowledgeState,
      sampleSize: questionsCount,
      confidenceScore: scoreBreakdown.confiancaEstatistica,
      confidenceLevel: scoreBreakdown.confidenceLevel,
      topicWeightSource: scoreBreakdown.topicWeightSource,
      historicalIncidenceSource: scoreBreakdown.historicalIncidenceSource,
      historicalIncidenceRate:
        scoreBreakdown.historicalIncidenceSource === "EMPIRICAL"
          ? scoreBreakdown.historicalIncidenceRate
          : null,
      disciplineZeroSafetyStatus: scoreBreakdown.disciplineZeroSafetyStatus,
      disciplineSampleSize: scoreBreakdown.disciplineSampleSize,
      disciplineCorrectAnswers: scoreBreakdown.disciplineCorrectAnswers,
      disciplineSafetyCoverageFront: disciplineSafetyCoverageFront === true
    }
  };
}
