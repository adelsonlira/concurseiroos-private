import { routePrivateStudyMaterial } from "../materials/materialPolicy";
import type { MaterialLocatorRecommendation } from "../materials/types";
import { buildExternalQuestionSourcePlan } from "../questions/externalQuestionBanks";
import { INITIAL_DIAGNOSTIC_POLICY } from "../diagnostic/diagnosticPlacement";
import type { StudyActivityType, StudySession } from "../sde/planner/plannerTypes";
import { getPlannerActionId } from "../sde/planner/blockBuilder";
import type { StrategicAction } from "../sde/prioritization/types";
import { buildStudyFocusGuide } from "./studyFocusGuide";
import type {
  DailyStudyPrescription,
  DailyStudyPrescriptionInput,
  ExecutableStudyPrescription,
  PrescriptionConfidence,
  PrescriptionDecisionReliability,
  PrescriptionExecutionReadiness,
  QuestionAttemptPaceSample,
  QuestionPaceSource,
  QuestionPracticePrescription
} from "./types";

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function validSamples(samples: readonly QuestionAttemptPaceSample[]): QuestionAttemptPaceSample[] {
  return samples.filter(
    (sample) => Number.isFinite(sample.seconds) && sample.seconds > 0
  );
}

function confidenceForSampleSize(
  sampleSize: number,
  input: DailyStudyPrescriptionInput
): PrescriptionConfidence {
  if (sampleSize >= input.questionPolicy.highConfidenceSamples) return "HIGH";
  if (sampleSize >= input.questionPolicy.mediumConfidenceSamples) return "MEDIUM";
  return "LOW";
}

function selectObservedPace(
  session: StudySession,
  input: DailyStudyPrescriptionInput
): {
  seconds: number;
  source: QuestionPaceSource;
  sampleSize: number;
  confidence: PrescriptionConfidence;
} | null {
  const samples = validSamples(input.attempts);
  const candidates: Array<{
    source: QuestionPaceSource;
    items: QuestionAttemptPaceSample[];
  }> = [];

  if (session.subassuntoId) {
    candidates.push({
      source: "CANDIDATE_SUBTOPIC_MEDIAN",
      items: samples.filter((sample) => sample.subtopicId === session.subassuntoId)
    });
  }
  candidates.push({
    source: "CANDIDATE_TOPIC_MEDIAN",
    items: samples.filter((sample) => sample.topicId === session.assuntoId)
  });
  candidates.push({
    source: "CANDIDATE_DISCIPLINE_MEDIAN",
    items: samples.filter((sample) => sample.disciplineId === session.disciplinaId)
  });

  const selected = candidates.find(
    (candidate) => candidate.items.length >= input.questionPolicy.minimumObservedSamples
  );
  if (!selected) return null;

  return {
    seconds: Math.max(1, Math.round(median(selected.items.map((item) => item.seconds)))),
    source: selected.source,
    sampleSize: selected.items.length,
    confidence: confidenceForSampleSize(selected.items.length, input)
  };
}

function buildQuestionPractice(
  session: StudySession,
  input: DailyStudyPrescriptionInput,
  material: MaterialLocatorRecommendation | null,
  diagnosticPurpose: boolean
): QuestionPracticePrescription | null {
  if (session.tipo !== "questoes") return null;

  const practiceMinutes = session.passosExecucao
    .filter((step) => step.phase === "QUESTION_PRACTICE")
    .reduce((sum, step) => sum + step.tempoMinutos, 0);
  const correctionMinutes = session.passosExecucao
    .filter((step) => step.phase === "CORRECTION" || step.phase === "RETRY")
    .reduce((sum, step) => sum + step.tempoMinutos, 0);
  if (practiceMinutes <= 0) return null;

  const observed = selectObservedPace(session, input);
  const officialGrossPace = Math.max(
    1,
    Math.round((input.examPacing.durationMinutes * 60) / input.examPacing.totalQuestions)
  );
  const paceSecondsPerQuestion = observed?.seconds ?? officialGrossPace;
  const calculatedTarget = Math.max(
    1,
    Math.floor((practiceMinutes * 60) / paceSecondsPerQuestion)
  );
  const targetQuestions = diagnosticPurpose
    ? Math.max(calculatedTarget, input.questionPolicy.diagnosticMinimumQuestions)
    : calculatedTarget;
  const stretchTargetQuestions = targetQuestions + input.questionPolicy.stretchQuestions;

  const rationale = observed
    ? `Alvo calculado pela mediana de ${observed.sampleSize} tentativa(s) reais no recorte mais específico disponível. A prova oficial permite, em média bruta, ${officialGrossPace} segundos por questão.`
    : `Ainda não há amostra mínima do candidato. O alvo usa a média bruta oficial de ${officialGrossPace} segundos por questão, derivada de ${input.examPacing.totalQuestions} questões em ${input.examPacing.durationMinutes} minutos.`;

  return {
    targetQuestions,
    stretchTargetQuestions,
    practiceMinutes,
    correctionMinutes,
    paceSecondsPerQuestion,
    paceSource: observed?.source ?? "OFFICIAL_EXAM_GROSS_PACE",
    sampleSize: observed?.sampleSize ?? 0,
    confidence: observed?.confidence ?? "LOW",
    rationale,
    externalSourcePlan: buildExternalQuestionSourcePlan({
      availableBanks: input.externalQuestionBanks,
      material,
      banca: input.banca,
      disciplineName: session.disciplinaNome,
      topicName: session.assuntoNome,
      subtopicName: session.subassuntoNome,
      targetQuestions,
      diagnosticPurpose
    })
  };
}

function completionEvidenceFor(activity: StudyActivityType): string[] {
  switch (activity) {
    case "teoria":
      return [
        "Registrar os conceitos recuperados sem consulta e as dúvidas restantes.",
        "Confirmar cobertura teórica somente quando o subassunto tiver sido realmente concluído."
      ];
    case "questoes":
      return [
        "Registrar quantidade, acertos, erros, tempo e confiança.",
        "Classificar a causa de cada erro e refazer o raciocínio sem olhar a solução."
      ];
    case "revisao":
      return [
        "Registrar o que foi recuperado antes da consulta.",
        "Marcar as lacunas que exigiram ajuda ou reaprendizagem."
      ];
    case "flashcards":
      return [
        "Responder antes de revelar a resposta.",
        "Registrar lembrança, erro e dificuldade observada."
      ];
    case "simulado":
      return [
        "Registrar gabarito, tempo total, itens em branco e erros.",
        "Classificar o desempenho por disciplina e assunto."
      ];
  }
}

function buildDecisionReliability(action: StrategicAction): PrescriptionDecisionReliability {
  const mode = action.diagnosticPurpose === true
    ? "DIAGNOSTIC"
    : action.decisionEvidence.knowledgeState === "UNSEEN"
      ? "FIRST_CONTACT"
      : "EVIDENCE_SUPPORTED";
  const caveats: string[] = [];
  if (action.decisionEvidence.historicalIncidenceSource === "UNAVAILABLE") {
    caveats.push("A incidência histórica FGV permanece em shadow mode e não influenciou esta decisão.");
  }
  if (action.marginalReturnEstimate?.status !== "CALCULATED") {
    caveats.push("O ganho causal de pontos por hora ainda não foi estimado com dados prospectivos.");
  }
  return {
    level: action.decisionEvidence.confidenceLevel,
    mode,
    historicalIncidenceUsed: action.decisionEvidence.historicalIncidenceSource === "EMPIRICAL",
    missingData: [...new Set(action.justificativaXAI.dadosAusentes)],
    caveats
  };
}

function buildExecutionReadiness(params: {
  activity: StudyActivityType;
  material: MaterialLocatorRecommendation | null;
  questionPractice: QuestionPracticePrescription | null;
}): PrescriptionExecutionReadiness {
  if (params.activity === "questoes") {
    if (params.questionPractice?.externalSourcePlan || params.material) {
      return { status: "READY", reason: "Fonte de questões identificada para execução.", requiredResource: "NONE" };
    }
    return {
      status: "READY_WITH_FALLBACK",
      reason: "O alvo de questões está definido, mas nenhuma fonte executável foi localizada; use Qconcursos ou Estratégia Questões com os filtros prescritos.",
      requiredResource: "QUESTION_SOURCE"
    };
  }
  if ((params.activity === "teoria" || params.activity === "revisao") && !params.material) {
    return {
      status: "READY_WITH_FALLBACK",
      reason: "A decisão pedagógica está válida, mas falta um localizador de material; use o material principal da disciplina e registre o trecho efetivamente estudado.",
      requiredResource: "MATERIAL"
    };
  }
  return { status: "READY", reason: "Todos os recursos obrigatórios para esta sessão estão disponíveis.", requiredResource: "NONE" };
}

function buildPrescriptionForSession(
  session: StudySession,
  action: StrategicAction,
  input: DailyStudyPrescriptionInput
): ExecutableStudyPrescription {
  const material = routePrivateStudyMaterial(input.materialCatalog, {
    concursoId: input.concursoId,
    activity: session.tipo as StudyActivityType,
    diagnosticPurpose: action.diagnosticPurpose === true,
    disciplineId: session.disciplinaId,
    topicId: session.assuntoId,
    subtopicId: session.subassuntoId
  });

  const diagnosticTheoryMaterial = action.diagnosticPurpose
    ? routePrivateStudyMaterial(input.materialCatalog, {
        concursoId: input.concursoId,
        activity: "teoria",
        disciplineId: session.disciplinaId,
        topicId: session.assuntoId,
        subtopicId: session.subassuntoId
      })
    : null;

  const questionPractice = buildQuestionPractice(
    session,
    input,
    material,
    action.diagnosticPurpose === true
  );

  return {
    id: `prescription-${session.id}`,
    sessionId: session.id,
    sequence: session.sequencia,
    activity: session.tipo as StudyActivityType,
    durationMinutes: session.tempoMinutos,
    disciplineId: session.disciplinaId,
    disciplineName: session.disciplinaNome,
    topicId: session.assuntoId,
    topicName: session.assuntoNome,
    subtopicId: session.subassuntoId,
    subtopicName: session.subassuntoNome,
    actionId: session.actionId!,
    strategicPriority: action.prioridade,
    sourceScore: action.score,
    reasonCode: action.reasonCode,
    diagnosticPurpose: action.diagnosticPurpose === true,
    diagnosticFollowUp: action.diagnosticPurpose
      ? {
          minimumQuestions: INITIAL_DIAGNOSTIC_POLICY.minimumQuestions,
          minimumHitRatePercent: Math.round(
            INITIAL_DIAGNOSTIC_POLICY.theoryBypassHitRate * 100
          ),
          onPass:
            "A teoria integral fica adiada provisoriamente. O Coach mantém prática e revisão para confirmar retenção; qualquer regressão pode reabrir a teoria.",
          onFail: diagnosticTheoryMaterial
            ? `O Coach abre teoria ativa em “${diagnosticTheoryMaterial.sectionTitle}”, páginas ${diagnosticTheoryMaterial.startPage}–${diagnosticTheoryMaterial.endPage}, antes de uma nova bateria.`
            : "O Coach abre uma sessão de teoria ativa no material principal do assunto antes de uma nova bateria.",
          theoryMaterial: diagnosticTheoryMaterial
        }
      : null,
    whyNow: action.justificativaXAI.porQue,
    confidence: action.justificativaXAI.nivelConfianca,
    objectives: session.objetivos.map((objective) => ({ ...objective })),
    executionSteps: session.passosExecucao.map((step) => ({ ...step })),
    focusGuide: buildStudyFocusGuide({
      activity: session.tipo as StudyActivityType,
      topicId: session.assuntoId,
      topicName: session.assuntoNome,
      subtopicId: session.subassuntoId,
      subtopicName: session.subassuntoNome,
      siblingSubtopicNames: input.siblingSubtopicNamesByTopic?.[session.assuntoId] ?? [],
      diagnosticPurpose: action.diagnosticPurpose === true,
      reasonCode: action.reasonCode,
      guidance: input.studyGuidance ?? null
    }),
    material,
    questionPractice,
    completionEvidence: completionEvidenceFor(session.tipo as StudyActivityType),
    decisionReliability: buildDecisionReliability(action),
    executionReadiness: buildExecutionReadiness({
      activity: session.tipo as StudyActivityType,
      material,
      questionPractice
    }),
    nextAction: {
      afterCompletion: "Registre as evidências de conclusão. O SDE invalidará a prescrição atual e recalculará a próxima ação com os novos dados.",
      preview: null
    }
  };
}

export function buildDailyStudyPrescription(
  input: DailyStudyPrescriptionInput
): DailyStudyPrescription {
  if (input.examPacing.durationMinutes <= 0 || input.examPacing.totalQuestions <= 0) {
    throw new Error("A duração e a quantidade oficial de questões devem ser positivas.");
  }
  if (input.questionPolicy.minimumObservedSamples <= 0) {
    throw new Error("minimumObservedSamples deve ser positivo.");
  }
  if (input.questionPolicy.stretchQuestions < 0) {
    throw new Error("stretchQuestions não pode ser negativo.");
  }
  if (input.questionPolicy.diagnosticMinimumQuestions <= 0) {
    throw new Error("diagnosticMinimumQuestions deve ser positivo.");
  }
  if (input.planner?.status !== "SUCCESS") {
    return {
      status: "NO_EXECUTABLE_SESSION",
      referenceDate: input.referenceDate,
      current: null,
      upcoming: [],
      warnings: ["O planner não produziu uma sessão executável para esta data."]
    };
  }

  const actionById = new Map(
    input.actions.map((action) => [getPlannerActionId(action), action] as const)
  );
  const studySessions = input.planner.plan.blocos
    .flatMap((block) => block.sessões)
    .filter(
      (session): session is StudySession & { tipo: StudyActivityType; actionId: string } =>
        session.tipo !== "descanso" && Boolean(session.actionId)
    );

  const prescriptions = studySessions.flatMap((session) => {
    const action = actionById.get(session.actionId);
    if (!action) return [];
    return [buildPrescriptionForSession(session, action, input)];
  });

  if (prescriptions.length === 0) {
    return {
      status: "NO_EXECUTABLE_SESSION",
      referenceDate: input.referenceDate,
      current: null,
      upcoming: [],
      warnings: ["As sessões do planner não puderam ser ligadas às ações estratégicas de origem."]
    };
  }

  const prescriptionsWithNextAction = prescriptions.map((prescription, index) => {
    const next = prescriptions[index + 1];
    return {
      ...prescription,
      nextAction: {
        ...prescription.nextAction,
        preview: next
          ? `${next.activity}: ${next.topicName}${next.subtopicName ? ` · ${next.subtopicName}` : ""} (${next.durationMinutes} min)`
          : null
      }
    };
  });

  const maxUpcoming = Math.max(0, input.maxUpcomingSessions ?? 2);
  const warnings = prescriptionsWithNextAction.flatMap((prescription) =>
    prescription.material
      ? []
      : [`Não há material mapeado com confiança suficiente para ${prescription.topicName}${prescription.subtopicName ? ` · ${prescription.subtopicName}` : ""}.`]
  );

  return {
    status: "READY",
    referenceDate: input.referenceDate,
    current: prescriptionsWithNextAction[0],
    upcoming: prescriptionsWithNextAction.slice(1, maxUpcoming + 1),
    warnings: [...new Set(warnings)]
  };
}
