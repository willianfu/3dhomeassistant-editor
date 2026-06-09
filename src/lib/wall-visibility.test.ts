import { describe, expect, it } from "vitest";
import { isVerticalWallLikeBox } from "./wall-visibility";

describe("wall-visibility", () => {
  it("detects vertical thin wall-like boxes", () => {
    expect(isVerticalWallLikeBox({ x: 8, y: 3, z: 0.12 })).toBe(true);
    expect(isVerticalWallLikeBox({ x: 0.12, y: 3, z: 8 })).toBe(true);
  });

  it("does not treat floors or furniture-like volumes as walls", () => {
    expect(isVerticalWallLikeBox({ x: 8, y: 0.12, z: 8 })).toBe(false);
    expect(isVerticalWallLikeBox({ x: 2, y: 1, z: 1.5 })).toBe(false);
  });
});
