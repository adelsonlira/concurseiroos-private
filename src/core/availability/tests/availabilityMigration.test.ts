import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { calculateDailyAvailability, createSixDayAvailability } from "../availabilityEngine";
import {
  CANONICAL_DAILY_AVAILABILITY_MINUTES,
  CANONICAL_TIME_ZONE,
  isExactLegacyDefaultAvailability,
  LEGACY_AVAILABILITY_MIGRATION_WARNING,
  migrateExactLegacyDefaultAvailability,
} from "../availabilityMigration";

function canonical() {
  return buildDataprev2026Profile3AppSeed().configuracao;
}

function legacy() {
  const config = structuredClone(canonical());
  config.metaHorariaDiariaMinutos = 180;
  config.disponibilidadeEstudo = createSixDayAvailability({
    minutesPerActiveDay: 180,
    restDay: 0,
    timeZone: "America/Fortaleza",
    includesBreaks: true,
  });
  return config;
}

describe("v3.35.0 canonical availability and conservative migration", () => {
  it("uses 120 minutes in the canonical seed", () => {
    expect(canonical().metaHorariaDiariaMinutos).toBe(120);
  });
  it("enables Monday through Saturday with 120 minutes", () => {
    expect(canonical().disponibilidadeEstudo.weekly.slice(1).every((d) => d.enabled && d.totalMinutes === 120)).toBe(true);
  });
  it("keeps Sunday unavailable", () => {
    expect(canonical().disponibilidadeEstudo.weekly[0]).toEqual({ dayOfWeek: 0, enabled: false, totalMinutes: 0 });
  });
  it("totals 720 normal weekly minutes", () => {
    expect(canonical().disponibilidadeEstudo.weekly.reduce((sum, d) => sum + d.totalMinutes, 0)).toBe(720);
  });
  it("uses America/Fortaleza", () => {
    expect(canonical().disponibilidadeEstudo.timeZone).toBe(CANONICAL_TIME_ZONE);
  });
  it("includes breaks", () => {
    expect(canonical().disponibilidadeEstudo.includesBreaks).toBe(true);
  });
  it("recognizes only the exact legacy profile", () => {
    expect(isExactLegacyDefaultAvailability(legacy())).toBe(true);
  });
  it("migrates the exact legacy profile to 120", () => {
    const result = migrateExactLegacyDefaultAvailability(legacy());
    expect(result.migrated).toBe(true);
    expect(result.config.metaHorariaDiariaMinutos).toBe(CANONICAL_DAILY_AVAILABILITY_MINUTES);
  });
  it("emits the required migration warning", () => {
    expect(migrateExactLegacyDefaultAvailability(legacy()).warning).toBe(LEGACY_AVAILABILITY_MIGRATION_WARNING);
  });
  it("is idempotent", () => {
    const first = migrateExactLegacyDefaultAvailability(legacy());
    const second = migrateExactLegacyDefaultAvailability(first.config);
    expect(second.migrated).toBe(false);
    expect(second.config).toEqual(first.config);
  });
  it("preserves a 90-minute customization", () => {
    const value = legacy(); value.metaHorariaDiariaMinutos = 90; value.disponibilidadeEstudo.weekly.slice(1).forEach((d) => d.totalMinutes = 90);
    expect(migrateExactLegacyDefaultAvailability(value)).toMatchObject({ migrated: false, config: value });
  });
  it("preserves a 150-minute customization", () => {
    const value = legacy(); value.metaHorariaDiariaMinutos = 150; value.disponibilidadeEstudo.weekly.slice(1).forEach((d) => d.totalMinutes = 150);
    expect(migrateExactLegacyDefaultAvailability(value)).toMatchObject({ migrated: false, config: value });
  });
  it("preserves legacy 180 when an override exists", () => {
    const value = legacy(); value.disponibilidadeEstudo.overrides.push({ date: "2026-07-20", totalMinutes: 60 });
    expect(migrateExactLegacyDefaultAvailability(value).migrated).toBe(false);
  });
  it("preserves a customized active day", () => {
    const value = legacy(); value.disponibilidadeEstudo.weekly[3].totalMinutes = 150;
    expect(migrateExactLegacyDefaultAvailability(value).migrated).toBe(false);
  });
  it("preserves a customized disabled weekday", () => {
    const value = legacy(); value.disponibilidadeEstudo.weekly[5] = { dayOfWeek: 5, enabled: false, totalMinutes: 0 };
    expect(migrateExactLegacyDefaultAvailability(value).migrated).toBe(false);
  });
  it("preserves a manually active Sunday", () => {
    const value = legacy(); value.disponibilidadeEstudo.weekly[0] = { dayOfWeek: 0, enabled: true, totalMinutes: 30 };
    expect(migrateExactLegacyDefaultAvailability(value).migrated).toBe(false);
  });
  it("preserves a custom timezone", () => {
    const value = legacy(); value.disponibilidadeEstudo.timeZone = "America/Sao_Paulo";
    expect(migrateExactLegacyDefaultAvailability(value).migrated).toBe(false);
  });
  it("preserves custom break semantics", () => {
    const value = legacy(); value.disponibilidadeEstudo.includesBreaks = false;
    expect(migrateExactLegacyDefaultAvailability(value).migrated).toBe(false);
  });
  it("reduces the remaining balance by time already used", () => {
    const result = calculateDailyAvailability({ date: "2026-07-20", config: canonical().disponibilidadeEstudo, completedStudy: [{ id: "s", date: "2026-07-20", minutes: 35, countsAgainstAvailability: true }] });
    expect(result).toMatchObject({ scheduledMinutes: 120, completedMinutes: 35, remainingMinutes: 85 });
  });
  it("keeps Sunday without mandatory balance", () => {
    const result = calculateDailyAvailability({ date: "2026-07-19", config: canonical().disponibilidadeEstudo, completedStudy: [] });
    expect(result).toMatchObject({ scheduledMinutes: 0, remainingMinutes: 0 });
  });
});
