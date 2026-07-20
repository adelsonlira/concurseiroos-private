import type { ExternalQuestionBankRecommendation } from "../questions/externalQuestionBanks";
import { assessStudyMaterialMatch, studyMaterialMatchLabel, toStudyExecutionMaterialCandidate } from "./materialMatch";
import { notebookIsReady, resolveStudyExecutionCapability, studyExecutionRegistry } from "./registry";
import type {
  StudyExecutionBlockReason,
  StudyExecutionEnvironment,
  StudyExecutionGateInput,
  StudyExecutionGateResult,
  StudyExecutionMaterialCandidate,
  StudyExecutionMaterialMatch,
  StudyExecutionPacket,
  StudyExecutionResultCapture,
} from "./types";

const QUESTION_METHODS = new Set([
  "questoes",
  "fgv_questions",
  "short_question_batch",
  "timed_question_batch",
]);
const THEORY_METHODS = new Set([
  "teoria",
  "theory_notebooklm",
  "continue_theory",
  "guided_reading",
  "prerequisite_recovery",
]);
const REVIEW_METHODS = new Set([
  "revisao",
  "review_due",
  "error_review",
  "active_recall",
  "flashcards",
]);
const SIMULATION_METHODS = new Set(["simulado", "mini_simulation"]);
const PRACTICE_METHODS = new Set(["technical_practice"]);

function stableId(input: StudyExecutionGateInput, environment: StudyExecutionEnvironment, method: string): string {
  const raw = [
    input.sourceDecisionId ?? "unlinked",
    input.context,
    input.disciplineId,
    input.topicId,
    input.subtopicId ?? "topic",
    method,
    environment,
    input.durationMinutes,
  ].join("|");
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `execution-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function resultCaptureFor(method: string): StudyExecutionResultCapture {
  if (QUESTION_METHODS.has(method)) {
    return {
      kind: "questions",
      fields: ["origem", "banca", "total", "acertos", "erros", "brancos", "consulta", "duração real", "assunto"],
      routeHint: studyExecutionRegistry.resultCaptureRoutes.questions,
    };
  }
  if (SIMULATION_METHODS.has(method)) {
    return {
      kind: "simulation",
      fields: ["origem", "banca", "recorte", "total", "acertos", "erros", "brancos", "condições", "duração real"],
      routeHint: studyExecutionRegistry.resultCaptureRoutes.simulation,
    };
  }
  if (REVIEW_METHODS.has(method)) {
    return {
      kind: "review",
      fields: ["desempenho", "itens lembrados", "erros persistentes", "necessidade de nova revisão", "duração real"],
      routeHint: studyExecutionRegistry.resultCaptureRoutes.review,
    };
  }
  if (PRACTICE_METHODS.has(method)) {
    return {
      kind: "technical_practice",
      fields: ["tarefa", "resultado observável", "conclusão", "dificuldade", "necessidade de ajuda", "duração real"],
      routeHint: studyExecutionRegistry.resultCaptureRoutes.technical_practice,
    };
  }
  if (method === "light_organization") {
    return {
      kind: "operational",
      fields: ["ação operacional realizada", "duração real", "resultado prático"],
      routeHint: studyExecutionRegistry.resultCaptureRoutes.operational,
    };
  }
  return {
    kind: "theory",
    fields: ["duração real", "material", "seção ou páginas", "recuperação ativa", "dúvidas", "critério informado"],
    routeHint: studyExecutionRegistry.resultCaptureRoutes.theory,
  };
}

function preferredEnvironment(method: string): StudyExecutionEnvironment {
  if (method === "theory_notebooklm") return "notebooklm";
  if (method === "guided_reading") return "internal_material";
  if (THEORY_METHODS.has(method)) return "notebooklm";
  if (method === "fgv_questions") return "treino_fgv";
  if (QUESTION_METHODS.has(method)) return "qconcursos";
  if (SIMULATION_METHODS.has(method)) return "simulation";
  if (REVIEW_METHODS.has(method) || PRACTICE_METHODS.has(method) || method === "flashcards" || method === "light_organization") return "guided_session";
  return "guided_session";
}

function exactContent(input: StudyExecutionGateInput, material: StudyExecutionMaterialCandidate | null): string {
  const taxonomyScope = input.subtopicName
    ? `${input.topicName} — ${input.subtopicName}`
    : input.topicName;
  if (material?.sectionTitle) return `${taxonomyScope}. Trecho: ${material.sectionTitle}.`;
  if (QUESTION_METHODS.has(input.requestedMethod)) return `${taxonomyScope}. Resolver o lote com os filtros indicados, sem ampliar para outro assunto.`;
  return taxonomyScope;
}

function sourcePlanRecommendation(input: StudyExecutionGateInput): ExternalQuestionBankRecommendation | null {
  const items = input.questionSourcePlan?.recommendations ?? [];
  return items.find((item) => item.provider === "QCONCURSOS") ?? items[0] ?? null;
}

function selectedNotebookSources(input: StudyExecutionGateInput, forceFgv: boolean): string[] {
  const capability = resolveStudyExecutionCapability(input.disciplineId, input.topicId);
  const targetText = `${input.topicName} ${input.subtopicName ?? ""}`.toLocaleLowerCase("pt-BR");
  return capability.approvedSources
    .filter((source) => {
      if (source.fgvEvidence) return forceFgv;
      if (source.defaultSelected) return true;
      return source.topicKeywords?.some((keyword) => targetText.includes(keyword.toLocaleLowerCase("pt-BR"))) ?? false;
    })
    .map((source) => source.fileName);
}

function fgvBoundary(params: {
  notebookStatus: string;
  fgvEvidenceStatus: string;
  fgvStyleTeaching: string;
  hasFgvSource: boolean;
}): string {
  const { notebookStatus, fgvEvidenceStatus, fgvStyleTeaching, hasFgvSource } = params;
  if (fgvStyleTeaching === "DISABLED" || fgvEvidenceStatus !== "APPROVED" || notebookStatus === "READY_THEORY_ONLY") {
    return "Ensine a teoria alinhada ao edital. Não faça afirmações sobre como a FGV cobra este assunto sem uma fonte documental FGV aprovada.";
  }
  if (notebookStatus === "READY_WITH_FGV_EVIDENCE" && fgvStyleTeaching === "ENABLED_LIMITED" && hasFgvSource) {
    return "Ao mencionar a banca, use apenas a formulação: “No conjunto documental selecionado, foram observados os seguintes padrões...”. Não generalize para toda a FGV e não declare incidência ou probabilidade.";
  }
  return "Não faça afirmações sobre preferência, frequência, incidência ou probabilidade de cobrança da FGV nesta sessão.";
}

function notebookPrompt(params: {
  input: StudyExecutionGateInput;
  sources: string[];
  boundary: string;
  material: StudyExecutionMaterialCandidate | null;
}): string {
  const { input, sources, boundary, material } = params;
  return [
    "Você está executando uma sessão prescrita pelo ConcurseiroOS.",
    "",
    `Disciplina: ${input.disciplineName}`,
    `Assunto: ${input.topicName}`,
    `Subassunto: ${input.subtopicName ?? "não especificado"}`,
    `Duração total: ${input.durationMinutes} minutos`,
    `Fontes autorizadas: ${sources.join("; ") || "nenhuma fonte aprovada disponível"}`,
    `Material ou trecho permitido: ${material?.sectionTitle ?? material?.materialTitle ?? "somente as fontes selecionadas no notebook"}`,
    `Objetivo: ${input.objective}`,
    "",
    "Conduza:",
    "1. diagnóstico inicial curto, sem atribuir domínio;",
    "2. explicação progressiva limitada ao conteúdo prescrito;",
    "3. exemplos compatíveis com as fontes autorizadas;",
    "4. recuperação ativa sem consulta;",
    "5. aplicação curta;",
    "6. verificação final pelo critério de conclusão.",
    "",
    boundary,
    "Não crie plano paralelo, não altere prioridade, não invente fontes, não declare domínio e não trate exercício sintético como evidência oficial.",
    `Critério de conclusão: ${input.completionCriterion}`,
    "",
    "Ao final, entregue:",
    "- conteúdo estudado;",
    "- tempo aproximado;",
    "- dúvidas restantes;",
    "- desempenho na recuperação ativa;",
    "- material, seção ou páginas efetivamente usados;",
    "- recomendação pedagógica sem alterar o plano do ConcurseiroOS.",
  ].join("\n");
}

function qconcursosPacket(params: {
  input: StudyExecutionGateInput;
  method: string;
  environment: StudyExecutionEnvironment;
  materialMatch: StudyExecutionMaterialMatch;
  material: StudyExecutionMaterialCandidate | null;
}): StudyExecutionPacket {
  const { input, method, environment, materialMatch, material } = params;
  const source = sourcePlanRecommendation(input);
  const board = input.examiningBoard?.trim() || source?.filters.banca || null;
  const targetQuestions = input.targetQuestions ?? source?.targetQuestions ?? null;
  const resultCapture = resultCaptureFor(method);
  const filters = source?.filters;
  const instruction = source?.instruction ??
    `No QConcursos, selecione a disciplina “${input.disciplineName}”, o assunto “${input.topicName}”${input.subtopicName ? ` e o subassunto “${input.subtopicName}”` : ""}.`;
  const content = exactContent(input, material);
  return {
    executionId: stableId(input, environment, method),
    disciplineId: input.disciplineId,
    topicId: input.topicId,
    subtopicId: input.subtopicId ?? null,
    method,
    environment,
    durationMinutes: input.durationMinutes,
    objective: input.objective,
    contentScope: content,
    materialId: material?.materialId ?? null,
    materialTitle: material?.materialTitle ?? null,
    sectionsOrPages: material?.startPage && material?.endPage
      ? `Páginas ${material.startPage}–${material.endPage}`
      : "Páginas não se aplicam ao banco externo de questões.",
    materialMatch,
    materialMatchLabel: studyMaterialMatchLabel(materialMatch),
    environmentInstructions: [
      instruction,
      `Resolva ${targetQuestions ?? "a quantidade prescrita de"} questão(ões) dentro de ${input.durationMinutes} minutos.`,
      "Não consulte a solução antes de responder. Corrija somente depois de concluir cada item ou o lote, conforme o método.",
    ],
    selectedSources: [source?.displayName ?? "QConcursos"],
    sourcesToDisable: [],
    prompt: [
      `Executar no QConcursos: ${content}`,
      `Banca: ${board ?? "não informada; confirme o filtro antes de iniciar"}.`,
      `Quantidade: ${targetQuestions ?? "conforme a prescrição"}.`,
      `Anuladas: ${filters?.excludeAnnulled === true ? "excluir" : "não informado"}.`,
      "Desatualizadas: excluir quando o filtro estiver disponível e validado.",
      "Consulta: não, salvo indicação explícita da atividade.",
      `Ao final, registre: ${resultCapture.fields.join(", ")}.`,
    ].join("\n"),
    completionCriterion: input.completionCriterion,
    resultCapture,
    returnInstructions: `Após concluir, volte ao ConcurseiroOS e abra “${resultCapture.routeHint}” para informar ${resultCapture.fields.join(", ")}.`,
    confidence: source ? "HIGH" : "MEDIUM",
    limitations: [
      ...(board ? [] : ["A banca ainda precisa ser confirmada no filtro; QConcursos é a origem, não a banca."]),
      "Não foram inventados anos ou filtros que não estejam presentes no plano de fonte externa.",
    ],
    questionFilters: {
      source: source?.displayName ?? "QConcursos",
      examiningBoard: board,
      discipline: filters?.discipline ?? input.disciplineName,
      topic: filters?.topic ?? input.topicName,
      subtopic: filters?.subtopic ?? input.subtopicName ?? null,
      years: null,
      excludeAnnulled: true,
      excludeOutdated: true,
      consultationAllowed: false,
      targetQuestions,
    },
  };
}

function notebookPacket(params: {
  input: StudyExecutionGateInput;
  method: string;
  materialMatch: StudyExecutionMaterialMatch;
  material: StudyExecutionMaterialCandidate | null;
}): StudyExecutionPacket | null {
  const { input, method, materialMatch, material } = params;
  const capability = resolveStudyExecutionCapability(input.disciplineId, input.topicId);
  if (!notebookIsReady(capability.notebookStatus) || !capability.notebookName || !capability.notebookConfiguration) return null;
  const forceFgv = input.forceFgvEvidenceUse === true;
  const sources = selectedNotebookSources(input, forceFgv);
  if (sources.length === 0) return null;
  const hasFgv = capability.approvedSources.some((source) => source.fgvEvidence && sources.includes(source.fileName));
  const boundary = fgvBoundary({
    notebookStatus: capability.notebookStatus,
    fgvEvidenceStatus: capability.fgvEvidenceStatus,
    fgvStyleTeaching: capability.fgvStyleTeaching,
    hasFgvSource: hasFgv,
  });
  const resultCapture = resultCaptureFor(method);
  const packet: StudyExecutionPacket = {
    executionId: stableId(input, "notebooklm", method),
    disciplineId: input.disciplineId,
    topicId: input.topicId,
    subtopicId: input.subtopicId ?? null,
    method,
    environment: "notebooklm",
    durationMinutes: input.durationMinutes,
    objective: input.objective,
    contentScope: exactContent(input, material),
    materialId: material?.materialId ?? null,
    materialTitle: material?.materialTitle ?? null,
    sectionsOrPages: material?.startPage && material?.endPage
      ? `Páginas ${material.startPage}–${material.endPage}`
      : "Páginas não cadastradas para o notebook; use apenas as fontes selecionadas e o conteúdo exato indicado.",
    materialMatch,
    materialMatchLabel: studyMaterialMatchLabel(materialMatch),
    environmentInstructions: [
      `Abra o notebook “${capability.notebookName}”.`,
      `Modo: ${capability.notebookConfiguration.conversationMode}.`,
      `Tamanho: ${capability.notebookConfiguration.responseLength}.`,
      "Selecione somente as fontes listadas neste pacote e desmarque as fontes indicadas.",
      `Pesquisa web: ${capability.notebookConfiguration.webSearchAllowed ? "permitida" : "não usar"}.`,
      `Análise de dados: ${capability.notebookConfiguration.dataAnalysisAllowed ? "permitida" : "não usar"}.`,
    ],
    selectedSources: sources,
    sourcesToDisable: capability.sourcesToDisableByDefault,
    prompt: notebookPrompt({ input, sources, boundary, material }),
    completionCriterion: input.completionCriterion,
    resultCapture,
    returnInstructions: `Após concluir, volte ao ConcurseiroOS e registre ${resultCapture.fields.join(", ")}.`,
    confidence: materialMatch === "EXACT_SUBTOPIC" ? "HIGH" : "MEDIUM",
    limitations: [boundary, ...capability.limitations, ...(capability.notebookUrl ? [] : ["O URL do notebook não está cadastrado; abra-o manualmente pelo nome informado."])],
    notebook: {
      name: capability.notebookName,
      url: capability.notebookUrl,
      status: capability.notebookStatus,
      mode: capability.notebookConfiguration.conversationMode,
      responseLength: capability.notebookConfiguration.responseLength,
      webSearchAllowed: capability.notebookConfiguration.webSearchAllowed,
      dataAnalysisAllowed: capability.notebookConfiguration.dataAnalysisAllowed,
      fgvEvidenceStatus: capability.fgvEvidenceStatus,
      fgvStyleTeaching: capability.fgvStyleTeaching,
      fgvEvidenceBoundary: boundary,
    },
  };
  return packet;
}

function internalPacket(params: {
  input: StudyExecutionGateInput;
  method: string;
  environment: "internal_material" | "guided_session" | "simulation" | "treino_fgv";
  materialMatch: StudyExecutionMaterialMatch;
  material: StudyExecutionMaterialCandidate | null;
}): StudyExecutionPacket {
  const { input, method, environment, materialMatch, material } = params;
  const resultCapture = resultCaptureFor(method);
  const isTreino = environment === "treino_fgv";
  const isSimulation = environment === "simulation";
  const steps = isTreino
    ? [
        `Abra o Treino FGV e filtre Banco de Dados${input.subtopicName ? `, subassunto “${input.subtopicName}”` : ""}.`,
        `Execute ${input.targetQuestions ?? "o lote prescrito"} questão(ões) em ${input.durationMinutes} minutos.`,
        "Use a correção segura do próprio treino e finalize o histórico.",
      ]
    : isSimulation
      ? [
          `Abra o ambiente de simulação e configure o recorte “${input.topicName}${input.subtopicName ? ` — ${input.subtopicName}` : ""}”.`,
          `Respeite o limite de ${input.durationMinutes} minutos e registre somente o resultado real.`,
        ]
      : environment === "internal_material"
        ? [
            `Abra o material “${material?.materialTitle ?? "material interno aprovado"}”.`,
            `Estude somente “${material?.sectionTitle ?? input.subtopicName ?? input.topicName}”${material?.startPage && material.endPage ? `, páginas ${material.startPage}–${material.endPage}` : ""}.`,
            "Execute recuperação ativa antes de consultar novamente.",
          ]
        : [
            `Abra a Sessão guiada com o recorte “${input.topicName}${input.subtopicName ? ` — ${input.subtopicName}` : ""}”.`,
            `Siga o método ${method} durante ${input.durationMinutes} minutos e produza o resultado observável descrito.`,
          ];
  return {
    executionId: stableId(input, environment, method),
    disciplineId: input.disciplineId,
    topicId: input.topicId,
    subtopicId: input.subtopicId ?? null,
    method,
    environment,
    durationMinutes: input.durationMinutes,
    objective: input.objective,
    contentScope: exactContent(input, material),
    materialId: material?.materialId ?? null,
    materialTitle: material?.materialTitle ?? null,
    sectionsOrPages: material?.startPage && material?.endPage
      ? `Páginas ${material.startPage}–${material.endPage}`
      : "Páginas não disponíveis ou não aplicáveis; o limite é o conteúdo exato indicado.",
    materialMatch,
    materialMatchLabel: studyMaterialMatchLabel(materialMatch),
    environmentInstructions: steps,
    selectedSources: isTreino ? ["Treino FGV — Banco de Dados"] : material ? [material.materialTitle] : ["Sessão guiada do ConcurseiroOS"],
    sourcesToDisable: [],
    prompt: [
      `Atividade: ${method}.`,
      `Conteúdo: ${exactContent(input, material)}.`,
      `Objetivo: ${input.objective}`,
      `Duração: ${input.durationMinutes} minutos.`,
      `Critério de conclusão: ${input.completionCriterion}`,
      `Ao terminar, registre: ${resultCapture.fields.join(", ")}.`,
    ].join("\n"),
    completionCriterion: input.completionCriterion,
    resultCapture,
    returnInstructions: `Após concluir, volte ao ConcurseiroOS e abra “${resultCapture.routeHint}” para registrar ${resultCapture.fields.join(", ")}.`,
    confidence: materialMatch === "EXACT_SUBTOPIC" || isTreino ? "HIGH" : "MEDIUM",
    limitations: environment === "guided_session" ? ["A sessão não inventa material ou conteúdo externo; use apenas o recorte da taxonomia e evidências já disponíveis."] : [],
    ...(isTreino ? {
      questionFilters: {
        source: "Treino FGV",
        examiningBoard: "FGV",
        discipline: input.disciplineName,
        topic: input.topicName,
        subtopic: input.subtopicName ?? null,
        years: null,
        excludeAnnulled: true,
        excludeOutdated: true,
        consultationAllowed: false,
        targetQuestions: input.targetQuestions ?? null,
      },
    } : {}),
  };
}

function blocked(input: StudyExecutionGateInput, reasons: StudyExecutionBlockReason[], materialMatch: StudyExecutionMaterialMatch, requestedEnvironment: StudyExecutionEnvironment): StudyExecutionGateResult {
  const explanation = reasons.map((reason) => {
    switch (reason) {
      case "NO_CONFIGURED_NOTEBOOK": return "Não existe notebook configurado para este assunto.";
      case "NO_APPROVED_SOURCE": return "Não há fonte aprovada que cubra o conteúdo prescrito.";
      case "NO_MATCHING_MATERIAL": return "Não há material correspondente ao assunto ou subassunto.";
      case "NO_RESULT_CAPTURE": return "Não existe forma válida de registrar o resultado.";
      case "ENVIRONMENT_UNAVAILABLE": return "O ambiente solicitado não está disponível.";
      case "MATERIAL_INCOMPATIBLE": return "O material localizado é incompatível com o assunto prescrito.";
      case "MISSING_CONTENT_SCOPE": return "O conteúdo exato não foi definido.";
      case "MISSING_COMPLETION_CRITERION": return "O critério de conclusão não foi definido.";
      case "INVALID_DURATION": return "A duração precisa ser um número positivo.";
    }
  }).join(" ");
  return {
    executionStatus: "BLOCKED_NO_EXECUTABLE_PATH",
    packet: null,
    requestedMethod: input.requestedMethod,
    effectiveMethod: null,
    requestedEnvironment,
    effectiveEnvironment: null,
    methodChanged: false,
    methodChangeReason: null,
    blockedReasons: [...new Set(reasons)],
    materialMatch,
    blockedCandidate: {
      disciplineId: input.disciplineId,
      topicId: input.topicId,
      subtopicId: input.subtopicId ?? null,
      requestedMethod: input.requestedMethod,
      requestedEnvironment,
      reasons: [...new Set(reasons)],
      explanation,
    },
  };
}

function ready(input: StudyExecutionGateInput, packet: StudyExecutionPacket, requestedEnvironment: StudyExecutionEnvironment, effectiveMethod: string, reason: string | null): StudyExecutionGateResult {
  return {
    executionStatus: "READY",
    packet,
    requestedMethod: input.requestedMethod,
    effectiveMethod,
    requestedEnvironment,
    effectiveEnvironment: packet.environment,
    methodChanged: effectiveMethod !== input.requestedMethod || packet.environment !== requestedEnvironment,
    methodChangeReason: reason,
    blockedReasons: [],
    materialMatch: packet.materialMatch,
  };
}

export function executionReadinessGate(input: StudyExecutionGateInput): StudyExecutionGateResult {
  const requestedEnvironment = input.requestedEnvironment ?? preferredEnvironment(input.requestedMethod);
  const capability = resolveStudyExecutionCapability(input.disciplineId, input.topicId, studyExecutionRegistry);
  const material = input.material ? toStudyExecutionMaterialCandidate(input.material) : null;
  const materialMatch = assessStudyMaterialMatch({
    disciplineId: input.disciplineId,
    topicId: input.topicId,
    subtopicId: input.subtopicId,
    candidate: material,
    materialCatalog: input.materialCatalog,
  });
  const baseReasons: StudyExecutionBlockReason[] = [];
  if (!input.topicName.trim() && !input.subtopicName?.trim()) baseReasons.push("MISSING_CONTENT_SCOPE");
  if (!input.completionCriterion.trim()) baseReasons.push("MISSING_COMPLETION_CRITERION");
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) baseReasons.push("INVALID_DURATION");
  if (materialMatch === "INCOMPATIBLE") baseReasons.push("MATERIAL_INCOMPATIBLE");
  const fatalReasons = baseReasons.filter((reason) => reason !== "MATERIAL_INCOMPATIBLE");
  if (fatalReasons.length > 0) return blocked(input, baseReasons, materialMatch, requestedEnvironment);

  const buildNotebook = (method: string) => notebookPacket({ input, method, materialMatch, material: materialMatch === "INCOMPATIBLE" ? null : material });
  const buildInternal = (method: string) => {
    if (!material || !["EXACT_SUBTOPIC", "EXACT_TOPIC"].includes(materialMatch)) return null;
    return internalPacket({ input, method, environment: "internal_material", materialMatch, material });
  };

  if (requestedEnvironment === "notebooklm") {
    const packet = buildNotebook(input.requestedMethod);
    if (packet) return ready(input, packet, requestedEnvironment, input.requestedMethod, null);
    if (input.allowMethodFallback !== false) {
      const internal = buildInternal(input.requestedMethod === "theory_notebooklm" ? "guided_reading" : input.requestedMethod);
      if (internal) return ready(input, internal, requestedEnvironment, internal.method, "NotebookLM indisponível; usado material interno tematicamente correspondente.");
    }
    const reasons: StudyExecutionBlockReason[] = [];
    if (!notebookIsReady(capability.notebookStatus)) reasons.push("NO_CONFIGURED_NOTEBOOK");
    if (capability.approvedSources.length === 0) reasons.push("NO_APPROVED_SOURCE");
    if (!material || ["UNVERIFIED", "INCOMPATIBLE", "DISCIPLINE_LEVEL"].includes(materialMatch)) reasons.push(materialMatch === "INCOMPATIBLE" ? "MATERIAL_INCOMPATIBLE" : "NO_MATCHING_MATERIAL");
    return blocked(input, [...baseReasons, ...reasons], materialMatch, requestedEnvironment);
  }

  if (requestedEnvironment === "internal_material") {
    const packet = buildInternal(input.requestedMethod);
    if (packet) return ready(input, packet, requestedEnvironment, input.requestedMethod, null);
    if (input.allowMethodFallback !== false && THEORY_METHODS.has(input.requestedMethod)) {
      const notebook = buildNotebook("theory_notebooklm");
      if (notebook) return ready(input, notebook, requestedEnvironment, "theory_notebooklm", "Material interno indisponível; usado NotebookLM configurado com fontes aprovadas.");
    }
    return blocked(input, [...baseReasons, materialMatch === "INCOMPATIBLE" ? "MATERIAL_INCOMPATIBLE" : "NO_MATCHING_MATERIAL"], materialMatch, requestedEnvironment);
  }

  if (requestedEnvironment === "treino_fgv") {
    if (capability.environments.includes("treino_fgv") && input.topicId === "dp26-p3-esp-banco-dados") {
      const packet = internalPacket({ input, method: input.requestedMethod, environment: "treino_fgv", materialMatch, material: null });
      return ready(input, packet, requestedEnvironment, input.requestedMethod, null);
    }
    if (input.allowMethodFallback !== false && QUESTION_METHODS.has(input.requestedMethod)) {
      const packet = qconcursosPacket({ input, method: input.requestedMethod, environment: "qconcursos", materialMatch, material: null });
      return ready(input, packet, requestedEnvironment, input.requestedMethod, "Treino FGV indisponível para este assunto; usado QConcursos com filtros estruturados.");
    }
    return blocked(input, [...baseReasons, "ENVIRONMENT_UNAVAILABLE"], materialMatch, requestedEnvironment);
  }

  if (requestedEnvironment === "qconcursos") {
    const globalAvailable = studyExecutionRegistry.globalEnvironments.some((item) => item.environment === "qconcursos" && item.status !== "UNAVAILABLE");
    if (!globalAvailable) return blocked(input, [...baseReasons, "ENVIRONMENT_UNAVAILABLE"], materialMatch, requestedEnvironment);
    const packet = qconcursosPacket({ input, method: input.requestedMethod, environment: "qconcursos", materialMatch, material: null });
    return ready(input, packet, requestedEnvironment, input.requestedMethod, null);
  }

  if (requestedEnvironment === "simulation") {
    const packet = internalPacket({ input, method: input.requestedMethod, environment: "simulation", materialMatch, material: null });
    return ready(input, packet, requestedEnvironment, input.requestedMethod, null);
  }

  if (requestedEnvironment === "guided_session") {
    if (THEORY_METHODS.has(input.requestedMethod)) {
      if (input.allowMethodFallback !== false) {
        const internal = buildInternal(input.requestedMethod === "theory_notebooklm" ? "guided_reading" : input.requestedMethod);
        if (internal) return ready(input, internal, requestedEnvironment, internal.method, "Sessão guiada sem fonte teórica suficiente; usado material interno correspondente.");
        const notebook = buildNotebook("theory_notebooklm");
        if (notebook) return ready(input, notebook, requestedEnvironment, "theory_notebooklm", "Sessão guiada sem material interno; usado NotebookLM configurado com fontes aprovadas.");
      }
      return blocked(input, [...baseReasons, "NO_MATCHING_MATERIAL", ...(notebookIsReady(capability.notebookStatus) ? [] : ["NO_CONFIGURED_NOTEBOOK" as const])], materialMatch, requestedEnvironment);
    }
    const packet = internalPacket({ input, method: input.requestedMethod, environment: "guided_session", materialMatch, material: materialMatch === "INCOMPATIBLE" ? null : material });
    return ready(input, packet, requestedEnvironment, input.requestedMethod, null);
  }

  if (requestedEnvironment === "manual_external") {
    return blocked(input, [...baseReasons, "NO_APPROVED_SOURCE"], materialMatch, requestedEnvironment);
  }

  return blocked(input, [...baseReasons, "ENVIRONMENT_UNAVAILABLE"], materialMatch, requestedEnvironment);
}
