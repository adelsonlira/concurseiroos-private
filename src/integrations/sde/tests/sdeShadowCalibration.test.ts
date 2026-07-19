import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import type { ExternalEvidenceInput } from "../../../core/externalEvidence/types";
import type { SdeV1V2Comparison } from "../../../core/sde-v2/types";
import { useConcurseiroStore } from "../../../store";
import { runCompetitionDecisionForDate, runCompetitionDecisionForDateV1 } from "../competitionDecisionAdapter";
import { buildSdeCalibrationRecord } from "../v2/calibrationLedger";


function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key); },
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}

function makeSnapshot() {
  const seed = buildDataprev2026Profile3AppSeed();
  seed.configuracao.activeSdeVersion = "v1";
  return {
    seed,
    snapshot: {
      configuracao: seed.configuracao,
      subassuntos: seed.subassuntos,
      tentativasQuestoes: [],
      sessoesEstudo: [],
      flashcards: [],
      cronogramasRevisao: [],
      externalEvidenceLedger: [],
      simulados: [],
      questoes: [],
      decisionLedger: [],
    },
  };
}

function resetStore() {
  const { seed } = makeSnapshot();
  useConcurseiroStore.setState({
    concursos: [seed.concurso],
    editais: [seed.edital],
    disciplinas: seed.disciplinas,
    assuntos: seed.assuntos,
    subassuntos: seed.subassuntos,
    configuracao: seed.configuracao,
    estatisticas: seed.estatisticas,
    historicoAtividades: [],
    tentativasQuestoes: [],
    sessoesEstudo: [],
    flashcards: [],
    cronogramasRevisao: [],
    casosRecuperacaoErro: [],
    externalEvidenceLedger: [],
    sdeDecisionLedger: [],
    sdeCalibrationLedger: [],
    simulados: [],
    questoes: [],
    biblioteca: seed.biblioteca,
    ultimaDecisaoSDE: null,
    activeConcursoId: seed.concurso.id,
  });
  return seed;
}

describe("SDE v2 prospective calibration shadow mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00.000Z"));
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("uses SDE v1 as the effective decision and runs SDE v2 in parallel", () => {
    const { snapshot } = makeSnapshot();
    const effective = runCompetitionDecisionForDate(snapshot, "2026-07-13");
    const v1 = runCompetitionDecisionForDateV1(snapshot, "2026-07-13");
    expect(effective.sdeVersionUsed).toBe("1.0");
    expect(effective.executionMode).toBe("shadow");
    expect(effective.affectsPrescription).toBe(false);
    expect(effective.actions).toEqual(v1.actions);
    expect(effective.planner).toEqual(v1.planner);
    expect(effective.prescription).toEqual(v1.prescription);
    expect(effective.v2?.output.status).toBe("SUCCESS");
  });

  it("records all required divergence dimensions without affecting prescription", () => {
    const { snapshot } = makeSnapshot();
    const result = runCompetitionDecisionForDate(snapshot, "2026-07-13");
    const record = result.calibrationRecord!;
    expect(record).toMatchObject({
      activeSdeVersion: "v1",
      executionMode: "shadow",
      affectsPrescription: false,
      schemaVersion: 1,
    });
    expect(record.divergences.map((item) => item.field)).toEqual(
      expect.arrayContaining(["topic", "subtopic", "method", "duration", "advance_criterion", "score"]),
    );
    expect(record.v1Decision.version).toBe("1.0");
    expect(record.v2Decision?.version).toBe("2.0");
  });

  it("can register equality explicitly", () => {
    const { snapshot } = makeSnapshot();
    const v1 = runCompetitionDecisionForDateV1(snapshot, "2026-07-13");
    const v1Action = v1.actions[0]!;
    const common = {
      status: "SUCCESS",
      disciplineId: v1Action.disciplinaId,
      topicId: v1Action.assuntoId,
      subtopicId: v1Action.subassuntoId ?? null,
      method: v1Action.tipo,
      durationMinutes: v1.prescription?.current?.durationMinutes ?? null,
      advanceCriterion: v1.prescription?.current?.completionEvidence.join(" | ") ?? null,
      prerequisiteSummary: null,
      score: v1Action.score,
      topFactors: [],
    };
    const comparison: SdeV1V2Comparison = {
      sameNode: true,
      sameActivity: true,
      v1NodeId: common.subtopicId,
      v1Activity: common.method,
      divergenceReasons: [],
      v1: { ...common, version: "1.0" },
      v2: { ...common, version: "2.0" },
      divergences: [],
      isEqual: true,
    };
    const record = buildSdeCalibrationRecord({
      referenceDate: "2026-07-13",
      v1Result: v1,
      v2Result: { ...v1, sdeVersionUsed: "2.0", activeSdeVersion: "v2", fallbackUsed: false },
      comparison,
    });
    expect(record.isEqual).toBe(true);
    expect(record.divergences).toEqual([]);
    expect(record.fallbackUsed).toBe(false);
  });

  it("records fallback when SDE v2 inputs are not executable", () => {
    const { snapshot } = makeSnapshot();
    const result = runCompetitionDecisionForDate(snapshot, "2026-07-12");
    expect(result.status).toBe("NO_TIME_AVAILABLE");
    expect(result.sdeVersionUsed).toBe("1.0");
    expect(result.calibrationRecord).toMatchObject({ fallbackUsed: true, executionMode: "shadow" });
    expect(result.calibrationRecord?.fallbackReason).toMatch(/não produziu decisão executável|NO_TIME_AVAILABLE/i);
  });

  it("keeps historical incidence at decision weight zero", () => {
    const { snapshot } = makeSnapshot();
    const result = runCompetitionDecisionForDate(snapshot, "2026-07-13");
    expect(result.v2?.output.selected?.historicalIncidenceShadow.decisionWeight).toBe(0);
    expect(result.calibrationRecord?.historicalIncidenceShadow?.decisionWeight).toBe(0);
  });

  it("appends once and does not duplicate on reload with unchanged inputs", () => {
    resetStore();
    const first = useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    const second = useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    const ledger = useConcurseiroStore.getState().sdeCalibrationLedger;
    expect(first.calibrationRecord?.calibrationId).toBe(second.calibrationRecord?.calibrationId);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].calibrationId).toBe(first.calibrationRecord?.calibrationId);
  });

  it("appends a new comparison only after objective inputs change and never duplicates evidence", () => {
    const seed = resetStore();
    useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    const subtopic = seed.subassuntos[0];
    const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const input: ExternalEvidenceInput = {
      evidenceType: "aggregate_question_batch",
      source: "qconcursos",
      disciplineId: topic.disciplinaId,
      topicId: topic.id,
      subtopicId: subtopic.id,
      examiningBoard: "FGV",
      totalQuestions: 10,
      correctAnswers: 7,
      wrongAnswers: 3,
      blankAnswers: 0,
      durationMinutes: 20,
      consultedMaterial: "no",
      perceivedConfidence: "not_informed",
      primaryErrorCause: "application",
      granularity: "aggregate",
    };
    const saved = useConcurseiroStore.getState().registrarEvidenciaExterna(input);
    useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    const state = useConcurseiroStore.getState();
    expect(state.externalEvidenceLedger).toHaveLength(1);
    expect(state.sdeCalibrationLedger).toHaveLength(2);
    expect(state.sdeCalibrationLedger[1].evidenceIds.filter((id) => id === saved.evidenceId)).toHaveLength(1);
  });

  it("persists and restores the append-only calibration ledger with stable IDs", () => {
    resetStore();
    useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    const backup = useConcurseiroStore.getState().exportBackup();
    const originalId = backup.dados.sdeCalibrationLedger?.[0]?.calibrationId;
    expect(originalId).toMatch(/^sde-calibration-/);
    useConcurseiroStore.getState().resetAllData();
    const imported = useConcurseiroStore.getState().importBackup(backup);
    expect(imported.success).toBe(true);
    expect(useConcurseiroStore.getState().sdeCalibrationLedger[0]?.calibrationId).toBe(originalId);
  });

  it("forces the versioned activation back to v1 for existing v2 configuration snapshots", () => {
    resetStore();
    useConcurseiroStore.getState().updateConfiguracao({ activeSdeVersion: "v2" });
    expect(useConcurseiroStore.getState().configuracao.activeSdeVersion).toBe("v1");
  });
});
