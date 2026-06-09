import { describe, expect, it } from "vitest";
import {
  getResizeRatios,
  scalePointAroundCenter,
} from "./selection-transform";

describe("selection-transform", () => {
  it("calculates axis resize ratios from current and target dimensions", () => {
    expect(
      getResizeRatios(
        { x: 2, y: 4, z: 8 },
        { x: 4, y: 2, z: 16 },
      ),
    ).toEqual({ x: 2, y: 0.5, z: 2 });
  });

  it("keeps a zero-sized axis stable when resizing dimensions", () => {
    expect(
      getResizeRatios(
        { x: 0, y: 4, z: 8 },
        { x: 5, y: 8, z: 4 },
      ),
    ).toEqual({ x: 1, y: 2, z: 0.5 });
  });

  it("scales world positions around the selection center", () => {
    expect(
      scalePointAroundCenter(
        { x: 3, y: 4, z: 5 },
        { x: 1, y: 1, z: 1 },
        { x: 2, y: 0.5, z: 3 },
      ),
    ).toEqual({ x: 5, y: 2.5, z: 13 });
  });
});
