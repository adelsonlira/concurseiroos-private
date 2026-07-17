import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../../components/LibraryView.tsx", import.meta.url), "utf8");

describe("library governance", () => {
  it("não altera o edital a partir de sugestão automática de material", () => {
    expect(source).not.toContain("addAssunto(");
    expect(source).not.toContain('prioridadeEdital: "MEDIA"');
    expect(source).toContain("O edital não foi alterado");
  });
});
