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
  EvidenciasCandidato,
  KnowledgeAssessment,
  EvidenciaSubassunto,
  VetoResult,
  ConstraintCheck
} from "./types";
import { getDaysSinceLastStudy, getReferenceDate, assessSubassunto } from "./priorityScore";
import { SDE_CONFIG } from "../config/sdeConfig";

/**
 * Evaluates the cognitive eligibility of an activity type for a given knowledge level.
 * Requires mandatory referenceDate (no fallback to system clock).
 */
export function evaluateActivityEligibility(
  tipo: "teoria" | "questoes" | "revisao" | "flashcards" | "simulado",
  assessment: KnowledgeAssessment,
  evidence: EvidenciaSubassunto | undefined,
  decayRate: number,
  referenceDate: Date
): {
  eligible: boolean;
  reasonCode: "UNSEEN_THEORY" | "LOW_PERFORMANCE_THEORY" | "DIAGNOSTIC_QUESTIONS" | "OBSERVED_PRACTICE" | "SCHEDULED_REVIEW_DUE" | "REVISION_EXPIRED" | "HIGH_DECAY" | "HISTORICAL_DROP" | "RECENT_REGRESSION" | "FLASHCARDS_PENDING" | "SIMULADO_ELIGIBLE" | "NOT_ELIGIBLE";
  reason?: string;
  diagnosticPurpose?: boolean;
  evidence?: string[];
} {
  if (tipo === "teoria") {
    const placement = assessment.diagnosticPlacement;

    if (!assessment.theoryCompleted && placement?.status === "THEORY_REQUIRED") {
      return {
        eligible: true,
        reasonCode: "LOW_PERFORMANCE_THEORY",
        reason: "O diagnóstico inicial não sustentou dispensa de teoria. Estudo teórico direcionado recomendado."
      };
    }

    if (!assessment.theoryCompleted && placement?.status === "THEORY_BYPASS_ELIGIBLE") {
      return {
        eligible: false,
        reasonCode: "NOT_ELIGIBLE",
        reason: "Conhecimento prévio demonstrado provisoriamente. Teoria integral adiada; prossiga com prática e revisão."
      };
    }

    if (assessment.state === "UNSEEN" || placement?.status === "INSUFFICIENT_SAMPLE") {
      return {
        eligible: false,
        reasonCode: "NOT_ELIGIBLE",
        reason: "Antes da teoria, conclua o diagnóstico inicial curto para medir conhecimento prévio sem consulta."
      };
    }

    if (
      assessment.state === "OBSERVED" &&
      assessment.hitRate !== null &&
      assessment.hitRate < SDE_CONFIG.ELIGIBILITY.LOW_PERFORMANCE_HIT_RATE
    ) {
      const isInitialTheoryRecovery = !assessment.theoryCompleted;
      const hasStrongRemediationSample =
        assessment.sampleSize >= SDE_CONFIG.ELIGIBILITY.STRONG_THEORY_REMEDIATION_MIN_SAMPLE_SIZE;

      if (isInitialTheoryRecovery || hasStrongRemediationSample) {
        return {
          eligible: true,
          reasonCode: "LOW_PERFORMANCE_THEORY",
          reason: isInitialTheoryRecovery
            ? "Desempenho observado baixo sem conclusão teórica registrada. Reforço teórico liberado para evitar bloqueio cognitivo."
            : "Desempenho baixo persistente após teoria concluída e com amostra forte. Reforço teórico recomendado."
        };
      }

      return {
        eligible: false,
        reasonCode: "NOT_ELIGIBLE",
        reason: "A teoria já foi concluída e a amostra ainda não justifica reabrir teoria; prossiga com prática e correção para ampliar a evidência."
      };
    }
    return {
      eligible: false,
      reasonCode: "NOT_ELIGIBLE",
      reason: "Estudo de teoria não é elegível para o nível cognitivo atual."
    };
  }

  if (tipo === "questoes") {
    const placement = assessment.diagnosticPlacement;

    if (
      assessment.state === "UNSEEN" ||
      placement?.status === "NOT_STARTED" ||
      placement?.status === "INSUFFICIENT_SAMPLE"
    ) {
      return {
        eligible: true,
        reasonCode: "DIAGNOSTIC_QUESTIONS",
        reason: placement?.status === "INSUFFICIENT_SAMPLE"
          ? `Continue o diagnóstico inicial: faltam ${placement.missingQuestions} questão(ões) para uma decisão segura.`
          : "Primeiro contato: resolva uma bateria diagnóstica curta, sem consulta, antes de abrir teoria.",
        diagnosticPurpose: true
      };
    }

    if (!assessment.theoryCompleted && placement?.status === "THEORY_REQUIRED") {
      return {
        eligible: false,
        reasonCode: "NOT_ELIGIBLE",
        reason: "O diagnóstico indicou necessidade de teoria antes de uma nova bateria de consolidação."
      };
    }

    if (placement?.status === "THEORY_BYPASS_ELIGIBLE") {
      return {
        eligible: true,
        reasonCode: "OBSERVED_PRACTICE",
        reason: "Conhecimento prévio demonstrado provisoriamente. Prática e revisão substituem a teoria integral por enquanto."
      };
    }

    if (assessment.state === "UNKNOWN") {
      return {
        eligible: true,
        reasonCode: "DIAGNOSTIC_QUESTIONS",
        reason: "Diagnóstico necessário. Resolução de questões recomendada.",
        diagnosticPurpose: true
      };
    }
    if (
      assessment.state === "OBSERVED" &&
      (assessment.theoryCompleted ||
        (assessment.hitRate !== null && assessment.hitRate >= SDE_CONFIG.ELIGIBILITY.PRACTICE_MIN_HIT_RATE))
    ) {
      return {
        eligible: true,
        reasonCode: "OBSERVED_PRACTICE",
        reason: "Prática recomendada para consolidação do assunto com base observada ou teoria registrada."
      };
    }
    return {
      eligible: false,
      reasonCode: "NOT_ELIGIBLE",
      reason: "Resolução de questões não recomendada no momento."
    };
  }

  if (tipo === "revisao") {
    if (evidence?.revisaoProgramadaPendente === true) {
      const hasPriorStudyEvidence =
        assessment.theoryCompleted ||
        assessment.sampleSize > 0 ||
        assessment.lastEvidenceAt !== null;
      if (hasPriorStudyEvidence) {
        return {
          eligible: true,
          reasonCode: "SCHEDULED_REVIEW_DUE",
          reason: `Revisão programada vencida em ${evidence.proximaRevisaoProgramada ?? "data não informada"}.`,
          evidence: [
            `scheduledDate=${evidence.proximaRevisaoProgramada ?? "UNKNOWN"}`,
            `trigger=${evidence.revisaoProgramadaGatilho ?? "UNSPECIFIED"}`
          ]
        };
      }
    }

    if (assessment.state === "UNSEEN" || assessment.state === "UNKNOWN") {
      return {
        eligible: false,
        reasonCode: "NOT_ELIGIBLE",
        reason: "Não é possível realizar revisão de tópico não estudado."
      };
    }

    if (assessment.state === "OBSERVED") {
      if (decayRate > SDE_CONFIG.ELIGIBILITY.HIGH_DECAY_THRESHOLD) {
        return {
          eligible: true,
          reasonCode: "HIGH_DECAY",
          reason: "Alto índice de esquecimento detectado. Revisão necessária."
        };
      }

      // Check for performance drop or revision countdown
      if (evidence && evidence.tentativas && evidence.tentativas.length >= SDE_CONFIG.ELIGIBILITY.PERFORMANCE_DROP_MIN_ATTEMPTS) {
        const sorted = [...evidence.tentativas].sort(
          (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
        );
        const splitIndex = Math.floor(sorted.length / 2);
        const earlier = sorted.slice(0, splitIndex);
        const recent = sorted.slice(splitIndex);

        const recentHits = recent.filter(t => t.acertou).length;
        const recentHitRate = recentHits / recent.length;

        const earlierHits = earlier.filter(t => t.acertou).length;
        const earlierHitRate = earlierHits / earlier.length;
        
        if (earlier.length > 0 && recentHitRate < earlierHitRate - SDE_CONFIG.ELIGIBILITY.PERFORMANCE_DROP_THRESHOLD) {
          return {
            eligible: true,
            reasonCode: "HISTORICAL_DROP",
            reason: "Queda de rendimento detectada nas tentativas mais recentes."
          };
        }
      }

      if (assessment.lastEvidenceAt) {
        const daysSinceLast = getDaysSinceLastStudy(assessment.lastEvidenceAt, referenceDate);
        if (daysSinceLast > SDE_CONFIG.ELIGIBILITY.REVISION_EXPIRED_DAYS) {
          return {
            eligible: true,
            reasonCode: "REVISION_EXPIRED",
            reason: `Último estudo há ${daysSinceLast.toFixed(0)} dias. Revisão expirada.`
          };
        }
      }
    }
    return {
      eligible: false,
      reasonCode: "NOT_ELIGIBLE",
      reason: "Sem gatilhos de revisão ativos para este tópico."
    };
  }

  if (tipo === "flashcards") {
    if (evidence && evidence.flashcardsPendentes > 0) {
      return {
        eligible: true,
        reasonCode: "FLASHCARDS_PENDING",
        reason: `Existem ${evidence.flashcardsPendentes} flashcards pendentes de revisão.`
      };
    }
    return {
      eligible: false,
      reasonCode: "NOT_ELIGIBLE",
      reason: "Sem flashcards pendentes no momento."
    };
  }

  if (tipo === "simulado") {
    return {
      eligible: false,
      reasonCode: "NOT_ELIGIBLE",
      reason: "Elegibilidade de simulado depende da política global de cobertura e planejamento."
    };
  }

  return {
    eligible: false,
    reasonCode: "NOT_ELIGIBLE",
    reason: "Tipo de atividade desconhecido ou não configurado."
  };
}

/**
 * Validates veto constraints according to the SDE rules.
 */
export function evaluateConstraints(params: {
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string | undefined;
  tipo: "teoria" | "questoes" | "revisao" | "flashcards" | "simulado";
  edital: EditalConfig;
  diagnosis: SDEDiagnosis;
  knowledgeGraph: KnowledgeGraph;
  timeHorizon: TimeHorizon;
  knowledgeState: KnowledgeState;
  flashcardsCount: number;
  hitRate: number | null;
  assuntoToDisciplina: { [id: string]: string };
  subassuntoToAssunto: { [id: string]: string };
  history: EvidenciasCandidato;
  subAssessment?: KnowledgeAssessment;
  assAssessment?: KnowledgeAssessment;
}): VetoResult {
  const {
    disciplinaId,
    assuntoId,
    subassuntoId,
    tipo,
    edital,
    diagnosis,
    knowledgeGraph,
    timeHorizon,
    knowledgeState,
    flashcardsCount,
    hitRate,
    assuntoToDisciplina,
    subassuntoToAssunto,
    history,
    subAssessment,
    assAssessment
  } = params;

  const checksPerformed: ConstraintCheck[] = [];

  const refDate = getReferenceDate(timeHorizon);

  // --- 1. VETO DE INUTILIDADE DA BANCA ---
  const disciplineWeight = edital.pesosDisciplinas[disciplinaId];
  if (disciplineWeight === undefined) {
    throw new Error(`Erro estruturado: Peso da disciplina '${disciplinaId}' ausente no edital.`);
  }
  const topicWeight = edital.pesosAssuntos[assuntoId];
  if (topicWeight === undefined) {
    throw new Error(`Erro estruturado: Peso do assunto '${assuntoId}' ausente no edital.`);
  }
  const historicalIncidence = edital.incidenciaHistoricaAssuntos[assuntoId];
  if (historicalIncidence === undefined) {
    throw new Error(`Erro estruturado: Incidência histórica do assunto '${assuntoId}' ausente no edital.`);
  }

  const topicMetadata = edital.assuntoModelMetadata[assuntoId];
  if (!topicMetadata) {
    throw new Error(`Erro estruturado: Metadados de proveniência do assunto '${assuntoId}' ausentes no edital.`);
  }
  const historicalIncidenceSource = topicMetadata.historicalIncidenceSource;
  const hasOfficialZeroWeight = disciplineWeight === 0 || topicWeight === 0;
  const hasValidatedZeroIncidence = historicalIncidenceSource === "EMPIRICAL" && historicalIncidence === 0;

  if (hasOfficialZeroWeight || hasValidatedZeroIncidence) {
    const vetoReason = hasOfficialZeroWeight
      ? "Este tópico possui peso oficial zero na configuração do edital."
      : `A matriz empírica validada registra incidência histórica nula para este tópico na banca ${edital.banca}.`;
    checksPerformed.push({
      type: "VETO_INUTILIDADE_BANCA",
      result: "VETOED",
      reasonCode: "VETO_INUTILIDADE_BANCA",
      reason: vetoReason
    });
    return {
      isVetoed: true,
      vetoType: "INUTILIDADE_BANCA",
      reasonCode: "VETO_INUTILIDADE_BANCA",
      reason: `${vetoReason} Estudar isso violaria o Art. 3º.`,
      checksPerformed
    };
  }

  checksPerformed.push({
    type: "VETO_INUTILIDADE_BANCA",
    result: historicalIncidenceSource === "EMPIRICAL" ? "PASSED" : "NOT_APPLICABLE",
    reasonCode: "NENHUM_VETO",
    reason: historicalIncidenceSource === "EMPIRICAL"
      ? "Tópico possui peso oficial positivo e incidência histórica empírica validada não nula."
      : "Tópico possui peso oficial positivo. A incidência histórica empírica ainda não está validada e não foi usada para vetar a atividade."
  });

  // --- 2. VETO DE DESPERDÍCIO ENERGÉTICO (Custo de Oportunidade Crítico & Overstudy) ---
  const theoryEvidenceAssessment = subassuntoId
    ? (subAssessment ?? assessSubassunto(subassuntoId, history, refDate))
    : assAssessment;
  const theoryAvoidanceSupported =
    theoryEvidenceAssessment?.theoryCompleted === true ||
    theoryEvidenceAssessment?.diagnosticPlacement?.status === "THEORY_BYPASS_ELIGIBLE";

  if (
    tipo === "teoria" &&
    theoryAvoidanceSupported &&
    hitRate !== null &&
    hitRate >= SDE_CONFIG.ELIGIBILITY.THEORY_OVERSTUDY_HIT_RATE
  ) {
    const vetoReason = "Desempenho elevado foi demonstrado com evidência suficiente. Reabrir teoria integral seria um desperdício energético.";
    checksPerformed.push({
      type: "VETO_DESPERDICIO_ENERGETICO",
      result: "VETOED",
      reasonCode: "VETO_DESPERDICIO_ENERGETICO",
      reason: vetoReason
    });
    return {
      isVetoed: true,
      vetoType: "DESPERDICIO_ENERGETICO",
      reasonCode: "VETO_DESPERDICIO_ENERGETICO",
      reason: "Proficiência elevada demonstrada. Teoria vetada para evitar desperdício de energia cognitiva.",
      checksPerformed
    };
  }

  checksPerformed.push({
    type: "CUSTO_OPORTUNIDADE_OPERACIONAL",
    result: "NOT_APPLICABLE",
    reasonCode: "DADOS_INSUFICIENTES",
    reason: "O custo de oportunidade comparativo é avaliado somente após a geração das ações elegíveis e requer duração estimada real."
  });

  // --- 3. VETO DE INVERSÃO DE PRÉ-REQUISITO (Rule 9) ---
  let preReqVetoed = false;
  let preReqReason = "";
  let preReqVetoType: "VETO_PRE_REQUISITO_DIAGNOSTICO" | "VETO_PRE_REQUISITO_PERFORMANCE" | undefined = undefined;
  let isDiagnostic = false;

  if (subassuntoId && (tipo === "questoes" || tipo === "revisao" || tipo === "flashcards" || tipo === "teoria")) {
    const node = knowledgeGraph.nodes[subassuntoId];
    if (node && node.dependencias && node.dependencias.length > 0) {
      for (const reqId of node.dependencias) {
        const reqNode = knowledgeGraph.nodes[reqId];
        if (!reqNode) {
          throw new Error(`Erro estruturado: Pré-requisito inexistente '${reqId}'.`);
        }

        const reqAssessment = assessSubassunto(reqId, history, refDate);

        if (reqAssessment.state === "INVALID") {
          throw new Error(`Erro estruturado: Pré-requisito '${reqId}' possui estado INVALID.`);
        }

        if (reqAssessment.hitRate !== null && reqAssessment.hitRate < SDE_CONFIG.CONSTRAINTS.PREREQUISITE_MIN_HIT_RATE) {
          preReqVetoed = true;
          preReqReason = `Veto de pré-requisito: Desempenho no pré-requisito '${reqId}' (${(reqAssessment.hitRate * 100).toFixed(0)}%) está abaixo do mínimo exigido de 50%.`;
          preReqVetoType = "VETO_PRE_REQUISITO_PERFORMANCE";
          break;
        }

        if (reqAssessment.state === "UNSEEN" || reqAssessment.state === "UNKNOWN") {
          preReqVetoed = true;
          preReqReason = `Necessidade diagnóstica: O pré-requisito '${reqId}' é ${reqAssessment.state} e necessita de diagnóstico antes de prosseguir com '${node.nome}'.`;
          preReqVetoType = "VETO_PRE_REQUISITO_DIAGNOSTICO";
          isDiagnostic = true;
          break;
        }
      }

      if (preReqVetoed) {
        checksPerformed.push({
          type: "VETO_INVERSION_PRE_REQUISITO",
          result: "VETOED",
          reasonCode: preReqVetoType || "VETO_INVERSION_PRE_REQUISITO",
          reason: preReqReason
        });
        return {
          isVetoed: true,
          vetoType: "INVERSION_PRE_REQUISITO",
          reasonCode: preReqVetoType || "VETO_INVERSION_PRE_REQUISITO",
          diagnosticPurpose: isDiagnostic,
          reason: preReqReason,
          checksPerformed
        };
      } else {
        checksPerformed.push({
          type: "VETO_INVERSION_PRE_REQUISITO",
          result: "PASSED",
          reasonCode: "NENHUM_VETO",
          reason: "Todos os pré-requisitos conceituais foram devidamente consolidados."
        });
      }
    } else {
      checksPerformed.push({
        type: "VETO_INVERSION_PRE_REQUISITO",
        result: "NOT_APPLICABLE",
        reasonCode: "NENHUM_VETO",
        reason: "Tópico não possui dependências cadastradas no Knowledge Graph."
      });
    }
  } else {
    checksPerformed.push({
      type: "VETO_INVERSION_PRE_REQUISITO",
      result: "NOT_APPLICABLE",
      reasonCode: "NENHUM_VETO",
      reason: "A atividade proposta não exige verificação de pré-requisito."
    });
  }

  // --- 4. INCOMPATIBILIDADE CONCEITUAL / ELEGIBILIDADE (Rule 8) ---
  if (knowledgeState === KnowledgeState.INVALID) {
    throw new Error("Erro estruturado: Estado de conhecimento inválido (INVALID).");
  }

  let assessment: KnowledgeAssessment;
  if (subassuntoId) {
    assessment = subAssessment || assessSubassunto(subassuntoId, history, refDate);
  } else {
    assessment = assAssessment || {
      state: knowledgeState as "UNSEEN" | "UNKNOWN" | "OBSERVED" | "INVALID",
      hitRate: hitRate !== null && !isNaN(hitRate) ? hitRate : null,
      sampleSize: 0,
      totalAcertos: 0,
      lastEvidenceAt: null,
      theoryCompleted: false,
      confidenceLevel: "LOW",
      confidenceScore: 0
    };
  }

  if (assessment.state === "INVALID") {
    throw new Error("Erro estruturado: Estado de conhecimento inválido (INVALID).");
  }

  const evidence = subassuntoId ? history.porSubassunto[subassuntoId] : undefined;
  const decayRate = subassuntoId ? (diagnosis.decayRates[subassuntoId] ?? 0) : 0;

  const eligibility = evaluateActivityEligibility(tipo, assessment, evidence, decayRate, refDate);
  if (!eligibility.eligible) {
    checksPerformed.push({
      type: "ELEGIBILIDADE_CONCEITUAL",
      result: "VETOED",
      reasonCode: eligibility.reasonCode,
      reason: eligibility.reason || "Atividade não atende aos critérios de elegibilidade para o estado cognitivo atual."
    });
    return {
      isVetoed: true,
      vetoType: "INCOMPATIBILIDADE_CONCEITUAL",
      reason: eligibility.reason || "Atividade não elegível para este patamar de conhecimento.",
      diagnosticPurpose: eligibility.diagnosticPurpose,
      reasonCode: eligibility.reasonCode,
      evidence: eligibility.evidence,
      checksPerformed
    };
  } else {
    checksPerformed.push({
      type: "ELEGIBILIDADE_CONCEITUAL",
      result: "PASSED",
      reasonCode: eligibility.reasonCode,
      reason: `Elegível sob o critério de ${eligibility.reasonCode}.`
    });
    return {
      isVetoed: false,
      vetoType: null,
      reasonCode: eligibility.reasonCode,
      reason: null,
      diagnosticPurpose: eligibility.diagnosticPurpose,
      evidence: eligibility.evidence,
      checksPerformed
    };
  }
}
