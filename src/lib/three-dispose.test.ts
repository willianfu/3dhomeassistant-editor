import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { disposeObjectTree } from "./three-dispose";

describe("three-dispose", () => {
  it("disposes geometry and material in an object subtree", () => {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const mesh = new THREE.Mesh(geometry, material);
    const root = new THREE.Group();
    root.add(mesh);

    disposeObjectTree(root);

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });

  it("disposes textures attached to materials", () => {
    const texture = new THREE.Texture();
    const textureDispose = vi.spyOn(texture, "dispose");
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);

    disposeObjectTree(mesh);

    expect(textureDispose).toHaveBeenCalledTimes(1);
  });
});
