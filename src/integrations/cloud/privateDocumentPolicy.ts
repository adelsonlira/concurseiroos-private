const PDF_MIME = "application/pdf";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface PrivateDocumentFingerprint {
  name: string;
  sizeBytes: number | null;
  sha256: string | null;
  storagePath?: string;
}

export interface PrivateDocumentDuplicateMatch {
  kind: "EXACT_CONTENT" | "LEGACY_NAME_AND_SIZE";
  existingName: string;
  storagePath?: string;
}

export function isAllowedPrivateDocument(file: Pick<File, "name" | "type" | "size">): boolean {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const mimeAllowed = !file.type || file.type === PDF_MIME;
  return hasPdfExtension && mimeAllowed && file.size > 0;
}

export function sanitizeStorageFileName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "material.pdf";
}

export function buildPrivateStoragePath(userId: string, fileName: string, sha256: string): string {
  if (!SHA256_PATTERN.test(sha256)) throw new Error("INVALID_PRIVATE_DOCUMENT_SHA256");
  return `${userId}/documents/${sha256}--${sanitizeStorageFileName(fileName)}`;
}

export function normalizeMaterialFileName(name: string): string {
  return sanitizeStorageFileName(name)
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function calculatePrivateDocumentSha256(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function parseContentAddressedStorageName(storageName: string): {
  name: string;
  sha256: string | null;
} {
  const match = storageName.match(/^([a-f0-9]{64})--(.+)$/i);
  if (!match) return { name: storageName, sha256: null };
  return { name: match[2], sha256: match[1].toLowerCase() };
}

export function findPrivateDocumentDuplicate(
  candidate: PrivateDocumentFingerprint,
  existing: readonly PrivateDocumentFingerprint[]
): PrivateDocumentDuplicateMatch | null {
  if (candidate.sha256 && SHA256_PATTERN.test(candidate.sha256)) {
    const exact = existing.find(
      (item) => item.sha256?.toLowerCase() === candidate.sha256!.toLowerCase()
    );
    if (exact) {
      return {
        kind: "EXACT_CONTENT",
        existingName: exact.name,
        storagePath: exact.storagePath
      };
    }
  }

  const normalizedName = normalizeMaterialFileName(candidate.name);
  const legacy = existing.find(
    (item) =>
      !item.sha256 &&
      candidate.sizeBytes !== null &&
      item.sizeBytes !== null &&
      candidate.sizeBytes === item.sizeBytes &&
      normalizeMaterialFileName(item.name) === normalizedName
  );
  if (!legacy) return null;
  return {
    kind: "LEGACY_NAME_AND_SIZE",
    existingName: legacy.name,
    storagePath: legacy.storagePath
  };
}
