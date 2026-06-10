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
