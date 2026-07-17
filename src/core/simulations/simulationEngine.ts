import type { CompetitionConfigurationPackage } from "../../config/concursos/types";
import {
  SIMULATION_POLICY_VERSION,
  type SimulationAnalysis,
  type SimulationBlueprint,
  type SimulationComparison,
  type SimulationCompositionRequest,
  type SimulationCorrectionAction,
  type SimulationDisciplineAnalysis,
  type SimulationDisciplinePlan,
  type SimulationDisciplineResult,
  type SimulationPlan,
  type SimulationQuestionReference,
} from "./types";

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} deve ser um inteiro positivo.`);
  }
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildSimulationBlueprint(
  competition: CompetitionConfigurationPackage,
): SimulationBlueprint {
  const disciplines = competition.sde.disciplinas.map((discipline) => {
    const questionCount = competition.sde.edital.quantidadeQuestoesProva[discipline.id];
    const pointsPerQuestion = competition.sde.edital.pontosPorQuestao[discipline.id];
    assertPositiveInteger(questionCount, `Quantidade oficial de ${discipline.nome}`);
    if (!Number.isFinite(pointsPerQuestion) || pointsPerQuestion <= 0) {
      throw new Error(`Pontuação oficial inválida para ${discipline.nome}.`);
    }
    return {
      disciplineId: discipline.id,
      disciplineName: discipline.nome,
      questionCount,
      pointsPerQuestion,
      maximumPoints: questionCount * pointsPerQuestion,
    };
  });

  const totalQuestions = disciplines.reduce((sum, item) => sum + item.questionCount, 0);
  const maximumPoints = disciplines.reduce((sum, item) => sum + item.maximumPoints, 0);

  if (totalQuestions !== competition.officialRules.totalQuestions) {
    throw new Error("A composição por disciplina diverge do total oficial de questões.");
  }
  if (maximumPoints !== competition.officialRules.maximumPoints) {
    throw new Error("A composição por disciplina diverge da pontuação máxima oficial.");
  }

  return {
    competitionId: competition.id,
    competitionName: competition.concursoName,
    version: `${competition.version}-simulation-blueprint-v1`,
    officialDocument: competition.officialDocument,
    examDurationMinutes: competition.officialRules.durationMinutes,
    totalQuestions,
    maximumPoints,
    minimumTotalPoints: competition.officialRules.minimumTotalPoints,
    eliminatesOnZeroDiscipline: competition.officialRules.eliminatesOnZeroDiscipline,
    disciplines,
  };
}

function eligibleLocalQuestions(
  references: SimulationQuestionReference[],
  disciplineId: string,
): SimulationQuestionReference[] {
  return references
    .filter(
      (item) =>
        item.disciplineId === disciplineId &&
        Boolean(item.sourceDocumentId) &&
        item.hasOfficialAnswer &&
        !item.isCustomQuestion,
    )
    .sort((left, right) => left.questionId.localeCompare(right.questionId));
}

function deterministicallySelectQuestions(
  references: SimulationQuestionReference[],
  count: number,
  seed: string,
): string[] {
  return [...references]
    .sort((left, right) => {
      const leftHash = stableHash(`${seed}:${left.questionId}`);
      const rightHash = stableHash(`${seed}:${right.questionId}`);
      return leftHash - rightHash || left.questionId.localeCompare(right.questionId);
    })
    .slice(0, count)
    .map((item) => item.questionId);
}

export function composeSimulationPlan(
  blueprint: SimulationBlueprint,
  request: SimulationCompositionRequest,
): SimulationPlan {
  if (!request.source.id.trim() || !request.source.label.trim() || !request.source.reference.trim()) {
    throw new Error("A fonte do simulado deve possuir identificador, nome e referência auditável.");
  }

  const selectedIds =
    request.kind === "FULL"
      ? blueprint.disciplines.map((item) => item.disciplineId)
      : [...new Set(request.selectedDisciplineIds ?? [])];

  if (selectedIds.length === 0) {
    throw new Error("O simulado parcial exige pelo menos uma disciplina.");
  }

  const unknownIds = selectedIds.filter(
    (disciplineId) => !blueprint.disciplines.some((item) => item.disciplineId === disciplineId),
  );
  if (unknownIds.length > 0) {
    throw new Error(`Disciplina fora do edital: ${unknownIds.join(", ")}.`);
  }

  const deterministicSeed = request.deterministicSeed?.trim() || `${blueprint.version}:${request.source.id}`;
  const disciplines: SimulationDisciplinePlan[] = blueprint.disciplines
    .filter((item) => selectedIds.includes(item.disciplineId))
    .map((item) => {
      if (request.source.kind === "LOCAL_IDENTIFIED_QUESTIONS") {
        const eligible = eligibleLocalQuestions(request.availableQuestions ?? [], item.disciplineId);
        if (eligible.length < item.questionCount) {
          throw new Error(
            `${item.disciplineName}: existem ${eligible.length} questões locais elegíveis, mas a composição oficial exige ${item.questionCount}.`,
          );
        }
        return {
          ...item,
          questionIds: deterministicallySelectQuestions(
            eligible,
            item.questionCount,
            `${deterministicSeed}:${item.disciplineId}`,
          ),
          sourceInstruction: `Usar somente as questões selecionadas com documento de origem e gabarito oficial identificados.`,
        };
      }

      return {
        ...item,
        questionIds: [],
        sourceInstruction: `Na fonte ${request.source.label}, filtrar banca FGV, concurso/área compatível e a disciplina “${item.disciplineName}”; responder ${item.questionCount} questões sem consulta.`,
      };
    });

  const totalQuestions = disciplines.reduce((sum, item) => sum + item.questionCount, 0);
  const maximumPoints = disciplines.reduce((sum, item) => sum + item.maximumPoints, 0);
  const durationMinutes =
    request.kind === "FULL"
      ? blueprint.examDurationMinutes
      : Math.ceil((blueprint.examDurationMinutes * totalQuestions) / blueprint.totalQuestions);

  return {
    policyVersion: SIMULATION_POLICY_VERSION,
    blueprintVersion: blueprint.version,
    competitionId: blueprint.competitionId,
    competitionName: blueprint.competitionName,
    kind: request.kind,
    source: request.source,
    officialDocument: blueprint.officialDocument,
    durationMinutes,
    totalQuestions,
    maximumPoints,
    minimumTotalPoints: blueprint.minimumTotalPoints,
    eliminatesOnZeroDiscipline: blueprint.eliminatesOnZeroDiscipline,
    disciplines,
    guardrails: [
      "Nenhuma questão, alternativa ou gabarito é gerado pelo ConcurseiroOS ou pelo Gemini.",
      "A fonte deve permanecer identificada no registro do simulado.",
      "Resultados agregados por disciplina não criam classificação temática nem incidência histórica.",
      "O plano de correção não altera diretamente o ranking do SDE.",
    ],
  };
}

function validateDisciplineResult(
  plan: SimulationDisciplinePlan,
  result: SimulationDisciplineResult | undefined,
): SimulationDisciplineResult {
  if (!result) throw new Error(`Resultado ausente para ${plan.disciplineName}.`);
  for (const [label, value] of [
    ["acertos", result.correct],
    ["erros", result.wrong],
    ["brancos", result.blank],
    ["tempo", result.elapsedSeconds],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${plan.disciplineName}: ${label} deve ser inteiro não negativo.`);
    }
  }
  if (result.correct + result.wrong + result.blank !== plan.questionCount) {
    throw new Error(
      `${plan.disciplineName}: acertos, erros e brancos devem totalizar ${plan.questionCount}.`,
    );
  }
  return result;
}

function buildCorrectionPlan(
  disciplines: SimulationDisciplineAnalysis[],
): SimulationCorrectionAction[] {
  return disciplines
    .filter((item) => item.wrong > 0 || item.blank > 0)
    .sort((left, right) => {
      if (left.zeroScoreRisk !== right.zeroScoreRisk) return left.zeroScoreRisk ? -1 : 1;
      if ((left.blank > 0) !== (right.blank > 0)) return left.blank > 0 ? -1 : 1;
      return right.missedPoints - left.missedPoints || left.disciplineName.localeCompare(right.disciplineName);
    })
    .map((item, index) => ({
      order: index + 1,
      disciplineId: item.disciplineId,
      disciplineName: item.disciplineName,
      priority: item.zeroScoreRisk
        ? "ZERO_SCORE_RISK"
        : item.blank > 0
          ? "BLANKS"
          : "MISSED_POINTS",
      reason: item.zeroScoreRisk
        ? "A disciplina terminou sem ponto e acionaria a regra eliminatória em uma prova completa equivalente."
        : item.blank > 0
          ? `${item.blank} questão(ões) ficaram em branco; separar falta de tempo, dúvida e desconhecimento antes da correção.`
          : `${item.missedPoints} ponto(s) oficiais deixaram de ser obtidos nesta disciplina.`,
      instructions: [
        "Identificar a fonte e classificar cada erro ou branco pelo subassunto real antes de registrar evidência.",
        "Confirmar a causa predominante sem pedir que a IA a invente.",
        "Corrigir na fonte identificada e registrar uma regra preventiva curta.",
        "Refazer itens equivalentes sem consulta; o SDE só recebe evidência quando houver subassunto identificado.",
      ],
    }));
}

export function analyzeSimulation(
  plan: SimulationPlan,
  results: SimulationDisciplineResult[],
): SimulationAnalysis {
  const byDiscipline = new Map(results.map((item) => [item.disciplineId, item]));
  if (byDiscipline.size !== results.length) {
    throw new Error("Há resultados duplicados para a mesma disciplina.");
  }

  const disciplines = plan.disciplines.map((disciplinePlan) => {
    const result = validateDisciplineResult(
      disciplinePlan,
      byDiscipline.get(disciplinePlan.disciplineId),
    );
    const points = result.correct * disciplinePlan.pointsPerQuestion;
    const zeroScoreRisk = plan.eliminatesOnZeroDiscipline && points === 0;
    return {
      ...result,
      disciplineName: disciplinePlan.disciplineName,
      pointsPerQuestion: disciplinePlan.pointsPerQuestion,
      points,
      maximumPoints: disciplinePlan.maximumPoints,
      hitRate: disciplinePlan.questionCount > 0 ? result.correct / disciplinePlan.questionCount : 0,
      zeroScoreRisk,
      missedPoints: disciplinePlan.maximumPoints - points,
    } satisfies SimulationDisciplineAnalysis;
  });

  const totalCorrect = disciplines.reduce((sum, item) => sum + item.correct, 0);
  const totalWrong = disciplines.reduce((sum, item) => sum + item.wrong, 0);
  const totalBlank = disciplines.reduce((sum, item) => sum + item.blank, 0);
  const elapsedSeconds = disciplines.reduce((sum, item) => sum + item.elapsedSeconds, 0);
  const points = disciplines.reduce((sum, item) => sum + item.points, 0);
  const zeroScoreDisciplineIds = disciplines
    .filter((item) => item.zeroScoreRisk)
    .map((item) => item.disciplineId);

  const eligibilityStatus =
    plan.kind === "PARTIAL"
      ? "NOT_EVALUATED_PARTIAL"
      : zeroScoreDisciplineIds.length > 0
        ? "ZERO_SCORE_DISCIPLINE"
        : points < plan.minimumTotalPoints
          ? "BELOW_TOTAL_CUTOFF"
          : "MEETS_RECORDED_RULES";

  return {
    policyVersion: SIMULATION_POLICY_VERSION,
    kind: plan.kind,
    totalCorrect,
    totalWrong,
    totalBlank,
    elapsedSeconds,
    points,
    maximumPoints: plan.maximumPoints,
    percentageOfMaximum: plan.maximumPoints > 0 ? points / plan.maximumPoints : 0,
    minimumTotalPoints: plan.minimumTotalPoints,
    zeroScoreDisciplineIds,
    eligibilityStatus,
    disciplines,
    correctionPlan: buildCorrectionPlan(disciplines),
    limitations: [
      "O resultado mede somente este conjunto executado e não estima probabilidade de aprovação.",
      "Simulado parcial não permite concluir atendimento ao corte global da prova completa.",
      "Sem classificação por subassunto, o resultado agregado não altera prioridades temáticas do SDE.",
      "Comparações são descritivas e não provam causalidade de uma intervenção de estudo.",
    ],
  };
}

export function compareSimulationAnalyses(
  currentPlan: SimulationPlan,
  current: SimulationAnalysis,
  previousPlan: SimulationPlan,
  previous: SimulationAnalysis,
): SimulationComparison {
  const currentSignature = currentPlan.disciplines
    .map((item) => `${item.disciplineId}:${item.questionCount}:${item.pointsPerQuestion}`)
    .sort()
    .join("|");
  const previousSignature = previousPlan.disciplines
    .map((item) => `${item.disciplineId}:${item.questionCount}:${item.pointsPerQuestion}`)
    .sort()
    .join("|");

  if (
    currentPlan.competitionId !== previousPlan.competitionId ||
    currentPlan.kind !== previousPlan.kind ||
    currentSignature !== previousSignature
  ) {
    return {
      comparable: false,
      reason: "A comparação exige mesmo concurso, tipo e composição por disciplina.",
    };
  }

  const previousByDiscipline = new Map(
    previous.disciplines.map((item) => [item.disciplineId, item]),
  );
  return {
    comparable: true,
    pointsDelta: current.points - previous.points,
    correctDelta: current.totalCorrect - previous.totalCorrect,
    blankDelta: current.totalBlank - previous.totalBlank,
    elapsedSecondsDelta: current.elapsedSeconds - previous.elapsedSeconds,
    disciplinePointDeltas: Object.fromEntries(
      current.disciplines.map((item) => [
        item.disciplineId,
        item.points - (previousByDiscipline.get(item.disciplineId)?.points ?? 0),
      ]),
    ),
  };
}
