import { describe, expect, it } from "vitest";
import {
  getEmptySceneOrbitTarget,
  getGroundedOrbitTarget,
  getManualEnvironmentSkyboxTransform,
} from "./environment-grounding";

describe("environment grounding", () => {
  it("places the projected skybox ground on the editor grid plane", () => {
    const transform = getManualEnvironmentSkyboxTransform();

    expect(transform.positionY).toBe(transform.height);
    expect(transform.groundY).toBe(0);
  });

  it("uses the grid center as the empty scene orbit target", () => {
    expect(getEmptySceneOrbitTarget()).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("grounds model orbit targets on the grid plane", () => {
    expect(getGroundedOrbitTarget({ x: 1.2, y: 3.4, z: -5.6 })).toEqual({
      x: 1.2,
      y: 0,
      z: -5.6,
    });
  });
});
