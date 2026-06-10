export type WeatherMode =
  | "none"
  | "sunny"
  | "cloudy"
  | "overcast"
  | "wind"
  | "rain-light"
  | "rain-medium"
  | "rain-heavy"
  | "lightning";

export type WeatherConfig = {
  mode: WeatherMode;
};

export type WeatherPreset = {
  mode: WeatherMode;
  label: string;
  description: string;
  rain: {
    count: number;
    speed: number;
    opacity: number;
    windDrift: number;
  };
  wind: {
    count: number;
    speed: number;
    opacity: number;
  };
  cloud: {
    count: number;
    opacity: number;
    speed: number;
  };
  lightning: {
    enabled: boolean;
    frequency: number;
    intensity: number;
    burstFrames: number;
  };
  lighting: {
    ambientMultiplier: number;
    directionalMultiplier: number;
    exposureOffset: number;
    background: number;
    fogDensity: number;
  };
};

export const defaultWeather: WeatherConfig = {
  mode: "none",
};

export const WEATHER_OPTIONS: Array<{
  mode: WeatherMode;
  label: string;
  description: string;
}> = [
  { mode: "none", label: "无天气", description: "关闭模拟效果" },
  { mode: "sunny", label: "大晴天", description: "高亮太阳光感" },
  { mode: "cloudy", label: "多云", description: "云层缓慢移动" },
  { mode: "overcast", label: "阴天", description: "低对比漫反射" },
  { mode: "wind", label: "刮风", description: "横向风线与轻微云动" },
  { mode: "rain-light", label: "小雨", description: "稀疏细雨" },
  { mode: "rain-medium", label: "中雨", description: "连续雨幕" },
  { mode: "rain-heavy", label: "大雨", description: "密集高速降雨" },
  { mode: "lightning", label: "闪电", description: "暴雨与闪电照明" },
];

const PRESETS: Record<WeatherMode, WeatherPreset> = {
  none: {
    mode: "none",
    label: "无天气",
    description: "关闭模拟效果",
    rain: { count: 0, speed: 0, opacity: 0, windDrift: 0 },
    wind: { count: 0, speed: 0, opacity: 0 },
    cloud: { count: 0, opacity: 0, speed: 0 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 1,
      directionalMultiplier: 1,
      exposureOffset: 0,
      background: 0x0b1017,
      fogDensity: 0,
    },
  },
  sunny: {
    mode: "sunny",
    label: "大晴天",
    description: "高亮太阳光感",
    rain: { count: 0, speed: 0, opacity: 0, windDrift: 0 },
    wind: { count: 0, speed: 0, opacity: 0 },
    cloud: { count: 4, opacity: 0.14, speed: 0.006 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 1.15,
      directionalMultiplier: 1.48,
      exposureOffset: 0.14,
      background: 0x13263c,
      fogDensity: 0,
    },
  },
  cloudy: {
    mode: "cloudy",
    label: "多云",
    description: "云层缓慢移动",
    rain: { count: 0, speed: 0, opacity: 0, windDrift: 0 },
    wind: { count: 0, speed: 0, opacity: 0 },
    cloud: { count: 12, opacity: 0.28, speed: 0.012 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 0.95,
      directionalMultiplier: 0.72,
      exposureOffset: -0.04,
      background: 0x172231,
      fogDensity: 0.01,
    },
  },
  overcast: {
    mode: "overcast",
    label: "阴天",
    description: "低对比漫反射",
    rain: { count: 0, speed: 0, opacity: 0, windDrift: 0 },
    wind: { count: 0, speed: 0, opacity: 0 },
    cloud: { count: 18, opacity: 0.48, speed: 0.006 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 0.82,
      directionalMultiplier: 0.35,
      exposureOffset: -0.12,
      background: 0x111820,
      fogDensity: 0.025,
    },
  },
  wind: {
    mode: "wind",
    label: "刮风",
    description: "横向风线与轻微云动",
    rain: { count: 0, speed: 0, opacity: 0, windDrift: 0 },
    wind: { count: 160, speed: 0.08, opacity: 0.34 },
    cloud: { count: 10, opacity: 0.22, speed: 0.025 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 0.92,
      directionalMultiplier: 0.7,
      exposureOffset: -0.04,
      background: 0x121e2c,
      fogDensity: 0.012,
    },
  },
  "rain-light": {
    mode: "rain-light",
    label: "小雨",
    description: "稀疏细雨",
    rain: { count: 520, speed: 0.055, opacity: 0.4, windDrift: 0.012 },
    wind: { count: 40, speed: 0.05, opacity: 0.18 },
    cloud: { count: 12, opacity: 0.34, speed: 0.01 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 0.86,
      directionalMultiplier: 0.48,
      exposureOffset: -0.08,
      background: 0x0f1720,
      fogDensity: 0.018,
    },
  },
  "rain-medium": {
    mode: "rain-medium",
    label: "中雨",
    description: "连续雨幕",
    rain: { count: 1250, speed: 0.078, opacity: 0.5, windDrift: 0.02 },
    wind: { count: 80, speed: 0.065, opacity: 0.22 },
    cloud: { count: 16, opacity: 0.42, speed: 0.012 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 0.78,
      directionalMultiplier: 0.38,
      exposureOffset: -0.12,
      background: 0x0c131b,
      fogDensity: 0.03,
    },
  },
  "rain-heavy": {
    mode: "rain-heavy",
    label: "大雨",
    description: "密集高速降雨",
    rain: { count: 2400, speed: 0.11, opacity: 0.6, windDrift: 0.032 },
    wind: { count: 120, speed: 0.085, opacity: 0.28 },
    cloud: { count: 20, opacity: 0.54, speed: 0.014 },
    lightning: { enabled: false, frequency: 0, intensity: 0, burstFrames: 0 },
    lighting: {
      ambientMultiplier: 0.68,
      directionalMultiplier: 0.28,
      exposureOffset: -0.18,
      background: 0x090f16,
      fogDensity: 0.045,
    },
  },
  lightning: {
    mode: "lightning",
    label: "闪电",
    description: "暴雨与闪电照明",
    rain: { count: 2200, speed: 0.105, opacity: 0.58, windDrift: 0.04 },
    wind: { count: 140, speed: 0.095, opacity: 0.32 },
    cloud: { count: 22, opacity: 0.58, speed: 0.018 },
    lightning: { enabled: true, frequency: 0.045, intensity: 18, burstFrames: 8 },
    lighting: {
      ambientMultiplier: 0.62,
      directionalMultiplier: 0.2,
      exposureOffset: -0.2,
      background: 0x070d15,
      fogDensity: 0.05,
    },
  },
};

export function getWeatherPreset(mode: WeatherMode): WeatherPreset {
  return PRESETS[mode];
}

export function resolveWeatherFogDensity(baseDensity: number, sceneSpan: number) {
  if (baseDensity <= 0) {
    return 0;
  }
  const safeSpan = Math.max(sceneSpan, 1);
  return Math.min(baseDensity, 0.45 / safeSpan);
}

export function resolveWeatherEffectSpan(sceneSpan: number) {
  return Math.round(Math.max(sceneSpan + 18, 28));
}

export function resolveWeatherEffectHeight(sceneHeight: number) {
  return Math.round(Math.max(sceneHeight + 14, 16));
}

export function resolveWeatherParticleCount(
  baseCount: number,
  sceneSpan: number,
  maxMultiplier = 5,
) {
  if (baseCount <= 0) {
    return 0;
  }
  const multiplier = Math.min(Math.max(sceneSpan / 56, 1), maxMultiplier);
  return Math.round(baseCount * multiplier);
}

const weatherCloudVolumeMultiplier = 3;
const cloudyDensityMultiplier = 2;
const weatherRainDensityMultiplier = 0.7;
const weatherRainSpeedMultiplier = 2;
const weatherRainDropSizeMultiplier = 3;
const weatherSkyHeightMultiplier = 6;
const weatherLightningThicknessMultiplier = 3;
const weatherSunScaleMultiplier = 3;
const weatherSunOpacity = 0.9;

export function resolveWeatherCloudParticleCount(
  mode: WeatherMode,
  baseCount: number,
  sceneSpan: number,
  maxMultiplier = 2.5,
) {
  const count = resolveWeatherParticleCount(baseCount, sceneSpan, maxMultiplier);
  return mode === "cloudy" ? Math.round(count * cloudyDensityMultiplier) : count;
}

export function resolveWeatherCloudScale(baseScale: number) {
  return baseScale * weatherCloudVolumeMultiplier;
}

export function resolveWeatherCloudAltitude(
  modelTop: number,
  skyPadding: number,
  ratio: number,
) {
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);
  return modelTop + skyPadding * (0.88 + (1 - 0.88) * clampedRatio);
}

export function resolveWeatherCloudWrapPadding(sceneSpan: number) {
  return Math.round(resolveWeatherScale(sceneSpan) * 28);
}

export function resolveWeatherRainTop(modelTop: number, skyPadding: number) {
  return modelTop + skyPadding * 0.82;
}

export function resolveWeatherRainParticleCount(
  baseCount: number,
  sceneSpan: number,
  maxMultiplier = 5,
) {
  return Math.round(
    resolveWeatherParticleCount(baseCount, sceneSpan, maxMultiplier) *
      weatherRainDensityMultiplier,
  );
}

export function resolveWeatherRainDropLength(baseLength: number, sceneSpan: number) {
  return baseLength * resolveWeatherScale(sceneSpan) * weatherRainDropSizeMultiplier;
}

export function resolveWeatherRainSpeed(baseSpeed: number, sceneSpan: number) {
  return baseSpeed * resolveWeatherScale(sceneSpan) * weatherRainSpeedMultiplier;
}

export function resolveWeatherScale(sceneSpan: number) {
  return Math.min(Math.max(sceneSpan / 56, 1), 8);
}

export function resolveWeatherSkyPadding(sceneSpan: number, sceneHeight: number) {
  const scalePadding = resolveWeatherScale(sceneSpan) * 8;
  return Math.round(
    Math.max(scalePadding, sceneHeight * 0.12, 6) * weatherSkyHeightMultiplier,
  );
}

export function resolveWeatherSunScale(baseScale: number, sceneSpan: number) {
  return baseScale * resolveWeatherScale(sceneSpan) * weatherSunScaleMultiplier;
}

export function resolveWeatherSunOpacity(baseOpacity: number) {
  return Math.min(Math.max(baseOpacity, weatherSunOpacity), 1);
}

export function resolveWeatherLightningRadius(sceneSpan: number) {
  return 0.045 * resolveWeatherScale(sceneSpan) * weatherLightningThicknessMultiplier;
}

export function resolveWeatherLightningCooldownFrames(ratio: number) {
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);
  return Math.round(42 + (150 - 42) * clampedRatio);
}

export function resolveWeatherLightningStrikePosition(
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  xRatio: number,
  zRatio: number,
) {
  const clampedX = Math.min(Math.max(xRatio, 0), 1);
  const clampedZ = Math.min(Math.max(zRatio, 0), 1);
  return {
    x: bounds.minX + (bounds.maxX - bounds.minX) * clampedX,
    z: bounds.minZ + (bounds.maxZ - bounds.minZ) * clampedZ,
  };
}
