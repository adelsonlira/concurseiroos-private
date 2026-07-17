import { calculateDailyAvailability, validateDateOnly } from "../availability/availabilityEngine";
import type { CompletedStudyTime, StudyAvailabilityConfig } from "../availability/types";

const DAY_MS = 86_400_000;

export interface ExamHorizonDisciplineInput {
  disciplinaId: string;
  disciplinaNome: string;
  officialMaxPoints: number;
  totalSubtopics: number;
  noLearningEvidence: number;
  withQuestionEvidence: number;
  activeErrorOrRecovery: number;
}

export interface ExamHorizonDisciplineReport extends ExamHorizonDisciplineInput {
  officialPointShare: number;
  unassessedSubtopics: number;
  safetyStatus: "UNASSESSED" | "MINIMAL_EVIDENCE" | "EVIDENCE_PRESENT";
}

export interface ExamHorizonReport {
  referenceDate: string;
  examDate: string;
  lastStudyDate: string;
  daysUntilExam: number;
  activeStudyDays: number;
  scheduledMinutes: number;
  remainingMinutes: number;
  scheduledHours: number;
  remainingHours: number;
  averageMinutesPerActiveDay: number;
  totalSubtopics: number;
  unassessedSubtopics: number;
  remainingMinutesPerUnassessedSubtopic: number | null;
  phase: "FOUNDATION" | "CONSOLIDATION" | "FINAL_STRETCH" | "EXAM_IMMINENT" | "EXAM_PASSED";
  disciplines: ExamHorizonDisciplineReport[];
  warnings: string[];
  caveats: string[];
}

export interface ExamHorizonInput {
  referenceDate: string;
  examDate: string;
  availability: StudyAvailabilityConfig;
  completedStudy: CompletedStudyTime[];
  disciplines: ExamHorizonDisciplineInput[];
}

function addDays(dateKey: string, days: number): string {
  validateDateOnly(dateKey);
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  validateDateOnly(start, "referenceDate");
  validateDateOnly(end, "examDate");
  return Math.round((Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) / DAY_MS);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function phaseFor(daysUntilExam: number): ExamHorizonReport["phase"] {
  if (daysUntilExam < 0) return "EXAM_PASSED";
  if (daysUntilExam <= 7) return "EXAM_IMMINENT";
  if (daysUntilExam <= 21) return "FINAL_STRETCH";
  if (daysUntilExam <= 45) return "CONSOLIDATION";
  return "FOUNDATION";
}

/**
 * Descriptive capacity envelope from the configured availability to the day
 * before the exam. It does not allocate hours, predict approval or replace the
 * daily SDE. Its purpose is to expose calendar pressure and unmeasured areas.
 */
export function buildExamHorizonReport(input: ExamHorizonInput): ExamHorizonReport {
  const daysUntilExam = daysBetween(input.referenceDate, input.examDate);
  const lastStudyDate = addDays(input.examDate, -1);
  const totalOfficialPoints = input.disciplines.reduce((sum, item) => sum + Math.max(0, item.officialMaxPoints), 0);

  const disciplines = input.disciplines.map((item) => {
    const unassessedSubtopics = Math.max(0, Math.min(item.totalSubtopics, item.noLearningEvidence));
    const safetyStatus = item.withQuestionEvidence <= 0
      ? "UNASSESSED"
      : item.withQuestionEvidence < Math.min(3, Math.max(1, item.totalSubtopics))
        ? "MINIMAL_EVIDENCE"
        : "EVIDENCE_PRESENT";
    return {
      ...item,
      unassessedSubtopics,
      officialPointShare: totalOfficialPoints > 0 ? round1((item.officialMaxPoints / totalOfficialPoints) * 100) : 0,
      safetyStatus
    } satisfies ExamHorizonDisciplineReport;
  });

  let scheduledMinutes = 0;
  let remainingMinutes = 0;
  let activeStudyDays = 0;

  if (daysUntilExam > 0) {
    for (let offset = 0; offset < daysUntilExam; offset += 1) {
      const date = addDays(input.referenceDate, offset);
      const daily = calculateDailyAvailability({
        date,
        config: input.availability,
        completedStudy: input.completedStudy
      });
      scheduledMinutes += daily.scheduledMinutes;
      remainingMinutes += daily.remainingMinutes;
      if (daily.scheduledMinutes > 0) activeStudyDays += 1;
    }
  }

  const totalSubtopics = disciplines.reduce((sum, item) => sum + item.totalSubtopics, 0);
  const unassessedSubtopics = disciplines.reduce((sum, item) => sum + item.unassessedSubtopics, 0);
  const warnings: string[] = [];
  if (daysUntilExam < 0) warnings.push("A data oficial da prova já passou em relação à referência escolhida.");
  if (daysUntilExam >= 0 && activeStudyDays === 0) warnings.push("Não há nenhum dia de estudo ativo configurado antes da prova.");
  const unsafeDisciplines = disciplines.filter((item) => item.safetyStatus === "UNASSESSED");
  if (unsafeDisciplines.length > 0) {
    warnings.push(`${unsafeDisciplines.length} disciplina(s) ainda não possuem evidência objetiva mínima; a proteção contra zero continua prioritária.`);
  }
  if (unassessedSubtopics > 0) {
    warnings.push(`${unassessedSubtopics} subassunto(s) ainda não possuem evidência de aprendizagem; isso não significa desempenho ruim, apenas ausência de medição.`);
  }

  return {
    referenceDate: input.referenceDate,
    examDate: input.examDate,
    lastStudyDate,
    daysUntilExam,
    activeStudyDays,
    scheduledMinutes,
    remainingMinutes,
    scheduledHours: round1(scheduledMinutes / 60),
    remainingHours: round1(remainingMinutes / 60),
    averageMinutesPerActiveDay: activeStudyDays > 0 ? round1(remainingMinutes / activeStudyDays) : 0,
    totalSubtopics,
    unassessedSubtopics,
    remainingMinutesPerUnassessedSubtopic: unassessedSubtopics > 0 ? round1(remainingMinutes / unassessedSubtopics) : null,
    phase: phaseFor(daysUntilExam),
    disciplines,
    warnings,
    caveats: [
      "A capacidade usa a disponibilidade configurada e desconta apenas sessões já registradas; faltas futuras não são presumidas.",
      "Minutos por subassunto são um indicador de pressão de cobertura, não uma estimativa de tempo para dominar conteúdo.",
      "A participação oficial em pontos é descritiva por disciplina; não representa incidência interna por assunto.",
      "O SDE diário continua soberano e recalcula a ação após cada evidência real."
    ]
  };
}
