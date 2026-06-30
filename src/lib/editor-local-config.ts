import * as THREE from "three";
import {
  defaultEnvironment,
  defaultPerformance,
  type EnvironmentConfig,
  type PerformanceConfig,
  type RenderQuality,
  type EditorRegion,
  type ObjectRegionAssignment,
} from "../types/editor";
import {
  defaultAppearance,
  normalizeAppearanceConfig,
  type AppearanceConfig,
} from "../types/appearance";
import type {
  HaBinding,
  HaCoverCapabilityConfig,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "../types/ha";
import type { HaRuntimeConfig } from "./ha-config";
import { defaultHaRuntimeConfig } from "./ha-config";
import { normalizeEditorRegions } from "./editor-regions";
import type { WeatherConfig } from "./weather-presets";
import { defaultWeather } from "./weather-presets";
import {
  getLightCapabilityConfig,
  getCoverCapabilityConfig,
  getManualDeviceType,
  getModelObjectId,
  getObjectRegionAssignment,
  getObjectBindings,
  setCoverCapabilityConfig,
  setLightCapabilityConfig,
  setManualDeviceType,
  setObjectRegionAssignment,
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
  regionAssignment?: ObjectRegionAssignment;
};

export type EditorLocalConfig = {
  version: 1;
  appearance: AppearanceConfig;
  environment: EnvironmentConfig;
  performance: PerformanceConfig;
  weather: WeatherConfig;
  ha: HaRuntimeConfig;
  regions: EditorRegion[];
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
    realisticRenderingEnabled: config?.realisticRenderingEnabled === true,
    modelShadowsEnabled: config?.modelShadowsEnabled === true,
  };
}

function hasObjectConfig(config: EditorObjectLocalConfig) {
  return (
    (config.bindings?.length ?? 0) > 0 ||
    (config.deviceType !== undefined && config.deviceType !== "auto") ||
    Boolean(config.coverCapability) ||
    Boolean(config.lightCapability) ||
    Boolean(
      config.regionAssignment &&
        (config.regionAssignment.mode === "manual" ||
          config.regionAssignment.initialized === true),
    )
  );
}

export function createEditorLocalConfig(
  root: THREE.Object3D,
  environment: EnvironmentConfig,
  weather: WeatherConfig,
  ha: HaRuntimeConfig,
  performance: PerformanceConfig = defaultPerformance,
  regions: EditorRegion[] = [],
  appearance: AppearanceConfig = defaultAppearance,
): EditorLocalConfig {
  const objects: Record<string, EditorObjectLocalConfig> = {};
  root.traverse((object) => {
    const objectId = getModelObjectId(object);
    if (!objectId) {
      return;
    }
    const regionAssignment = getObjectRegionAssignment(object);
    const objectConfig: EditorObjectLocalConfig = {
      bindings: getObjectBindings(object),
      deviceType: getManualDeviceType(object),
      coverCapability: getCoverCapabilityConfig(object) ?? undefined,
      lightCapability: getLightCapabilityConfig(object) ?? undefined,
      regionAssignment:
        regionAssignment.mode === "manual" || regionAssignment.initialized
          ? regionAssignment
          : undefined,
    };
    if (hasObjectConfig(objectConfig)) {
      objects[objectId] = objectConfig;
    }
  });

  return {
    version: 1,
    appearance: normalizeAppearanceConfig(appearance),
    environment,
    performance: normalizePerformanceConfig(performance),
    weather,
    ha,
    regions: normalizeEditorRegions(regions),
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
    if (objectConfig.regionAssignment) {
      setObjectRegionAssignment(object, objectConfig.regionAssignment);
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
      appearance: normalizeAppearanceConfig(parsed.appearance),
      performance: normalizePerformanceConfig(parsed.performance),
      ha: parsed.ha ?? defaultHaRuntimeConfig(),
      regions: normalizeEditorRegions(parsed.regions),
      objects: normalizeEditorObjectConfigs(parsed.objects),
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

function normalizeEditorObjectConfigs(
  value: EditorLocalConfig["objects"] | undefined,
): EditorLocalConfig["objects"] {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).map(([objectId, config]) => [
      objectId,
      {
        ...config,
        regionAssignment: config.regionAssignment
          ? {
              mode: config.regionAssignment.mode === "manual" ? "manual" : "auto",
              regionId:
                typeof config.regionAssignment.regionId === "string" &&
                config.regionAssignment.regionId.trim().length > 0
                  ? config.regionAssignment.regionId
                  : null,
              initialized: config.regionAssignment.initialized === true,
            }
          : undefined,
      },
    ]),
  );
}

export function saveEditorLocalConfig(
  config: EditorLocalConfig,
  storage: StorageLike = window.localStorage,
) {
  storage.setItem(EDITOR_LOCAL_CONFIG_KEY, JSON.stringify(config));
}
