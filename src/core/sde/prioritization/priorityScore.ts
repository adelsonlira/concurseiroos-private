/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  EditalConfig, 
  SDEDiagnosis, 
  KnowledgeGraph, 
  TimeHorizon, 
  KnowledgeState, 
  ConstitutionalTier,
  EvidenciasCandidato,
  KnowledgeAssessment,
  EvidenciaSubassunto,
  EliminationRiskPolicy,
  EliminationRiskLevel,
  OpportunityCostPolicy,
  LearningLeveragePolicy,
  OpportunityCostResult,
  MarginalReturnEstimate,
  EliminationRiskResult
} from "./types";
import { SDE_CONFIG } from "../config/sdeConfig";

export interface ScoreBreakdown {
  finalScore: number;
  pesoEdital: number;
  disciplineWeight?: number;
  topicWeight?: number;
  topicWeightSource?: "OFFICIAL" | "NEUTRAL_PRIOR";
  incidenciaHistorica: number;
  historicalIncidenceRate: number;
  historicalIncidenceSource?: "EMPIRICAL" | "UNAVAILABLE";
  deficienciaUsuario: number | null;
  riscoEsquecimento: number | null;
  retornoMarginal: number | null;
  learningLeverageScore: number | null;
  riscoEliminacao: number | null;
  dependenciasBonus: number;
  confiancaEstatistica: number;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  elimRiskLevel: EliminationRiskLevel;
  knowledgeState: KnowledgeState;
  camadaConstitucional: ConstitutionalTier;
  elimRiskResult?: EliminationRiskResult;
}

/**
 * Calculates days elapsed between last study and reference date purely.
 */
export function getDaysSinceLastStudy(
  lastStudyDateStr: string | undefined,
  referenceDate: Date
): number {
  if (!lastStudyDateStr) {
    return Infinity;
  }
  const lastStudyDate = new Date(lastStudyDateStr);
  const diffTime = referenceDate.getTime() - lastStudyDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.max(0, diffDays);
}

/**
 * Pure statistical confidence formula based on sample size (questions) and last study recency.
 */
export function calculateStatisticalConfidence(
  questionsCount: number,
  daysSinceLastStudy: number
): number {
  if (questionsCount <= 0) {
    return 0.0;
  }
  const sampleConfidence = questionsCount / (questionsCount + 10);
  
  let recencyFactor = 0.5;
  if (daysSinceLastStudy !== Infinity && daysSinceLastStudy >= 0) {
    recencyFactor = 1 / (1 + daysSinceLastStudy / 45);
  }
  
  const confidence = sampleConfidence * recencyFactor;
  return parseFloat(Math.min(1.0, Math.max(0.0, confidence)).toFixed(4));
}

export interface DisciplinaAssessment extends KnowledgeAssessment {
  treinoHitRate: number | null;
  treinoSampleSize: number;
  simuladoHitRate: number | null;
  simuladoSampleSize: number;
}

/**
 * Canonically assesses a subassunto.
 */
export function assessSubassunto(
  subId: string,
  history: EvidenciasCandidato,
  referenceDate: Date
): KnowledgeAssessment {
  const evidence = history.porSubassunto[subId];
  if (!evidence) {
    return {
      state: "UNSEEN",
      hitRate: null,
      sampleSize: 0,
      totalAcertos: 0,
      lastEvidenceAt: null,
      theoryCompleted: false,
      confidenceLevel: "LOW",
      confidenceScore: 0
    };
  }

  const theoryCompleted = evidence.teoriaConcluida === true;
  const sampleSize = evidence.tentativas ? evidence.tentativas.length : 0;
  
  let lastEvidenceAt: string | null = null;
  if (evidence.dataUltimoEstudo) {
    lastEvidenceAt = evidence.dataUltimoEstudo;
  } else {
    const dates: Date[] = [];
    if (evidence.tentativas) {
      for (const t of evidence.tentativas) {
        if (t.data) dates.push(new Date(t.data));
      }
    }
    if (evidence.historicoRevisoes) {
      for (const r of evidence.historicoRevisoes) {
        if (r.data) dates.push(new Date(r.data));
      }
    }
    if (dates.length > 0) {
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      lastEvidenceAt = maxDate.toISOString().split('T')[0];
    }
  }

  let totalAcertos = 0;
  if (evidence.tentativas) {
    for (const t of evidence.tentativas) {
      if (t.acertou) {
        totalAcertos++;
      }
    }
  }
  const hitRate = sampleSize > 0 ? totalAcertos / sampleSize : null;

  // Validate INVALID state
  let isInvalid = false;
  if (hitRate !== null && (hitRate < 0 || hitRate > 1 || isNaN(hitRate))) {
    isInvalid = true;
  }
  if (evidence.flashcardsPendentes < 0 || evidence.flashcardsDisponiveis < 0 || evidence.flashcardsPendentes > evidence.flashcardsDisponiveis) {
    isInvalid = true;
  }
  if (evidence.tentativas) {
    for (const t of evidence.tentativas) {
      if (t.tempoRespostaSegundos < 0 || !t.data || isNaN(t.tempoRespostaSegundos) || !isFinite(t.tempoRespostaSegundos)) {
        isInvalid = true;
      }
    }
  }

  if (isInvalid) {
    return {
      state: "INVALID",
      hitRate: null,
      sampleSize: sampleSize,
      totalAcertos: totalAcertos,
      lastEvidenceAt: lastEvidenceAt,
      theoryCompleted: theoryCompleted,
      confidenceLevel: "LOW",
      confidenceScore: 0
    };
  }

  let state: "UNSEEN" | "UNKNOWN" | "OBSERVED" = "UNSEEN";
  if (!theoryCompleted && sampleSize === 0 && !lastEvidenceAt) {
    state = "UNSEEN";
  } else if (sampleSize >= 5) {
    state = "OBSERVED";
  } else {
    state = "UNKNOWN";
  }

  let confidenceLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let daysSinceLast = Infinity;
  if (lastEvidenceAt) {
    daysSinceLast = getDaysSinceLastStudy(lastEvidenceAt, referenceDate);
  }

  if (sampleSize > 100 && daysSinceLast <= 15) {
    confidenceLevel = "HIGH";
  } else if ((sampleSize >= 20 && sampleSize <= 100) || (sampleSize > 100 && daysSinceLast > 15)) {
    confidenceLevel = "MEDIUM";
  } else {
    confidenceLevel = "LOW";
  }

  const sampleConfidence = sampleSize / (sampleSize + 10);
  const recencyFactor = daysSinceLast !== Infinity ? 1 / (1 + daysSinceLast / 45) : 0.5;
  const confidenceScore = parseFloat((sampleConfidence * recencyFactor).toFixed(4));

  return {
    state,
    hitRate,
    sampleSize,
    totalAcertos,
    lastEvidenceAt,
    theoryCompleted,
    confidenceLevel,
    confidenceScore
  };
}

/**
 * Canonically assesses an assunto.
 */
export function assessAssunto(
  assuntoId: string,
  subassuntoIds: string[],
  history: EvidenciasCandidato,
  referenceDate: Date
): KnowledgeAssessment {
  let totalTentativas = 0;
  let totalAcertos = 0;
  let hasUnseen = false;
  let hasUnknown = false;
  let hasObserved = false;
  let hasInvalid = false;
  let theoryCompleted = true;
  let latestDate: string | null = null;

  if (subassuntoIds.length === 0) {
    theoryCompleted = false;
  }

  for (const subId of subassuntoIds) {
    const assessment = assessSubassunto(subId, history, referenceDate);
    if (assessment.state === "INVALID") hasInvalid = true;
    else if (assessment.state === "OBSERVED") hasObserved = true;
    else if (assessment.state === "UNKNOWN") hasUnknown = true;
    else if (assessment.state === "UNSEEN") hasUnseen = true;

    if (!assessment.theoryCompleted) {
      theoryCompleted = false;
    }

    if (assessment.lastEvidenceAt) {
      if (!latestDate || assessment.lastEvidenceAt > latestDate) {
        latestDate = assessment.lastEvidenceAt;
      }
    }

    totalTentativas += assessment.sampleSize;
    totalAcertos += assessment.totalAcertos;
  }

  const hitRate = totalTentativas > 0 ? totalAcertos / totalTentativas : null;

  let state: "UNSEEN" | "UNKNOWN" | "OBSERVED" | "INVALID" = "UNSEEN";
  if (hasInvalid) state = "INVALID";
  else if (totalTentativas >= 5) state = "OBSERVED";
  else if (totalTentativas > 0 || hasUnknown || hasObserved || hasUnseen) {
    if (totalTentativas === 0 && !hasUnknown && !hasObserved) {
      state = "UNSEEN";
    } else {
      state = "UNKNOWN";
    }
  }

  let confidenceLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let daysSinceLast = Infinity;
  if (latestDate) {
    daysSinceLast = getDaysSinceLastStudy(latestDate, referenceDate);
  }

  if (totalTentativas > 100 && daysSinceLast <= 15) {
    confidenceLevel = "HIGH";
  } else if ((totalTentativas >= 20 && totalTentativas <= 100) || (totalTentativas > 100 && daysSinceLast > 15)) {
    confidenceLevel = "MEDIUM";
  } else {
    confidenceLevel = "LOW";
  }

  const sampleConfidence = totalTentativas / (totalTentativas + 10);
  const recencyFactor = daysSinceLast !== Infinity ? 1 / (1 + daysSinceLast / 45) : 0.5;
  const confidenceScore = parseFloat((sampleConfidence * recencyFactor).toFixed(4));

  return {
    state,
    hitRate,
    sampleSize: totalTentativas,
    totalAcertos,
    lastEvidenceAt: latestDate,
    theoryCompleted,
    confidenceLevel,
    confidenceScore
  };
}

/**
 * Canonically assesses a disciplina.
 */
export function assessDisciplina(
  disciplinaId: string,
  assuntoIds: string[],
  assuntoToSubassuntos: { [assuntoId: string]: string[] },
  edital: EditalConfig,
  history: EvidenciasCandidato,
  referenceDate: Date
): DisciplinaAssessment {
  let totalTentativas = 0;
  let totalAcertos = 0;
  let hasUnseen = false;
  let hasUnknown = false;
  let hasObserved = false;
  let hasInvalid = false;
  let theoryCompleted = true;
  let latestDate: string | null = null;

  let weightedHitRateSum = 0;
  let weightedHitRateDenom = 0;

  for (const assuntoId of assuntoIds) {
    const subs = assuntoToSubassuntos[assuntoId] || [];
    const assAssessment = assessAssunto(assuntoId, subs, history, referenceDate);
    if (assAssessment.state === "INVALID") hasInvalid = true;
    else if (assAssessment.state === "OBSERVED") hasObserved = true;
    else if (assAssessment.state === "UNKNOWN") hasUnknown = true;
    else if (assAssessment.state === "UNSEEN") hasUnseen = true;

    if (!assAssessment.theoryCompleted) {
      theoryCompleted = false;
    }

    if (assAssessment.lastEvidenceAt) {
      if (!latestDate || assAssessment.lastEvidenceAt > latestDate) {
        latestDate = assAssessment.lastEvidenceAt;
      }
    }

    totalTentativas += assAssessment.sampleSize;
    totalAcertos += assAssessment.totalAcertos;

    if (assAssessment.hitRate !== null) {
      const weight = edital.pesosAssuntos[assuntoId];
      if (weight === undefined) {
        throw new Error(`Erro estruturado: Peso do assunto '${assuntoId}' ausente.`);
      }
      weightedHitRateSum += assAssessment.hitRate * weight;
      weightedHitRateDenom += weight;
    }
  }

  const hitRate = weightedHitRateDenom > 0 ? weightedHitRateSum / weightedHitRateDenom : null;

  let state: "UNSEEN" | "UNKNOWN" | "OBSERVED" | "INVALID" = "UNSEEN";
  if (hasInvalid) state = "INVALID";
  else if (totalTentativas >= 5) state = "OBSERVED";
  else if (totalTentativas > 0 || hasUnknown || hasObserved) {
    state = "UNKNOWN";
  }

  let confidenceLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let daysSinceLast = Infinity;
  if (latestDate) {
    daysSinceLast = getDaysSinceLastStudy(latestDate, referenceDate);
  }

  if (totalTentativas > 100 && daysSinceLast <= 15) {
    confidenceLevel = "HIGH";
  } else if ((totalTentativas >= 20 && totalTentativas <= 100) || (totalTentativas > 100 && daysSinceLast > 15)) {
    confidenceLevel = "MEDIUM";
  } else {
    confidenceLevel = "LOW";
  }

  const sampleConfidence = totalTentativas / (totalTentativas + 10);
  const recencyFactor = daysSinceLast !== Infinity ? 1 / (1 + daysSinceLast / 45) : 0.5;
  const confidenceScore = parseFloat((sampleConfidence * recencyFactor).toFixed(4));

  // Differentiate Treino and Simulado
  let treinoAcertos = 0;
  let treinoTentativas = 0;
  let simuladoAcertos = 0;
  let simuladoTentativas = 0;

  for (const assuntoId of assuntoIds) {
    const subIds = assuntoToSubassuntos[assuntoId] || [];
    for (const subId of subIds) {
      const evidence = history.porSubassunto[subId];
      if (evidence && evidence.tentativas) {
        for (const t of evidence.tentativas) {
          if (t.origem === "TREINO_ISOLADO") {
            treinoTentativas++;
            if (t.acertou) treinoAcertos++;
          } else if (t.origem === "SIMULADO") {
            simuladoTentativas++;
            if (t.acertou) simuladoAcertos++;
          }
        }
      }
    }
  }

  const treinoHitRate = treinoTentativas > 0 ? treinoAcertos / treinoTentativas : null;
  const simuladoHitRate = simuladoTentativas > 0 ? simuladoAcertos / simuladoTentativas : null;

  return {
    state,
    hitRate,
    sampleSize: totalTentativas,
    totalAcertos,
    lastEvidenceAt: latestDate,
    theoryCompleted,
    confidenceLevel,
    confidenceScore,
    treinoHitRate,
    treinoSampleSize: treinoTentativas,
    simuladoHitRate,
    simuladoSampleSize: simuladoTentativas
  };
}

/**
 * Canonically calculates the discipline hit rate.
 */
export function calculateDisciplineHitRate(
  disciplinaId: string,
  edital: EditalConfig,
  history: EvidenciasCandidato,
  assuntoToDisciplina: { [assuntoId: string]: string },
  assuntoToSubassuntos: { [assuntoId: string]: string[] },
  referenceDate: Date
): { hitRate: number | null; state: KnowledgeState } {
  const discAssuntos = Object.keys(edital.pesosAssuntos).filter(
    aId => assuntoToDisciplina[aId] === disciplinaId
  );

  const discAssessment = assessDisciplina(
    disciplinaId,
    discAssuntos,
    assuntoToSubassuntos,
    edital,
    history,
    referenceDate
  );

  const state = discAssessment.state as unknown as KnowledgeState;
  const hr = discAssessment.hitRate;

  return { hitRate: hr, state };
}

/**
 * Canonically calculates the elimination risk.
 */
export function calculateEliminationRisk(
  disciplinaId: string,
  edital: EditalConfig,
  history: EvidenciasCandidato,
  assuntoToDisciplina: { [assuntoId: string]: string },
  assuntoToSubassuntos: { [assuntoId: string]: string[] },
  referenceDate: Date,
  policy: EliminationRiskPolicy,
  discAssessment?: DisciplinaAssessment
): EliminationRiskResult {
  const minRequired = edital.minimosDisciplinas[disciplinaId];
  if (minRequired === undefined) {
    return {
      level: EliminationRiskLevel.NOT_APPLICABLE,
      disciplineHitRate: null,
      minimumRequired: null,
      margin: null,
      weightedCoverage: 0,
      sampleSize: 0,
      treinoHitRate: null,
      simuladoHitRate: null
    };
  }

  const discAssuntos = Object.keys(edital.pesosAssuntos).filter(
    aId => assuntoToDisciplina[aId] === disciplinaId
  );

  const assessment = discAssessment || assessDisciplina(
    disciplinaId,
    discAssuntos,
    assuntoToSubassuntos,
    edital,
    history,
    referenceDate
  );

  // Check weighted coverage
  let totalWeight = 0;
  let coveredWeight = 0;

  for (const aId of discAssuntos) {
    const weight = edital.pesosAssuntos[aId];
    if (weight === undefined) {
      throw new Error(`Erro estruturado: Peso do assunto '${aId}' ausente.`);
    }
    totalWeight += weight;

    const subs = assuntoToSubassuntos[aId] || [];
    let topicSampleSize = 0;
    for (const subId of subs) {
      const subEv = history.porSubassunto[subId];
      if (subEv && subEv.tentativas) {
         topicSampleSize += subEv.tentativas.length;
      }
    }

    if (topicSampleSize >= policy.minTopicSampleSizeForCoverage) {
      coveredWeight += weight;
    }
  }

  const coberturaPonderada = totalWeight > 0 ? coveredWeight / totalWeight : 0;

  if (
    assessment.sampleSize < policy.minDisciplineSampleSize ||
    coberturaPonderada < policy.minWeightedCoverage
  ) {
    return {
      level: EliminationRiskLevel.INSUFFICIENT_DATA,
      disciplineHitRate: assessment.hitRate,
      minimumRequired: minRequired,
      margin: null,
      weightedCoverage: coberturaPonderada,
      sampleSize: assessment.sampleSize,
      treinoHitRate: assessment.treinoHitRate,
      simuladoHitRate: assessment.simuladoHitRate
    };
  }

  if (assessment.hitRate === null || isNaN(assessment.hitRate)) {
    return {
      level: EliminationRiskLevel.INSUFFICIENT_DATA,
      disciplineHitRate: null,
      minimumRequired: minRequired,
      margin: null,
      weightedCoverage: coberturaPonderada,
      sampleSize: assessment.sampleSize,
      treinoHitRate: assessment.treinoHitRate,
      simuladoHitRate: assessment.simuladoHitRate
    };
  }

  const margin = assessment.hitRate - minRequired;
  let level = EliminationRiskLevel.SAFE;
  if (assessment.hitRate < minRequired) {
    level = EliminationRiskLevel.CRITICAL;
  } else if (margin <= policy.warningMargin) {
    level = EliminationRiskLevel.WARNING;
  }

  return {
    level,
    disciplineHitRate: assessment.hitRate,
    minimumRequired: minRequired,
    margin,
    weightedCoverage: coberturaPonderada,
    sampleSize: assessment.sampleSize,
    treinoHitRate: assessment.treinoHitRate,
    simuladoHitRate: assessment.simuladoHitRate
  };
}

/**
 * Classifies an action into its strict Constitutional Tier.
 */
export function classifyConstitutionalTier(params: {
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string | undefined;
  tipo: string;
  hitRate: number | null;
  elimRiskLevel: EliminationRiskLevel;
  topicWeight: number;
  historicalIncidence: number;
  decayRate: number;
  knowledgeState: KnowledgeState;
  sampleSize: number;
  diagnosticPurpose?: boolean;
  scheduledReviewDue?: boolean;
}): ConstitutionalTier {
  const {
    hitRate,
    elimRiskLevel,
    topicWeight,
    historicalIncidence,
    decayRate,
    knowledgeState,
    sampleSize,
    diagnosticPurpose,
    scheduledReviewDue
  } = params;

  if (diagnosticPurpose) {
    return ConstitutionalTier.EXPANSAO_EDITAL;
  }

  if (elimRiskLevel === EliminationRiskLevel.CRITICAL || elimRiskLevel === EliminationRiskLevel.WARNING) {
    return ConstitutionalTier.RISCO_ELIMINACAO;
  }

  if (
    knowledgeState === KnowledgeState.OBSERVED &&
    hitRate !== null &&
    sampleSize >= 5 &&
    (topicWeight >= 4 || historicalIncidence >= 0.4) &&
    hitRate < 0.60
  ) {
    return ConstitutionalTier.LACUNAS_ALTO_PESO;
  }

  if (
    knowledgeState === KnowledgeState.OBSERVED &&
    hitRate !== null &&
    historicalIncidence >= 0.25 &&
    hitRate >= 0.50 &&
    hitRate < 0.75
  ) {
    return ConstitutionalTier.RETORNO_ESPERADO;
  }

  if (scheduledReviewDue === true && knowledgeState !== KnowledgeState.UNSEEN) {
    return ConstitutionalTier.PROTECAO_MEMORIA;
  }

  if (decayRate > 0.5 && knowledgeState !== KnowledgeState.UNSEEN) {
    return ConstitutionalTier.PROTECAO_MEMORIA;
  }

  if (knowledgeState === KnowledgeState.UNSEEN) {
    return ConstitutionalTier.EXPANSAO_EDITAL;
  }

  return ConstitutionalTier.MANUTENCAO_EXCELENCIA;
}

/**
 * Evaluates the actual reference date from TimeHorizon purely.
 */
export function getReferenceDate(timeHorizon: TimeHorizon): Date {
  return new Date(timeHorizon.referenceDate);
}

/**
 * Deterministically determines the current KnowledgeState of a topic.
 */
export function determineKnowledgeState(
  subId: string,
  history: EvidenciasCandidato,
  referenceDate: Date
): KnowledgeState {
  const assessment = assessSubassunto(subId, history, referenceDate);
  return assessment.state as unknown as KnowledgeState;
}

/**
 * Calculates the complete, deterministic Priority Score for a study action.
 */
export function calculatePriorityScore(
  disciplinaId: string,
  assuntoId: string,
  subassuntoId: string | undefined,
  tipo: "teoria" | "questoes" | "revisao" | "flashcards" | "simulado",
  edital: EditalConfig,
  diagnosis: SDEDiagnosis,
  history: EvidenciasCandidato,
  knowledgeGraph: KnowledgeGraph,
  timeHorizon: TimeHorizon,
  assuntoToDisciplina: { [id: string]: string },
  assuntoToSubassuntos: { [assuntoId: string]: string[] },
  policy: EliminationRiskPolicy,
  diagnosticPurpose: boolean,
  learningLeveragePolicy: LearningLeveragePolicy,
  subAssessment?: KnowledgeAssessment,
  assAssessment?: KnowledgeAssessment,
  discAssessment?: DisciplinaAssessment
): ScoreBreakdown {
  const refDate = getReferenceDate(timeHorizon);

  const disciplineWeight = edital.pesosDisciplinas[disciplinaId];
  if (disciplineWeight === undefined) {
    throw new Error(`Erro estruturado: Peso da disciplina '${disciplinaId}' ausente no edital.`);
  }
  const topicWeight = edital.pesosAssuntos[assuntoId];
  if (topicWeight === undefined) {
    throw new Error(`Erro estruturado: Peso do assunto '${assuntoId}' ausente no edital.`);
  }

  const topicMetadata = edital.assuntoModelMetadata?.[assuntoId];
  const topicWeightSource = topicMetadata?.topicWeightSource ?? "OFFICIAL";
  const historicalIncidenceSource = topicMetadata?.historicalIncidenceSource ?? "EMPIRICAL";

  const pesoEditalScore = (disciplineWeight * topicWeight) * SDE_CONFIG.PRIORITY_SCORE.PESO_EDITAL_MULT;

  const historicalIncidence = edital.incidenciaHistoricaAssuntos[assuntoId];
  if (historicalIncidence === undefined) {
    throw new Error(`Erro estruturado: Incidência histórica do assunto '${assuntoId}' ausente no edital.`);
  }
  const incidenciaHistoricaScore = historicalIncidenceSource === "EMPIRICAL"
    ? historicalIncidence * SDE_CONFIG.PRIORITY_SCORE.INCIDENCIA_MULT
    : 0;

  let hitRate: number | null = null;
  let sampleSize = 0;
  let knowledgeState = KnowledgeState.UNSEEN;
  let confidenceScore = 0;
  let confidenceLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let lastEvidenceAt: string | null = null;

  if (subassuntoId) {
    const assessment = subAssessment || assessSubassunto(subassuntoId, history, refDate);
    hitRate = assessment.hitRate;
    sampleSize = assessment.sampleSize;
    knowledgeState = assessment.state as unknown as KnowledgeState;
    confidenceScore = assessment.confidenceScore;
    confidenceLevel = assessment.confidenceLevel;
    lastEvidenceAt = assessment.lastEvidenceAt;
  } else {
    const subIds = assuntoToSubassuntos[assuntoId] || [];
    const assessment = assAssessment || assessAssunto(assuntoId, subIds, history, refDate);
    hitRate = assessment.hitRate;
    sampleSize = assessment.sampleSize;
    knowledgeState = assessment.state as unknown as KnowledgeState;
    confidenceScore = assessment.confidenceScore;
    confidenceLevel = assessment.confidenceLevel;
    lastEvidenceAt = assessment.lastEvidenceAt;
  }

  let deficienciaUsuarioScore: number | null = null;
  if (hitRate !== null && knowledgeState === KnowledgeState.OBSERVED) {
    deficienciaUsuarioScore = parseFloat(((1 - hitRate) * SDE_CONFIG.PRIORITY_SCORE.DEFICIENCIA_MULT).toFixed(2));
  }

  const decayRate = subassuntoId ? (diagnosis.decayRates[subassuntoId] ?? 0) : 0;
  let riscoEsquecimentoScore: number | null = null;
  if (knowledgeState !== KnowledgeState.UNSEEN) {
    const daysSinceLast = lastEvidenceAt ? getDaysSinceLastStudy(lastEvidenceAt, refDate) : 0;
    const recencyMultiplier = 1 + daysSinceLast * 0.05;
    riscoEsquecimentoScore = parseFloat((decayRate * SDE_CONFIG.PRIORITY_SCORE.RISCO_ESQUECIMENTO_MULT * recencyMultiplier).toFixed(2));
  }

  const llPolicy = learningLeveragePolicy;

  let learningLeverageScore: number | null = null;
  if (hitRate !== null) {
    if (hitRate >= llPolicy.leverageZoneLowerBound && hitRate <= llPolicy.leverageZoneUpperBound) {
      learningLeverageScore = SDE_CONFIG.PRIORITY_SCORE.LEARNING_LEVERAGE_GOLDEN_SCORE;
    } else if (hitRate >= llPolicy.lowPerformanceUpperBound && hitRate < llPolicy.leverageZoneLowerBound) {
      learningLeverageScore = SDE_CONFIG.PRIORITY_SCORE.LEARNING_LEVERAGE_SUB_GOLDEN_SCORE;
    } else if (hitRate < llPolicy.lowPerformanceUpperBound) {
      learningLeverageScore = SDE_CONFIG.PRIORITY_SCORE.LEARNING_LEVERAGE_HIGH_SCORE;
    } else {
      learningLeverageScore = SDE_CONFIG.PRIORITY_SCORE.LEARNING_LEVERAGE_MASTERED_SCORE;
    }
  }
  const retornoMarginalScore: number | null = null;

  const elimRisk = calculateEliminationRisk(disciplinaId, edital, history, assuntoToDisciplina, assuntoToSubassuntos, refDate, policy, discAssessment);
  let riscoEliminacaoScore: number | null = null;
  if (elimRisk.level === EliminationRiskLevel.CRITICAL) {
    riscoEliminacaoScore = SDE_CONFIG.PRIORITY_SCORE.RISCO_ELIMINACAO_CRITICAL_SCORE;
  } else if (elimRisk.level === EliminationRiskLevel.WARNING) {
    riscoEliminacaoScore = SDE_CONFIG.PRIORITY_SCORE.RISCO_ELIMINACAO_WARN_SCORE;
  } else if (elimRisk.level === EliminationRiskLevel.SAFE) {
    riscoEliminacaoScore = 0;
  }

  let dependenciasBonusScore = 0;
  if (subassuntoId) {
    let prerequisiteForCount = 0;
    for (const nodeId in knowledgeGraph.nodes) {
      const node = knowledgeGraph.nodes[nodeId];
      if (node.dependencias.includes(subassuntoId)) {
        prerequisiteForCount++;
      }
    }
    dependenciasBonusScore = Math.min(
      SDE_CONFIG.PRIORITY_SCORE.MAX_DEPENDENCIES_BONUS,
      prerequisiteForCount * SDE_CONFIG.PRIORITY_SCORE.DEPENDENCY_MULTIPLIER
    );
  }

  const confiancaEstatistica = confidenceScore;

  let finalScore = 
    pesoEditalScore + 
    incidenciaHistoricaScore + 
    (deficienciaUsuarioScore ?? 0) + 
    (riscoEsquecimentoScore ?? 0) + 
    (learningLeverageScore ?? 0) + 
    (riscoEliminacaoScore ?? 0) + 
    dependenciasBonusScore;

  if (confiancaEstatistica < SDE_CONFIG.PRIORITY_SCORE.CONFIDENCE_DIAGNOSTIC_THRESHOLD) {
    if (tipo === "questoes") {
      finalScore += SDE_CONFIG.PRIORITY_SCORE.CONFIDENCE_DIAGNOSTIC_BOOST;
    } else if (tipo === "teoria") {
      finalScore -= SDE_CONFIG.PRIORITY_SCORE.CONFIDENCE_DIAGNOSTIC_PENALTY;
    }
  }

  if (hitRate !== null) {
    if (tipo === "flashcards" && ((riscoEsquecimentoScore ?? 0) < SDE_CONFIG.PRIORITY_SCORE.FLASHCARD_RISK_THRESHOLD || hitRate < SDE_CONFIG.PRIORITY_SCORE.FLASHCARD_HIT_RATE_THRESHOLD)) {
      finalScore -= SDE_CONFIG.PRIORITY_SCORE.FLASHCARD_INAPPROPRIATE_PENALTY;
    }
    if (tipo === "teoria" && hitRate > SDE_CONFIG.PRIORITY_SCORE.THEORY_MASTERED_HIT_RATE_THRESHOLD) {
      finalScore -= SDE_CONFIG.PRIORITY_SCORE.THEORY_MASTERED_PENALTY;
    }
  }

  const scheduledReviewDue =
    tipo === "revisao" &&
    subassuntoId !== undefined &&
    history.porSubassunto[subassuntoId]?.revisaoProgramadaPendente === true;

  const camadaConstitucional = classifyConstitutionalTier({
    disciplinaId,
    assuntoId,
    subassuntoId,
    tipo,
    hitRate,
    elimRiskLevel: elimRisk.level,
    topicWeight,
    historicalIncidence,
    decayRate,
    knowledgeState,
    sampleSize,
    diagnosticPurpose,
    scheduledReviewDue
  });

  return {
    finalScore: Math.max(0, parseFloat(finalScore.toFixed(2))),
    pesoEdital: parseFloat(pesoEditalScore.toFixed(2)),
    disciplineWeight,
    topicWeight,
    topicWeightSource,
    incidenciaHistorica: parseFloat(incidenciaHistoricaScore.toFixed(2)),
    historicalIncidenceRate: historicalIncidence,
    historicalIncidenceSource,
    deficienciaUsuario: deficienciaUsuarioScore,
    riscoEsquecimento: riscoEsquecimentoScore,
    retornoMarginal: retornoMarginalScore,
    learningLeverageScore,
    riscoEliminacao: riscoEliminacaoScore,
    dependenciasBonus: parseFloat(dependenciasBonusScore.toFixed(2)),
    confiancaEstatistica,
    confidenceLevel,
    elimRiskLevel: elimRisk.level,
    knowledgeState,
    camadaConstitucional,
    elimRiskResult: elimRisk
  };
}
