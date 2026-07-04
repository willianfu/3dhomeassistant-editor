import { describe, expect, it } from "vitest";
import { getEnvironmentMapKind } from "./environment-map";

describe("getEnvironmentMapKind", () => {
  it("accepts hdr and exr environment maps", () => {
    expect(getEnvironmentMapKind("studio.HDR")).toBe("hdr");
    expect(getEnvironmentMapKind("interior.exr")).toBe("exr");
  });

  it("rejects mistyped erx files", () => {
    expect(getEnvironmentMapKind("interior.erx")).toBeNull();
  });
});
