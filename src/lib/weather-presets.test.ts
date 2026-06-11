import { describe, expect, it } from "vitest";
import {
  getWeatherPreset,
  resolveWeatherEffectHeight,
  resolveWeatherParticleCount,
  resolveWeatherCloudParticleCount,
  resolveWeatherCloudScale,
  resolveWeatherCloudAltitude,
  resolveWeatherCloudWrapPadding,
  resolveWeatherRainDropLength,
  resolveWeatherRainParticleCount,
  resolveWeatherRainSpeed,
  resolveWeatherRainTop,
  resolveWeatherLightningRadius,
  resolveWeatherLightningCooldownFrames,
  resolveWeatherLightningStrikePosition,
  resolveWeatherScale,
  resolveWeatherSkyPadding,
  resolveWeatherSunOpacity,
  resolveWeatherSunScale,
  resolveWeatherEffectSpan,
  resolveWeatherFogDensity,
  WEATHER_OPTIONS,
  type WeatherMode,
} from "./weather-presets";

describe("weather presets", () => {
  it("exposes every toolbar weather option with a label", () => {
    expect(WEATHER_OPTIONS.map((option) => option.mode)).toEqual([
      "none",
      "sunny",
      "cloudy",
      "overcast",
      "wind",
      "rain-light",
      "rain-medium",
      "rain-heavy",
      "lightning",
    ]);
    expect(WEATHER_OPTIONS.every((option) => option.label.length > 0)).toBe(true);
  });

  it("scales rain density from light to heavy", () => {
    const light = getWeatherPreset("rain-light");
    const medium = getWeatherPreset("rain-medium");
    const heavy = getWeatherPreset("rain-heavy");

    expect(light.rain.count).toBeGreaterThan(0);
    expect(medium.rain.count).toBeGreaterThan(light.rain.count);
    expect(heavy.rain.count).toBeGreaterThan(medium.rain.count);
    expect(heavy.rain.speed).toBeGreaterThan(light.rain.speed);
  });

  it("reduces medium and heavy rain base density by a quarter", () => {
    expect(getWeatherPreset("rain-medium").rain.count).toBe(938);
    expect(getWeatherPreset("rain-heavy").rain.count).toBe(1800);
  });

  it("keeps weather particle counts suitable for whole-home model editing", () => {
    expect(getWeatherPreset("rain-heavy").rain.count).toBeLessThanOrEqual(2600);
    expect(getWeatherPreset("lightning").rain.count).toBeLessThanOrEqual(2600);
  });

  it("enables lightning flashes only for lightning weather", () => {
    const modes: WeatherMode[] = [
      "none",
      "sunny",
      "cloudy",
      "overcast",
      "wind",
      "rain-light",
      "rain-medium",
      "rain-heavy",
    ];

    expect(getWeatherPreset("lightning").lightning.enabled).toBe(true);
    expect(modes.every((mode) => !getWeatherPreset(mode).lightning.enabled)).toBe(true);
  });

  it("brightens sunny weather and darkens overcast weather", () => {
    const sunny = getWeatherPreset("sunny");
    const overcast = getWeatherPreset("overcast");

    expect(sunny.lighting.ambientMultiplier).toBeGreaterThanOrEqual(1.15);
    expect(sunny.lighting.directionalMultiplier).toBeGreaterThanOrEqual(1.45);
    expect(sunny.lighting.exposureOffset).toBeGreaterThanOrEqual(0.14);
    expect(overcast.lighting.directionalMultiplier).toBeLessThan(1);
    expect(overcast.cloud.opacity).toBeGreaterThan(sunny.cloud.opacity);
  });

  it("scales fog down for large whole-home models so geometry stays visible", () => {
    expect(resolveWeatherFogDensity(0.05, 200)).toBeLessThanOrEqual(0.003);
    expect(resolveWeatherFogDensity(0.018, 20)).toBeCloseTo(0.018);
    expect(resolveWeatherFogDensity(0, 200)).toBe(0);
  });

  it("expands weather effects to cover large whole-home models", () => {
    expect(resolveWeatherEffectSpan(800)).toBe(818);
    expect(resolveWeatherEffectSpan(20)).toBe(38);
    expect(resolveWeatherEffectSpan(4)).toBe(28);
    expect(resolveWeatherEffectHeight(200)).toBe(214);
  });

  it("increases weather particles for larger model spans with a safe cap", () => {
    expect(resolveWeatherParticleCount(2400, 20)).toBe(2400);
    expect(resolveWeatherParticleCount(2400, 112)).toBe(4800);
    expect(resolveWeatherParticleCount(2400, 800)).toBe(12000);
  });

  it("uses denser and larger clouds for whole-home weather", () => {
    expect(resolveWeatherCloudParticleCount("cloudy", 12, 56)).toBe(24);
    expect(resolveWeatherCloudParticleCount("rain-heavy", 20, 56)).toBe(20);
    expect(resolveWeatherCloudParticleCount("cloudy", 12, 112)).toBe(48);
    expect(resolveWeatherCloudScale(4)).toBe(12);
    expect(resolveWeatherRainTop(10, 60)).toBeCloseTo(59.2);
    expect(resolveWeatherCloudAltitude(10, 60, 0)).toBeCloseTo(62.8);
    expect(resolveWeatherCloudAltitude(10, 60, 1)).toBeCloseTo(70);
    expect(resolveWeatherCloudWrapPadding(20)).toBe(28);
    expect(resolveWeatherCloudWrapPadding(112)).toBe(56);
  });

  it("keeps rain lighter but makes each raindrop larger", () => {
    expect(resolveWeatherRainParticleCount(2400, 20)).toBe(1680);
    expect(resolveWeatherRainParticleCount(2400, 112)).toBe(3360);
    expect(resolveWeatherRainSpeed(0.11, 20)).toBeCloseTo(0.22);
    expect(resolveWeatherRainSpeed(0.11, 112)).toBeCloseTo(0.44);
    expect(resolveWeatherRainDropLength(0.7, 20)).toBeCloseTo(2.1);
    expect(resolveWeatherRainDropLength(0.7, 112)).toBeCloseTo(4.2);
  });

  it("scales weather element size, speed, and sky height to model dimensions", () => {
    expect(resolveWeatherScale(20)).toBe(1);
    expect(resolveWeatherScale(112)).toBe(2);
    expect(resolveWeatherScale(800)).toBe(8);
    expect(resolveWeatherSkyPadding(20, 4)).toBe(48);
    expect(resolveWeatherSkyPadding(112, 30)).toBe(96);
    expect(resolveWeatherSkyPadding(800, 200)).toBe(384);
    expect(resolveWeatherSunScale(5.5, 20)).toBeCloseTo(16.5);
    expect(resolveWeatherSunScale(5.5, 112)).toBeCloseTo(33);
    expect(resolveWeatherSunOpacity(0.58)).toBeCloseTo(0.9);
  });

  it("scales lightning into a visibly thick bolt", () => {
    expect(resolveWeatherLightningRadius(20)).toBeCloseTo(0.135);
    expect(resolveWeatherLightningRadius(112)).toBeCloseTo(0.27);
    expect(resolveWeatherLightningRadius(800)).toBeCloseTo(1.08);
    expect(resolveWeatherLightningCooldownFrames(0)).toBe(42);
    expect(resolveWeatherLightningCooldownFrames(1)).toBe(150);
    expect(
      resolveWeatherLightningStrikePosition(
        { minX: -10, maxX: 30, minZ: 100, maxZ: 180 },
        0.25,
        0.75,
      ),
    ).toEqual({ x: 0, z: 160 });
  });

  it("defines lightning as a visible multi-frame burst", () => {
    const lightning = getWeatherPreset("lightning").lightning;

    expect(lightning.frequency).toBeGreaterThanOrEqual(0.035);
    expect(lightning.intensity).toBeGreaterThanOrEqual(16);
    expect(lightning.burstFrames).toBeGreaterThanOrEqual(5);
  });
});
