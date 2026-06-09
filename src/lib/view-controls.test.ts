import { MOUSE } from "three";
import { describe, expect, it } from "vitest";
import { getViewControlMode } from "./view-controls";

describe("view-controls", () => {
  it("keeps perspective view fully orbitable", () => {
    const mode = getViewControlMode("perspective");

    expect(mode).toMatchObject({
      enabled: true,
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
    });
    expect(mode.mouseButtons.LEFT).toBe(MOUSE.ROTATE);
    expect(mode.mouseButtons.MIDDLE).toBe(MOUSE.DOLLY);
    expect(mode.mouseButtons.RIGHT).toBe(MOUSE.PAN);
  });

  it("lets orthographic views zoom and pan without rotating", () => {
    const mode = getViewControlMode("top");

    expect(mode).toMatchObject({
      enabled: true,
      enableRotate: false,
      enableZoom: true,
      enablePan: true,
    });
    expect(mode.mouseButtons.MIDDLE).toBe(MOUSE.DOLLY);
    expect(mode.mouseButtons.RIGHT).toBe(MOUSE.PAN);
  });
});
