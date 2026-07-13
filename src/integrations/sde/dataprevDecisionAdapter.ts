/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateDailyAvailability } from "../../core/availability/availabilityEngine";
import { CompletedStudyTime } from "../../core/availability/types";
import { createStudyPlan } from "../../core/sde/planner/studyPlanner";
import {
  buildActionId,
  generateStrategicActions
} from "../../core/sde/prioritization/priorityEngine";
import { StrategicAction } from "../../core/sde/prioritization/types";
import {
  DATAPREV_2026_PROFILE_3_ID,
  DATAPREV_2026_PROFILE_3_PACKAGE
} from "../../config/concursos/dataprev-2026-perfil-3";
import {
  ConfigUsuario,
  CronogramaRevisao,
  Flashcard,
  SessaoEstudo,
  Subassunto,
  TentativaQuestaoUsuario
} from "../../types";
import { buildCanonicalEvidenceFromStore } from "./storeEvidenceAdapter";
import { SDEApplicationResult } from "./types";

export interface DataprevDecisionSnapshot {
  configuracao: ConfigUsuario;
  subassuntos: Subassunto[];
  tentativasQuestoes: TentativaQuestaoUsuario[];
  sessoesEstudo: SessaoEstudo[];
  flashcards: Flashcard[];
  cronogramasRevisao: CronogramaRevisao[];
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function validatePreferredDurations(config: ConfigUsuario): void {
  const durations = config.duracaoSessaoPreferidaMinutos;
  if (!durations) throw new Error("Durações operacionais das sessões são obrigatórias.");
  const plannerPolicy = DATAPREV_2026_PROFILE_3_PACKAGE.sde.plannerPolicy;
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

function buildDurationMap(config: ConfigUsuario): Record<string, number> {
  validatePreferredDurations(config);
  const pkg = DATAPREV_2026_PROFILE_3_PACKAGE;
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

function defaultWarnings(): string[] {
  return [
    "O edital não informa a distribuição das questões entre os assuntos de cada disciplina; o pacote usa pesos internos neutros e não os apresenta como fatos oficiais.",
    "A matriz histórica de incidência da FGV por assunto ainda não foi validada; esse dado permanece ausente na XAI.",
    "O retorno marginal em pontos por hora permanece indisponível até existirem episódios de aprendizagem antes/depois.",
    "As durações são tamanhos operacionais configuráveis de sessão, não estimativas de tempo para dominar um assunto."
  ];
}

export function runDataprevDecisionForDate(
  snapshot: DataprevDecisionSnapshot,
  referenceDate: string
): SDEApplicationResult {
  try {
    if (snapshot.configuracao.concursoAlvoId !== DATAPREV_2026_PROFILE_3_ID) {
      throw new Error("A configuração ativa não corresponde ao pacote DATAPREV 2026 — Perfil 3.");
    }

    const pkg = DATAPREV_2026_PROFILE_3_PACKAGE;
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
        warnings: defaultWarnings(),
        errors: []
      };
    }

    const evidence = buildCanonicalEvidenceFromStore({
      concursoId: DATAPREV_2026_PROFILE_3_ID,
      referenceDate,
      timeZone: snapshot.configuracao.disponibilidadeEstudo.timeZone,
      subassuntos: snapshot.subassuntos,
      tentativasQuestoes: snapshot.tentativasQuestoes,
      sessoesEstudo: snapshot.sessoesEstudo,
      flashcards: snapshot.flashcards,
      cronogramasRevisao: snapshot.cronogramasRevisao
    });

    const durationMap = buildDurationMap(snapshot.configuracao);
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
        seedId: `${DATAPREV_2026_PROFILE_3_ID}-${referenceDate}`,
        policy: pkg.sde.plannerPolicy
      }
    });

    return {
      status: "SUCCESS",
      referenceDate,
      availability,
      actions,
      planner,
      warnings: defaultWarnings(),
      errors: []
    };
  } catch (error) {
    return {
      status: "INVALID_INPUT",
      referenceDate,
      availability: null,
      actions: [],
      planner: null,
      warnings: defaultWarnings(),
      errors: [error instanceof Error ? error.message : "Erro desconhecido na execução do SDE."]
    };
  }
}
