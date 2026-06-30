import { describe, expect, test } from "vitest";
import { degreesToRadiansVector, radiansToDegreesVector } from "./rotation";

describe("rotation conversion", () => {
  test("converts degree vectors to radians", () => {
    expect(degreesToRadiansVector({ x: 90, y: 180, z: -45 })).toEqual({
      x: Math.PI / 2,
      y: Math.PI,
      z: -Math.PI / 4,
    });
  });

  test("converts radians vectors to rounded degree values", () => {
    expect(
      radiansToDegreesVector({
        x: Math.PI / 2,
        y: Math.PI,
        z: -Math.PI / 4,
      }),
    ).toEqual({ x: 90, y: 180, z: -45 });
  });
});
