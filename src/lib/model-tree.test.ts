import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildModelTree,
  flattenModelTree,
  getObjectMetadata,
  shouldHandleDeleteKey,
} from "./model-tree";

function createMesh(name = "") {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  mesh.name = name;
  return mesh;
}

describe("model-tree", () => {
  it("builds a tree from a nested Object3D hierarchy", () => {
    const root = new THREE.Group();
    root.name = "Apartment";
    const room = new THREE.Group();
    room.name = "Living Room";
    const sofa = createMesh();
    room.add(sofa);
    root.add(room);

    const tree = buildModelTree(root);

    expect(tree.id).toBe(root.uuid);
    expect(tree.name).toBe("Apartment");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].name).toBe("Living Room");
    expect(tree.children[0].children[0].id).toBe(sofa.uuid);
    expect(tree.children[0].children[0].name).toBe("Mesh");
  });

  it("flattens a tree in depth-first order", () => {
    const root = new THREE.Group();
    root.name = "Root";
    const child = createMesh("Child");
    root.add(child);

    const flat = flattenModelTree(buildModelTree(root));

    expect(flat.map((node) => node.name)).toEqual(["Root", "Child"]);
  });

  it("computes metadata with nested mesh counts", () => {
    const root = new THREE.Group();
    root.name = "Cabinet";
    root.position.set(1.23456, 2, -3);
    root.rotation.set(0, Math.PI / 2, 0);
    root.scale.set(1, 2, 3);
    const door = new THREE.Group();
    door.name = "Door";
    door.add(createMesh("Panel"));
    door.add(createMesh("Handle"));
    root.add(door);

    const metadata = getObjectMetadata(root);

    expect(metadata).toMatchObject({
      id: root.uuid,
      name: "Cabinet",
      type: "Group",
      parentName: null,
      childCount: 1,
      meshCount: 2,
      position: { x: 1.235, y: 2, z: -3 },
      scale: { x: 1, y: 2, z: 3 },
    });
    expect(metadata.rotation.y).toBeCloseTo(1.571, 3);
  });

  it("ignores Delete when text editing has focus", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    const editable = document.createElement("div");
    editable.contentEditable = "true";

    for (const target of [input, textarea, select, editable]) {
      const event = new KeyboardEvent("keydown", { key: "Delete" });
      Object.defineProperty(event, "target", { value: target });
      expect(shouldHandleDeleteKey(event)).toBe(false);
    }
  });

  it("handles Delete for ordinary elements only", () => {
    const event = new KeyboardEvent("keydown", { key: "Delete" });
    Object.defineProperty(event, "target", { value: document.createElement("div") });
    expect(shouldHandleDeleteKey(event)).toBe(true);

    const backspace = new KeyboardEvent("keydown", { key: "Backspace" });
    Object.defineProperty(backspace, "target", {
      value: document.createElement("div"),
    });
    expect(shouldHandleDeleteKey(backspace)).toBe(false);
  });
});
