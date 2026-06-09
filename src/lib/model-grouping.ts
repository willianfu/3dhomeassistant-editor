import * as THREE from "three";
import { markModelGroup } from "./model-identity";

export function groupObjectsPreservingWorldTransform(
  parent: THREE.Object3D,
  objects: THREE.Object3D[],
  name: string,
) {
  const uniqueObjects = [...new Set(objects)].filter(
    (object) => object.parent === parent,
  );
  if (uniqueObjects.length < 2) {
    return null;
  }

  parent.updateMatrixWorld(true);
  const insertIndex = Math.min(
    ...uniqueObjects.map((object) => parent.children.indexOf(object)),
  );
  const box = new THREE.Box3();
  for (const object of uniqueObjects) {
    box.expandByObject(object);
  }
  const center = box.getCenter(new THREE.Vector3());

  const group = new THREE.Group();
  group.name = name;
  markModelGroup(group);
  parent.add(group);
  parent.children.splice(parent.children.indexOf(group), 1);
  parent.children.splice(insertIndex, 0, group);
  group.parent = parent;
  group.position.copy(parent.worldToLocal(center.clone()));
  group.updateMatrixWorld(true);

  for (const object of uniqueObjects) {
    group.attach(object);
  }
  parent.updateMatrixWorld(true);
  return group;
}
