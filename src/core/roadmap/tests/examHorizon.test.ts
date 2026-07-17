import { describe, expect, it } from "vitest";
import { createSixDayAvailability } from "../../availability/availabilityEngine";
import { buildExamHorizonReport } from "../examHorizon";

const disciplines = [
  { disciplinaId: "esp", disciplinaNome: "Específicos", officialMaxPoints: 75, totalSubtopics: 10, noLearningEvidence: 8, withQuestionEvidence: 2, activeErrorOrRecovery: 0 },
  { disciplinaId: "port", disciplinaNome: "Português", officialMaxPoints: 12, totalSubtopics: 5, noLearningEvidence: 5, withQuestionEvidence: 0, activeErrorOrRecovery: 0 }
];

describe("exam horizon report", () => {
  it("computes the remaining capacity until the day before the exam", () => {
    const report = buildExamHorizonReport({
      referenceDate: "2026-07-13",
      examDate: "2026-07-20",
      availability: createSixDayAvailability({ minutesPerActiveDay: 120, restDay: 0 }),
      completedStudy: [{ id: "s", date: "2026-07-13", minutes: 30, countsAgainstAvailability: true }],
      disciplines
    });

    expect(report.daysUntilExam).toBe(7);
    expect(report.activeStudyDays).toBe(6);
    expect(report.scheduledMinutes).toBe(720);
    expect(report.remainingMinutes).toBe(690);
    expect(report.phase).toBe("EXAM_IMMINENT");
    expect(report.disciplines[0].officialPointShare).toBeCloseTo(86.2, 1);
  });

  it("does not interpret missing evidence as failure", () => {
    const report = buildExamHorizonReport({
      referenceDate: "2026-07-13",
      examDate: "2026-08-30",
      availability: createSixDayAvailability({ minutesPerActiveDay: 60 }),
      completedStudy: [],
      disciplines
    });

    expect(report.unassessedSubtopics).toBe(13);
    expect(report.warnings.join(" ")).toContain("ausência de medição");
    expect(report.disciplines[1].safetyStatus).toBe("UNASSESSED");
  });

  it("reports no active capacity instead of inventing study time", () => {
    const availability = createSixDayAvailability({ minutesPerActiveDay: 60 });
    availability.weekly = availability.weekly.map((day) => ({ ...day, enabled: false, totalMinutes: 0 }));
    const report = buildExamHorizonReport({
      referenceDate: "2026-07-13",
      examDate: "2026-07-20",
      availability,
      completedStudy: [],
      disciplines
    });

    expect(report.activeStudyDays).toBe(0);
    expect(report.remainingMinutes).toBe(0);
    expect(report.warnings.join(" ")).toContain("nenhum dia de estudo ativo");
  });
});
