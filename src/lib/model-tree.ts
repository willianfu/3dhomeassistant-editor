import * as THREE from "three";
import type { ModelTreeNode, ObjectMetadata, Vector3Values } from "../types/editor";

function displayName(object: THREE.Object3D) {
  return object.name?.trim() || object.type || "Object";
}

function roundValue(value: number) {
  return Number(value.toFixed(3));
}

function vectorValues(vector: THREE.Vector3 | THREE.Euler): Vector3Values {
  return {
    x: roundValue(vector.x),
    y: roundValue(vector.y),
    z: roundValue(vector.z),
  };
}

export function buildModelTree(
  object: THREE.Object3D,
  depth = 0,
): ModelTreeNode {
  return {
    id: object.uuid,
    name: displayName(object),
    type: object.type,
    depth,
    childCount: object.children.length,
    children: object.children.map((child) => buildModelTree(child, depth + 1)),
  };
}

export function flattenModelTree(root: ModelTreeNode): ModelTreeNode[] {
  return [root, ...root.children.flatMap((child) => flattenModelTree(child))];
}

export function getObjectMetadata(object: THREE.Object3D): ObjectMetadata {
  let meshCount = 0;
  object.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      meshCount += 1;
    }
  });

  return {
    id: object.uuid,
    name: displayName(object),
    type: object.type,
    parentName: object.parent ? displayName(object.parent) : null,
    childCount: object.children.length,
    meshCount,
    position: vectorValues(object.position),
    rotation: vectorValues(object.rotation),
    scale: vectorValues(object.scale),
  };
}

export function shouldHandleDeleteKey(event: KeyboardEvent): boolean {
  if (event.key !== "Delete") {
    return false;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  if (["input", "textarea", "select"].includes(tagName)) {
    return false;
  }

  return target.isContentEditable !== true && target.contentEditable !== "true";
}
