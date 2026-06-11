import type { HaEntityState } from "../../types/ha";

export type HaClimateCapabilities = {
  entityId: string;
  friendlyName: string;
  isOn: boolean;
  hvacMode: string;
  targetTemperature: number;
  currentTemperature: number | null;
  temperatureUnit: string;
  minTemperature: number;
  maxTemperature: number;
  temperatureStep: number;
  fanMode: string | null;
  fanModes: string[];
  hvacModes: string[];
  presetMode: string | null;
  presetModes: string[];
  swingMode: string | null;
  swingModes: string[];
};

function numberAttribute(
  state: HaEntityState | undefined,
  keys: string[],
  fallback: number,
) {
  for (const key of keys) {
    const value = Number(state?.attributes[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

function optionalNumberAttribute(state: HaEntityState | undefined, keys: string[]) {
  for (const key of keys) {
    const value = Number(state?.attributes[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function stringListAttribute(state: HaEntityState | undefined, key: string) {
  const value = state?.attributes[key];
  return Array.isArray(value)
    ? value.map(String).filter((entry) => entry.length > 0)
    : [];
}

function stringAttribute(
  state: HaEntityState | undefined,
  keys: string[],
  fallback: string | null,
) {
  for (const key of keys) {
    const value = state?.attributes[key];
    if (value !== undefined && value !== null && String(value).length > 0) {
      return String(value);
    }
  }
  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function roundClimateTemperature(value: number, step: number) {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 0.5;
  return Number((Math.round(value / safeStep) * safeStep).toFixed(2));
}

export function resolveHaClimateCapabilities(
  entityId: string,
  state?: HaEntityState,
): HaClimateCapabilities {
  const minTemperature = numberAttribute(state, ["min_temp"], 16);
  const maxTemperature = numberAttribute(state, ["max_temp"], 30);
  const temperatureStep = numberAttribute(
    state,
    ["target_temp_step", "temperature_step"],
    0.5,
  );
  const targetTemperature = clamp(
    numberAttribute(state, ["temperature", "target_temp"], 24),
    minTemperature,
    maxTemperature,
  );
  const hvacMode = state?.state && state.state !== "unknown" ? state.state : "off";

  return {
    entityId,
    friendlyName: String(state?.attributes.friendly_name ?? entityId),
    isOn: hvacMode !== "off" && hvacMode !== "unavailable",
    hvacMode,
    targetTemperature,
    currentTemperature: optionalNumberAttribute(state, ["current_temperature"]),
    temperatureUnit: stringAttribute(
      state,
      ["temperature_unit", "unit_of_measurement"],
      "℃",
    ) ?? "℃",
    minTemperature,
    maxTemperature,
    temperatureStep,
    fanMode: stringAttribute(state, ["fan_mode"], null),
    fanModes: stringListAttribute(state, "fan_modes"),
    hvacModes: stringListAttribute(state, "hvac_modes"),
    presetMode: stringAttribute(state, ["preset_mode"], null),
    presetModes: stringListAttribute(state, "preset_modes"),
    swingMode: stringAttribute(state, ["swing_mode"], null),
    swingModes: stringListAttribute(state, "swing_modes"),
  };
}
