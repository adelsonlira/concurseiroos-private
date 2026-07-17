import { ItemBiblioteca } from "../../types";

export function isPrivateLicensedLibraryItem(item: ItemBiblioteca): boolean {
  return item.privateMaterial?.rightsClassification === "PRIVATE_LICENSED_USER_COPY";
}

/**
 * Backups may carry the locator and user-authored metadata, but never embedded
 * copies/extractions of a licensed source document.
 */
export function sanitizeLibraryItemForBackup(item: ItemBiblioteca): ItemBiblioteca {
  if (!isPrivateLicensedLibraryItem(item)) return structuredClone(item);

  const sanitized = structuredClone(item);
  delete sanitized.conteudoMarkdown;
  delete sanitized.dadosMapaMental;
  if (sanitized.dadosPDF) {
    sanitized.dadosPDF = {
      totalPaginas: sanitized.dadosPDF.totalPaginas,
      indice: sanitized.dadosPDF.indice,
      indexStatus: sanitized.dadosPDF.indexStatus,
      indexedAt: sanitized.dadosPDF.indexedAt
    };
  }
  return sanitized;
}

export function sanitizeLibraryForBackup(items: readonly ItemBiblioteca[]): ItemBiblioteca[] {
  return items.map(sanitizeLibraryItemForBackup);
}

export function mergeLibrarySeedItems(
  current: readonly ItemBiblioteca[],
  seed: readonly ItemBiblioteca[]
): ItemBiblioteca[] {
  const byId = new Map(current.map((item) => [item.id, item] as const));
  for (const item of seed) {
    if (!byId.has(item.id)) byId.set(item.id, structuredClone(item));
  }
  return [...byId.values()];
}
