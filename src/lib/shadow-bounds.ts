import * as THREE from "three";

export type DirectionalShadowBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
};

export function computeDirectionalShadowBounds(box: THREE.Box3): DirectionalShadowBounds {
  const size = box.getSize(new THREE.Vector3());
  const footprint = Math.max(size.x, size.z);
  const halfRange = Math.max(12, Math.ceil(footprint * 0.7));
  const heightRange = Math.max(40, Math.ceil(size.y + footprint));

  return {
    left: -halfRange,
    right: halfRange,
    top: halfRange,
    bottom: -halfRange,
    near: 0.1,
    far: heightRange,
  };
}
