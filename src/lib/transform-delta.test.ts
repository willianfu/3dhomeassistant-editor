import { describe, expect, it } from "vitest";
import { getIncrementalTransformDelta } from "./transform-delta";

describe("getIncrementalTransformDelta", () => {
  it("returns movement since the previous transform event", () => {
    expect(
      getIncrementalTransformDelta(
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
      ),
    ).toEqual({ x: 3, y: 0, z: 0 });

    expect(
      getIncrementalTransformDelta(
        { x: 3, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 },
      ),
    ).toEqual({ x: 2, y: 0, z: 0 });
  });
});
