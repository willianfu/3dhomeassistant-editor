import { getEntityDomain } from "../ha-client";
import type { HaEntityState, HaLightCapabilityConfig } from "../../types/ha";

export type ResolvedLightCapability = {
  enabled: boolean;
  isOn: boolean;
  brightnessRatio: number;
  colorTemperatureKelvin: number;
  sourceEntityId: string | null;
  lightType: HaLightCapabilityConfig["lightType"];
  emissionMode: HaLightCapabilityConfig["emissionMode"];
  coneAngle: number;
  maxIntensity: number;
  lightRange: number;
};

export type HaLightControlCapabilities = {
  brightnessPercent: number;
  colorTemperatureKelvin: number;
  minColorTemperatureKelvin: number;
  maxColorTemperatureKelvin: number;
  effect: string | null;
  effects: string[];
  supportsBrightness: boolean;
  supportsColorTemperature: boolean;
  supportsEffect: boolean;
};

const lightSourceIntensityMultiplier = 10;

export function defaultLightCapabilityConfig(): HaLightCapabilityConfig {
  return {
    enabled: false,
    lightType: "point",
    emissionMode: "whole",
    coneAngle: 45,
    maxIntensity: 8,
    lightRange: 14,
    maxBrightness: 255,
    fixedColorTemperatureKelvin: 3000,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function numericStateValue(state?: HaEntityState) {
  if (!state) {
    return null;
  }
  const rawValue =
    state.attributes.brightness ??
    state.attributes.color_temp_kelvin ??
    state.attributes.color_temp ??
    state.state;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function lightColorTemperatureKelvin(state?: HaEntityState) {
  if (!state) {
    return null;
  }
  if (getEntityDomain(state.entity_id) !== "light") {
    return numericStateValue(state);
  }
  const kelvin = Number(state.attributes.color_temp_kelvin);
  if (Number.isFinite(kelvin)) {
    return kelvin;
  }
  const mired = Number(state.attributes.color_temp);
  if (Number.isFinite(mired) && mired > 0) {
    return Math.round(1_000_000 / mired);
  }
  return null;
}

function numericAttribute(state: HaEntityState | undefined, key: string) {
  const value = Number(state?.attributes[key]);
  return Number.isFinite(value) ? value : null;
}

function hasSupportedColorMode(state: HaEntityState | undefined, mode: string) {
  const modes = state?.attributes.supported_color_modes;
  return Array.isArray(modes) && modes.map(String).includes(mode);
}

export function brightnessToPercent(brightness: number | null) {
  if (brightness === null) {
    return 100;
  }
  return clamp(Math.round((brightness / 255) * 100), 1, 100);
}

export function percentToBrightness(percent: number) {
  return clamp(Math.round((clamp(percent, 1, 100) / 100) * 255), 1, 255);
}

export function resolveHaLightControlCapabilities(
  state?: HaEntityState,
): HaLightControlCapabilities {
  const brightness = numericAttribute(state, "brightness");
  const minMireds = numericAttribute(state, "min_mireds");
  const maxMireds = numericAttribute(state, "max_mireds");
  const minKelvin =
    numericAttribute(state, "min_color_temp_kelvin") ??
    numericAttribute(state, "min_color_temp") ??
    (maxMireds && maxMireds > 0 ? Math.round(1_000_000 / maxMireds) : null) ??
    1800;
  const maxKelvin =
    numericAttribute(state, "max_color_temp_kelvin") ??
    numericAttribute(state, "max_color_temp") ??
    (minMireds && minMireds > 0 ? Math.round(1_000_000 / minMireds) : null) ??
    6500;
  const rawEffects = state?.attributes.effect_list;
  const effects = Array.isArray(rawEffects)
    ? rawEffects.map(String).filter((effect) => effect.length > 0)
    : [];
  const supportedFeatures = Number(state?.attributes.supported_features ?? 0);
  const supportsBrightness =
    brightness !== null ||
    hasSupportedColorMode(state, "brightness") ||
    hasSupportedColorMode(state, "color_temp") ||
    hasSupportedColorMode(state, "hs") ||
    hasSupportedColorMode(state, "rgb") ||
    hasSupportedColorMode(state, "xy");
  const supportsColorTemperature =
    hasSupportedColorMode(state, "color_temp") ||
    state?.attributes.color_temp_kelvin !== undefined ||
    state?.attributes.color_temp !== undefined ||
    state?.attributes.min_color_temp_kelvin !== undefined ||
    state?.attributes.max_color_temp_kelvin !== undefined;

  return {
    brightnessPercent: brightnessToPercent(brightness),
    colorTemperatureKelvin:
      lightColorTemperatureKelvin(state) ?? Math.round((minKelvin + maxKelvin) / 2),
    minColorTemperatureKelvin: Math.min(minKelvin, maxKelvin),
    maxColorTemperatureKelvin: Math.max(minKelvin, maxKelvin),
    effect:
      state?.attributes.effect === undefined
        ? null
        : String(state.attributes.effect),
    effects,
    supportsBrightness,
    supportsColorTemperature,
    supportsEffect: effects.length > 0 || (supportedFeatures & 4) === 4,
  };
}

export function resolveLightCapability({
  config,
  entityIds,
  states,
}: {
  config: HaLightCapabilityConfig | null;
  entityIds: string[];
  states: Record<string, HaEntityState>;
}): ResolvedLightCapability {
  const lightEntityId = entityIds.find((entityId) => getEntityDomain(entityId) === "light");
  const mergedConfig = { ...defaultLightCapabilityConfig(), ...(config ?? {}) };
  const shouldEnable = mergedConfig.enabled || Boolean(lightEntityId);
  if (!shouldEnable) {
    return {
      enabled: false,
      isOn: false,
      brightnessRatio: 0,
      colorTemperatureKelvin: mergedConfig.fixedColorTemperatureKelvin,
      sourceEntityId: null,
      lightType: mergedConfig.lightType,
      emissionMode: mergedConfig.emissionMode,
      coneAngle: mergedConfig.coneAngle,
      maxIntensity: mergedConfig.maxIntensity,
      lightRange: mergedConfig.lightRange,
    };
  }

  const sourceEntityId =
    lightEntityId ??
    mergedConfig.powerEntityId ??
    (mergedConfig.enabled ? entityIds[0] : null) ??
    null;
  const sourceState = sourceEntityId ? states[sourceEntityId] : undefined;
  const powerState = mergedConfig.powerEntityId
    ? states[mergedConfig.powerEntityId]
    : sourceState;
  const brightnessState = mergedConfig.brightnessEntityId
    ? states[mergedConfig.brightnessEntityId]
    : sourceState;
  const colorTemperatureState = mergedConfig.colorTemperatureEntityId
    ? states[mergedConfig.colorTemperatureEntityId]
    : sourceState;
  const brightnessValue = numericStateValue(brightnessState);
  const brightnessRatio =
    brightnessValue === null
      ? 0.7
      : clamp(brightnessValue / Math.max(mergedConfig.maxBrightness, 1), 0, 1);

  return {
    enabled: true,
    isOn: powerState?.state === "on",
    brightnessRatio,
    colorTemperatureKelvin:
      lightColorTemperatureKelvin(colorTemperatureState) ??
      mergedConfig.fixedColorTemperatureKelvin,
    sourceEntityId,
    lightType: mergedConfig.lightType,
    emissionMode: mergedConfig.emissionMode,
    coneAngle: mergedConfig.coneAngle,
    maxIntensity: mergedConfig.maxIntensity,
    lightRange: mergedConfig.lightRange,
  };
}

export function resolveLightRenderIntensity(lightConfig: ResolvedLightCapability) {
  const emissiveIntensity = Math.max(
    0.05,
    lightConfig.brightnessRatio * lightConfig.maxIntensity,
  );
  return {
    emissiveIntensity,
    lightIntensity: emissiveIntensity * lightSourceIntensityMultiplier,
  };
}
