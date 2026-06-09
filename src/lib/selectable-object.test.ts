import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { markModelGroup } from "./model-identity";
import { resolveSelectableObject } from "./selectable-object";

describe("resolveSelectableObject", () => {
  it("keeps a clicked mesh selectable when exported models wrap meshes in parent groups", () => {
    const root = new THREE.Group();
    const wrapper = new THREE.Group();
    const mesh = new THREE.Mesh();
    mesh.userData.homeAssistant = { objectId: "home/lamp/bulb" };
    wrapper.add(mesh);
    root.add(wrapper);

    expect(resolveSelectableObject(mesh, root)).toBe(mesh);
  });

  it("falls back to the top-level model child when the hit object has no persistent object id", () => {
    const root = new THREE.Group();
    const wrapper = new THREE.Group();
    const mesh = new THREE.Mesh();
    wrapper.add(mesh);
    root.add(wrapper);

    expect(resolveSelectableObject(mesh, root)).toBe(wrapper);
  });

  it("selects the marked model group when clicking one of its internal meshes", () => {
    const root = new THREE.Group();
    const lamp = new THREE.Group();
    const mesh = new THREE.Mesh();
    lamp.userData.homeAssistant = { objectId: "home/lamp", isGroup: true };
    mesh.userData.homeAssistant = { objectId: "home/lamp/bulb" };
    lamp.add(mesh);
    root.add(lamp);

    expect(resolveSelectableObject(mesh, root)).toBe(lamp);
  });
});
