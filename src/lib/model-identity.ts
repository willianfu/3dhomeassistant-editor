import * as THREE from "three";
import type {
  ObjectRegionAssignment,
} from "../types/editor";
import type {
  HaBinding,
  HaCoverCapabilityConfig,
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
    cover?: HaCoverCapabilityConfig;
    light?: HaLightCapabilityConfig;
  };
  regionAssignment?: ObjectRegionAssignment;
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

function normalizeRegionAssignment(
  value: ObjectRegionAssignment | undefined,
): ObjectRegionAssignment {
  if (!value || typeof value !== "object") {
    return { mode: "auto", regionId: null, initialized: false };
  }
  const regionId =
    typeof value.regionId === "string" && value.regionId.trim().length > 0
      ? value.regionId
      : null;
  if (value.mode === "manual") {
    return { mode: "manual", regionId, initialized: false };
  }
  return {
    mode: "auto",
    regionId,
    initialized: value.initialized === true,
  };
}

export function getObjectRegionAssignment(
  object: THREE.Object3D,
): ObjectRegionAssignment {
  return normalizeRegionAssignment(getHomeAssistantData(object).regionAssignment);
}

export function setObjectRegionAssignment(
  object: THREE.Object3D,
  assignment: ObjectRegionAssignment,
) {
  getHomeAssistantData(object).regionAssignment = normalizeRegionAssignment(assignment);
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

export function getCoverCapabilityConfig(object: THREE.Object3D) {
  return getHomeAssistantData(object).capabilities?.cover ?? null;
}

export function setCoverCapabilityConfig(
  object: THREE.Object3D,
  config: HaCoverCapabilityConfig,
) {
  const data = getHomeAssistantData(object);
  data.capabilities = {
    ...data.capabilities,
    cover: config,
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

export function assignFreshModelObjectIds(
  root: THREE.Object3D,
  existingObjectIds: Iterable<string | null | undefined>,
) {
  const used = new Set(
    [...existingObjectIds].filter((value): value is string => Boolean(value)),
  );

  function uniqueObjectId(basePath: string) {
    let objectId = basePath;
    let index = 2;
    while (used.has(objectId)) {
      objectId = `${basePath}_${index}`;
      index += 1;
    }
    used.add(objectId);
    return objectId;
  }

  function visit(object: THREE.Object3D, parentPath: string, pathName: string) {
    const data = getHomeAssistantData(object);
    const basePath = parentPath ? `${parentPath}/${pathName}` : pathName;
    data.objectId = uniqueObjectId(basePath);

    const childNameCounts = new Map<string, number>();
    for (const child of object.children) {
      const childBase = slugify(displayName(child));
      const nextCount = (childNameCounts.get(childBase) ?? 0) + 1;
      childNameCounts.set(childBase, nextCount);
      const childPathName = nextCount === 1 ? childBase : `${childBase}_${nextCount}`;
      visit(child, data.objectId, childPathName);
    }
  }

  visit(root, "", slugify(displayName(root)));
}

function findObjectByModelObjectId(
  root: THREE.Object3D,
  objectId: string | undefined,
): THREE.Object3D | null {
  const normalized = objectId?.trim();
  if (!normalized) {
    return null;
  }
  let match: THREE.Object3D | null = null;
  root.traverse((object) => {
    if (!match && getModelObjectId(object) === normalized) {
      match = object;
    }
  });
  return match;
}

export function syncCoverTargetBindings(
  root: THREE.Object3D,
  host: THREE.Object3D,
  config: HaCoverCapabilityConfig,
) {
  if (!config.enabled || config.openMode !== "symmetrical") {
    return;
  }
  const hostBindings = getObjectBindings(host);
  const targets: THREE.Object3D[] = [];
  const leftTarget = findObjectByModelObjectId(root, config.leftObjectId);
  const rightTarget = findObjectByModelObjectId(root, config.rightObjectId);
  if (leftTarget && leftTarget !== host) {
    targets.push(leftTarget);
  }
  if (rightTarget && rightTarget !== host && rightTarget !== leftTarget) {
    targets.push(rightTarget);
  }

  for (const target of targets) {
    setObjectBindings(target, hostBindings);
    setManualDeviceType(target, "cover");
  }
}

export function syncAllCoverTargetBindings(root: THREE.Object3D) {
  root.traverse((object) => {
    const config = getCoverCapabilityConfig(object);
    if (config) {
      syncCoverTargetBindings(root, object, config);
    }
  });
}
