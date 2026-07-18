import { describe, expect, it } from "vitest";
import { resolveAppNavigationFromLocation } from "../../../navigation/appNavigationState";
import {
  EXTERNAL_EVIDENCE_ROUTE,
  EXTERNAL_EVIDENCE_ROUTE_ALIASES,
  isExternalEvidenceHash,
} from "../navigation";

describe("external evidence navigation", () => {
  it("opens the reused exercise screen at the canonical result route", () => {
    expect(resolveAppNavigationFromLocation(EXTERNAL_EVIDENCE_ROUTE).activeTab).toBe("exercises");
  });

  it("preserves aliases for previous question registration links", () => {
    for (const alias of EXTERNAL_EVIDENCE_ROUTE_ALIASES) {
      expect(isExternalEvidenceHash(alias)).toBe(true);
      expect(resolveAppNavigationFromLocation(alias).activeTab).toBe("exercises");
    }
  });
});
