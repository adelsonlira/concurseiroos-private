import { describe, expect, it } from "vitest";
import {
  buildPrivateStoragePath,
  calculatePrivateDocumentSha256,
  findPrivateDocumentDuplicate,
  isAllowedPrivateDocument,
  normalizeMaterialFileName,
  parseContentAddressedStorageName,
  sanitizeStorageFileName
} from "../privateDocumentPolicy";

describe("private document policy", () => {
  it("accepts only non-empty PDFs", () => {
    expect(isAllowedPrivateDocument({ name: "aula.pdf", type: "application/pdf", size: 100 })).toBe(true);
    expect(isAllowedPrivateDocument({ name: "aula.exe", type: "application/octet-stream", size: 100 })).toBe(false);
    expect(isAllowedPrivateDocument({ name: "aula.pdf", type: "application/pdf", size: 0 })).toBe(false);
  });

  it("removes accents and unsafe path characters", () => {
    expect(sanitizeStorageFileName("Aula 01 — Segurança/OWASP.pdf")).toBe(
      "Aula-01-Seguranca-OWASP.pdf"
    );
  });

  it("creates a deterministic content-addressed path inside the authenticated user folder", () => {
    const sha256 = "a".repeat(64);
    const path = buildPrivateStoragePath("user-123", "Aula 01.pdf", sha256);
    expect(path).toBe(`user-123/documents/${sha256}--Aula-01.pdf`);
    expect(parseContentAddressedStorageName(`${sha256}--Aula-01.pdf`)).toEqual({
      name: "Aula-01.pdf",
      sha256
    });
  });

  it("normalizes filenames for matching the pre-indexed private catalog", () => {
    expect(normalizeMaterialFileName("Aula_01 - BANCO DE DADOS.pdf")).toBe(
      "aula 01 banco de dados"
    );
  });

  it("calculates a stable SHA-256 digest for exact-content deduplication", async () => {
    const digest = await calculatePrivateDocumentSha256(new Blob(["abc"]));
    expect(digest).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("rejects exact content even when the filename is different", () => {
    const sha256 = "b".repeat(64);
    expect(findPrivateDocumentDuplicate(
      { name: "novo-nome.pdf", sizeBytes: 200, sha256 },
      [{ name: "nome-antigo.pdf", sizeBytes: 200, sha256, storagePath: "u/documents/file.pdf" }]
    )).toEqual({
      kind: "EXACT_CONTENT",
      existingName: "nome-antigo.pdf",
      storagePath: "u/documents/file.pdf"
    });
  });

  it("uses filename and size only as a legacy fallback when no hash exists", () => {
    expect(findPrivateDocumentDuplicate(
      { name: "Aula 01.pdf", sizeBytes: 200, sha256: "c".repeat(64) },
      [{ name: "aula-01.pdf", sizeBytes: 200, sha256: null }]
    )?.kind).toBe("LEGACY_NAME_AND_SIZE");
  });
});
