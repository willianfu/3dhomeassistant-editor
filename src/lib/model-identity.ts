import * as THREE from "three";
import type {
  HaBinding,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "../types/ha";

const HA_USER_DATA_KEY = "homeAssistant";

type HomeAssistantObjectData = {
  objectId?: string;
  bindingGroupId?: string;
  entityId?: string;
  deviceType?: HaManualDeviceType;
  bindings?: HaBinding[];
  isGroup?: boolean;
  capabilities?: {
    light?: HaLightCapabilityConfig;
  };
};

function slugify(value: string) {
  return (
    value
      .trim()
      .replace(/\\/g, "/")
      .replace(/\s+/g, "_")
      .replace(/[^\w\u4e00-\u9fa5/-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "object"
  );
}

function displayName(object: THREE.Object3D) {
  return object.name?.trim() || object.type || "object";
}

export function getHomeAssistantData(
  object: THREE.Object3D,
): HomeAssistantObjectData {
  const current = object.userData[HA_USER_DATA_KEY];
  if (current && typeof current === "object") {
    return current as HomeAssistantObjectData;
  }
  object.userData[HA_USER_DATA_KEY] = {};
  return object.userData[HA_USER_DATA_KEY] as HomeAssistantObjectData;
}

export function getModelObjectId(object: THREE.Object3D) {
  return getHomeAssistantData(object).objectId ?? null;
}

export function getObjectBindings(object: THREE.Object3D) {
  return getHomeAssistantData(object).bindings ?? [];
}

export function setObjectBindings(object: THREE.Object3D, bindings: HaBinding[]) {
  getHomeAssistantData(object).bindings = bindings;
}

export function getManualDeviceType(object: THREE.Object3D): HaManualDeviceType {
  return getHomeAssistantData(object).deviceType ?? "auto";
}

export function setManualDeviceType(
  object: THREE.Object3D,
  deviceType: HaManualDeviceType,
) {
  getHomeAssistantData(object).deviceType = deviceType;
}

export function getLightCapabilityConfig(object: THREE.Object3D) {
  return getHomeAssistantData(object).capabilities?.light ?? null;
}

export function setLightCapabilityConfig(
  object: THREE.Object3D,
  config: HaLightCapabilityConfig,
) {
  const data = getHomeAssistantData(object);
  data.capabilities = {
    ...data.capabilities,
    light: config,
  };
}

export function isModelGroup(object: THREE.Object3D) {
  return getHomeAssistantData(object).isGroup === true;
}

export function markModelGroup(object: THREE.Object3D) {
  getHomeAssistantData(object).isGroup = true;
}

export function ensureModelObjectIds(root: THREE.Object3D) {
  const used = new Set<string>();

  function visit(object: THREE.Object3D, parentPath: string, pathName: string) {
    const data = getHomeAssistantData(object);
    if (data.objectId) {
      used.add(data.objectId);
    } else {
      const basePath = parentPath ? `${parentPath}/${pathName}` : pathName;
      let objectId = basePath;
      let index = 2;
      while (used.has(objectId)) {
        objectId = `${basePath}_${index}`;
        index += 1;
      }
      data.objectId = objectId;
      used.add(objectId);
    }

    const childNameCounts = new Map<string, number>();
    for (const child of object.children) {
      const childBase = slugify(displayName(child));
      const nextCount = (childNameCounts.get(childBase) ?? 0) + 1;
      childNameCounts.set(childBase, nextCount);
      const childPathName = nextCount === 1 ? childBase : `${childBase}_${nextCount}`;
      const currentId = getModelObjectId(object) ?? parentPath;
      visit(child, currentId ?? "", childPathName);
    }
  }

  visit(root, "", slugify(displayName(root)));
}
