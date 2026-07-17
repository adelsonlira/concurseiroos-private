/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateDailyAvailability } from "../../core/availability/availabilityEngine";
import { buildDailyStudyPrescription } from "../../core/prescription/prescriptionEngine";
import { buildDynamicPrivateMaterialCatalog, mergePrivateMaterialCatalogs } from "../../core/materials/dynamicLibraryCatalog";
import { CompletedStudyTime } from "../../core/availability/types";
import { createStudyPlan } from "../../core/sde/planner/studyPlanner";
import {
  buildActionId,
  generateStrategicActions
} from "../../core/sde/prioritization/priorityEngine";
import { StrategicAction } from "../../core/sde/prioritization/types";
import {
  getCompetitionRuntimeDefinition,
  type CompetitionRuntimeDefinition
} from "../../config/concursos/registry";
import {
  ConfigUsuario,
  CronogramaRevisao,
  Flashcard,
  SessaoEstudo,
  Subassunto,
  TentativaQuestaoUsuario,
  ItemBiblioteca
} from "../../types";
import { buildCanonicalEvidenceFromStore } from "./storeEvidenceAdapter";
import { SDEApplicationResult } from "./types";

export interface CompetitionDecisionSnapshot {
  configuracao: ConfigUsuario;
  subassuntos: Subassunto[];
  tentativasQuestoes: TentativaQuestaoUsuario[];
  sessoesEstudo: SessaoEstudo[];
  flashcards: Flashcard[];
  cronogramasRevisao: CronogramaRevisao[];
  biblioteca?: ItemBiblioteca[];
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const QUESTION_PRESCRIPTION_POLICY = {
  minimumObservedSamples: 3,
  mediumConfidenceSamples: 5,
  highConfidenceSamples: 20,
  stretchQuestions: 1,
  diagnosticMinimumQuestions: 10
} as const;


function parseDateOnly(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (!match) throw new Error(`Data inválida '${value}'. Use YYYY-MM-DD.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Data calendariamente inválida '${value}'.`);
  }
  return date;
}

function daysBetween(start: string, end: string): number {
  const diff = parseDateOnly(end).getTime() - parseDateOnly(start).getTime();
  if (diff < 0) throw new Error("A data de referência é posterior à data da prova.");
  return Math.round(diff / 86_400_000);
}

function timestampToDateKey(timestamp: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validatePreferredDurations(
  config: ConfigUsuario,
  runtime: CompetitionRuntimeDefinition
): void {
  const durations = config.duracaoSessaoPreferidaMinutos;
  if (!durations) throw new Error("Durações operacionais das sessões são obrigatórias.");
  const plannerPolicy = runtime.package.sde.plannerPolicy;
  for (const tipo of ["teoria", "questoes", "revisao", "flashcards", "simulado"] as const) {
    const value = durations[tipo];
    if (!Number.isInteger(value) || !Number.isFinite(value) || value <= 0) {
      throw new Error(`Duração preferida de ${tipo} deve ser um inteiro positivo.`);
    }
    if (
      value < plannerPolicy.minSessionMinutes[tipo] ||
      value > plannerPolicy.maxSessionMinutes[tipo]
    ) {
      throw new Error(
        `Duração preferida de ${tipo} (${value}) deve ficar entre ` +
        `${plannerPolicy.minSessionMinutes[tipo]} e ${plannerPolicy.maxSessionMinutes[tipo]} minutos.`
      );
    }
  }
}

function buildDurationMap(
  config: ConfigUsuario,
  runtime: CompetitionRuntimeDefinition
): Record<string, number> {
  validatePreferredDurations(config, runtime);
  const pkg = runtime.package;
  const map: Record<string, number> = {};
  const types = ["teoria", "questoes", "revisao"] as const;

  for (const assunto of pkg.sde.assuntos) {
    const disciplinaId = pkg.sde.assuntoToDisciplina[assunto.id];
    for (const tipo of types) {
      map[buildActionId({ disciplinaId, assuntoId: assunto.id, tipo })] =
        config.duracaoSessaoPreferidaMinutos[tipo];
    }
    for (const subassuntoId of pkg.sde.assuntoToSubassuntos[assunto.id]) {
      for (const tipo of types) {
        map[buildActionId({
          disciplinaId,
          assuntoId: assunto.id,
          subassuntoId,
          tipo
        })] = config.duracaoSessaoPreferidaMinutos[tipo];
      }
      map[buildActionId({
        disciplinaId,
        assuntoId: assunto.id,
        subassuntoId,
        tipo: "flashcards"
      })] = config.duracaoSessaoPreferidaMinutos.flashcards;
    }
  }
  return map;
}

function completedStudyForAvailability(
  sessions: SessaoEstudo[],
  timeZone: string
): CompletedStudyTime[] {
  return sessions.map((session) => ({
    id: session.id,
    date: session.dataLocal ?? timestampToDateKey(session.dataFim, timeZone),
    minutes: Math.ceil(session.tempoGastoSegundos / 60),
    countsAgainstAvailability: session.contabilizaNaDisponibilidade ?? true
  }));
}

function defaultWarnings(runtime: CompetitionRuntimeDefinition): string[] {
  return [
    "O edital não informa a distribuição das questões entre os assuntos de cada disciplina; o pacote usa pesos internos neutros e não os apresenta como fatos oficiais. Este é um limite da fonte oficial, não uma falha que impeça o estudo.",
    `A matriz histórica de incidência da banca ${runtime.package.banca} por assunto permanece em shadow mode e não altera a prioridade até concluir revisão humana e validação.`,
    "O retorno marginal causal em pontos por hora permanece fora do ranking; sua calibração exige uma série prospectiva suficiente de episódios antes/depois e não bloqueia a prescrição atual.",
    "As durações são blocos operacionais configuráveis de sessão, não estimativas de tempo necessário para dominar um assunto."
  ];
}

export function runCompetitionDecisionForDate(
  snapshot: CompetitionDecisionSnapshot,
  referenceDate: string
): SDEApplicationResult {
  let runtime: CompetitionRuntimeDefinition | null = null;
  try {
    runtime = getCompetitionRuntimeDefinition(snapshot.configuracao.concursoAlvoId);
    const pkg = runtime.package;
    const daysToExam = daysBetween(referenceDate, pkg.officialRules.examDate);
    const availability = calculateDailyAvailability({
      date: referenceDate,
      config: snapshot.configuracao.disponibilidadeEstudo,
      completedStudy: completedStudyForAvailability(
        snapshot.sessoesEstudo,
        snapshot.configuracao.disponibilidadeEstudo.timeZone
      )
    });

    if (availability.remainingMinutes <= 0) {
      return {
        status: "NO_TIME_AVAILABLE",
        referenceDate,
        availability,
        actions: [],
        planner: null,
        prescription: null,
        warnings: defaultWarnings(runtime),
        errors: []
      };
    }

    const evidence = buildCanonicalEvidenceFromStore({
      concursoId: pkg.id,
      referenceDate,
      timeZone: snapshot.configuracao.disponibilidadeEstudo.timeZone,
      subassuntos: snapshot.subassuntos,
      tentativasQuestoes: snapshot.tentativasQuestoes,
      sessoesEstudo: snapshot.sessoesEstudo,
      flashcards: snapshot.flashcards,
      cronogramasRevisao: snapshot.cronogramasRevisao
    });

    const durationMap = buildDurationMap(snapshot.configuracao, runtime);
    const actions: StrategicAction[] = generateStrategicActions({
      diagnosis: {
        disciplinasCriticasIds: [],
        swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
        assuntoRendimento: {},
        subassuntoRendimento: {},
        decayRates: {},
        tempoDisponivelMinutos: availability.remainingMinutes
      },
      knowledgeGraph: pkg.sde.knowledgeGraph,
      edital: pkg.sde.edital,
      timeHorizon: {
        dataProva: pkg.officialRules.examDate,
        diasAteAProva: daysToExam,
        horasDisponiveisPorDia: availability.remainingMinutes / 60,
        referenceDate
      },
      history: evidence,
      disciplinas: pkg.sde.disciplinas,
      assuntos: pkg.sde.assuntos,
      subassuntos: pkg.sde.subassuntos,
      names: pkg.sde.names,
      assuntoToDisciplina: pkg.sde.assuntoToDisciplina,
      subassuntoToAssunto: pkg.sde.subassuntoToAssunto,
      assuntoToSubassuntos: pkg.sde.assuntoToSubassuntos,
      policy: pkg.sde.eliminationRiskPolicy,
      opportunityCostPolicy: pkg.sde.opportunityCostPolicy,
      learningLeveragePolicy: pkg.sde.learningLeveragePolicy,
      estimatedDurationMinutesByAction: durationMap
    });

    const planner = createStudyPlan({
      actions,
      context: {
        tempoDisponivelMinutos: availability.remainingMinutes,
        diasAteAProva: daysToExam,
        referenceDate,
        bancaName: pkg.banca,
        tipoQuestao: pkg.officialRules.questionType,
        tempoAlvoPorQuestaoSegundos: null,
        seedId: `${pkg.id}-${referenceDate}`,
        policy: pkg.sde.plannerPolicy
      }
    });

    const materialCatalog = mergePrivateMaterialCatalogs(
      runtime.privateStudyMaterials,
      buildDynamicPrivateMaterialCatalog(snapshot.biblioteca ?? [], pkg.id)
    );

    const prescription = buildDailyStudyPrescription({
      concursoId: pkg.id,
      referenceDate,
      planner,
      actions,
      materialCatalog,
      externalQuestionBanks: runtime.externalQuestionBanks,
      banca: pkg.banca,
      studyGuidance: pkg.studyGuidance,
      siblingSubtopicNamesByTopic: Object.fromEntries(
        Object.entries(pkg.sde.assuntoToSubassuntos).map(([topicId, ids]) => [
          topicId,
          ids.map((id) => pkg.sde.names.subassuntos[id] ?? id)
        ])
      ),
      attempts: snapshot.tentativasQuestoes.map((attempt) => ({
        disciplineId: attempt.disciplinaId,
        topicId: attempt.assuntoId,
        subtopicId: attempt.subassuntoId,
        seconds: attempt.tempoRespostaSegundos
      })),
      examPacing: {
        durationMinutes: pkg.officialRules.durationMinutes,
        totalQuestions: pkg.officialRules.totalQuestions
      },
      questionPolicy: QUESTION_PRESCRIPTION_POLICY,
      maxUpcomingSessions: 2
    });

    return {
      status: "SUCCESS",
      referenceDate,
      availability,
      actions,
      planner,
      prescription,
      warnings: defaultWarnings(runtime),
      errors: []
    };
  } catch (error) {
    return {
      status: "INVALID_INPUT",
      referenceDate,
      availability: null,
      actions: [],
      planner: null,
      prescription: null,
      warnings: runtime ? defaultWarnings(runtime) : [],
      errors: [error instanceof Error ? error.message : "Erro desconhecido na execução do SDE."]
    };
  }
}

