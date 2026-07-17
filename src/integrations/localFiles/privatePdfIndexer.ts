import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export interface PrivatePdfIndexSectionDraft {
  title: string;
  startPage: number;
  endPage: number;
  confidence: number;
}

export interface PrivatePdfIndexDraft {
  fileName: string;
  sha256: string;
  totalPages: number;
  outlineText: string;
  sections: PrivatePdfIndexSectionDraft[];
}

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function linesFromPdfTextItems(items: readonly TextItemLike[]): string[] {
  const lines: string[] = [];
  let current = "";
  for (const item of items) {
    const text = typeof item.str === "string" ? item.str : "";
    if (text) current += `${current ? " " : ""}${text}`;
    if (item.hasEOL) {
      const clean = normalizeSpace(current);
      if (clean) lines.push(clean);
      current = "";
    }
  }
  const clean = normalizeSpace(current);
  if (clean) lines.push(clean);
  return lines;
}

export function parseOutlineEntries(
  lines: readonly string[],
  totalPages: number
): Array<{ title: string; page: number }> {
  const entries: Array<{ title: string; page: number }> = [];
  const seen = new Set<string>();
  const patterns = [
    /^(.{4,140}?)\s*[.·•…_-]{2,}\s*(\d{1,4})$/,
    /^(.{4,140}?)\s{2,}(\d{1,4})$/,
    /^(?:cap[ií]tulo|aula|m[oó]dulo|se[cç][aã]o|unidade)\s+[^\d]*?(.{2,120}?)\s+(\d{1,4})$/i
  ];

  for (const raw of lines) {
    const line = normalizeSpace(raw);
    if (!line || line.length > 180) continue;
    let match: RegExpMatchArray | null = null;
    for (const pattern of patterns) {
      match = line.match(pattern);
      if (match) break;
    }
    if (!match) continue;
    const page = Number(match[2]);
    const title = normalizeSpace(match[1].replace(/^[\d.\-–—\s]+/, ""));
    if (!title || page < 1 || page > totalPages) continue;
    const key = `${title.toLocaleLowerCase("pt-BR")}|${page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ title, page });
  }

  return entries
    .sort((a, b) => a.page - b.page || a.title.localeCompare(b.title, "pt-BR"))
    .filter((entry, index, all) => index === 0 || entry.page !== all[index - 1].page || entry.title !== all[index - 1].title)
    .slice(0, 120);
}

export function buildSectionsFromOutline(
  entries: readonly { title: string; page: number }[],
  totalPages: number
): PrivatePdfIndexSectionDraft[] {
  if (entries.length < 2) {
    return [{ title: "Conteúdo integral", startPage: 1, endPage: totalPages, confidence: 0.35 }];
  }

  return entries.map((entry, index) => ({
    title: entry.title,
    startPage: entry.page,
    endPage: Math.max(entry.page, (entries[index + 1]?.page ?? totalPages + 1) - 1),
    confidence: 0.72
  }));
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function indexPrivatePdfLocally(file: File): Promise<PrivatePdfIndexDraft> {
  if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("ONLY_PDF_SUPPORTED");
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = workerUrl;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await getDocument({ data: bytes }).promise;
  const totalPages = document.numPages;
  const outlineLines: string[] = [];
  const pagesToInspect = Math.min(totalPages, 20);

  for (let pageNumber = 1; pageNumber <= pagesToInspect; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    outlineLines.push(...linesFromPdfTextItems(content.items as TextItemLike[]));
  }

  const entries = parseOutlineEntries(outlineLines, totalPages);
  const sections = buildSectionsFromOutline(entries, totalPages);
  const outlineText = sections
    .slice(0, 80)
    .map((section) => `${section.title} — páginas ${section.startPage}-${section.endPage}`)
    .join("\n");

  return {
    fileName: file.name,
    sha256: await sha256Hex(file),
    totalPages,
    outlineText,
    sections
  };
}
