import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  shouldUseDoubleSidedMaterial,
  shouldUseOpaqueRendering,
} from "./material-visibility";

describe("shouldUseDoubleSidedMaterial", () => {
  it("uses double-sided rendering for thin furniture panels", () => {
    expect(shouldUseDoubleSidedMaterial({ x: 2.4, y: 0.025, z: 1.1 })).toBe(
      true,
    );
  });

  it("keeps chunky cabinet bodies single-sided", () => {
    expect(shouldUseDoubleSidedMaterial({ x: 2.4, y: 0.7, z: 1.1 })).toBe(
      false,
    );
  });
});

describe("shouldUseOpaqueRendering", () => {
  it("treats fully opaque JPEG textured panels as opaque even when glTF marks them transparent", () => {
    const material = new THREE.MeshStandardMaterial({
      opacity: 1,
      transparent: true,
      map: new THREE.Texture(),
    });
    material.map!.userData.mimeType = "image/jpeg";

    expect(shouldUseOpaqueRendering(material)).toBe(true);
  });

  it("keeps PNG glass materials transparent", () => {
    const material = new THREE.MeshStandardMaterial({
      name: "@Marble_蓝色玻璃",
      opacity: 1,
      transparent: true,
      map: new THREE.Texture(),
    });
    material.map!.userData.mimeType = "image/png";

    expect(shouldUseOpaqueRendering(material)).toBe(false);
  });
});
