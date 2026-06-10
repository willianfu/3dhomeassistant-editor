import type { EnvironmentConfig, Vector3Values } from "../types/editor";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function interpolate(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

const NIGHT_AMBIENT_INTENSITY = 0.5;
const NIGHT_DIRECTIONAL_INTENSITY = 0.5;
const NIGHT_COLOR_TEMPERATURE_KELVIN = 5000;
const TWILIGHT_RATIO = Math.sin(Math.PI / 12);

function isNightHour(hour: number) {
  return hour < 6 || hour >= 19;
}

export function getSolarDaylightRatio(hour: number) {
  const normalizedHour = clamp(hour, 0, 23);
  if (isNightHour(normalizedHour)) {
    return 0;
  }
  if (normalizedHour <= 12) {
    return interpolate(TWILIGHT_RATIO, 1, (normalizedHour - 6) / 6);
  }
  return interpolate(1, TWILIGHT_RATIO, (normalizedHour - 12) / 7);
}

export function getSolarDirection(hour: number): Vector3Values {
  const normalizedHour = clamp(hour, 0, 23);
  const daylight = getSolarDaylightRatio(normalizedHour);

  if (isNightHour(normalizedHour)) {
    return { x: 0, y: 0.8, z: -6 };
  }

  const dayProgress = Math.min((normalizedHour - 6) / 12, 1);
  const eastWest = Math.cos(dayProgress * Math.PI) * 9;
  const southBias = interpolate(1.5, 7.5, daylight);
  const height = interpolate(1.2, 11, daylight);

  return {
    x: round(eastWest),
    y: round(height),
    z: round(southBias),
  };
}

export function getSolarEnvironmentPreset(
  hour: number,
  current: EnvironmentConfig,
): EnvironmentConfig {
  const normalizedHour = Math.round(clamp(hour, 0, 23));
  const daylight = getSolarDaylightRatio(normalizedHour);
  const night = isNightHour(normalizedHour);
  const colorTemperatureKelvin =
    night
      ? NIGHT_COLOR_TEMPERATURE_KELVIN
      : Math.round(interpolate(2800, 6200, daylight));

  return {
    ...current,
    timeOfDay: normalizedHour,
    ambientIntensity: night
      ? NIGHT_AMBIENT_INTENSITY
      : round(interpolate(0.12, 0.78, daylight)),
    directionalIntensity: night
      ? NIGHT_DIRECTIONAL_INTENSITY
      : round(interpolate(0.05, 1.45, daylight)),
    directionalPosition: getSolarDirection(normalizedHour),
    colorTemperatureKelvin,
    exposure: round(interpolate(0.72, 1.18, daylight)),
  };
}
