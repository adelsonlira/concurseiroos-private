import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { DATAPREV_KNOWLEDGE_GRAPH_V2 } from "../../../core/sde-v2/config";
import { runCompetitionDecisionForDate, runCompetitionDecisionForDateV1 } from "../competitionDecisionAdapter";
import { useConcurseiroStore } from "../../../store";
import type { ExternalEvidenceInput } from "../../../core/externalEvidence/types";

function snapshot(active: "v1" | "v2" = "v2") {
  const seed = buildDataprev2026Profile3AppSeed();
  seed.configuracao.activeSdeVersion = active;
  return {
    seed,
    value: {
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
  const { seed } = snapshot("v1");
  useConcurseiroStore.setState({
    concursos: [seed.concurso], editais: [seed.edital], disciplinas: seed.disciplinas,
    assuntos: seed.assuntos, subassuntos: seed.subassuntos, configuracao: seed.configuracao,
    estatisticas: seed.estatisticas, historicoAtividades: [], tentativasQuestoes: [], sessoesEstudo: [],
    flashcards: [], cronogramasRevisao: [], casosRecuperacaoErro: [], externalEvidenceLedger: [],
    sdeDecisionLedger: [], sdeCalibrationLedger: [], simulados: [], questoes: [], biblioteca: [], ultimaDecisaoSDE: null,
    activeConcursoId: seed.concurso.id,
  });
  return seed;
}

describe("SDE v2 application integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00.000Z"));
  });

  it("keeps SDE v1 as the effective prescription while SDE v2 runs in shadow", () => {
    const { value } = snapshot("v1");
    const effective = runCompetitionDecisionForDate(value, "2026-07-13");
    const pureV1 = runCompetitionDecisionForDateV1(value, "2026-07-13");
    expect(effective.status).toBe("SUCCESS");
    expect(effective.sdeVersionUsed).toBe("1.0");
    expect(effective.activeSdeVersion).toBe("v1");
    expect(effective.executionMode).toBe("shadow");
    expect(effective.affectsPrescription).toBe(false);
    expect(effective.prescription).toEqual(pureV1.prescription);
    expect(effective.actions).toEqual(pureV1.actions);
    expect(effective.v2?.decisionRecord?.sdeVersion).toBe("2.0");
    expect(effective.calibrationRecord).toMatchObject({ executionMode: "shadow", affectsPrescription: false });
  });

  it("keeps the SDE v2 engine available behind explicit technical activation", () => {
    const { value } = snapshot("v2");
    const result = runCompetitionDecisionForDate(value, "2026-07-13");
    expect(result.sdeVersionUsed).toBe("2.0");
    expect(result.activeSdeVersion).toBe("v2");
    expect(result.executionMode).toBe("active");
    expect(result.affectsPrescription).toBe(true);
    expect(result.calibrationRecord).toBeNull();
  });

  it("records an explainable append-only decision with alternatives", () => {
    const { value } = snapshot("v2");
    const result = runCompetitionDecisionForDate(value, "2026-07-13");
    expect(result.v2?.decisionRecord).toMatchObject({
      decisionId: expect.stringMatching(/^decision-v2-/),
      selectedNodeId: expect.any(String),
      selectedMethod: expect.any(String),
      hardRules: expect.any(Array),
      scoreComponents: expect.any(Array),
      alternativesConsidered: expect.any(Array),
    });
    expect(result.v2!.decisionRecord!.alternativesConsidered.length).toBeGreaterThan(0);
  });

  it("compares v1 and v2 without deleting the v1 result", () => {
    const { value } = snapshot("v2");
    const result = runCompetitionDecisionForDate(value, "2026-07-13");
    expect(result.v2?.comparisonWithV1.v1NodeId).toBeTruthy();
    expect(typeof result.v2?.comparisonWithV1.sameNode).toBe("boolean");
  });

  it("keeps incidence historical in shadow mode and unable to alter the selected action", () => {
    const { value } = snapshot("v2");
    const first = runCompetitionDecisionForDate(value, "2026-07-13");
    const selected = first.v2?.output.selected;
    expect(selected?.historicalIncidenceShadow.decisionWeight).toBe(0);
    expect(selected?.historicalIncidenceShadow.label).toMatch(/shadow mode/i);
  });

  it("creates a complete and reduced executable prescription", () => {
    const { value } = snapshot("v2");
    const result = runCompetitionDecisionForDate(value, "2026-07-13");
    const method = result.v2?.output.selected?.method;
    expect(method?.executionSequence.length).toBeGreaterThan(0);
    expect(method?.reducedPlan.length).toBeGreaterThan(0);
    expect(method?.advanceCriterion).toMatch(/80%/);
  });

  it("falls back safely when there is no daily availability", () => {
    const { value } = snapshot("v2");
    const result = runCompetitionDecisionForDate(value, "2026-07-12");
    expect(result.status).toBe("NO_TIME_AVAILABLE");
    expect(result.sdeVersionUsed).toBe("1.0");
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toMatch(/NO_TIME_AVAILABLE/);
  });

  it("saving valid objective evidence invalidates only the current decision", () => {
    const seed = resetStore();
    const first = useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    expect(first.status).toBe("SUCCESS");
    const subtopic = seed.subassuntos[0];
    const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const input: ExternalEvidenceInput = {
      evidenceType: "aggregate_question_batch", source: "qconcursos", disciplineId: topic.disciplinaId,
      topicId: topic.id, subtopicId: subtopic.id, examiningBoard: "FGV", totalQuestions: 10,
      correctAnswers: 7, wrongAnswers: 3, blankAnswers: 0, durationMinutes: 15, consultedMaterial: "no",
      perceivedConfidence: "not_informed", primaryErrorCause: "application", granularity: "aggregate",
    };
    const result = useConcurseiroStore.getState().registrarEvidenciaExterna(input);
    expect(result.success).toBe(true);
    expect(useConcurseiroStore.getState().ultimaDecisaoSDE).toBeNull();
    expect(useConcurseiroStore.getState().externalEvidenceLedger[0]).toMatchObject({ decisionStatus: "eligible_for_future_sde", affectsSde: true });
  });

  it("recalculation uses a valid external evidence ID and appends a new decision", () => {
    const seed = resetStore();
    const first = useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    const firstId = first.v2?.decisionRecord?.decisionId;
    const subtopic = seed.subassuntos[0];
    const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const saved = useConcurseiroStore.getState().registrarEvidenciaExterna({
      evidenceType: "aggregate_question_batch", source: "qconcursos", disciplineId: topic.disciplinaId,
      topicId: topic.id, subtopicId: subtopic.id, examiningBoard: "FGV", totalQuestions: 10,
      correctAnswers: 2, wrongAnswers: 8, blankAnswers: 0, durationMinutes: 15, consultedMaterial: "no",
      perceivedConfidence: "not_informed", primaryErrorCause: "conceptual_gap", granularity: "aggregate",
    });
    const second = useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    expect(saved.evidenceId).toBeTruthy();
    expect(second.v2?.output.normalizedEvidence.some((item) => item.evidenceId === saved.evidenceId && item.decisionEligible)).toBe(true);
    expect(useConcurseiroStore.getState().sdeDecisionLedger.length).toBeGreaterThanOrEqual(1);
    expect(second.v2?.decisionRecord?.decisionId).toBeTruthy();
    expect(second.calibrationRecord?.evidenceIds).toContain(saved.evidenceId);
    expect(useConcurseiroStore.getState().sdeCalibrationLedger.length).toBeGreaterThanOrEqual(2);
    if (firstId && second.v2?.decisionRecord?.decisionId && second.v2.decisionRecord.decisionId === firstId) {
      expect(second.calibrationRecord?.inputFingerprint).not.toBe(useConcurseiroStore.getState().sdeCalibrationLedger[0]?.inputFingerprint);
    }
  });

  it("does not use free observations as score input", () => {
    const seed = resetStore();
    const subtopic = seed.subassuntos[0];
    const topic = seed.assuntos.find((item) => item.id === subtopic.assuntoId)!;
    const base: ExternalEvidenceInput = {
      evidenceType: "aggregate_question_batch", source: "qconcursos", disciplineId: topic.disciplinaId,
      topicId: topic.id, subtopicId: subtopic.id, examiningBoard: "FGV", totalQuestions: 10,
      correctAnswers: 7, wrongAnswers: 3, blankAnswers: 0, durationMinutes: 15, consultedMaterial: "no",
      perceivedConfidence: "not_informed", primaryErrorCause: "application", granularity: "aggregate",
    };
    useConcurseiroStore.getState().registrarEvidenciaExterna({ ...base, notes: "observação um" });
    const first = useConcurseiroStore.getState().executarSDEParaData("2026-07-13").v2?.output.selected?.score;
    resetStore();
    useConcurseiroStore.getState().registrarEvidenciaExterna({ ...base, notes: "texto livre completamente diferente" });
    const second = useConcurseiroStore.getState().executarSDEParaData("2026-07-13").v2?.output.selected?.score;
    expect(second).toBe(first);
  });

  it("persists the SDE v2 decision ledger in backup without persisting ephemeral decision state", () => {
    resetStore();
    useConcurseiroStore.getState().executarSDEParaData("2026-07-13");
    const backup = useConcurseiroStore.getState().exportBackup();
    expect(backup.dados.sdeDecisionLedger?.length).toBeGreaterThan(0);
    expect("ultimaDecisaoSDE" in backup.dados).toBe(false);
  });

  it("keeps the approved graph data-driven and unchanged by the engine", () => {
    expect(DATAPREV_KNOWLEDGE_GRAPH_V2.version).toBe("dataprev-2026-profile-3-kg-v1");
    expect(DATAPREV_KNOWLEDGE_GRAPH_V2.edges).toHaveLength(20);
  });
});
