import type { ConfigUsuario } from "../../types";
import { createSixDayAvailability } from "./availabilityEngine";

export const CANONICAL_DAILY_AVAILABILITY_MINUTES = 120;
export const LEGACY_DEFAULT_DAILY_AVAILABILITY_MINUTES = 180;
export const CANONICAL_TIME_ZONE = "America/Fortaleza";
export const LEGACY_AVAILABILITY_MIGRATION_WARNING = "LEGACY_DEFAULT_AVAILABILITY_MIGRATED_180_TO_120";

export interface AvailabilityMigrationResult {
  config: ConfigUsuario;
  migrated: boolean;
  warning?: typeof LEGACY_AVAILABILITY_MIGRATION_WARNING;
}

export function isExactLegacyDefaultAvailability(config: ConfigUsuario | null | undefined): boolean {
  if (!config || config.metaHorariaDiariaMinutos !== LEGACY_DEFAULT_DAILY_AVAILABILITY_MINUTES) return false;
  const availability = config.disponibilidadeEstudo;
  if (!availability || availability.timeZone !== CANONICAL_TIME_ZONE || availability.includesBreaks !== true) return false;
  if (!Array.isArray(availability.overrides) || availability.overrides.length !== 0) return false;
  if (!Array.isArray(availability.weekly) || availability.weekly.length !== 7) return false;
  const sorted = [...availability.weekly].sort((left, right) => left.dayOfWeek - right.dayOfWeek);
  return sorted.every((day, index) => {
    if (day.dayOfWeek !== index) return false;
    if (index === 0) return day.enabled === false && day.totalMinutes === 0;
    return day.enabled === true && day.totalMinutes === LEGACY_DEFAULT_DAILY_AVAILABILITY_MINUTES;
  });
}

export function migrateExactLegacyDefaultAvailability(config: ConfigUsuario): AvailabilityMigrationResult {
  if (!isExactLegacyDefaultAvailability(config)) {
    return { config, migrated: false };
  }
  return {
    config: {
      ...config,
      metaHorariaDiariaMinutos: CANONICAL_DAILY_AVAILABILITY_MINUTES,
      disponibilidadeEstudo: createSixDayAvailability({
        minutesPerActiveDay: CANONICAL_DAILY_AVAILABILITY_MINUTES,
        restDay: 0,
        timeZone: CANONICAL_TIME_ZONE,
        includesBreaks: true,
      }),
    },
    migrated: true,
    warning: LEGACY_AVAILABILITY_MIGRATION_WARNING,
  };
}
