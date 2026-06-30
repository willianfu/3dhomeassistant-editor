import * as THREE from "three";
import type { Vector3Values } from "../types/editor";

const thinPanelThicknessRatio = 0.08;
const jpegMimeTypes = new Set(["image/jpeg", "image/jpg"]);
const intentionallyTransparentNamePattern =
  /(玻璃|透明|灯|光晕|发光|glass|transparent|light|glow|emissive)/i;

export function shouldUseDoubleSidedMaterial(size: Vector3Values) {
  const dimensions = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort(
    (a, b) => a - b,
  );
  const [thin, middle, long] = dimensions;
  if (long <= 0 || middle <= 0) {
    return false;
  }
  return thin / long <= thinPanelThicknessRatio && middle / long >= 0.12;
}

export function makeMaterialDoubleSided(
  material: THREE.Material | THREE.Material[],
) {
  const materials = Array.isArray(material) ? material : [material];
  for (const entry of materials) {
    if (entry.side !== THREE.DoubleSide) {
      entry.side = THREE.DoubleSide;
      entry.needsUpdate = true;
    }
  }
  return material;
}

export function shouldUseOpaqueRendering(material: THREE.Material) {
  if (!material.transparent || material.opacity < 0.999) {
    return false;
  }
  if (material.alphaTest > 0 || intentionallyTransparentNamePattern.test(material.name)) {
    return false;
  }
  const textureMap = (material as THREE.MeshStandardMaterial).map;
  const alphaMap = (material as THREE.MeshStandardMaterial).alphaMap;
  const mimeType = textureMap?.userData.mimeType;
  return !alphaMap && typeof mimeType === "string" && jpegMimeTypes.has(mimeType);
}

export function makeMaterialOpaque(material: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(material) ? material : [material];
  for (const entry of materials) {
    if (shouldUseOpaqueRendering(entry)) {
      entry.transparent = false;
      entry.depthWrite = true;
      entry.needsUpdate = true;
    }
  }
  return material;
}
