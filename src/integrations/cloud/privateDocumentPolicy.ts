const PDF_MIME = "application/pdf";

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

export function buildPrivateStoragePath(userId: string, fileName: string, now = new Date()): string {
  const datePrefix = now.toISOString().slice(0, 10);
  return `${userId}/${datePrefix}/${Date.now()}-${sanitizeStorageFileName(fileName)}`;
}

export function normalizeMaterialFileName(name: string): string {
  return sanitizeStorageFileName(name)
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
