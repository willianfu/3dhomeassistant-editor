import * as THREE from "three";

export type RealisticMaterialRole = "glass" | "fabric" | "metal" | "emissive" | "wall";

const rolePatterns: Array<{ role: RealisticMaterialRole; pattern: RegExp }> = [
  { role: "glass", pattern: /glass|window|pane|窗|玻璃/i },
  { role: "fabric", pattern: /curtain|fabric|cloth|blind|shade|帘|布/i },
  { role: "emissive", pattern: /screen|display|tv|monitor|lamp|light|led|屏|灯/i },
  { role: "metal", pattern: /metal|steel|chrome|fridge|oven|washer|dishwasher|handle|金属|冰箱|烤箱/i },
  { role: "wall", pattern: /wall|ceiling|plaster|paint|墙|天花/i },
];

export function resolveRealisticMaterialRole(
  objectName: string | null | undefined,
  materialName: string | null | undefined,
) {
  const text = `${objectName ?? ""} ${materialName ?? ""}`;
  for (const rule of rolePatterns) {
    if (rule.pattern.test(text)) {
      return rule.role;
    }
  }
  return null;
}

export function enhanceMaterialForRole(
  material: THREE.Material,
  role: RealisticMaterialRole,
) {
  const source = material as THREE.MeshStandardMaterial;
  const enhanced = new THREE.MeshPhysicalMaterial();
  enhanced.name = material.name;
  enhanced.map = source.map ?? null;
  enhanced.normalMap = source.normalMap ?? null;
  enhanced.roughnessMap = source.roughnessMap ?? null;
  enhanced.metalnessMap = source.metalnessMap ?? null;
  enhanced.aoMap = source.aoMap ?? null;
  enhanced.emissiveMap = source.emissiveMap ?? null;
  enhanced.color.copy(source.color ?? new THREE.Color(0xffffff));
  enhanced.emissive.copy(source.emissive ?? new THREE.Color(0x000000));
  enhanced.emissiveIntensity = source.emissiveIntensity ?? 0;
  enhanced.side = material.side;
  enhanced.alphaTest = material.alphaTest;
  enhanced.transparent = material.transparent;
  enhanced.opacity = material.opacity;

  if (role === "glass") {
    enhanced.color.set(0xddeeff);
    enhanced.metalness = 0;
    enhanced.roughness = 0.04;
    enhanced.transmission = 0.68;
    enhanced.thickness = 0.08;
    enhanced.ior = 1.45;
    enhanced.transparent = true;
    enhanced.opacity = 0.42;
    enhanced.depthWrite = false;
  } else if (role === "fabric") {
    enhanced.metalness = 0;
    enhanced.roughness = 0.88;
    enhanced.sheen = 0.45;
    enhanced.sheenRoughness = 0.72;
    enhanced.side = THREE.DoubleSide;
  } else if (role === "metal") {
    enhanced.metalness = Math.max(source.metalness ?? 0, 0.72);
    enhanced.roughness = Math.min(source.roughness ?? 0.45, 0.32);
    enhanced.clearcoat = 0.18;
    enhanced.clearcoatRoughness = 0.25;
  } else if (role === "emissive") {
    enhanced.metalness = source.metalness ?? 0;
    enhanced.roughness = Math.min(source.roughness ?? 0.35, 0.28);
    enhanced.emissive.copy(source.emissive ?? enhanced.color);
    if (enhanced.emissive.getHex() === 0) {
      enhanced.emissive.copy(enhanced.color);
    }
    enhanced.emissiveIntensity = Math.max(source.emissiveIntensity ?? 0, 0.45);
  } else if (role === "wall") {
    enhanced.metalness = 0;
    enhanced.roughness = Math.max(source.roughness ?? 0.75, 0.82);
  }

  enhanced.needsUpdate = true;
  return enhanced;
}
