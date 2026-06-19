import * as THREE from "three";
import {
  defaultEnvironment,
  defaultPerformance,
  type EnvironmentConfig,
  type PerformanceConfig,
  type RenderQuality,
} from "../types/editor";
import type {
  HaBinding,
  HaCoverCapabilityConfig,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "../types/ha";
import type { HaRuntimeConfig } from "./ha-config";
import { defaultHaRuntimeConfig } from "./ha-config";
import type { WeatherConfig } from "./weather-presets";
import { defaultWeather } from "./weather-presets";
import {
  getLightCapabilityConfig,
  getCoverCapabilityConfig,
  getManualDeviceType,
  getModelObjectId,
  getObjectBindings,
  setCoverCapabilityConfig,
  setLightCapabilityConfig,
  setManualDeviceType,
  setObjectBindings,
} from "./model-identity";

export const EDITOR_LOCAL_CONFIG_KEY = "3dhomeassistant.editor.config";
const legacyDefaultWeatherLocation = "116.41,39.92";
const renderQualities: RenderQuality[] = ["low", "medium", "high", "ultra"];

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => unknown;
};

export type EditorObjectLocalConfig = {
  bindings?: HaBinding[];
  deviceType?: HaManualDeviceType;
  coverCapability?: HaCoverCapabilityConfig;
  lightCapability?: HaLightCapabilityConfig;
};

export type EditorLocalConfig = {
  version: 1;
  environment: EnvironmentConfig;
  performance: PerformanceConfig;
  weather: WeatherConfig;
  ha: HaRuntimeConfig;
  objects: Record<string, EditorObjectLocalConfig>;
};

export function normalizePerformanceConfig(
  config: Partial<PerformanceConfig> | null | undefined,
): PerformanceConfig {
  return {
    ...defaultPerformance,
    ...(config ?? {}),
    renderBackend:
      config?.renderBackend === "webgpu" || config?.renderBackend === "webgl"
        ? config.renderBackend
        : defaultPerformance.renderBackend,
    quality: renderQualities.includes(config?.quality as RenderQuality)
      ? (config?.quality as RenderQuality)
      : defaultPerformance.quality,
  };
}

function hasObjectConfig(config: EditorObjectLocalConfig) {
  return (
    (config.bindings?.length ?? 0) > 0 ||
    (config.deviceType !== undefined && config.deviceType !== "auto") ||
    Boolean(config.coverCapability) ||
    Boolean(config.lightCapability)
  );
}

export function createEditorLocalConfig(
  root: THREE.Object3D,
  environment: EnvironmentConfig,
  weather: WeatherConfig,
  ha: HaRuntimeConfig,
  performance: PerformanceConfig = defaultPerformance,
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
      coverCapability: getCoverCapabilityConfig(object) ?? undefined,
      lightCapability: getLightCapabilityConfig(object) ?? undefined,
    };
    if (hasObjectConfig(objectConfig)) {
      objects[objectId] = objectConfig;
    }
  });

  return {
    version: 1,
    environment,
    performance: normalizePerformanceConfig(performance),
    weather,
    ha,
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
    if (objectConfig.coverCapability) {
      setCoverCapabilityConfig(object, objectConfig.coverCapability);
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
    if (parsed.version !== 1) {
      return null;
    }
    return {
      ...parsed,
      environment: {
        ...defaultEnvironment,
        ...(parsed.environment ?? {}),
      },
      performance: normalizePerformanceConfig(parsed.performance),
      ha: parsed.ha ?? defaultHaRuntimeConfig(),
      weather: {
        ...defaultWeather,
        ...(parsed.weather ?? {}),
        qweatherLocation:
          parsed.weather?.qweatherLocation === legacyDefaultWeatherLocation
            ? defaultWeather.qweatherLocation
            : (parsed.weather?.qweatherLocation ?? defaultWeather.qweatherLocation),
      },
    };
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
