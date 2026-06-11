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
    ).toEqual({ left: 350, top: 104, placement: "above" });
  });

  it("flips below the anchor when there is not enough room above", () => {
    expect(
      placeFloatingPanel({
        anchor: { x: 80, y: 40 },
        panel: { width: 300, height: 240 },
        viewport: { width: 1000, height: 700 },
      }),
    ).toEqual({ left: 12, top: 96, placement: "below" });
  });

  it("clamps oversized placements to viewport padding", () => {
    expect(
      placeFloatingPanel({
        anchor: { x: 20, y: 20 },
        panel: { width: 900, height: 680 },
        viewport: { width: 800, height: 600 },
      }),
    ).toEqual({ left: 12, top: 12, placement: "below" });
  });

  it("keeps the nearest panel edge at a stable gap from the model anchor", () => {
    const above = placeFloatingPanel({
      anchor: { x: 500, y: 500 },
      panel: { width: 280, height: 300 },
      viewport: { width: 1000, height: 800 },
    });
    const below = placeFloatingPanel({
      anchor: { x: 500, y: 40 },
      panel: { width: 280, height: 300 },
      viewport: { width: 1000, height: 800 },
    });

    expect(above.top + 300).toBe(444);
    expect(below.top).toBe(96);
  });
});
