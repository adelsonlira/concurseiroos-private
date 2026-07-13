import { calculateDailyAvailability, validateDateOnly } from "../availability/availabilityEngine";
import type { CompletedStudyTime } from "../availability/types";
import type { ReviewMethod } from "../review/types";
import type { WeeklyCalibrationInput, WeeklyCalibrationReport } from "./types";

const DAY_MS = 86_400_000;

function addDays(dateKey: string, days: number): string {
  validateDateOnly(dateKey);
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(dateKey: string): string {
  validateDateOnly(dateKey);
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return addDays(dateKey, -offset);
}

function localDateKey(timestamp: string, timeZone: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Timestamp inválido: ${timestamp}`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(parsed);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function inRange(dateKey: string, startDate: string, endDate: string): boolean {
  return dateKey >= startDate && dateKey <= endDate;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildWeeklyCalibrationReport(
  input: WeeklyCalibrationInput
): WeeklyCalibrationReport {
  validateDateOnly(input.referenceDate, "referenceDate");
  const startDate = startOfIsoWeek(input.referenceDate);
  const endDate = addDays(startDate, 6);
  const timeZone = input.availability.timeZone;

  const completedStudy: CompletedStudyTime[] = input.sessions.map((session) => ({
    id: session.id,
    date: session.dataLocal ?? localDateKey(session.dataFim, timeZone),
    minutes: Math.ceil(session.tempoGastoSegundos / 60),
    countsAgainstAvailability: session.contabilizaNaDisponibilidade ?? true
  }));

  const daily = Array.from({ length: 7 }, (_, index) =>
    calculateDailyAvailability({
      date: addDays(startDate, index),
      config: input.availability,
      completedStudy
    })
  );
  const scheduledMinutes = daily.reduce((sum, item) => sum + item.scheduledMinutes, 0);
  const recordedMinutes = daily.reduce((sum, item) => sum + item.completedMinutes, 0);
  const recordedDays = new Set(
    completedStudy
      .filter((item) => item.countsAgainstAvailability && inRange(item.date, startDate, endDate) && item.minutes > 0)
      .map((item) => item.date)
  );

  const weeklySessions = input.sessions.filter((session) => {
    const key = session.dataLocal ?? localDateKey(session.dataFim, timeZone);
    return inRange(key, startDate, endDate);
  });
  const minutesByActivity: Record<string, number> = {};
  let sessionsWithoutActivity = 0;
  let unclassifiedMinutes = 0;
  let sessionsWithPlanTrace = 0;
  let plannedMinutesForTracedSessions = 0;
  let actualMinutesForTracedSessions = 0;

  for (const session of weeklySessions) {
    const minutes = session.tempoGastoSegundos / 60;
    const activity = session.atividadeEstudo ?? "SEM_CLASSIFICACAO";
    minutesByActivity[activity] = (minutesByActivity[activity] ?? 0) + minutes;
    if (!session.atividadeEstudo) {
      sessionsWithoutActivity += 1;
      unclassifiedMinutes += minutes;
    }
    const planned = session.decisaoSDE?.duracaoPlanejadaMinutos;
    if (Number.isFinite(planned) && (planned ?? 0) >= 0) {
      sessionsWithPlanTrace += 1;
      plannedMinutesForTracedSessions += planned ?? 0;
      actualMinutesForTracedSessions += minutes;
    }
  }

  for (const key of Object.keys(minutesByActivity)) {
    minutesByActivity[key] = round1(minutesByActivity[key]);
  }

  const weeklyAttempts = input.attempts.filter((attempt) =>
    inRange(localDateKey(attempt.respondidaEm, timeZone), startDate, endDate)
  );
  const correct = weeklyAttempts.filter((attempt) => attempt.acertou).length;
  const distinctAttemptSubtopics = new Set(
    weeklyAttempts.map((attempt) => attempt.subassuntoId).filter(Boolean)
  );

  const reviewEntries = input.reviewSchedules.flatMap((schedule) =>
    schedule.historicoTentativas
      .filter((entry) => inRange(localDateKey(entry.revisadoEm, timeZone), startDate, endDate))
      .map((entry) => ({ ...entry, subassuntoId: schedule.subassuntoId }))
  );
  const timedEntries = reviewEntries.filter(
    (entry) => Number.isFinite(entry.tempoGastoSegundos) && (entry.tempoGastoSegundos ?? 0) > 0
  );
  const methodsUsed: Partial<Record<ReviewMethod, number>> = {};
  for (const entry of reviewEntries) {
    if (entry.metodoAplicado) {
      methodsUsed[entry.metodoAplicado] = (methodsUsed[entry.metodoAplicado] ?? 0) + 1;
    }
  }

  const theoryCompletions = input.activities.filter((activity) =>
    activity.tipoAtividade === "ESTUDO_TEORIA" &&
    activity.metadata?.markTheoryCompleted === true &&
    Boolean(activity.subassuntoId) &&
    inRange(localDateKey(activity.dataHora, timeZone), startDate, endDate)
  );
  const newlyConfirmedIds = Array.from(
    new Set(theoryCompletions.map((activity) => activity.subassuntoId!).filter(Boolean))
  ).sort();
  const remainingIncomplete = input.subtopics.filter(
    (subtopic) => !subtopic.isDeleted && !subtopic.completado
  ).length;

  const gaps: string[] = [];
  const reviewEntriesWithoutDuration = reviewEntries.length - timedEntries.length;
  const attemptsWithoutSubtopic = weeklyAttempts.filter((attempt) => !attempt.subassuntoId).length;
  if (sessionsWithoutActivity > 0) {
    gaps.push(`${sessionsWithoutActivity} sessão(ões) sem tipo de atividade; o tempo não pode ser atribuído com precisão.`);
  }
  if (reviewEntriesWithoutDuration > 0) {
    gaps.push(`${reviewEntriesWithoutDuration} revisão(ões) sem duração real; foram excluídas da análise de eficiência.`);
  }
  if (attemptsWithoutSubtopic > 0) {
    gaps.push(`${attemptsWithoutSubtopic} tentativa(s) sem subassunto; a recuperação temática fica menos precisa.`);
  }
  if (weeklySessions.length > 0 && sessionsWithPlanTrace === 0) {
    gaps.push("Nenhuma sessão da semana possui duração planejada vinculada ao SDE.");
  }

  const protectNewContentNextWeek =
    recordedMinutes > 0 && newlyConfirmedIds.length === 0 && remainingIncomplete > 0;
  const observations: string[] = [];
  if (recordedMinutes === 0) {
    observations.push("Nenhum tempo de estudo foi registrado nesta semana.");
  } else {
    observations.push(`${recordedMinutes} de ${scheduledMinutes} minutos disponíveis foram registrados.`);
  }
  observations.push(
    weeklyAttempts.length > 0
      ? `${weeklyAttempts.length} questão(ões) real(is) foram registradas, com ${correct} acerto(s).`
      : "Nenhuma questão real foi registrada na semana; não há evidência semanal de desempenho por questões."
  );
  observations.push(
    newlyConfirmedIds.length > 0
      ? `${newlyConfirmedIds.length} subassunto(s) tiveram conclusão de teoria confirmada.`
      : remainingIncomplete > 0
        ? "Não houve confirmação de avanço em conteúdo novo, embora ainda existam subassuntos incompletos."
        : "O edital cadastrado não possui subassuntos incompletos ativos."
  );

  return {
    period: { startDate, endDate, referenceDate: input.referenceDate },
    availability: {
      scheduledMinutes,
      recordedMinutes,
      remainingScheduledMinutes: Math.max(0, scheduledMinutes - recordedMinutes),
      overageMinutes: Math.max(0, recordedMinutes - scheduledMinutes),
      daysWithRecordedStudy: recordedDays.size,
      scheduledStudyDays: daily.filter((item) => item.scheduledMinutes > 0).length
    },
    execution: {
      minutesByActivity,
      unclassifiedMinutes: round1(unclassifiedMinutes),
      sessionsWithPlanTrace,
      totalSessions: weeklySessions.length,
      plannedMinutesForTracedSessions: round1(plannedMinutesForTracedSessions),
      actualMinutesForTracedSessions: round1(actualMinutesForTracedSessions),
      observedPlanDifferenceMinutes: round1(actualMinutesForTracedSessions - plannedMinutesForTracedSessions)
    },
    questions: {
      attempts: weeklyAttempts.length,
      correct,
      observedAccuracy: weeklyAttempts.length > 0 ? correct / weeklyAttempts.length : null,
      distinctSubtopics: distinctAttemptSubtopics.size
    },
    reviews: {
      completed: reviewEntries.length,
      timedCompleted: timedEntries.length,
      timedMinutes: round1(
        timedEntries.reduce((sum, entry) => sum + (entry.tempoGastoSegundos ?? 0) / 60, 0)
      ),
      failedRecoveries: reviewEntries.filter((entry) => entry.desempenhoAutoAvaliado === "HARD").length,
      effortfulRecoveries: reviewEntries.filter((entry) => entry.desempenhoAutoAvaliado === "MEDIUM").length,
      fluentRecoveries: reviewEntries.filter((entry) => entry.desempenhoAutoAvaliado === "EASY").length,
      methodsUsed
    },
    progression: {
      newlyConfirmedSubtopics: newlyConfirmedIds.length,
      newlyConfirmedSubtopicIds: newlyConfirmedIds,
      remainingIncompleteSubtopics: remainingIncomplete,
      newContentProgressObserved: newlyConfirmedIds.length > 0
    },
    dataQuality: {
      sessionsWithoutActivity,
      reviewEntriesWithoutDuration,
      attemptsWithoutSubtopic,
      planTraceCoverage:
        weeklySessions.length > 0 ? sessionsWithPlanTrace / weeklySessions.length : null,
      gaps
    },
    guardrails: {
      protectNewContentNextWeek,
      reason: protectNewContentNextWeek
        ? "Houve estudo registrado, mas nenhuma conclusão de teoria nova; o Planner deve preservar avanço sem remover ações de risco superior."
        : null
    },
    observations
  };
}
