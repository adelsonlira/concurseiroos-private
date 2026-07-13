import { describe, expect, it } from "vitest";
import { createSixDayAvailability } from "../../availability/availabilityEngine";
import { buildWeeklyCalibrationReport } from "../weeklyCalibration";

const availability = createSixDayAvailability({
  minutesPerActiveDay: 180,
  restDay: 0,
  timeZone: "America/Fortaleza"
});

describe("weekly calibration", () => {
  it("computes the Monday-Sunday window and only uses real records", () => {
    const report = buildWeeklyCalibrationReport({
      referenceDate: "2026-07-15",
      availability,
      sessions: [
        {
          id: "s1",
          disciplinaId: "d1",
          atividadeEstudo: "teoria",
          tempoGastoSegundos: 3600,
          dataInicio: "2026-07-13T08:00:00-03:00",
          dataFim: "2026-07-13T09:00:00-03:00",
          dataLocal: "2026-07-13",
          contabilizaNaDisponibilidade: true,
          decisaoSDE: { duracaoPlanejadaMinutos: 50 }
        },
        {
          id: "outside",
          disciplinaId: "d1",
          atividadeEstudo: "questoes",
          tempoGastoSegundos: 600,
          dataInicio: "2026-07-20T08:00:00-03:00",
          dataFim: "2026-07-20T08:10:00-03:00",
          dataLocal: "2026-07-20"
        }
      ],
      attempts: [
        {
          id: "a1",
          respondidaEm: "2026-07-14T10:00:00-03:00",
          acertou: true,
          disciplinaId: "d1",
          assuntoId: "a1",
          subassuntoId: "sub1"
        }
      ],
      reviewSchedules: [],
      activities: [
        {
          dataHora: "2026-07-13T09:00:00-03:00",
          tipoAtividade: "ESTUDO_TEORIA",
          subassuntoId: "sub1",
          metadata: { markTheoryCompleted: true }
        }
      ],
      subtopics: [
        { id: "sub1", completado: true },
        { id: "sub2", completado: false }
      ]
    });

    expect(report.period).toMatchObject({ startDate: "2026-07-13", endDate: "2026-07-19" });
    expect(report.availability.scheduledMinutes).toBe(1080);
    expect(report.availability.recordedMinutes).toBe(60);
    expect(report.execution.totalSessions).toBe(1);
    expect(report.execution.observedPlanDifferenceMinutes).toBe(10);
    expect(report.questions).toMatchObject({ attempts: 1, correct: 1, distinctSubtopics: 1 });
    expect(report.progression.newlyConfirmedSubtopics).toBe(1);
    expect(report.guardrails.protectNewContentNextWeek).toBe(false);
  });

  it("flags missing duration without inventing review efficiency", () => {
    const report = buildWeeklyCalibrationReport({
      referenceDate: "2026-07-15",
      availability,
      sessions: [
        {
          id: "review-session",
          disciplinaId: "d1",
          atividadeEstudo: "revisao",
          tempoGastoSegundos: 300,
          dataInicio: "2026-07-14T08:00:00-03:00",
          dataFim: "2026-07-14T08:05:00-03:00",
          dataLocal: "2026-07-14"
        }
      ],
      attempts: [],
      reviewSchedules: [
        {
          id: "r1",
          subassuntoId: "sub1",
          historicoTentativas: [
            {
              revisadoEm: "2026-07-14T08:05:00-03:00",
              desempenhoAutoAvaliado: "MEDIUM",
              metodoAplicado: "ADAPTIVE_RETRIEVAL"
            }
          ]
        }
      ],
      activities: [],
      subtopics: [{ id: "sub1", completado: false }]
    });

    expect(report.reviews.completed).toBe(1);
    expect(report.reviews.timedCompleted).toBe(0);
    expect(report.reviews.timedMinutes).toBe(0);
    expect(report.dataQuality.reviewEntriesWithoutDuration).toBe(1);
    expect(report.guardrails.protectNewContentNextWeek).toBe(true);
  });
});
