import { describe, expect, it } from "vitest";
import {
  calculateBackupChecksum,
  prepareBackupForImport,
  validateBackup
} from "../backupIntegrity";
import type { BackupExportSchema } from "../../../types";

function backup(): BackupExportSchema {
  const value = {
    metadata: {
      versaoBackup: "2.0.0",
      exportadoEm: "2026-07-16T00:00:00.000Z",
      estudanteNome: "",
      totalTamanhoBytes: 0,
      appSource: "ConcurseiroOS" as const,
      integrityAlgorithm: "FNV1A64_CANONICAL_JSON" as const,
      checksum: ""
    },
    dados: {
      concursos: [{ id: "c1" }], editais: [], disciplinas: [{ id: "d1", concursoId: "c1" }],
      assuntos: [{ id: "a1", disciplinaId: "d1" }], subassuntos: [{ id: "s1", assuntoId: "a1" }],
      questoes: [], tentativasQuestoes: [], flashcards: [], documentos: [], resumos: [], anotacoes: [],
      planosEstudo: [], simulados: [], estatisticas: null, agenda: [], historicos: [], cronogramasRevisao: [],
      configuracao: null, conversasIA: [], sessoesEstudo: [], evidenciasAprendizagemGuiada: [],
      casosRecuperacaoErro: [], externalEvidenceLedger: [], itensBiblioteca: []
    }
  } as unknown as BackupExportSchema;
  value.metadata.checksum = calculateBackupChecksum(value);
  return value;
}

describe("backup integrity", () => {
  it("accepts a coherent backup with a valid checksum", () => {
    expect(validateBackup(backup())).toMatchObject({ valid: true, errors: [] });
  });

  it("rejects altered data", () => {
    const value = backup();
    value.dados.disciplinas[0].id = "changed";
    expect(validateBackup(value).errors).toContain("Assunto a1 referencia disciplina inexistente.");
    expect(validateBackup(value).errors).toContain("Checksum do backup não confere; o arquivo pode estar truncado ou alterado.");
  });

  it("rejects duplicate IDs and broken references", () => {
    const value = backup();
    value.dados.concursos.push({ ...value.dados.concursos[0] });
    value.metadata.checksum = calculateBackupChecksum(value);
    const result = validateBackup(value);
    expect(result.valid).toBe(false);
    expect(result.errors.some((item) => item.includes("IDs duplicados"))).toBe(true);
  });

  it("migrates a valid 1.0 snapshot that predates guided-learning evidence", () => {
    const value = backup() as BackupExportSchema & {
      dados: BackupExportSchema["dados"] & { evidenciasAprendizagemGuiada?: unknown; casosRecuperacaoErro?: unknown; externalEvidenceLedger?: unknown; sdeCalibrationLedger?: unknown };
    };
    value.metadata.versaoBackup = "1.0.0";
    delete value.metadata.checksum;
    delete value.metadata.integrityAlgorithm;
    delete value.dados.evidenciasAprendizagemGuiada;
    delete value.dados.casosRecuperacaoErro;
    delete value.dados.externalEvidenceLedger;
    delete value.dados.sdeCalibrationLedger;

    const prepared = prepareBackupForImport(value);
    expect(prepared.errors).toEqual([]);
    expect(prepared.migrated).toBe(true);
    expect(prepared.backup?.dados.evidenciasAprendizagemGuiada).toEqual([]);
    expect(prepared.backup?.dados.casosRecuperacaoErro).toEqual([]);
    expect(prepared.backup?.dados.externalEvidenceLedger).toEqual([]);
    expect(prepared.backup?.dados.sdeCalibrationLedger).toEqual([]);
    expect(prepared.warnings.join(" ")).toMatch(/snapshot antigo|backup legado/i);
  });


  it("rejects a calibration record that can affect the real prescription", () => {
    const value = backup();
    value.dados.sdeCalibrationLedger = [{
      calibrationId: "calibration-invalid",
      schemaVersion: 1,
      createdAt: "2026-07-16T12:00:00.000Z",
      referenceDate: "2026-07-16",
      inputFingerprint: "fnv1a-deadbeef",
      activeSdeVersion: "v1",
      executionMode: "shadow",
      affectsPrescription: true,
      v1Decision: {},
      v2Decision: null,
      divergences: [],
      isEqual: false,
      fallbackUsed: true,
      evidenceIds: [],
    }] as never;
    value.metadata.checksum = calculateBackupChecksum(value);
    expect(validateBackup(value).errors).toContain("Calibração calibration-invalid viola o isolamento shadow.");
  });

  it("never uses migration to hide a corrupted checksummed snapshot", () => {
    const value = backup();
    value.dados.disciplinas[0].id = "corrupted";
    delete (value.dados as BackupExportSchema["dados"] & { evidenciasAprendizagemGuiada?: unknown })
      .evidenciasAprendizagemGuiada;

    const prepared = prepareBackupForImport(value);
    expect(prepared.backup).toBeNull();
    expect(prepared.errors).toContain(
      "Checksum do backup não confere; o arquivo pode estar truncado ou alterado."
    );
  });
});
