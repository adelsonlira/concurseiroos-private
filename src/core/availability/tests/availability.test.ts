import { describe, expect, it } from "vitest";
import {
  calculateDailyAvailability,
  createSixDayAvailability,
  validateStudyAvailabilityConfig
} from "../availabilityEngine";

function config() {
  return createSixDayAvailability({
    minutesPerActiveDay: 180,
    restDay: 0,
    timeZone: "America/Fortaleza",
    includesBreaks: true
  });
}

describe("Study availability engine", () => {
  it("configura 180 minutos de segunda a sábado e domingo sem estudo", () => {
    const value = config();
    expect(value.weekly.filter((day) => day.enabled)).toHaveLength(6);
    expect(value.weekly.find((day) => day.dayOfWeek === 0)).toEqual({
      dayOfWeek: 0,
      enabled: false,
      totalMinutes: 0
    });
  });

  it("retorna 180 minutos para uma segunda-feira", () => {
    const result = calculateDailyAvailability({
      date: "2026-07-13",
      config: config(),
      completedStudy: []
    });
    expect(result.scheduledMinutes).toBe(180);
    expect(result.remainingMinutes).toBe(180);
  });

  it("retorna zero no domingo configurado como descanso", () => {
    const result = calculateDailyAvailability({
      date: "2026-07-12",
      config: config(),
      completedStudy: []
    });
    expect(result.scheduledMinutes).toBe(0);
    expect(result.remainingMinutes).toBe(0);
  });

  it("desconta apenas estudo concluído no mesmo dia", () => {
    const result = calculateDailyAvailability({
      date: "2026-07-13",
      config: config(),
      completedStudy: [
        { id: "a", date: "2026-07-13", minutes: 45, countsAgainstAvailability: true },
        { id: "b", date: "2026-07-13", minutes: 30, countsAgainstAvailability: false },
        { id: "c", date: "2026-07-14", minutes: 60, countsAgainstAvailability: true }
      ]
    });
    expect(result.completedMinutes).toBe(45);
    expect(result.remainingMinutes).toBe(135);
  });

  it("nunca retorna saldo negativo", () => {
    const result = calculateDailyAvailability({
      date: "2026-07-13",
      config: config(),
      completedStudy: [
        { id: "a", date: "2026-07-13", minutes: 240, countsAgainstAvailability: true }
      ]
    });
    expect(result.remainingMinutes).toBe(0);
  });

  it("uma exceção diária substitui a grade semanal", () => {
    const value = config();
    value.overrides = [{ date: "2026-07-13", totalMinutes: 60, reason: "Compromisso" }];
    const result = calculateDailyAvailability({
      date: "2026-07-13",
      config: value,
      completedStudy: []
    });
    expect(result.source).toBe("DATE_OVERRIDE");
    expect(result.scheduledMinutes).toBe(60);
    expect(result.overrideReason).toBe("Compromisso");
  });

  it("rejeita grade semanal incompleta", () => {
    const value = config();
    value.weekly = value.weekly.slice(0, 6);
    expect(() => validateStudyAvailabilityConfig(value)).toThrow(/sete dias/i);
  });

  it("é determinístico e não modifica as entradas", () => {
    const value = config();
    const entries = [{ id: "a", date: "2026-07-13", minutes: 30, countsAgainstAvailability: true }];
    const before = structuredClone({ value, entries });
    const first = calculateDailyAvailability({ date: "2026-07-13", config: value, completedStudy: entries });
    const second = calculateDailyAvailability({ date: "2026-07-13", config: value, completedStudy: entries });
    expect(first).toEqual(second);
    expect({ value, entries }).toEqual(before);
  });
});
