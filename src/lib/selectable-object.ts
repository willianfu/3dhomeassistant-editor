import * as THREE from "three";
import { getModelObjectId, isModelGroup } from "./model-identity";

export function resolveSelectableObject(hit: THREE.Object3D, root: THREE.Object3D) {
  let current: THREE.Object3D | null = hit;
  let topLevel: THREE.Object3D | null = null;
  let firstWithObjectId: THREE.Object3D | null = null;
  const modelGroups: THREE.Object3D[] = [];

  while (current && current !== root) {
    if (current.parent === root) {
      topLevel = current;
    }
    if (isModelGroup(current)) {
      modelGroups.push(current);
    }
    if (!firstWithObjectId && getModelObjectId(current)) {
      firstWithObjectId = current;
    }
    current = current.parent;
  }

  return modelGroups[0] ?? firstWithObjectId ?? topLevel ?? hit;
}
