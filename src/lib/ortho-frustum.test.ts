import { describe, expect, it } from "vitest";
import { computeOrthoFrustum } from "./ortho-frustum";

describe("computeOrthoFrustum", () => {
  it("expands horizontal bounds for wide viewports", () => {
    expect(computeOrthoFrustum(100, 2)).toMatchObject({
      left: -130,
      right: 130,
      top: 65,
      bottom: -65,
      near: 0.1,
      far: 400,
      distance: 200,
    });
  });

  it("expands vertical bounds for tall viewports", () => {
    expect(computeOrthoFrustum(100, 0.5)).toMatchObject({
      left: -65,
      right: 65,
      top: 130,
      bottom: -130,
      near: 0.1,
      far: 400,
      distance: 200,
    });
  });
});
