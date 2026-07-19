import { buildDailyStudyPrescription } from "../../../core/prescription/prescriptionEngine";
import { buildDynamicPrivateMaterialCatalog, mergePrivateMaterialCatalogs } from "../../../core/materials/dynamicLibraryCatalog";
import { createStudyPlan } from "../../../core/sde/planner/studyPlanner";
import { buildActionId } from "../../../core/sde/prioritization/priorityEngine";
import {
  ConstitutionalTier,
  EliminationRiskLevel,
  KnowledgeState,
  type StrategicAction,
} from "../../../core/sde/prioritization/types";
import { normalizeUnifiedEvidence } from "../../../core/sde-v2/evidenceAdapter";
import { runSdeV2Decision } from "../../../core/sde-v2/decisionEngine";
import type { DecisionRecord, SdeV2CandidateDecision } from "../../../core/sde-v2/types";
import { getCompetitionRuntimeDefinition } from "../../../config/concursos/registry";
import type { CompetitionDecisionSnapshot } from "../competitionDecisionAdapter";
import type { SDEApplicationResult } from "../types";
import { buildSdeV1V2Comparison } from "./calibrationLedger";


function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildFallbackDecisionRecord(params: {
  referenceDate: string;
  v1Result: SDEApplicationResult;
  reason: string;
  v2Output: ReturnType<typeof runSdeV2Decision>;
}): DecisionRecord | null {
  const action = params.v1Result.actions[0];
  if (!action || !params.v1Result.availability) return null;
  const stable = `${params.referenceDate}:${action.subassuntoId ?? action.assuntoId}:${action.tipo}:${params.reason}:fallback`;
  return {
    decisionId: `decision-v2-fallback-${params.referenceDate}-${hashText(stable)}`,
    sdeVersion: "2.0",
    createdAt: `${params.referenceDate}T12:00:00.000Z`,
    referenceDate: params.referenceDate,
    selectedAction: `fallback-v1:${action.tipo}:${action.subassuntoId ?? action.assuntoId}`,
    selectedNodeId: action.subassuntoId ?? action.assuntoId,
    selectedMethod: `fallback_v1_${action.tipo}`,
    availableMinutes: params.v1Result.availability.remainingMinutes,
    hardRules: [],
    scoreComponents: [],
    evidenceIds: params.v2Output.normalizedEvidence.filter((item) => item.decisionEligible).map((item) => item.evidenceId),
    prerequisiteState: { requiredBlocked: false, blockingNodeIds: [], recommendedNodeIds: [], transferValue: 0, rationale: [] },
    historicalIncidenceShadow: undefined,
    alternativesConsidered: params.v1Result.actions.slice(0, 10).map((item) => ({
      nodeId: item.subassuntoId ?? item.assuntoId,
      score: item.score,
      method: `fallback_v1_${item.tipo}` as never,
    })),
    fallbackUsed: true,
    fallbackReason: params.reason,
  };
}

function historicalSignalsFromCatalog(catalog: CompetitionDecisionSnapshot["isolatedEvidence"] extends infer _T ? NonNullable<CompetitionDecisionSnapshot["isolatedEvidence"]>["fgvTrainingCatalog"] : never) {
  const grouped = new Map<string, { observed: number; direct: number; partial: number }>();
  for (const question of catalog.questions) {
    const current = grouped.get(question.primaryItem.id) ?? { observed: 0, direct: 0, partial: 0 };
    current.observed += 1;
    if (question.adherence === "DIRECT") current.direct += 1;
    else current.partial += 1;
    grouped.set(question.primaryItem.id, current);
  }
  return [...grouped.entries()].map(([nodeId, counts]) => ({
    nodeId,
    observedCount: counts.observed,
    deduplicatedCount: counts.observed,
    directCount: counts.direct,
    partialCount: counts.partial,
    recencyAdjustedValue: 0,
    roleProximityValue: 1,
    classificationConfidence: counts.observed > 0 ? (counts.direct + counts.partial * 0.5) / counts.observed : 0,
  }));
}

const QUESTION_PRESCRIPTION_POLICY = {
  minimumObservedSamples: 3,
  mediumConfidenceSamples: 5,
  highConfidenceSamples: 20,
  stretchQuestions: 1,
  diagnosticMinimumQuestions: 10,
} as const;

function mapKnowledgeState(candidate: SdeV2CandidateDecision): KnowledgeState {
  if (candidate.knowledgeState.state === "INVALID") return KnowledgeState.INVALID;
  if (candidate.knowledgeState.state === "UNSEEN") return KnowledgeState.UNSEEN;
  return KnowledgeState.OBSERVED;
}

function activityFor(candidate: SdeV2CandidateDecision): StrategicAction["tipo"] {
  switch (candidate.method.method) {
    case "short_diagnostic":
    case "fgv_question_batch":
    case "timed_question_batch":
      return "questoes";
    case "active_review":
    case "structured_error_recovery":
    case "spaced_maintenance":
      return "revisao";
    case "theory_notebooklm":
    case "concept_recovery":
    case "prerequisite_recovery":
      return "teoria";
  }
}

function reasonCodeFor(candidate: SdeV2CandidateDecision): StrategicAction["reasonCode"] {
  switch (candidate.method.method) {
    case "short_diagnostic": return "DIAGNOSTIC_QUESTIONS";
    case "theory_notebooklm": return candidate.knowledgeState.state === "UNSEEN" ? "UNSEEN_THEORY" : "LOW_PERFORMANCE_THEORY";
    case "concept_recovery": return "LOW_PERFORMANCE_THEORY";
    case "fgv_question_batch": return "OBSERVED_PRACTICE";
    case "active_review": return candidate.knowledgeState.reviewPending ? "SCHEDULED_REVIEW_DUE" : "HIGH_DECAY";
    case "timed_question_batch": return "OBSERVED_PRACTICE";
    case "structured_error_recovery": return "RECENT_REGRESSION";
    case "spaced_maintenance": return "REVISION_EXPIRED";
    case "prerequisite_recovery": return "LOW_PERFORMANCE_THEORY";
  }
}

function constitutionalTierFor(candidate: SdeV2CandidateDecision): ConstitutionalTier {
  if (candidate.hardRules.some((rule) => rule.condition === "ELIMINATION_OR_ZERO_RISK" && rule.result === "FAVORED")) {
    return ConstitutionalTier.RISCO_ELIMINACAO;
  }
  if (candidate.knowledgeState.reviewPending || candidate.knowledgeState.state === "DECAYING") {
    return ConstitutionalTier.PROTECAO_MEMORIA;
  }
  if (candidate.knowledgeState.state === "UNSEEN") return ConstitutionalTier.EXPANSAO_EDITAL;
  if (candidate.knowledgeState.state === "STABLE") return ConstitutionalTier.MANUTENCAO_EXCELENCIA;
  return ConstitutionalTier.LACUNAS_ALTO_PESO;
}

function toStrategicAction(candidate: SdeV2CandidateDecision, priority: number): StrategicAction {
  const tipo = activityFor(candidate);
  const confidence = candidate.knowledgeState.confidence === "HIGH"
    ? "ALTA"
    : candidate.knowledgeState.confidence === "MEDIUM"
      ? "MEDIA"
      : "BAIXA";
  const topFactors = candidate.scoreComponents
    .slice()
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 5)
    .map((item) => `${item.label}: ${item.explanation}`);
  const blockedRules = candidate.hardRules.filter((rule) => rule.result === "BLOCKED");
  const missingData = candidate.scoreComponents
    .filter((item) => item.fallbackUsed)
    .map((item) => item.label);
  const diagnosticPurpose = candidate.method.method === "short_diagnostic";
  return {
    prioridade: priority,
    score: candidate.score,
    tempoEstimadoMinutos: candidate.estimatedMinutes,
    estimatedDurationMinutes: candidate.estimatedMinutes,
    disciplinaId: candidate.disciplineId,
    disciplinaNome: candidate.disciplineName,
    assuntoId: candidate.topicId,
    assuntoNome: candidate.topicName,
    subassuntoId: candidate.subtopicId,
    subassuntoNome: candidate.subtopicName,
    tipo,
    ganhoEsperado: null,
    riscoEvitado: null,
    hitRate: candidate.knowledgeState.weightedAccuracy,
    custoOportunidade: null,
    justificativaXAI: {
      porQue: `${candidate.method.objective} ${topFactors.slice(0, 3).join(" ")}`,
      dadosUtilizados: `${candidate.evidenceIds.length} evidência(s); amostra efetiva ${candidate.knowledgeState.effectiveSampleSize.toFixed(2)}; estado ${candidate.knowledgeState.state}.`,
      beneficioEsperado: candidate.method.advanceCriterion,
      custoIgnorar: candidate.knowledgeState.state === "CRITICAL" || candidate.knowledgeState.reviewPending
        ? "Manter a lacuna ou a revisão vencida aumenta o risco de repetição de erros e esquecimento."
        : "Adiar reduz cobertura ou retarda a medição necessária para avançar com segurança.",
      camadaConstitucional: constitutionalTierFor(candidate),
      fatosUtilizados: topFactors.join(" "),
      inferencias: `Método escolhido pela regra determinística ${candidate.method.rule}. Incidência histórica calculada apenas em shadow mode com peso zero.`,
      dadosAusentes: missingData,
      nivelConfianca: confidence,
      custoOportunidade: "As alternativas foram comparadas pelo score normalizado, regras duras, tempo disponível e diversidade recente.",
      vetosConsiderados: blockedRules.map((rule) => `${rule.condition}: ${rule.justification}`),
      diagnosticPurpose,
    },
    camadaConstitucional: constitutionalTierFor(candidate),
    diagnosticPurpose,
    reasonCode: reasonCodeFor(candidate),
    rankingContext: {
      tiedActionCount: 1,
      isTied: false,
      tieBreakRule: null,
      note: null,
    },
    opportunityCostResult: {
      status: "INSUFFICIENT_DATA",
      value: null,
      unit: null,
      consideredFactors: ["score normalizado SDE v2", "tempo", "pré-requisitos", "diversidade"],
      missingData: ["série causal prospectiva por ação"],
      bestAlternativeActionId: null,
      bestAlternativeValue: null,
    },
    marginalReturnEstimate: {
      status: "INSUFFICIENT_DATA",
      expectedNetPointsPerHour: null,
      confidence: null,
      evidence: [],
      missingData: ["episódios prospectivos antes/depois"],
    },
    eliminationRiskResult: {
      level: candidate.hardRules.some((rule) => rule.condition === "ELIMINATION_OR_ZERO_RISK" && rule.result === "FAVORED")
        ? EliminationRiskLevel.CRITICAL
        : EliminationRiskLevel.INSUFFICIENT_DATA,
      disciplineHitRate: null,
      minimumRequired: null,
      margin: null,
      weightedCoverage: 0,
      sampleSize: 0,
      treinoHitRate: null,
      simuladoHitRate: null,
    },
    decisionEvidence: {
      knowledgeState: mapKnowledgeState(candidate),
      sampleSize: Math.round(candidate.knowledgeState.effectiveSampleSize),
      confidenceScore: candidate.knowledgeState.confidence === "HIGH" ? 1 : candidate.knowledgeState.confidence === "MEDIUM" ? 0.65 : 0.35,
      confidenceLevel: candidate.knowledgeState.confidence,
      topicWeightSource: "NEUTRAL_PRIOR",
      historicalIncidenceSource: "UNAVAILABLE",
      historicalIncidenceRate: null,
      disciplineZeroSafetyStatus: candidate.hardRules.some((rule) => rule.condition === "ELIMINATION_OR_ZERO_RISK" && rule.result === "FAVORED")
        ? "UNASSESSED"
        : "PROTECTED",
      disciplineSampleSize: 0,
      disciplineCorrectAnswers: 0,
    },
  };
}

function applyDeterministicTieTransparency(actions: StrategicAction[]): StrategicAction[] {
  const epsilon = 1e-9;
  return actions.map((action) => {
    const tiedActionCount = actions.filter((candidate) => Math.abs(candidate.score - action.score) <= epsilon).length;
    if (tiedActionCount <= 1) return action;
    return {
      ...action,
      rankingContext: {
        isTied: true,
        tiedActionCount,
        tieBreakRule: "DETERMINISTIC_ACTION_ID",
        note: "Empate estratégico preservado; a ordem usa desempate operacional determinístico pelo identificador da ação.",
      },
    };
  });
}

function buildDurationMap(snapshot: CompetitionDecisionSnapshot, actions: readonly StrategicAction[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const action of actions) {
    map[buildActionId({
      disciplinaId: action.disciplinaId,
      assuntoId: action.assuntoId,
      subassuntoId: action.subassuntoId,
      tipo: action.tipo,
    })] = Math.max(10, Math.min(action.estimatedDurationMinutes ?? snapshot.configuracao.duracaoSessaoPreferidaMinutos[action.tipo], snapshot.configuracao.metaHorariaDiariaMinutos));
  }
  return map;
}

export function buildSdeV2ApplicationResult(params: {
  snapshot: CompetitionDecisionSnapshot;
  referenceDate: string;
  v1Result: SDEApplicationResult;
}): SDEApplicationResult {
  const { snapshot, referenceDate, v1Result } = params;
  if (v1Result.status !== "SUCCESS" || !v1Result.availability) {
    return {
      ...v1Result,
      sdeVersionUsed: "1.0",
      activeSdeVersion: "v2",
      fallbackUsed: true,
      fallbackReason: `SDE v2 não foi executado porque o SDE v1 retornou ${v1Result.status}.`,
    };
  }
  const runtime = getCompetitionRuntimeDefinition(snapshot.configuracao.concursoAlvoId);
  const materialCatalog = mergePrivateMaterialCatalogs(
    runtime.privateStudyMaterials,
    buildDynamicPrivateMaterialCatalog(snapshot.biblioteca ?? [], runtime.package.id),
  );
  const normalizedEvidence = normalizeUnifiedEvidence({
    referenceDate,
    legacyAttempts: snapshot.tentativasQuestoes,
    externalEvidenceLedger: snapshot.externalEvidenceLedger ?? [],
    sessions: snapshot.sessoesEstudo,
    reviewSchedules: snapshot.cronogramasRevisao,
    subtopics: snapshot.subassuntos,
    simulations: snapshot.simulados ?? [],
    questions: snapshot.questoes ?? [],
    fgvTrainingAttempts: snapshot.isolatedEvidence?.fgvTrainingAttempts ?? [],
    fgvTrainingCatalog: snapshot.isolatedEvidence?.fgvTrainingCatalog ?? null,
    pilotDiagnosticAttempts: snapshot.isolatedEvidence?.pilotDiagnosticAttempts ?? [],
  });
  const v2Output = runSdeV2Decision({
    referenceDate,
    examDate: runtime.package.officialRules.examDate,
    availableMinutes: v1Result.availability.remainingMinutes,
    edital: runtime.package.sde.edital,
    disciplinas: runtime.package.sde.disciplinas,
    assuntos: runtime.package.sde.assuntos,
    subassuntos: runtime.package.sde.subassuntos,
    evidence: normalizedEvidence,
    materials: materialCatalog,
    historicalSignals: historicalSignalsFromCatalog(snapshot.isolatedEvidence?.fgvTrainingCatalog ?? { questions: [] } as never),
    recentDecisionNodeIds: (snapshot.decisionLedger ?? [])
      .filter((record) => record.referenceDate < referenceDate && record.referenceDate >= new Date(new Date(`${referenceDate}T00:00:00Z`).getTime() - 7 * 86_400_000).toISOString().slice(0, 10))
      .map((record) => record.selectedNodeId),
  });
  if (
    v2Output.status !== "SUCCESS" ||
    !v2Output.selected ||
    !v2Output.decisionRecord ||
    !v2Output.selected.materialAvailable ||
    v2Output.selected.estimatedMinutes > v1Result.availability.remainingMinutes ||
    !Number.isFinite(v2Output.selected.score)
  ) {
    const fallbackReason = v2Output.errors.join(" ") || (!v2Output.selected?.materialAvailable ? "SDE v2 não encontrou material utilizável para a ação selecionada." : "SDE v2 não produziu ação executável dentro do tempo disponível.");
    const fallbackRecord = buildFallbackDecisionRecord({ referenceDate, v1Result, reason: fallbackReason, v2Output });
    const provisional: SDEApplicationResult = {
      ...v1Result,
      sdeVersionUsed: "1.0",
      activeSdeVersion: "v2",
      fallbackUsed: true,
      fallbackReason,
      warnings: [...v1Result.warnings, ...v2Output.warnings],
      v2: {
        output: v2Output,
        decisionRecord: fallbackRecord,
        comparisonWithV1: undefined as never,
      },
    };
    const compared = buildSdeV1V2Comparison(v1Result, provisional);
    if (fallbackRecord) fallbackRecord.comparisonWithV1 = compared;
    provisional.v2!.comparisonWithV1 = compared;
    return provisional;
  }

  const candidateActions = v2Output.candidates
    .filter((candidate) => candidate.score > 0)
    .slice(0, 20)
    .map((candidate, index) => toStrategicAction(candidate, index + 1));
  const actions = applyDeterministicTieTransparency(
    candidateActions.length > 0 ? candidateActions : [toStrategicAction(v2Output.selected, 1)],
  );
  const daysToExam = Math.max(0, Math.ceil((new Date(`${runtime.package.officialRules.examDate}T00:00:00Z`).getTime() - new Date(`${referenceDate}T00:00:00Z`).getTime()) / 86_400_000));
  const planner = createStudyPlan({
    actions,
    context: {
      tempoDisponivelMinutos: v1Result.availability.remainingMinutes,
      diasAteAProva: daysToExam,
      referenceDate,
      bancaName: runtime.package.banca,
      tipoQuestao: runtime.package.officialRules.questionType,
      tempoAlvoPorQuestaoSegundos: null,
      seedId: `${runtime.package.id}-${referenceDate}-sde-v2`,
      policy: runtime.package.sde.plannerPolicy,
    },
  });
  const prescription = buildDailyStudyPrescription({
    concursoId: runtime.package.id,
    referenceDate,
    planner,
    actions,
    materialCatalog,
    externalQuestionBanks: runtime.externalQuestionBanks,
    banca: runtime.package.banca,
    studyGuidance: runtime.package.studyGuidance,
    siblingSubtopicNamesByTopic: Object.fromEntries(
      Object.entries(runtime.package.sde.assuntoToSubassuntos).map(([topicId, ids]) => [
        topicId,
        ids.map((id) => runtime.package.sde.names.subassuntos[id] ?? id),
      ]),
    ),
    attempts: snapshot.tentativasQuestoes.map((attempt) => ({
      disciplineId: attempt.disciplinaId,
      topicId: attempt.assuntoId,
      subtopicId: attempt.subassuntoId,
      seconds: attempt.tempoRespostaSegundos,
    })),
    examPacing: {
      durationMinutes: runtime.package.officialRules.durationMinutes,
      totalQuestions: runtime.package.officialRules.totalQuestions,
    },
    questionPolicy: QUESTION_PRESCRIPTION_POLICY,
    maxUpcomingSessions: 2,
  });
  const compared = buildSdeV1V2Comparison(v1Result, {
    ...v1Result,
    sdeVersionUsed: "2.0",
    activeSdeVersion: "v2",
    fallbackUsed: false,
    v2: {
      output: v2Output,
      decisionRecord: v2Output.decisionRecord,
      comparisonWithV1: undefined as never,
    },
  });
  v2Output.decisionRecord.comparisonWithV1 = compared;

  return {
    status: "SUCCESS",
    referenceDate,
    availability: v1Result.availability,
    actions,
    planner,
    prescription,
    warnings: [
      ...v1Result.warnings,
      ...v2Output.warnings,
      "SDE v2 ativo; SDE v1 preservado como fallback técnico.",
    ],
    errors: [],
    sdeVersionUsed: "2.0",
    activeSdeVersion: "v2",
    fallbackUsed: false,
    v2: {
      output: v2Output,
      decisionRecord: v2Output.decisionRecord,
      comparisonWithV1: compared,
    },
  };
}
