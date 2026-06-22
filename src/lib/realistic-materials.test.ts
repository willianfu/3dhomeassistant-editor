import { describe, expect, it } from "vitest";
import { resolveRealisticMaterialRole } from "./realistic-materials";

describe("realistic material rules", () => {
  it("detects glass, curtain, metal, emissive, and wall roles from names", () => {
    expect(resolveRealisticMaterialRole("Window_Glass", "clear pane")).toBe("glass");
    expect(resolveRealisticMaterialRole("curtain_left", "fabric")).toBe("fabric");
    expect(resolveRealisticMaterialRole("fridge door", "brushed metal")).toBe("metal");
    expect(resolveRealisticMaterialRole("tv_screen", "black screen")).toBe("emissive");
    expect(resolveRealisticMaterialRole("interior wall", "paint")).toBe("wall");
  });

  it("returns null for generic objects", () => {
    expect(resolveRealisticMaterialRole("chair", "default")).toBeNull();
  });
});
