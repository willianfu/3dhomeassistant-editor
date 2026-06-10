import { describe, expect, it } from "vitest";
import { placeFloatingPanel } from "./floating-panel-placement";

describe("floating-panel-placement", () => {
  it("places the panel centered above the anchor when there is room", () => {
    expect(
      placeFloatingPanel({
        anchor: { x: 500, y: 400 },
        panel: { width: 300, height: 240 },
        viewport: { width: 1000, height: 700 },
      }),
    ).toEqual({ left: 350, top: 104 });
  });

  it("flips below the anchor when there is not enough room above", () => {
    expect(
      placeFloatingPanel({
        anchor: { x: 80, y: 40 },
        panel: { width: 300, height: 240 },
        viewport: { width: 1000, height: 700 },
      }),
    ).toEqual({ left: 12, top: 96 });
  });

  it("clamps oversized placements to viewport padding", () => {
    expect(
      placeFloatingPanel({
        anchor: { x: 20, y: 20 },
        panel: { width: 900, height: 680 },
        viewport: { width: 800, height: 600 },
      }),
    ).toEqual({ left: 12, top: 12 });
  });
});
