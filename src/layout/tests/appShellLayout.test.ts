import { describe, expect, it } from "vitest";
import { WORKSPACE_CONTENT_CLASS_NAME } from "../appShellLayout";

describe("appShellLayout", () => {
  it("mantém o conteúdo principal em uma coluna flexível com altura limitada", () => {
    const classes = WORKSPACE_CONTENT_CLASS_NAME.split(/\s+/);

    for (const requiredClass of ["flex", "min-h-0", "flex-1", "flex-col", "overflow-hidden"]) {
      expect(classes).toContain(requiredClass);
    }
  });
});
