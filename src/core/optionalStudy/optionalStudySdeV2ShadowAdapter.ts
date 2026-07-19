import type { Assunto, Disciplina, ItemBiblioteca, SessaoEstudo, Subassunto } from "../../types";
import type { ExternalEvidenceRecord } from "../externalEvidence/types";
import type { ErrorRecoveryCase } from "../review/types";
import type { CronogramaRevisao } from "../../types";
import type { SDEApplicationResult } from "../../integrations/sde/types";
import { runSdeV2Decision, type SdeV2DecisionInput } from "../sde-v2/decisionEngine";
import type { SdeV2CandidateDecision, SdeV2Method } from "../sde-v2/types";
import type {
  OptionalStudyContext,
  OptionalStudyMaterialMatchConfidence,
  OptionalStudyMethod,
  OptionalStudyRecommendationOption,
  OptionalStudyShadowExecution,
} from "./types";

export interface OptionalStudySdeV2ShadowAdapterInput {
  localDate: string;
  context: OptionalStudyContext;
  scheduledMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  weeklyStudiedMinutes: number;
  effectiveDecision: SDEApplicationResult | null;
  disciplines: readonly Disciplina[];
  topics: readonly Assunto[];
  subtopics: readonly Subassunto[];
  sessions: readonly SessaoEstudo[];
  reviews: readonly CronogramaRevisao[];
  errorCases: readonly ErrorRecoveryCase[];
  materials: readonly ItemBiblioteca[];
  evidence: readonly ExternalEvidenceRecord[];
  /** Core input built from the exact same store snapshot. Absence means unsupported context. */
  sdeV2DecisionInput?: SdeV2DecisionInput;
}

export interface OptionalStudySdeV2ShadowAdapterResult {
  option: OptionalStudyRecommendationOption | null;
  execution: OptionalStudyShadowExecution;
}

function methodFromV2(method: SdeV2Method): OptionalStudyMethod {
  switch (method) {
    case "short_diagnostic": return "short_question_batch";
    case "theory_notebooklm": return "theory_notebooklm";
    case "concept_recovery": return "active_recall";
    case "fgv_question_batch": return "fgv_questions";
    case "active_review": return "review_due";
    case "timed_question_batch": return "timed_question_batch";
    case "structured_error_recovery": return "error_review";
    case "spaced_maintenance": return "active_recall";
    case "prerequisite_recovery": return "prerequisite_recovery";
  }
}

function materialMatch(
  materials: readonly ItemBiblioteca[],
  disciplineId: string,
  topicId: string,
  subtopicId: string,
): { material?: ItemBiblioteca; confidence: OptionalStudyMaterialMatchConfidence } {
  const live = materials.filter((item) => !item.isDeleted);
  const exact = live.find((item) => item.dadosPDF?.indice?.some((section) => section.subassuntoIds?.includes(subtopicId)));
  if (exact) return { material: exact, confidence: "exact_subtopic" };
  const topic = live.find((item) => item.assuntoId === topicId || item.dadosPDF?.indice?.some((section) => section.assuntoId === topicId));
  if (topic) return { material: topic, confidence: "topic" };
  const discipline = live.find((item) => item.disciplinaId === disciplineId || item.dadosPDF?.indice?.some((section) => section.disciplinaId === disciplineId));
  if (discipline) return { material: discipline, confidence: "discipline_broad" };
  return { confidence: "none" };
}

function optionFromRealV2(input: OptionalStudySdeV2ShadowAdapterInput, selected: SdeV2CandidateDecision, decisionId: string): OptionalStudyRecommendationOption | null {
  const discipline = input.disciplines.find((item) => item.id === selected.disciplineId);
  const topic = input.topics.find((item) => item.id === selected.topicId);
  const subtopic = input.subtopics.find((item) => item.id === selected.subtopicId);
  if (!discipline || !topic || !subtopic || !Number.isFinite(selected.score)) return null;
  const match = materialMatch(input.materials, discipline.id, topic.id, subtopic.id);
  const mappedMethod = methodFromV2(selected.method.method);
  const warnings = [
    ...selected.prerequisiteState.rationale,
    ...(selected.prerequisiteState.requiredBlocked ? ["Este assunto possui um pré-requisito ainda não consolidado."] : []),
    ...(match.confidence === "discipline_broad" ? ["O material localizado possui vínculo amplo com a disciplina; confirme a compatibilidade temática antes de usar."] : []),
  ];
  return {
    optionId: `optional-shadow-v2-${decisionId}`,
    disciplineId: discipline.id,
    disciplineName: discipline.nome,
    topicId: topic.id,
    topicName: topic.nome,
    subtopicId: subtopic.id,
    subtopicName: subtopic.nome,
    method: mappedMethod,
    environment: mappedMethod === "fgv_questions" || mappedMethod === "timed_question_batch" || mappedMethod === "short_question_batch"
      ? "qconcursos"
      : mappedMethod === "theory_notebooklm" || mappedMethod === "prerequisite_recovery"
        ? "notebooklm"
        : "concurseiroos",
    materialId: match.confidence === "discipline_broad" ? undefined : match.material?.id,
    materialLabel: match.confidence === "discipline_broad" ? undefined : match.material?.titulo,
    materialMatchConfidence: match.confidence,
    durationMinutes: selected.estimatedMinutes,
    objective: selected.method.objective,
    completionCriterion: selected.method.advanceCriterion,
    rationale: `Saída real do SDE v2: ${selected.method.rule}.`,
    expectedPedagogicalEffect: selected.method.objective,
    warnings,
    supportSignals: selected.scoreComponents
      .slice()
      .sort((left, right) => right.contribution - left.contribution)
      .slice(0, 5)
      .map((component) => `${component.label}: ${component.explanation}`),
    prerequisiteAdequate: !selected.prerequisiteState.requiredBlocked,
    origin: "sde_v2_real",
    sdeVersion: "2.0",
    sourceDecisionId: decisionId,
    score: selected.score,
    suggestedSource: mappedMethod === "fgv_questions" || mappedMethod === "short_question_batch" || mappedMethod === "timed_question_batch" ? "qconcursos" : undefined,
    suggestedExaminingBoard: mappedMethod === "fgv_questions" ? "FGV" : undefined,
  };
}

/**
 * Adapts only a real SDE v2 output. It never fabricates a v2 option from the
 * optional v1 engine or from the list of v1 alternatives.
 */
export function optionalStudySdeV2ShadowAdapter(input: OptionalStudySdeV2ShadowAdapterInput): OptionalStudySdeV2ShadowAdapterResult {
  if (!input.sdeV2DecisionInput) {
    return {
      option: null,
      execution: {
        adapter: "optionalStudySdeV2ShadowAdapter",
        executed: false,
        fallbackUsed: true,
        fallbackReason: "OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2",
      },
    };
  }

  const output = runSdeV2Decision(input.sdeV2DecisionInput);
  const record = output.decisionRecord;
  if (output.status !== "SUCCESS" || !output.selected || !record || record.sdeVersion !== "2.0" || record.fallbackUsed) {
    return {
      option: null,
      execution: {
        adapter: "optionalStudySdeV2ShadowAdapter",
        executed: true,
        fallbackUsed: true,
        fallbackReason: output.status === "SUCCESS" ? "SDE_V2_OUTPUT_UNAVAILABLE" : "SDE_V2_OUTPUT_INVALID",
        sourceDecisionId: record?.decisionId,
        evidenceIds: output.normalizedEvidence.filter((item) => item.decisionEligible).map((item) => item.evidenceId),
      },
    };
  }
  const option = optionFromRealV2(input, output.selected, record.decisionId);
  if (!option || !output.selected.materialAvailable) {
    return {
      option: null,
      execution: {
        adapter: "optionalStudySdeV2ShadowAdapter",
        executed: true,
        fallbackUsed: true,
        fallbackReason: "SDE_V2_OUTPUT_INVALID",
        sourceDecisionId: record.decisionId,
        evidenceIds: record.evidenceIds,
        historicalIncidenceShadow: record.historicalIncidenceShadow,
      },
    };
  }
  return {
    option,
    execution: {
      adapter: "optionalStudySdeV2ShadowAdapter",
      executed: true,
      fallbackUsed: false,
      sourceDecisionId: record.decisionId,
      evidenceIds: record.evidenceIds,
      historicalIncidenceShadow: record.historicalIncidenceShadow,
    },
  };
}
