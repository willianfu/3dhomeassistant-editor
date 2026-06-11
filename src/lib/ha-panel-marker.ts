import * as THREE from "three";

export function resolveHaPanelMarkerPosition(objects: THREE.Object3D[]) {
  if (objects.length === 0) {
    return null;
  }
  const box = new THREE.Box3();
  let hasBounds = false;
  for (const object of objects) {
    object.updateWorldMatrix(true, true);
    const objectBox = new THREE.Box3().setFromObject(object);
    if (objectBox.isEmpty()) {
      continue;
    }
    box.union(objectBox);
    hasBounds = true;
  }
  if (!hasBounds || box.isEmpty()) {
    return null;
  }
  const size = box.getSize(new THREE.Vector3());
  return new THREE.Vector3(
    (box.min.x + box.max.x) / 2,
    box.max.y + Math.max(size.y * 0.08, Math.max(size.x, size.z) * 0.03, 0.12),
    (box.min.z + box.max.z) / 2,
  );
}
