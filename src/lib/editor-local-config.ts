import * as THREE from "three";
import type { EnvironmentConfig } from "../types/editor";
import type {
  HaBinding,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "../types/ha";
import type { WeatherConfig } from "./weather-presets";
import {
  getLightCapabilityConfig,
  getManualDeviceType,
  getModelObjectId,
  getObjectBindings,
  setLightCapabilityConfig,
  setManualDeviceType,
  setObjectBindings,
} from "./model-identity";

export const EDITOR_LOCAL_CONFIG_KEY = "3dhomeassistant.editor.config";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => unknown;
};

export type EditorObjectLocalConfig = {
  bindings?: HaBinding[];
  deviceType?: HaManualDeviceType;
  lightCapability?: HaLightCapabilityConfig;
};

export type EditorLocalConfig = {
  version: 1;
  environment: EnvironmentConfig;
  weather: WeatherConfig;
  objects: Record<string, EditorObjectLocalConfig>;
};

function hasObjectConfig(config: EditorObjectLocalConfig) {
  return (
    (config.bindings?.length ?? 0) > 0 ||
    (config.deviceType !== undefined && config.deviceType !== "auto") ||
    Boolean(config.lightCapability)
  );
}

export function createEditorLocalConfig(
  root: THREE.Object3D,
  environment: EnvironmentConfig,
  weather: WeatherConfig,
): EditorLocalConfig {
  const objects: Record<string, EditorObjectLocalConfig> = {};
  root.traverse((object) => {
    const objectId = getModelObjectId(object);
    if (!objectId) {
      return;
    }
    const objectConfig: EditorObjectLocalConfig = {
      bindings: getObjectBindings(object),
      deviceType: getManualDeviceType(object),
      lightCapability: getLightCapabilityConfig(object) ?? undefined,
    };
    if (hasObjectConfig(objectConfig)) {
      objects[objectId] = objectConfig;
    }
  });

  return {
    version: 1,
    environment,
    weather,
    objects,
  };
}

export function applyEditorLocalConfig(
  root: THREE.Object3D,
  config: EditorLocalConfig | null,
) {
  if (!config) {
    return;
  }
  root.traverse((object) => {
    const objectId = getModelObjectId(object);
    if (!objectId) {
      return;
    }
    const objectConfig = config.objects[objectId];
    if (!objectConfig) {
      return;
    }
    if (objectConfig.bindings) {
      setObjectBindings(object, objectConfig.bindings);
    }
    if (objectConfig.deviceType) {
      setManualDeviceType(object, objectConfig.deviceType);
    }
    if (objectConfig.lightCapability) {
      setLightCapabilityConfig(object, objectConfig.lightCapability);
    }
  });
}

export function loadEditorLocalConfig(
  storage: StorageLike = window.localStorage,
): EditorLocalConfig | null {
  try {
    const raw = storage.getItem(EDITOR_LOCAL_CONFIG_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as EditorLocalConfig;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveEditorLocalConfig(
  config: EditorLocalConfig,
  storage: StorageLike = window.localStorage,
) {
  storage.setItem(EDITOR_LOCAL_CONFIG_KEY, JSON.stringify(config));
}
