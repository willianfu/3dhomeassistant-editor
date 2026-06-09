import * as THREE from "three";
import type {
  ModelTreeNode,
  ObjectMetadata,
  SelectionTransformInfo,
  Vector3Values,
} from "../types/editor";
import { getHomeAssistantData, getModelObjectId, isModelGroup } from "./model-identity";

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

function boxValues(vector: THREE.Vector3): Vector3Values {
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
  const atomicGroup = depth > 0 && isModelGroup(object);
  return {
    id: object.uuid,
    objectId: getModelObjectId(object),
    name: displayName(object),
    type: object.type,
    depth,
    childCount: object.children.length,
    children: atomicGroup
      ? []
      : object.children.map((child) => buildModelTree(child, depth + 1)),
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

  const homeAssistantData = getHomeAssistantData(object);
  return {
    id: object.uuid,
    objectId: homeAssistantData.objectId ?? null,
    bindingGroupId: homeAssistantData.bindingGroupId ?? null,
    entityId: homeAssistantData.entityId ?? null,
    bindings: homeAssistantData.bindings ?? [],
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

export function getSelectionTransformInfo(
  objects: THREE.Object3D[],
): SelectionTransformInfo | null {
  if (objects.length === 0) {
    return null;
  }
  const box = new THREE.Box3();
  for (const object of objects) {
    box.expandByObject(object);
  }
  if (box.isEmpty()) {
    return null;
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return {
    center: boxValues(center),
    size: boxValues(size),
    scale:
      objects.length === 1
        ? vectorValues(objects[0].scale)
        : { x: 1, y: 1, z: 1 },
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
