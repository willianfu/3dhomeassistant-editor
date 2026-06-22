import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { computeDirectionalShadowBounds } from "./shadow-bounds";

describe("computeDirectionalShadowBounds", () => {
  it("expands the shadow camera around the model footprint", () => {
    const box = new THREE.Box3(
      new THREE.Vector3(-12, 0, -8),
      new THREE.Vector3(18, 6, 10),
    );

    const bounds = computeDirectionalShadowBounds(box);

    expect(bounds.left).toBeLessThanOrEqual(-21);
    expect(bounds.right).toBeGreaterThanOrEqual(21);
    expect(bounds.bottom).toBeLessThanOrEqual(-21);
    expect(bounds.top).toBeGreaterThanOrEqual(21);
    expect(bounds.far).toBeGreaterThan(bounds.near);
  });

  it("keeps a minimum useful range for small models", () => {
    const box = new THREE.Box3(
      new THREE.Vector3(-1, 0, -1),
      new THREE.Vector3(1, 2, 1),
    );

    const bounds = computeDirectionalShadowBounds(box);

    expect(bounds.left).toBe(-12);
    expect(bounds.right).toBe(12);
    expect(bounds.bottom).toBe(-12);
    expect(bounds.top).toBe(12);
  });
});
