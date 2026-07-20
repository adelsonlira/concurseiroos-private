import type { Assunto, CronogramaRevisao, Disciplina, ItemBiblioteca, SessaoEstudo, Subassunto } from "../../types";
import { deriveExternalEvidenceViews } from "../externalEvidence/ledger";
import type { ExternalEvidenceRecord } from "../externalEvidence/types";
import { deriveErrorRecoveryCaseState } from "../review/errorRecovery";
import type { ErrorRecoveryCase } from "../review/types";
import { DATAPREV_KNOWLEDGE_GRAPH_V2, SDE_V2_CONFIG } from "../sde-v2/config";
import { prerequisiteStateForTaxonomyNode } from "../sde-v2/knowledgeGraph";
import type { KnowledgeStateAssessment, SdeCalibrationRecord, SdeDecisionComparisonSnapshot } from "../sde-v2/types";
import type { SdeV2DecisionInput } from "../sde-v2/decisionEngine";
import type { SDEApplicationResult } from "../../integrations/sde/types";
import type { PrivateStudyMaterial } from "../materials/types";
import { executionReadinessGate } from "../studyExecution/executionReadinessGate";
import type { StudyExecutionEnvironment, StudyExecutionMaterialCandidate } from "../studyExecution/types";
import { optionalStudySdeV2ShadowAdapter } from "./optionalStudySdeV2ShadowAdapter";
import type {
  OptionalStudyContext,
  OptionalStudyDerivedState,
  OptionalStudyInputSnapshot,
  OptionalStudyLedgerEvent,
  OptionalStudyMaterialMatchConfidence,
  OptionalStudyMethod,
  OptionalStudyRecommendation,
  OptionalStudyRecommendationOption,
} from "./types";

export const OPTIONAL_STUDY_ENGINE_VERSION = "1.2" as const;
export const OPTIONAL_STUDY_QUICK_DURATIONS = [15, 30, 45, 60, 90, 120] as const;
export const OPTIONAL_STUDY_NORMAL_DAILY_LIMIT = 120;
export const OPTIONAL_STUDY_REVIEW_WINDOW_DAYS = 3;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

export function hashOptionalStudyInput(value: unknown): string {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `optional-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function optionId(method: OptionalStudyMethod, topicId: string, ordinal: number): string {
  return `optional-option-${method}-${topicId}-${ordinal}`;
}

function methodToEnvironment(method: OptionalStudyMethod): OptionalStudyRecommendationOption["environment"] {
  if (["theory_notebooklm", "continue_theory", "prerequisite_recovery"].includes(method)) return "notebooklm";
  if (["fgv_questions", "short_question_batch", "timed_question_batch"].includes(method)) return "qconcursos";
  if (method === "mini_simulation") return "concurseiroos";
  if (method === "guided_reading") return "material";
  return "concurseiroos";
}

const METHOD_CONTENT: Record<OptionalStudyMethod, { objective: string; criterion: string; effect: string }> = {
  theory_notebooklm: { objective: "Compreender os conceitos-base e produzir exemplos próprios.", criterion: "Explicar os pontos centrais sem copiar o material e registrar dúvidas restantes.", effect: "Construção de base conceitual antes de medir desempenho." },
  continue_theory: { objective: "Retomar a teoria do ponto em que a sessão anterior terminou.", criterion: "Concluir o trecho escolhido e realizar recuperação ativa breve.", effect: "Continuidade sem reiniciar o conteúdo." },
  prerequisite_recovery: { objective: "Recuperar o pré-requisito que sustenta o assunto avançado.", criterion: "Resolver ou explicar o conceito-base sem consulta contínua.", effect: "Redução de erros causados por base insuficiente." },
  guided_reading: { objective: "Ler o trecho aprovado com perguntas orientadoras.", criterion: "Registrar os conceitos e restrições realmente identificados.", effect: "Cobertura teórica focada e verificável." },
  active_recall: { objective: "Recuperar o conteúdo sem consulta antes de conferir.", criterion: "Registrar o que foi lembrado, esquecido e corrigido.", effect: "Fortalecimento de memória e detecção de lacunas." },
  fgv_questions: { objective: "Resolver questões FGV do assunto e corrigir os erros.", criterion: "Registrar quantidade, acertos, erros, brancos, tempo, origem, banca e consulta.", effect: "Medição objetiva em formato próximo da prova." },
  short_question_batch: { objective: "Executar um lote curto de questões para medir o estado atual.", criterion: "Concluir pelo menos 5 questões e registrar o resultado real.", effect: "Amostra rápida sem comprometer o descanso." },
  timed_question_batch: { objective: "Treinar aplicação e gerenciamento de tempo.", criterion: "Concluir o lote no tempo escolhido e registrar o resultado.", effect: "Medição conjunta de precisão e ritmo." },
  review_due: { objective: "Executar a revisão vencida ou próxima mais útil.", criterion: "Recuperar o conteúdo antes da consulta e registrar erros persistentes.", effect: "Proteção contra esquecimento." },
  error_review: { objective: "Revisar a causa de erros ativos e refazer a aplicação.", criterion: "Explicar a regra preventiva e testar novamente sem ajuda.", effect: "Redução de recorrência do erro." },
  flashcards: { objective: "Revisar cartões pendentes por recuperação ativa.", criterion: "Classificar honestamente a recuperação e registrar falhas.", effect: "Manutenção leve da memória." },
  technical_practice: { objective: "Aplicar o conceito em SQL, código, modelagem ou arquitetura.", criterion: "Produzir uma solução observável e registrar dificuldades.", effect: "Transferência da teoria para aplicação." },
  mini_simulation: { objective: "Executar um bloco cronometrado e analisar o resultado.", criterion: "Concluir o recorte, registrar fonte, banca, condições, tempo, acertos, erros e brancos.", effect: "Treino integrado de decisão e tempo." },
  light_organization: { objective: "Preparar o ambiente ou registrar resultados pendentes.", criterion: "Concluir uma ação operacional concreta sem substituir estudo útil.", effect: "Redução de atrito para a próxima sessão, sem evidência cognitiva." },
};

export interface OptionalMaterialMatch {
  material?: ItemBiblioteca;
  candidate?: StudyExecutionMaterialCandidate;
  confidence: OptionalStudyMaterialMatchConfidence;
}

export function findOptionalStudyMaterialById(
  materials: readonly ItemBiblioteca[],
  selectedMaterialId: string,
  disciplineId: string,
  topicId: string,
  subtopicId?: string,
  materialCatalog: readonly PrivateStudyMaterial[] = [],
): OptionalMaterialMatch {
  const material = materials.find((item) => item.id === selectedMaterialId && !item.isDeleted);
  if (!material) return { confidence: "none" };
  const catalogId = material.privateMaterial?.catalogMaterialId ?? (material.id.startsWith("lib-") ? material.id.slice(4) : material.id);
  const catalogMaterial = materialCatalog.find((item) => item.id === catalogId);
  if (catalogMaterial) {
    const exact = subtopicId ? catalogMaterial.sections.find((section) => section.subtopicIds.includes(subtopicId)) : undefined;
    const topicWide = catalogMaterial.sections.find((section) =>
      section.topicId === topicId &&
      (section.subtopicIds.length === 0 || section.matchedTerms.includes("AUDITED_TOPIC_WIDE")),
    );
    const topicSection = exact ?? topicWide ?? catalogMaterial.sections.find((section) => section.topicId === topicId) ?? catalogMaterial.sections[0];
    return {
      material,
      confidence: exact ? "exact_subtopic" : topicWide ? "topic" : catalogMaterial.disciplineId === disciplineId ? "discipline_broad" : "none",
      candidate: {
        materialId: catalogMaterial.id,
        materialTitle: catalogMaterial.displayTitle,
        sectionTitle: topicSection?.title,
        startPage: topicSection?.startPage,
        endPage: topicSection?.endPage,
        sourceFileName: catalogMaterial.sourceFileName,
        matchScope: exact ? "EXACT_SUBTOPIC" : "TOPIC_FALLBACK",
        contentKind: topicSection?.contentKind,
        questionBank: topicSection?.questionBank,
      },
    };
  }
  const exactIndex = subtopicId
    ? material.dadosPDF?.indice?.find((section) => section.subassuntoIds?.includes(subtopicId))
    : undefined;
  const topicIndex = material.dadosPDF?.indice?.find((section) => section.assuntoId === topicId);
  const section = exactIndex ?? topicIndex;
  return {
    material,
    confidence: exactIndex ? "exact_subtopic" : topicIndex ? "topic" : material.disciplinaId === disciplineId ? "discipline_broad" : "none",
    candidate: {
      materialId: material.id,
      materialTitle: material.titulo,
      sectionTitle: section?.titulo,
      startPage: section?.paginaInicial,
      endPage: section?.paginaFinal,
      matchScope: exactIndex ? "EXACT_SUBTOPIC" : "TOPIC_FALLBACK",
    },
  };
}

export function findOptionalStudyMaterial(
  materials: readonly ItemBiblioteca[],
  disciplineId: string,
  topicId: string,
  subtopicId?: string,
  materialCatalog: readonly PrivateStudyMaterial[] = [],
): OptionalMaterialMatch {
  const live = materials.filter((item) => !item.isDeleted);
  const libraryById = new Map(live.map((item) => [item.id, item] as const));
  const libraryItemForCatalog = (catalogId: string): ItemBiblioteca | undefined =>
    libraryById.get(catalogId) ?? libraryById.get(`lib-${catalogId}`);
  const catalogById = new Map(materialCatalog.map((material) => [material.id, material] as const));
  const catalogForLibraryItem = (item: ItemBiblioteca): PrivateStudyMaterial | undefined => {
    const catalogId = item.privateMaterial?.catalogMaterialId ?? (item.id.startsWith("lib-") ? item.id.slice(4) : item.id);
    return catalogById.get(catalogId);
  };
  const catalogSectionSupportsTarget = (material: PrivateStudyMaterial): boolean => {
    const topicSections = material.sections.filter((section) => section.topicId === topicId);
    if (topicSections.length === 0) return false;
    if (!subtopicId) {
      return topicSections.some((section) => section.subtopicIds.length === 0 || section.matchedTerms.includes("AUDITED_TOPIC_WIDE"));
    }
    return topicSections.some((section) =>
      section.subtopicIds.includes(subtopicId) ||
      section.subtopicIds.length === 0 ||
      section.matchedTerms.includes("AUDITED_TOPIC_WIDE"),
    );
  };
  if (subtopicId) {
    for (const catalogMaterial of materialCatalog) {
      const section = catalogMaterial.sections.find((item) => item.subtopicIds.includes(subtopicId));
      if (!section) continue;
      return {
        material: libraryItemForCatalog(catalogMaterial.id),
        confidence: "exact_subtopic",
        candidate: {
          materialId: catalogMaterial.id,
          materialTitle: catalogMaterial.displayTitle,
          sectionTitle: section.title,
          startPage: section.startPage,
          endPage: section.endPage,
          sourceFileName: catalogMaterial.sourceFileName,
          matchScope: "EXACT_SUBTOPIC",
          contentKind: section.contentKind,
          questionBank: section.questionBank,
        },
      };
    }
    const exact = live.find((item) => item.dadosPDF?.indice?.some((section) => section.subassuntoIds?.includes(subtopicId)));
    if (exact) return { material: exact, confidence: "exact_subtopic", candidate: { materialId: exact.id, materialTitle: exact.titulo, matchScope: "EXACT_SUBTOPIC" } };
  }
  for (const catalogMaterial of materialCatalog) {
    const sections = catalogMaterial.sections.filter((section) => section.topicId === topicId);
    const section = sections.find((item) => item.subtopicIds.length === 0 || item.matchedTerms.includes("AUDITED_TOPIC_WIDE"));
    if (!section) continue;
    return {
      material: libraryItemForCatalog(catalogMaterial.id),
      confidence: "topic",
      candidate: {
        materialId: catalogMaterial.id,
        materialTitle: catalogMaterial.displayTitle,
        sectionTitle: section.title,
        startPage: section.startPage,
        endPage: section.endPage,
        sourceFileName: catalogMaterial.sourceFileName,
        matchScope: "TOPIC_FALLBACK",
        contentKind: section.contentKind,
        questionBank: section.questionBank,
      },
    };
  }
  const topic = live.find((item) => {
    const catalogMaterial = catalogForLibraryItem(item);
    if (catalogMaterial) return catalogSectionSupportsTarget(catalogMaterial);
    return item.dadosPDF?.indice?.some((section) =>
      section.assuntoId === topicId &&
      (!subtopicId || !section.subassuntoIds?.length || section.subassuntoIds.includes(subtopicId)),
    ) ?? false;
  });
  if (topic) {
    const catalogMaterial = catalogForLibraryItem(topic);
    const materialId = catalogMaterial?.id ?? topic.id;
    const section = catalogMaterial?.sections.find((item) =>
      item.topicId === topicId &&
      (!subtopicId || item.subtopicIds.includes(subtopicId) || item.subtopicIds.length === 0 || item.matchedTerms.includes("AUDITED_TOPIC_WIDE")),
    );
    return {
      material: topic,
      confidence: "topic",
      candidate: {
        materialId,
        materialTitle: catalogMaterial?.displayTitle ?? topic.titulo,
        sectionTitle: section?.title,
        startPage: section?.startPage,
        endPage: section?.endPage,
        sourceFileName: catalogMaterial?.sourceFileName,
        matchScope: "TOPIC_FALLBACK",
        contentKind: section?.contentKind,
        questionBank: section?.questionBank,
      },
    };
  }
  const discipline = live.find((item) => item.disciplinaId === disciplineId || item.dadosPDF?.indice?.some((section) => section.disciplinaId === disciplineId));
  if (discipline) return { material: discipline, confidence: "discipline_broad" };
  return { confidence: "none" };
}

function optionalEnvironment(environment: OptionalStudyRecommendationOption["environment"]): StudyExecutionEnvironment {
  switch (environment) {
    case "notebooklm": return "notebooklm";
    case "qconcursos": return "qconcursos";
    case "treino_fgv": return "treino_fgv";
    case "material": return "internal_material";
    case "manual": return "manual_external";
    default: return "guided_session";
  }
}

export function validateOptionalStudyExecutionOption(
  option: OptionalStudyRecommendationOption,
  context: OptionalStudyContext,
  materialMatch: OptionalMaterialMatch,
  materialCatalog: readonly PrivateStudyMaterial[],
): OptionalStudyRecommendationOption {
  const gate = executionReadinessGate({
    competitionId: "dataprev-2026-perfil-3",
    context,
    disciplineId: option.disciplineId,
    disciplineName: option.disciplineName,
    topicId: option.topicId,
    topicName: option.topicName,
    subtopicId: option.subtopicId,
    subtopicName: option.subtopicName,
    requestedMethod: option.method,
    requestedEnvironment: optionalEnvironment(option.environment),
    durationMinutes: option.durationMinutes,
    objective: option.objective,
    completionCriterion: option.completionCriterion,
    material: materialMatch.candidate ?? null,
    materialCatalog,
    targetQuestions: ["fgv_questions", "short_question_batch", "timed_question_batch"].includes(option.method) ? (option.method === "short_question_batch" ? 5 : 10) : null,
    examiningBoard: option.suggestedExaminingBoard ?? null,
    sourceLabel: option.suggestedSource ?? null,
    sourceDecisionId: option.sourceDecisionId ?? option.optionId,
    allowMethodFallback: true,
    forceFgvEvidenceUse: false,
  });
  return {
    ...option,
    method: (gate.effectiveMethod ?? option.method) as OptionalStudyMethod,
    environment: gate.effectiveEnvironment === "notebooklm" ? "notebooklm"
      : gate.effectiveEnvironment === "qconcursos" ? "qconcursos"
      : gate.effectiveEnvironment === "treino_fgv" ? "treino_fgv"
      : gate.effectiveEnvironment === "internal_material" ? "material"
      : gate.effectiveEnvironment === "manual_external" ? "manual"
      : "concurseiroos",
    materialId: gate.packet?.materialId ?? option.materialId,
    materialLabel: gate.packet?.materialTitle ?? option.materialLabel,
    executionStatus: gate.executionStatus,
    executionPacket: gate.packet,
    executionBlockReasons: gate.blockedReasons,
    warnings: [...option.warnings, ...(gate.methodChanged && gate.methodChangeReason ? [gate.methodChangeReason] : []), ...(gate.blockedCandidate ? [gate.blockedCandidate.explanation] : [])],
  };
}

function makeOption(params: {
  ordinal: number;
  method: OptionalStudyMethod;
  discipline: Disciplina;
  topic: Assunto;
  subtopic?: Subassunto;
  durationMinutes: number;
  materialMatch?: OptionalMaterialMatch;
  rationale: string;
  warnings?: string[];
  supportSignals: string[];
  prerequisiteAdequate?: boolean | null;
}): OptionalStudyRecommendationOption {
  const content = METHOD_CONTENT[params.method];
  const materialAllowed = params.materialMatch && params.materialMatch.confidence !== "discipline_broad";
  return {
    optionId: optionId(params.method, params.topic.id, params.ordinal),
    disciplineId: params.discipline.id,
    disciplineName: params.discipline.nome,
    topicId: params.topic.id,
    topicName: params.topic.nome,
    subtopicId: params.subtopic?.id,
    subtopicName: params.subtopic?.nome,
    method: params.method,
    environment: methodToEnvironment(params.method),
    materialId: materialAllowed ? params.materialMatch?.material?.id : undefined,
    materialLabel: materialAllowed ? params.materialMatch?.material?.titulo : undefined,
    materialMatchConfidence: params.materialMatch?.confidence ?? "none",
    durationMinutes: params.durationMinutes,
    objective: content.objective,
    completionCriterion: content.criterion,
    rationale: params.rationale,
    expectedPedagogicalEffect: content.effect,
    warnings: params.warnings ?? [],
    supportSignals: params.supportSignals,
    prerequisiteAdequate: params.prerequisiteAdequate ?? null,
    origin: "sde_v1_optional",
    sdeVersion: "1.0",
    score: null,
    suggestedSource: params.method === "fgv_questions" || params.method === "short_question_batch" || params.method === "timed_question_batch" ? "qconcursos" : params.method === "mini_simulation" ? "simulado_externo" : undefined,
    suggestedExaminingBoard: params.method === "fgv_questions" ? "FGV" : undefined,
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function buildOptionalPrerequisiteKnowledgeStates(input: BuildOptionalStudyRecommendationInput): Record<string, KnowledgeStateAssessment> {
  const activeEvidence = deriveExternalEvidenceViews(input.evidence)
    .filter((view) => view.status === "active" && view.record.affectsSde)
    .map((view) => view.record);
  return Object.fromEntries(input.subtopics.map((subtopic) => {
    const evidence = activeEvidence.filter((record) => record.subtopicId === subtopic.id || record.syllabusItemId === subtopic.id);
    const objectiveItems = evidence.reduce((sum, record) => sum + (record.totalQuestions ?? 0), 0);
    const hasSession = input.sessions.some((session) => session.subassuntoId === subtopic.id && session.tempoGastoSegundos > 0);
    const state: KnowledgeStateAssessment["state"] = objectiveItems > 0
      ? "PRACTICING"
      : subtopic.completado || hasSession
        ? "LEARNING"
        : "UNSEEN";
    return [subtopic.id, {
      nodeId: subtopic.id,
      state,
      weightedAccuracy: null,
      effectiveSampleSize: objectiveItems,
      lastEvidenceAt: evidence.map((item) => item.recordedAt).sort().at(-1) ?? null,
      ageInDays: null,
      consultedEvidenceRatio: 0,
      trend: "UNKNOWN",
      confidence: objectiveItems >= 5 ? "MEDIUM" : "LOW",
      primaryErrorCause: evidence.find((item) => item.primaryErrorCause)?.primaryErrorCause ?? null,
      theoryCoverage: subtopic.completado || hasSession ? "PARTIAL" : "NONE",
      reviewPending: input.reviews.some((item) => item.subassuntoId === subtopic.id && !item.isDeleted && !item.desabilitada && item.proximaRevisaoData <= input.localDate),
      evidenceIds: evidence.map((item) => item.evidenceId),
      reasons: ["Estado mínimo para validação opcional derivado sem usar a saída shadow do SDE v2."],
    } satisfies KnowledgeStateAssessment];
  }));
}

function prerequisiteState(knowledgeStates: Record<string, KnowledgeStateAssessment>, subtopicId?: string) {
  if (!subtopicId) return null;
  try {
    return prerequisiteStateForTaxonomyNode({
      graph: DATAPREV_KNOWLEDGE_GRAPH_V2,
      taxonomyNodeId: subtopicId,
      knowledgeStates,
      acceptableRequiredStates: SDE_V2_CONFIG.safeguards.requiredPrerequisiteMinimumState,
    });
  } catch {
    return null;
  }
}

export interface BuildOptionalStudyRecommendationInput {
  now: string;
  localDate: string;
  context: OptionalStudyContext;
  requestOrdinal?: number;
  scheduledMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  weeklyStudiedMinutes: number;
  examDate?: string;
  effectiveDecision: SDEApplicationResult | null;
  disciplines: readonly Disciplina[];
  topics: readonly Assunto[];
  subtopics: readonly Subassunto[];
  sessions: readonly SessaoEstudo[];
  reviews: readonly CronogramaRevisao[];
  errorCases: readonly ErrorRecoveryCase[];
  materials: readonly ItemBiblioteca[];
  materialCatalog?: readonly PrivateStudyMaterial[];
  evidence: readonly ExternalEvidenceRecord[];
  sdeV2DecisionInput?: SdeV2DecisionInput;
}

interface CandidateSpec {
  method: OptionalStudyMethod;
  discipline: Disciplina;
  topic: Assunto;
  subtopic?: Subassunto;
  rationale: string;
  signals: string[];
  materialMatch: OptionalMaterialMatch;
  prerequisiteAdequate: boolean | null;
  warnings: string[];
  duration: number;
}

function uniqueCandidates(candidates: CandidateSpec[]): CandidateSpec[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.method}:${candidate.subtopic?.id ?? candidate.topic.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildOptionalStudyRecommendation(input: BuildOptionalStudyRecommendationInput): OptionalStudyRecommendation | null {
  const prerequisiteKnowledgeStates = buildOptionalPrerequisiteKnowledgeStates(input);
  const activeEvidenceRecords = deriveExternalEvidenceViews(input.evidence).filter((view) => view.status === "active").map((view) => view.record);
  const prescription = input.effectiveDecision?.prescription?.current ?? null;
  const reviewWindowEnd = addDays(input.localDate, OPTIONAL_STUDY_REVIEW_WINDOW_DAYS);
  const dueReviews = input.reviews
    .filter((item) => !item.isDeleted && !item.desabilitada && item.proximaRevisaoData <= reviewWindowEnd)
    .sort((left, right) => left.proximaRevisaoData.localeCompare(right.proximaRevisaoData) || left.updatedAt.localeCompare(right.updatedAt));
  const dueReview = dueReviews[0];
  const activeErrors = input.errorCases
    .map((item) => ({ item, state: deriveErrorRecoveryCaseState(item) }))
    .filter(({ state }) => state.status !== "STABILIZED")
    .sort((left, right) => right.state.lastErrorAt.localeCompare(left.state.lastErrorAt) || right.state.lastEventAt.localeCompare(left.state.lastEventAt));
  const openError = activeErrors[0]?.item;
  const recentSession = [...input.sessions].sort((a, b) => b.dataFim.localeCompare(a.dataFim))[0];

  const subtopicId = prescription?.subtopicId ?? dueReview?.subassuntoId ?? openError?.subassuntoId ?? recentSession?.subassuntoId ?? input.subtopics[0]?.id;
  const subtopic = input.subtopics.find((item) => item.id === subtopicId);
  const topicId = prescription?.topicId ?? dueReview?.assuntoId ?? openError?.assuntoId ?? recentSession?.assuntoId ?? subtopic?.assuntoId ?? input.topics[0]?.id;
  const topic = input.topics.find((item) => item.id === topicId);
  const disciplineId = prescription?.disciplineId ?? dueReview?.disciplinaId ?? openError?.disciplinaId ?? recentSession?.disciplinaId ?? topic?.disciplinaId ?? input.disciplines[0]?.id;
  const discipline = input.disciplines.find((item) => item.id === disciplineId);
  if (!discipline || !topic) return null;

  const match = findOptionalStudyMaterial(input.materials, discipline.id, topic.id, subtopic?.id, input.materialCatalog ?? []);
  const prereq = prerequisiteState(prerequisiteKnowledgeStates, subtopic?.id);
  const prereqAdequate = prereq ? !prereq.requiredBlocked : null;
  const highWeeklyLoad = input.weeklyStudiedMinutes >= 600;
  const baseDuration = highWeeklyLoad ? 15 : 30;
  const commonWarnings = [
    ...(highWeeklyLoad ? ["Você já realizou uma carga alta nesta semana. Considere manter a atividade leve."] : []),
    ...(match.confidence === "discipline_broad" ? ["Existe apenas material amplo da disciplina; ele não foi selecionado automaticamente por risco de incompatibilidade temática."] : []),
  ];
  const candidates: CandidateSpec[] = [];
  const push = (method: OptionalStudyMethod, rationale: string, signals: string[], extra: Partial<CandidateSpec> = {}) => {
    candidates.push({ method, discipline, topic, subtopic, rationale, signals, materialMatch: match, prerequisiteAdequate: prereqAdequate, warnings: commonWarnings, duration: baseDuration, ...extra });
  };

  if (dueReview) {
    push("review_due", dueReview.proximaRevisaoData <= input.localDate
      ? "Existe revisão vencida ou prevista para hoje."
      : `Existe revisão próxima dentro da janela de ${OPTIONAL_STUDY_REVIEW_WINDOW_DAYS} dias.`,
    ["revisão canônica vencida, prevista ou próxima"]);
  }
  if (openError) push("error_review", "Existe caso de erro ativo, ordenado por recência e ainda não estabilizado.", ["caso de erro canônico ativo"]);

  if (prereq?.requiredBlocked && subtopic) {
    const blockerId = prereq.blockingNodeIds[0];
    const blockerSubtopic = input.subtopics.find((item) => item.id === blockerId);
    const blockerTopic = blockerSubtopic ? input.topics.find((item) => item.id === blockerSubtopic.assuntoId) : undefined;
    const blockerDiscipline = blockerTopic ? input.disciplines.find((item) => item.id === blockerTopic.disciplinaId) : undefined;
    if (blockerSubtopic && blockerTopic && blockerDiscipline) {
      const blockerMaterial = findOptionalStudyMaterial(input.materials, blockerDiscipline.id, blockerTopic.id, blockerSubtopic.id, input.materialCatalog ?? []);
      candidates.unshift({
        method: "prerequisite_recovery",
        discipline: blockerDiscipline,
        topic: blockerTopic,
        subtopic: blockerSubtopic,
        rationale: "O grafo versionado indica pré-requisito obrigatório ainda insuficiente; a base deve ser recuperada antes do conteúdo avançado.",
        signals: ["pré-requisito obrigatório insuficiente"],
        materialMatch: blockerMaterial,
        prerequisiteAdequate: false,
        warnings: blockerMaterial.confidence === "none" || blockerMaterial.confidence === "discipline_broad"
          ? ["Não há material tematicamente confirmado para o pré-requisito; use recuperação ativa ou escolha manual e confirme a fonte."]
          : [],
        duration: baseDuration,
      });
    }
  } else if (prescription) {
    if (prescription.activity === "questoes") push("fgv_questions", "A prescrição efetiva do SDE v1 aponta prática de questões e os pré-requisitos não estão bloqueados.", ["prescrição efetiva de questões", "pré-requisito adequado"]);
    else if (prescription.activity === "revisao") push("active_recall", "A prescrição efetiva do SDE v1 aponta revisão; a atividade opcional mantém continuidade sem competir com o plano.", ["prescrição efetiva de revisão"]);
    else if (prescription.activity === "simulado" && baseDuration >= 30) push("mini_simulation", "A prescrição efetiva do SDE v1 aponta simulação e o tempo comporta um bloco curto.", ["prescrição efetiva de simulado", "tempo compatível"]);
    else if (match.confidence === "exact_subtopic" || match.confidence === "topic") push("continue_theory", "A prescrição efetiva do SDE v1 aponta teoria e há material tematicamente correspondente.", ["prescrição efetiva de teoria", `material ${match.confidence}`]);
  }

  if (!subtopic?.completado && (match.confidence === "exact_subtopic" || match.confidence === "topic")) {
    push("theory_notebooklm", "O conteúdo não possui cobertura declarada e existe material correspondente ao assunto ou subassunto.", ["cobertura teórica ausente", `material ${match.confidence}`]);
  }
  if (recentSession?.subassuntoId === subtopic?.id) push("active_recall", "Há contato recente com o conteúdo; uma recuperação ativa curta mede retenção sem consulta.", ["sessão recente no mesmo subassunto"]);

  const objectiveEvidence = activeEvidenceRecords.filter((item) => item.topicId === topic.id && item.affectsSde);
  if (!prereq?.requiredBlocked && (subtopic?.completado || objectiveEvidence.length > 0 || recentSession?.subassuntoId === subtopic?.id)) {
    push("short_question_batch", "Há base ou evidência prévia suficiente para uma medição objetiva curta.", ["base previamente estudada ou evidência objetiva"]);
    push("technical_practice", "Há contato prévio com o conteúdo e a prática pode produzir resultado observável.", ["contato prévio com o conteúdo", "pré-requisito adequado"]);
  }

  let grounded = uniqueCandidates(candidates);
  if (grounded.length === 0) {
    grounded = [{
      method: "light_organization",
      discipline,
      topic,
      subtopic,
      rationale: "Não há sinal pedagógico suficiente para recomendar teoria, revisão, erro, questões ou prática sem inventar dados.",
      signals: ["ausência de sinal pedagógico suficiente"],
      materialMatch: match,
      prerequisiteAdequate: prereqAdequate,
      warnings: commonWarnings,
      duration: 15,
    }];
  }

  const gatedOptions = grounded.map((candidate, index) => validateOptionalStudyExecutionOption(makeOption({
    ordinal: index,
    method: candidate.method,
    discipline: candidate.discipline,
    topic: candidate.topic,
    subtopic: candidate.subtopic,
    durationMinutes: candidate.duration,
    materialMatch: candidate.materialMatch,
    rationale: candidate.rationale,
    warnings: candidate.warnings,
    supportSignals: candidate.signals,
    prerequisiteAdequate: candidate.prerequisiteAdequate,
  }), input.context, candidate.materialMatch, input.materialCatalog ?? []));
  let executableOptions = gatedOptions.filter((option) => option.executionStatus === "READY" && option.executionPacket);
  const blockedOptions = gatedOptions.filter((option) => option.executionStatus !== "READY" || !option.executionPacket);
  if (executableOptions.length === 0) {
    const safeFallbackSpec: CandidateSpec = {
      method: "light_organization",
      discipline,
      topic,
      subtopic,
      rationale: "Os caminhos pedagógicos avaliados não possuem ambiente ou material executável; foi mantida somente uma opção operacional leve, sem substituir estudo real.",
      signals: ["ausência de caminho pedagógico executável"],
      materialMatch: { confidence: "none" },
      prerequisiteAdequate: prereqAdequate,
      warnings: [...commonWarnings, "Nenhum ambiente pedagógico foi apresentado como pronto sem os recursos necessários."],
      duration: 15,
    };
    const fallback = validateOptionalStudyExecutionOption(makeOption({
      ordinal: gatedOptions.length,
      method: safeFallbackSpec.method,
      discipline: safeFallbackSpec.discipline,
      topic: safeFallbackSpec.topic,
      subtopic: safeFallbackSpec.subtopic,
      durationMinutes: safeFallbackSpec.duration,
      materialMatch: safeFallbackSpec.materialMatch,
      rationale: safeFallbackSpec.rationale,
      warnings: safeFallbackSpec.warnings,
      supportSignals: safeFallbackSpec.signals,
      prerequisiteAdequate: safeFallbackSpec.prerequisiteAdequate,
    }), input.context, safeFallbackSpec.materialMatch, input.materialCatalog ?? []);
    if (fallback.executionStatus === "READY" && fallback.executionPacket) executableOptions = [fallback];
  }
  if (executableOptions.length === 0) return null;
  const [primary, ...restExecutable] = executableOptions;
  const alternatives = restExecutable.slice(0, 4);

  const blockedIds = input.subtopics.filter((item) => prerequisiteState(prerequisiteKnowledgeStates, item.id)?.requiredBlocked).map((item) => item.id);
  const snapshot: OptionalStudyInputSnapshot = {
    localDate: input.localDate,
    context: input.context,
    scheduledMinutes: input.scheduledMinutes,
    completedMinutes: input.completedMinutes,
    remainingMinutes: input.remainingMinutes,
    weeklyStudiedMinutes: input.weeklyStudiedMinutes,
    examDate: input.examDate,
    effectivePrescriptionId: prescription?.id,
    effectiveDisciplineId: prescription?.disciplineId,
    effectiveTopicId: prescription?.topicId,
    effectiveSubtopicId: prescription?.subtopicId,
    recentErrorSubtopicIds: activeErrors.map(({ item }) => item.subassuntoId).slice(0, 20),
    dueReviewSubtopicIds: dueReviews.map((item) => item.subassuntoId).slice(0, 20),
    recentSessionSubtopicIds: [...input.sessions].sort((a, b) => b.dataFim.localeCompare(a.dataFim)).map((item) => item.subassuntoId).filter((item): item is string => Boolean(item)).slice(0, 10),
    availableMaterialIds: input.materials.filter((item) => !item.isDeleted).map((item) => item.id).sort(),
    evidenceIds: input.evidence.filter((item) => item.decisionStatus === "eligible_for_future_sde" && item.affectsSde).map((item) => item.evidenceId).sort(),
    prerequisiteBlockedSubtopicIds: blockedIds,
    sdeV1Effective: true,
    sdeV2ExecutionMode: "shadow",
    sdeV2AffectsPrescription: false,
  };
  const fingerprint = hashOptionalStudyInput(snapshot);
  const requestOrdinal = input.requestOrdinal ?? 0;
  const shadow = optionalStudySdeV2ShadowAdapter(input);
  return {
    recommendationId: `optional-recommendation-${input.localDate}-${input.context}-${fingerprint}-${requestOrdinal}`,
    schemaVersion: 1,
    engineVersion: OPTIONAL_STUDY_ENGINE_VERSION,
    generatedAt: input.now,
    localDate: input.localDate,
    context: input.context,
    inputFingerprint: fingerprint,
    requestOrdinal,
    primary,
    alternatives,
    blockedOptions,
    shadowAlternative: shadow.option ?? undefined,
    shadowExecution: shadow.execution,
    snapshot,
    explanation: {
      signalsUsed: primary.supportSignals ?? [],
      missingInformation: [
        ...(["none", "discipline_broad"].includes(match.confidence) ? ["material tematicamente confirmado"] : []),
        ...(input.evidence.length > 0 ? [] : ["amostra objetiva recente"]),
      ],
      shadowModeNotice: shadow.execution.fallbackUsed
        ? "SDE v2 em calibração — contexto opcional sem saída utilizável; fallback registrado e sem efeito na recomendação."
        : "SDE v2 em calibração — comparação real registrada e sem efeito na recomendação opcional exibida.",
    },
  };
}

export function durationWarning(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return "Informe uma duração positiva.";
  return minutes > OPTIONAL_STUDY_NORMAL_DAILY_LIMIT
    ? "Essa duração ultrapassa sua disponibilidade diária normal de 120 minutos. Confirme somente se hoje você possui disponibilidade excepcional."
    : null;
}

export function validateManualOptionalChoice(params: {
  durationMinutes: number;
  materialMatchConfidence: OptionalStudyMaterialMatchConfidence;
  prerequisiteAdequate: boolean | null;
  weeklyStudiedMinutes: number;
  method: OptionalStudyMethod;
  environment: OptionalStudyRecommendationOption["environment"];
  sourceInformed?: boolean;
  examiningBoardInformed?: boolean;
}): string[] {
  const warnings: string[] = [];
  const duration = durationWarning(params.durationMinutes);
  if (duration) warnings.push(duration);
  if (params.prerequisiteAdequate === false) warnings.push("Este assunto possui um pré-requisito ainda não consolidado.");
  if (["theory_notebooklm", "continue_theory", "guided_reading", "prerequisite_recovery"].includes(params.method) && ["none", "discipline_broad"].includes(params.materialMatchConfidence)) warnings.push("Não há material aprovado tematicamente correspondente para essa atividade.");
  if (params.weeklyStudiedMinutes >= 600) warnings.push("Você já realizou uma carga alta nesta semana. Considere uma revisão mais leve.");
  if (["fgv_questions", "short_question_batch", "timed_question_batch", "mini_simulation"].includes(params.method) && !params.sourceInformed) warnings.push("A fonte ou plataforma das questões ainda precisa ser informada.");
  if (["fgv_questions", "short_question_batch", "timed_question_batch", "mini_simulation"].includes(params.method) && params.environment === "qconcursos" && !params.examiningBoardInformed) warnings.push("A banca das questões ainda precisa ser informada ou confirmada pelo filtro utilizado.");
  const questionMethod = ["fgv_questions", "short_question_batch", "timed_question_batch", "mini_simulation"].includes(params.method);
  if (params.environment === "treino_fgv" && !questionMethod) warnings.push("O ambiente Treino FGV é compatível com atividades de questões, não com o método escolhido.");
  if ((params.environment === "notebooklm" || params.environment === "material") && questionMethod) warnings.push("O ambiente selecionado não executa diretamente um lote de questões; confirme a plataforma de resolução.");
  return warnings;
}

export function appendOptionalStudyEvent(ledger: readonly OptionalStudyLedgerEvent[], event: OptionalStudyLedgerEvent): OptionalStudyLedgerEvent[] {
  if (ledger.some((item) => item.eventId === event.eventId)) return [...ledger];
  return [...ledger, event];
}

export function deriveOptionalStudyState(ledger: readonly OptionalStudyLedgerEvent[], localDate: string): OptionalStudyDerivedState {
  const today = ledger.filter((item) => item.localDate === localDate);
  const recommendationEvent = [...today].reverse().find((item) => item.eventType === "recommendation_generated");
  const recommendation = (recommendationEvent?.payload.recommendation as OptionalStudyRecommendation | undefined) ?? null;
  const hidden = today.some((item) => item.eventType === "hidden_for_today");
  const restKept = today.some((item) => item.eventType === "rest_kept");
  const start = [...today].reverse().find((item) => item.eventType === "session_started");
  if (!start?.sessionId) return { recommendation, hidden, restKept, activeSessionId: null, sessionStatus: "none", selectedOption: null };
  const sessionEvents = today.filter((item) => item.sessionId === start.sessionId);
  const terminal = [...sessionEvents].reverse().find((item) => item.eventType === "session_completed" || item.eventType === "session_interrupted");
  const paused = [...sessionEvents].reverse().find((item) => item.eventType === "session_paused" || item.eventType === "session_resumed");
  const accepted = [...today].reverse().find((item) => item.eventType === "accepted" && item.sessionId === start.sessionId);
  return {
    recommendation,
    hidden,
    restKept,
    activeSessionId: terminal ? null : start.sessionId,
    sessionStatus: terminal?.eventType === "session_completed" ? "completed" : terminal?.eventType === "session_interrupted" ? "interrupted" : paused?.eventType === "session_paused" ? "paused" : "active",
    selectedOption: (accepted?.payload.option as OptionalStudyRecommendationOption | undefined) ?? null,
  };
}

function snapshotFromOption(option: OptionalStudyRecommendationOption, version: "1.0" | "2.0"): SdeDecisionComparisonSnapshot {
  return {
    version,
    status: "OPTIONAL_RECOMMENDATION",
    disciplineId: option.disciplineId,
    topicId: option.topicId,
    subtopicId: option.subtopicId ?? null,
    method: option.method,
    durationMinutes: option.durationMinutes,
    advanceCriterion: option.completionCriterion,
    prerequisiteSummary: option.warnings.find((item) => item.toLocaleLowerCase("pt-BR").includes("pré-requisito")) ?? null,
    score: option.score ?? null,
    topFactors: [option.rationale, ...(option.supportSignals ?? []).slice(0, 4)],
  };
}

export function buildOptionalStudyCalibrationRecord(recommendation: OptionalStudyRecommendation): SdeCalibrationRecord {
  const v1 = snapshotFromOption(recommendation.primary, "1.0");
  const realV2 = recommendation.shadowAlternative?.origin === "sde_v2_real" && recommendation.shadowAlternative.sdeVersion === "2.0"
    ? recommendation.shadowAlternative
    : null;
  const v2 = realV2 ? snapshotFromOption(realV2, "2.0") : null;
  const fields = ["discipline", "topic", "subtopic", "method", "duration", "advance_criterion", "prerequisite", "score"] as const;
  const values = {
    discipline: [v1.disciplineId, v2?.disciplineId ?? null],
    topic: [v1.topicId, v2?.topicId ?? null],
    subtopic: [v1.subtopicId, v2?.subtopicId ?? null],
    method: [v1.method, v2?.method ?? null],
    duration: [v1.durationMinutes, v2?.durationMinutes ?? null],
    advance_criterion: [v1.advanceCriterion, v2?.advanceCriterion ?? null],
    prerequisite: [v1.prerequisiteSummary, v2?.prerequisiteSummary ?? null],
    score: [v1.score, v2?.score ?? null],
  } as const;
  const divergences = fields.flatMap((field) => values[field][0] === values[field][1] ? [] : [{ field, v1Value: values[field][0], v2Value: values[field][1] }]);
  const fallbackReason = recommendation.shadowExecution?.fallbackReason ?? "OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2";
  return {
    calibrationId: `sde-calibration-optional-${recommendation.engineVersion}-${recommendation.inputFingerprint}-${recommendation.requestOrdinal}`,
    schemaVersion: 1,
    createdAt: recommendation.generatedAt,
    referenceDate: recommendation.localDate,
    inputFingerprint: recommendation.inputFingerprint,
    activeSdeVersion: "v1",
    executionMode: "shadow",
    affectsPrescription: false,
    decisionContext: "optional_study",
    v1Decision: v1,
    v2Decision: v2,
    divergences,
    isEqual: v2 !== null && divergences.length === 0,
    fallbackUsed: v2 === null,
    fallbackReason: v2 === null ? fallbackReason : undefined,
    evidenceIds: recommendation.shadowExecution?.evidenceIds ?? recommendation.snapshot.evidenceIds,
    historicalIncidenceShadow: recommendation.shadowExecution?.historicalIncidenceShadow,
    sessionOutcome: null,
  };
}
