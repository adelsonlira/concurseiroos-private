import { beforeEach, describe, expect, it } from "vitest";
import { useConcurseiroStore } from "../../../store";
import { calculateBackupChecksum, prepareBackupForImport } from "../../backup/backupIntegrity";
import { fingerprintSnapshot, hasMeaningfulLocalProgress } from "../../../integrations/cloud/snapshotPolicy";
import type { ExternalEvidenceInput } from "..";
import type { BackupExportSchema } from "../../../types";

function aggregate(overrides: Partial<ExternalEvidenceInput> = {}): ExternalEvidenceInput {
  return {
    evidenceType: "aggregate_question_batch",
    source: "qconcursos",
    prescriptionId: "prescription-1",
    sessionId: "session-1",
    disciplineId: "d1",
    topicId: "a1",
    subtopicId: "s1",
    syllabusItemId: "s1",
    examiningBoard: "FGV",
    totalQuestions: 20,
    correctAnswers: 14,
    wrongAnswers: 5,
    blankAnswers: 1,
    durationMinutes: 30,
    plannedQuestions: 20,
    actualQuestions: 20,
    consultedMaterial: "no",
    perceivedConfidence: "not_informed",
    primaryErrorCause: "not_identified",
    granularity: "aggregate",
    ...overrides,
  };
}

function resetStore() {
  useConcurseiroStore.setState({
    concursos: [{ id: "c1" }] as never,
    disciplinas: [{ id: "d1", concursoId: "c1", nome: "Banco de Dados", isDeleted: false }] as never,
    assuntos: [{ id: "a1", disciplinaId: "d1", nome: "SQL", isDeleted: false }] as never,
    subassuntos: [{ id: "s1", assuntoId: "a1", nome: "Consultas", isDeleted: false }] as never,
    tentativasQuestoes: [],
    externalEvidenceLedger: [],
    cronogramasRevisao: [],
    casosRecuperacaoErro: [],
    historicoAtividades: [],
    ultimaDecisaoSDE: { decision: "sentinel" } as never,
  });
}

describe("external evidence store integration", () => {
  beforeEach(resetStore);

  it("one aggregate batch appends exactly one ledger event and no synthetic attempts", () => {
    const before = useConcurseiroStore.getState();
    const attempts = before.tentativasQuestoes;
    const result = before.registrarEvidenciaExterna(aggregate());
    const after = useConcurseiroStore.getState();
    expect(result.success).toBe(true);
    expect(after.externalEvidenceLedger).toHaveLength(1);
    expect(after.tentativasQuestoes).toBe(attempts);
    expect(after.tentativasQuestoes).toHaveLength(0);
  });

  it("invalidates only the current decision while preserving mastery statistics, priorities and legacy records", () => {
    const before = useConcurseiroStore.getState();
    const decision = before.ultimaDecisaoSDE;
    const stats = before.estatisticas;
    const disciplines = before.disciplinas;
    const topics = before.assuntos;
    const attempts = before.tentativasQuestoes;
    before.registrarEvidenciaExterna(aggregate());
    const after = useConcurseiroStore.getState();
    expect(decision).not.toBeNull();
    expect(after.ultimaDecisaoSDE).toBeNull();
    expect(after.estatisticas).toBe(stats);
    expect(after.disciplinas).toBe(disciplines);
    expect(after.assuntos).toBe(topics);
    expect(after.tentativasQuestoes).toBe(attempts);
  });

  it("correction and void are append-only and preserve original IDs", () => {
    const first = useConcurseiroStore.getState().registrarEvidenciaExterna(aggregate());
    expect(first.evidenceId).toBeTruthy();
    const correction = useConcurseiroStore.getState().corrigirEvidenciaExterna(first.evidenceId!, aggregate({ correctAnswers: 16, wrongAnswers: 3 }));
    expect(correction.success).toBe(true);
    expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(2);
    expect(useConcurseiroStore.getState().externalEvidenceLedger[0]?.evidenceId).toBe(first.evidenceId);
    const voidResult = useConcurseiroStore.getState().anularEvidenciaExterna(correction.evidenceId!);
    expect(voidResult.success).toBe(true);
    expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(3);
    expect(useConcurseiroStore.getState().externalEvidenceLedger[2]?.voidsEvidenceId).toBe(correction.evidenceId);
  });

  it("backup and cloud fingerprint include the ledger and restoration preserves IDs", () => {
    const created = useConcurseiroStore.getState().registrarEvidenciaExterna(aggregate());
    const backup = useConcurseiroStore.getState().exportBackup();
    expect(backup.dados.externalEvidenceLedger.map((item) => item.evidenceId)).toEqual([created.evidenceId]);
    expect(hasMeaningfulLocalProgress(backup)).toBe(true);

    const empty = structuredClone(backup);
    empty.dados.externalEvidenceLedger = [];
    empty.metadata.checksum = calculateBackupChecksum(empty);
    expect(fingerprintSnapshot(backup)).not.toBe(fingerprintSnapshot(empty));

    resetStore();
    const restored = useConcurseiroStore.getState().importBackup(backup);
    expect(restored.success).toBe(true);
    expect(useConcurseiroStore.getState().externalEvidenceLedger[0]?.evidenceId).toBe(created.evidenceId);
  });

  it("migrates legacy backups additively without rewriting old attempts", () => {
    const backup = useConcurseiroStore.getState().exportBackup() as BackupExportSchema & {
      dados: BackupExportSchema["dados"] & { externalEvidenceLedger?: unknown };
    };
    backup.dados.tentativasQuestoes = [{
      id: "legacy-attempt",
      questaoId: "external-legacy",
      concursoId: "c1",
      disciplinaId: "d1",
      assuntoId: "a1",
      subassuntoId: "s1",
      opcaoSelecionadaId: "MANUAL_CORRETA",
      acertou: true,
      origem: "TREINO_ISOLADO",
      tempoRespostaSegundos: 30,
      respondidaEm: "2026-07-18T11:00:00.000Z",
      registradaManualmente: true
    }] as never;
    delete backup.dados.externalEvidenceLedger;
    backup.metadata.checksum = calculateBackupChecksum(backup as BackupExportSchema);
    const prepared = prepareBackupForImport(backup);
    expect(prepared.migrated).toBe(true);
    expect(prepared.backup?.dados.externalEvidenceLedger).toEqual([]);
    expect(prepared.backup?.dados.tentativasQuestoes[0]?.id).toBe("legacy-attempt");
  });

  it("rejects correction or void against missing evidence", () => {
    expect(useConcurseiroStore.getState().corrigirEvidenciaExterna("missing", aggregate()).success).toBe(false);
    expect(useConcurseiroStore.getState().anularEvidenciaExterna("missing").success).toBe(false);
  });
});
