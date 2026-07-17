import { describe, expect, it } from "vitest";
import type { BackupExportSchema } from "../../../types";
import {
  decideSyncReconciliation,
  detectSyncConflict,
  fingerprintSnapshot,
  validateBackupSnapshot
} from "../snapshotPolicy";
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
      evidenciasAprendizagemGuiada: [],
      casosRecuperacaoErro: [],
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

function syncedMetadata(baseRevision: number, snapshot: BackupExportSchema): LocalSyncMetadata {
  return {
    ...metadata(baseRevision),
    localFingerprint: fingerprintSnapshot(snapshot)
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

  it("ignores volatile export metadata in the local fingerprint", () => {
    const first = backup();
    const second = backup();
    second.metadata.exportadoEm = "2026-07-14T15:00:00.000Z";
    second.metadata.totalTamanhoBytes = 9999;
    expect(fingerprintSnapshot(first)).toBe(fingerprintSnapshot(second));
  });

  it("restores the cloud automatically on a clean new device", () => {
    expect(decideSyncReconciliation(remote(3), metadata(null), backup())).toBe("RESTORE_CLOUD");
  });

  it("requires a decision when a new device already has meaningful local progress", () => {
    const local = backup();
    local.dados.sessoesEstudo = [{ id: "session-1" }] as never;
    expect(decideSyncReconciliation(remote(3), metadata(null), local)).toBe("CONFLICT");
  });

  it("restores remote-only changes and pushes local-only changes", () => {
    const local = backup();
    const base = syncedMetadata(2, local);
    expect(decideSyncReconciliation(remote(3), base, local)).toBe("RESTORE_CLOUD");

    local.dados.anotacoes = [{ id: "note-1" }] as never;
    expect(decideSyncReconciliation(remote(2), base, local)).toBe("PUSH_LOCAL");
  });

  it("interrupts only when local and remote changed from the same base", () => {
    const original = backup();
    const base = syncedMetadata(2, original);
    const changed = backup();
    changed.dados.anotacoes = [{ id: "note-1" }] as never;
    expect(decideSyncReconciliation(remote(3), base, changed)).toBe("CONFLICT");
  });
});
