import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../../components/OnlineAccountView.tsx", import.meta.url), "utf8");

describe("private vault presentation", () => {
  it("keeps discipline folders collapsible so the vault does not become one long list", () => {
    expect(source).toContain("<details key={group.id}");
    expect(source).toContain("As disciplinas ficam recolhidas por padrão");
  });
});
