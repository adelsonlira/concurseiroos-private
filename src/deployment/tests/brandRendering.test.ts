import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("brand rendering", () => {
  it("renders the product mark without deployment-time static image dependencies", () => {
    const sidebar = readFileSync(resolve(process.cwd(), "src/components/Sidebar.tsx"), "utf8");
    const accessGate = readFileSync(resolve(process.cwd(), "src/components/AccessGate.tsx"), "utf8");
    const brandMark = readFileSync(resolve(process.cwd(), "src/components/BrandMark.tsx"), "utf8");

    expect(sidebar).toContain("<BrandMark");
    expect(accessGate).toContain("<BrandMark");
    expect(sidebar).not.toContain('/brand/');
    expect(accessGate).not.toContain('/brand/');
    expect(brandMark).toContain("<svg");
    expect(brandMark).toContain("aria-label={title}");
  });
});
