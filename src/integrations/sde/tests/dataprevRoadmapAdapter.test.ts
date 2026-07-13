import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { buildDataprevStrategicRoadmap } from "../dataprevRoadmapAdapter";

function snapshot() {
  const seed = buildDataprev2026Profile3AppSeed();
  return {
    seed,
    data: {
      configuracao: seed.configuracao,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      flashcards: [],
      cronogramasRevisao: []
    }
  };
}

describe("DATAPREV strategic roadmap adapter", () => {
  it("keeps a new candidate as no evidence instead of zero performance", () => {
    const { data } = snapshot();
    const roadmap = buildDataprevStrategicRoadmap(data, "2026-07-13");

    expect(roadmap.evidence.totalSubtopics).toBeGreaterThan(0);
    expect(roadmap.evidence.countsByState.NO_LEARNING_EVIDENCE).toBe(
      roadmap.evidence.totalSubtopics
    );
    expect(roadmap.evidence.profiles.every((item) => item.observedAccuracy === null)).toBe(true);
    expect(roadmap.evidence.roadmap[0].kind).toBe("NEW_CONTENT");
  });

  it("builds a seven-day recalculable preview from the same immutable snapshot", () => {
    const { data } = snapshot();
    const before = structuredClone(data);
    const roadmap = buildDataprevStrategicRoadmap(data, "2026-07-13");

    expect(roadmap.weekly.days).toHaveLength(7);
    expect(roadmap.weekly.days.some((day) => day.status === "REST_DAY")).toBe(true);
    expect(data).toEqual(before);
  });
});
