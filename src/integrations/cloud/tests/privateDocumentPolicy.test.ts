import { describe, expect, it } from "vitest";
import {
  buildPrivateStoragePath,
  isAllowedPrivateDocument,
  normalizeMaterialFileName,
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

  it("always creates a path inside the authenticated user folder", () => {
    const path = buildPrivateStoragePath("user-123", "Aula 01.pdf", new Date("2026-07-13T12:00:00Z"));
    expect(path.startsWith("user-123/2026-07-13/")).toBe(true);
    expect(path.endsWith("-Aula-01.pdf")).toBe(true);
  });

  it("normalizes filenames for matching the pre-indexed private catalog", () => {
    expect(normalizeMaterialFileName("Aula_01 - BANCO DE DADOS.pdf")).toBe(
      "aula 01 banco de dados"
    );
  });
});
