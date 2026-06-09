import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { isModelGroup } from "./model-identity";
import { groupObjectsPreservingWorldTransform } from "./model-grouping";

describe("groupObjectsPreservingWorldTransform", () => {
  it("groups sibling objects without changing their world positions", () => {
    const root = new THREE.Group();
    const first = new THREE.Mesh();
    const second = new THREE.Mesh();
    first.position.set(2, 0, 0);
    second.position.set(0, 3, 0);
    root.add(first, second);
    root.updateMatrixWorld(true);

    const firstBefore = first.getWorldPosition(new THREE.Vector3());
    const secondBefore = second.getWorldPosition(new THREE.Vector3());

    const group = groupObjectsPreservingWorldTransform(root, [first, second], "灯具组合");

    expect(group).not.toBeNull();
    if (!group) {
      return;
    }
    expect(group.name).toBe("灯具组合");
    expect(isModelGroup(group)).toBe(true);
    expect(group.children).toEqual([first, second]);
    expect(root.children).toEqual([group]);
    expect(first.getWorldPosition(new THREE.Vector3())).toEqual(firstBefore);
    expect(second.getWorldPosition(new THREE.Vector3())).toEqual(secondBefore);
  });

  it("returns null for fewer than two valid child objects", () => {
    const root = new THREE.Group();
    const child = new THREE.Mesh();
    root.add(child);

    expect(groupObjectsPreservingWorldTransform(root, [child], "组合")).toBeNull();
  });
});
