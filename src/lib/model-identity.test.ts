import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { ensureModelObjectIds, getModelObjectId } from "./model-identity";

describe("model-identity", () => {
  it("assigns persistent object ids without merging repeated names", () => {
    const root = new THREE.Group();
    root.name = "home";
    const first = new THREE.Mesh();
    first.name = "lamp";
    const second = new THREE.Mesh();
    second.name = "lamp";
    root.add(first, second);

    ensureModelObjectIds(root);

    expect(getModelObjectId(first)).toBe("home/lamp");
    expect(getModelObjectId(second)).toBe("home/lamp_2");
  });

  it("keeps existing persistent object ids", () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh();
    mesh.userData.homeAssistant = { objectId: "custom-lamp-id" };
    root.add(mesh);

    ensureModelObjectIds(root);

    expect(getModelObjectId(mesh)).toBe("custom-lamp-id");
  });
});
