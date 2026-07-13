import type { StudyAvailabilityConfig } from "../availability/types";
import type { ReviewMethod, ReviewPerformance } from "../review/types";

export interface WeeklySessionRecord {
  id: string;
  disciplinaId: string;
  assuntoId?: string;
  subassuntoId?: string;
  atividadeEstudo?: "teoria" | "questoes" | "revisao" | "flashcards" | "simulado";
  tempoGastoSegundos: number;
  dataInicio: string;
  dataFim: string;
  dataLocal?: string;
  contabilizaNaDisponibilidade?: boolean;
  decisaoSDE?: {
    duracaoPlanejadaMinutos?: number | null;
  };
}

export interface WeeklyAttemptRecord {
  id: string;
  respondidaEm: string;
  acertou: boolean;
  disciplinaId: string;
  assuntoId: string;
  subassuntoId?: string;
}

export interface WeeklyReviewScheduleRecord {
  id: string;
  subassuntoId: string;
  historicoTentativas: Array<{
    revisadoEm: string;
    desempenhoAutoAvaliado: ReviewPerformance | string;
    metodoAplicado?: ReviewMethod;
    tempoGastoSegundos?: number;
  }>;
}

export interface WeeklyActivityRecord {
  dataHora: string;
  tipoAtividade: string;
  subassuntoId?: string;
  metadata?: {
    markTheoryCompleted?: boolean;
  } | null;
}

export interface WeeklySubtopicRecord {
  id: string;
  completado: boolean;
  isDeleted?: boolean;
}

export interface WeeklyCalibrationInput {
  referenceDate: string;
  availability: StudyAvailabilityConfig;
  sessions: readonly WeeklySessionRecord[];
  attempts: readonly WeeklyAttemptRecord[];
  reviewSchedules: readonly WeeklyReviewScheduleRecord[];
  activities: readonly WeeklyActivityRecord[];
  subtopics: readonly WeeklySubtopicRecord[];
}

export interface WeeklyCalibrationReport {
  period: {
    startDate: string;
    endDate: string;
    referenceDate: string;
  };
  availability: {
    scheduledMinutes: number;
    recordedMinutes: number;
    remainingScheduledMinutes: number;
    overageMinutes: number;
    daysWithRecordedStudy: number;
    scheduledStudyDays: number;
  };
  execution: {
    minutesByActivity: Record<string, number>;
    unclassifiedMinutes: number;
    sessionsWithPlanTrace: number;
    totalSessions: number;
    plannedMinutesForTracedSessions: number;
    actualMinutesForTracedSessions: number;
    observedPlanDifferenceMinutes: number;
  };
  questions: {
    attempts: number;
    correct: number;
    observedAccuracy: number | null;
    distinctSubtopics: number;
  };
  reviews: {
    completed: number;
    timedCompleted: number;
    timedMinutes: number;
    failedRecoveries: number;
    effortfulRecoveries: number;
    fluentRecoveries: number;
    methodsUsed: Partial<Record<ReviewMethod, number>>;
  };
  progression: {
    newlyConfirmedSubtopics: number;
    newlyConfirmedSubtopicIds: string[];
    remainingIncompleteSubtopics: number;
    newContentProgressObserved: boolean;
  };
  dataQuality: {
    sessionsWithoutActivity: number;
    reviewEntriesWithoutDuration: number;
    attemptsWithoutSubtopic: number;
    planTraceCoverage: number | null;
    gaps: string[];
  };
  guardrails: {
    protectNewContentNextWeek: boolean;
    reason: string | null;
  };
  observations: string[];
}
