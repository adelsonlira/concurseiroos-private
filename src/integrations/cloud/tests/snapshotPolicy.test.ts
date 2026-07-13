import { describe, expect, it } from "vitest";
import type { BackupExportSchema } from "../../../types";
import { detectSyncConflict, fingerprintSnapshot, validateBackupSnapshot } from "../snapshotPolicy";
import type { CloudSnapshotRow, LocalSyncMetadata } from "../types";

function backup(): BackupExportSchema {
  return {
    metadata: {
      versaoBackup: "1.0.0",
      exportadoEm: "2026-07-13T12:00:00.000Z",
      estudanteNome: "Aluno",
      totalTamanhoBytes: 1,
      appSource: "ConcurseiroOS"
    },
    dados: {
      concursos: [],
      editais: [],
      disciplinas: [],
      assuntos: [],
      subassuntos: [],
      questoes: [],
      tentativasQuestoes: [],
      flashcards: [],
      documentos: [],
      resumos: [],
      anotacoes: [],
      planosEstudo: [],
      simulados: [],
      estatisticas: null,
      agenda: [],
      historicos: [],
      cronogramasRevisao: [],
      configuracao: null,
      conversasIA: [],
      sessoesEstudo: [],
      itensBiblioteca: []
    }
  };
}

function metadata(baseRevision: number | null): LocalSyncMetadata {
  return {
    deviceId: "device-1",
    baseRevision,
    remoteUpdatedAt: null,
    lastSuccessfulSyncAt: null,
    localFingerprint: null
  };
}

function remote(revision: number): CloudSnapshotRow {
  return {
    user_id: "user-1",
    snapshot: backup(),
    revision,
    device_id: "device-2",
    updated_at: "2026-07-13T12:00:00.000Z"
  };
}

describe("cloud snapshot policy", () => {
  it("rejects unknown JSON as a ConcurseiroOS backup", () => {
    expect(validateBackupSnapshot({ metadata: { appSource: "other" }, dados: {} })).toBe(false);
    expect(validateBackupSnapshot(backup())).toBe(true);
  });

  it("detects a remote snapshot before this device has a base revision", () => {
    expect(detectSyncConflict(remote(1), metadata(null))?.reason).toBe(
      "REMOTE_EXISTS_WITHOUT_LOCAL_BASE"
    );
  });

  it("detects a remote revision newer than the local base", () => {
    expect(detectSyncConflict(remote(4), metadata(3))?.reason).toBe(
      "REMOTE_NEWER_THAN_LOCAL_BASE"
    );
  });

  it("does not report a conflict when revisions match", () => {
    expect(detectSyncConflict(remote(4), metadata(4))).toBeNull();
  });

  it("creates a deterministic fingerprint independent of object key order", () => {
    const first = backup();
    const second = JSON.parse(JSON.stringify(first)) as BackupExportSchema;
    expect(fingerprintSnapshot(first)).toBe(fingerprintSnapshot(second));
  });
});
