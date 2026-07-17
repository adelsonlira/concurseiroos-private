import { describe, expect, it } from "vitest";
import { buildSectionsFromOutline, linesFromPdfTextItems, parseOutlineEntries } from "../privatePdfIndexer";

describe("private PDF local indexer", () => {
  it("reconstructs lines from PDF text items", () => {
    expect(linesFromPdfTextItems([
      { str: "1. Introdução", hasEOL: true },
      { str: "Modelagem", hasEOL: false },
      { str: "de dados", hasEOL: true }
    ])).toEqual(["1. Introdução", "Modelagem de dados"]);
  });

  it("extracts table-of-contents entries and page ranges", () => {
    const entries = parseOutlineEntries([
      "Introdução ........ 5",
      "Modelagem conceitual ........ 18",
      "Modelagem lógica ........ 31"
    ], 50);
    expect(entries).toEqual([
      { title: "Introdução", page: 5 },
      { title: "Modelagem conceitual", page: 18 },
      { title: "Modelagem lógica", page: 31 }
    ]);
    expect(buildSectionsFromOutline(entries, 50)).toEqual([
      { title: "Introdução", startPage: 5, endPage: 17, confidence: 0.72 },
      { title: "Modelagem conceitual", startPage: 18, endPage: 30, confidence: 0.72 },
      { title: "Modelagem lógica", startPage: 31, endPage: 50, confidence: 0.72 }
    ]);
  });

  it("falls back to a whole-document locator when no useful outline exists", () => {
    expect(buildSectionsFromOutline([], 77)).toEqual([
      { title: "Conteúdo integral", startPage: 1, endPage: 77, confidence: 0.35 }
    ]);
  });
});
