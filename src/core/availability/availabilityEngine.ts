/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AvailabilityOverride,
  CompletedStudyTime,
  DailyAvailabilityResult,
  StudyAvailabilityConfig,
  WeeklyAvailabilityDay
} from "./types";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function validateDateOnly(value: string, fieldName = "date"): void {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    throw new Error(`${fieldName} deve usar o formato YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} contém uma data calendariamente inválida.`);
  }
}

function assertIntegerMinutes(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || !Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} deve ser um inteiro finito maior ou igual a zero.`);
  }
}

function validateWeeklyDay(day: WeeklyAvailabilityDay): void {
  if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
    throw new Error("dayOfWeek deve ser um inteiro entre 0 e 6.");
  }
  if (typeof day.enabled !== "boolean") {
    throw new Error(`enabled do dia ${day.dayOfWeek} deve ser booleano.`);
  }
  assertIntegerMinutes(day.totalMinutes, `totalMinutes do dia ${day.dayOfWeek}`);
  if (!day.enabled && day.totalMinutes !== 0) {
    throw new Error(`Dia ${day.dayOfWeek} desativado deve possuir totalMinutes igual a zero.`);
  }
}

function validateOverride(override: AvailabilityOverride): void {
  validateDateOnly(override.date, "override.date");
  assertIntegerMinutes(override.totalMinutes, `override.totalMinutes de ${override.date}`);
}

export function validateStudyAvailabilityConfig(config: StudyAvailabilityConfig): void {
  if (!config || typeof config !== "object") {
    throw new Error("Configuração de disponibilidade é obrigatória.");
  }
  if (typeof config.timeZone !== "string" || config.timeZone.trim().length === 0) {
    throw new Error("timeZone é obrigatório.");
  }
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: config.timeZone }).format(new Date(0));
  } catch {
    throw new Error(`timeZone inválido: '${config.timeZone}'.`);
  }
  if (typeof config.includesBreaks !== "boolean") {
    throw new Error("includesBreaks deve ser booleano.");
  }
  if (!Array.isArray(config.weekly) || config.weekly.length !== 7) {
    throw new Error("A grade semanal deve conter exatamente sete dias.");
  }
  const seenDays = new Set<number>();
  for (const day of config.weekly) {
    validateWeeklyDay(day);
    if (seenDays.has(day.dayOfWeek)) {
      throw new Error(`Dia da semana duplicado: ${day.dayOfWeek}.`);
    }
    seenDays.add(day.dayOfWeek);
  }
  if (!Array.isArray(config.overrides)) {
    throw new Error("overrides deve ser um array.");
  }
  const seenOverrides = new Set<string>();
  for (const override of config.overrides) {
    validateOverride(override);
    if (seenOverrides.has(override.date)) {
      throw new Error(`Exceção de disponibilidade duplicada para ${override.date}.`);
    }
    seenOverrides.add(override.date);
  }
}

function dayOfWeekFromDateOnly(date: string): number {
  validateDateOnly(date);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function calculateDailyAvailability(params: {
  date: string;
  config: StudyAvailabilityConfig;
  completedStudy: CompletedStudyTime[];
}): DailyAvailabilityResult {
  const { date, config, completedStudy } = params;
  validateDateOnly(date);
  validateStudyAvailabilityConfig(config);
  if (!Array.isArray(completedStudy)) {
    throw new Error("completedStudy deve ser um array.");
  }

  const override = config.overrides.find((item) => item.date === date);
  const weeklyDay = config.weekly.find(
    (item) => item.dayOfWeek === dayOfWeekFromDateOnly(date)
  );
  if (!weeklyDay) {
    throw new Error(`Grade semanal sem o dia correspondente a ${date}.`);
  }

  const scheduledMinutes = override
    ? override.totalMinutes
    : weeklyDay.enabled
      ? weeklyDay.totalMinutes
      : 0;

  let completedMinutes = 0;
  const ids = new Set<string>();
  for (const entry of completedStudy) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Registro de estudo concluído inválido.");
    }
    if (!entry.id || ids.has(entry.id)) {
      throw new Error(`ID de estudo concluído inválido ou duplicado: '${entry.id}'.`);
    }
    ids.add(entry.id);
    validateDateOnly(entry.date, `completedStudy.${entry.id}.date`);
    assertIntegerMinutes(entry.minutes, `completedStudy.${entry.id}.minutes`);
    if (typeof entry.countsAgainstAvailability !== "boolean") {
      throw new Error(`countsAgainstAvailability de '${entry.id}' deve ser booleano.`);
    }
    if (entry.date === date && entry.countsAgainstAvailability) {
      completedMinutes += entry.minutes;
    }
  }

  return {
    date,
    scheduledMinutes,
    completedMinutes,
    remainingMinutes: Math.max(0, scheduledMinutes - completedMinutes),
    includesBreaks: config.includesBreaks,
    source: override ? "DATE_OVERRIDE" : "WEEKLY_SCHEDULE",
    overrideReason: override?.reason?.trim() || null
  };
}

export function createSixDayAvailability(params?: {
  minutesPerActiveDay?: number;
  restDay?: number;
  timeZone?: string;
  includesBreaks?: boolean;
}): StudyAvailabilityConfig {
  const minutes = params?.minutesPerActiveDay ?? 120;
  const restDay = params?.restDay ?? 0;
  assertIntegerMinutes(minutes, "minutesPerActiveDay");
  if (minutes === 0) throw new Error("minutesPerActiveDay deve ser positivo.");
  if (!Number.isInteger(restDay) || restDay < 0 || restDay > 6) {
    throw new Error("restDay deve ser um inteiro entre 0 e 6.");
  }
  const config: StudyAvailabilityConfig = {
    timeZone: params?.timeZone ?? "America/Fortaleza",
    includesBreaks: params?.includesBreaks ?? true,
    weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: dayOfWeek !== restDay,
      totalMinutes: dayOfWeek === restDay ? 0 : minutes
    })),
    overrides: []
  };
  validateStudyAvailabilityConfig(config);
  return config;
}
