import { describe, expect, it } from "vitest";
import {
  getFirstPersonSpawnPosition,
  getFirstPersonVelocity,
} from "./first-person-controls";

describe("getFirstPersonSpawnPosition", () => {
  it("starts at the model center", () => {
    expect(
      getFirstPersonSpawnPosition({
        min: { x: -2, y: 0, z: -4 },
        max: { x: 6, y: 3, z: 2 },
      }),
    ).toEqual({ x: 2, y: 1.5, z: -1 });
  });
});

describe("getFirstPersonVelocity", () => {
  it("moves forward along the camera yaw", () => {
    const velocity = getFirstPersonVelocity(
      { forward: true, backward: false, left: false, right: false, fast: false },
      0,
      2,
    );

    expect(velocity.x).toBeCloseTo(0);
    expect(velocity.y).toBe(0);
    expect(velocity.z).toBeCloseTo(-2);
  });

  it("normalizes diagonal movement", () => {
    const velocity = getFirstPersonVelocity(
      { forward: true, backward: false, left: false, right: true, fast: false },
      0,
      2,
    );

    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(2);
    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.z).toBeLessThan(0);
  });
});
