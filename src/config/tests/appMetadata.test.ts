import { describe, expect, it } from "vitest";
import packageMetadata from "../../../package.json";
import { APP_RELEASE_CHANNEL, APP_VERSION } from "../appMetadata";

describe("app metadata", () => {
  it("usa a versão do package.json como fonte única", () => {
    expect(APP_VERSION).toBe(packageMetadata.version);
    expect(APP_RELEASE_CHANNEL).toBe("PRIVATE BETA");
  });
});
