import { describe, expect, it } from "vitest";
import { defaultEnvironment } from "../types/editor";
import {
  getSolarDaylightRatio,
  getSolarDirection,
  getSolarEnvironmentPreset,
} from "./environment-lighting";

describe("environment lighting timeline", () => {
  it("places morning sun in the east and evening sun in the west", () => {
    expect(getSolarDirection(6).x).toBeGreaterThan(0);
    expect(getSolarDirection(18).x).toBeLessThan(0);
  });

  it("places noon sun high and to the south of the plan", () => {
    const noon = getSolarDirection(12);

    expect(noon.y).toBeGreaterThan(10);
    expect(noon.z).toBeGreaterThan(7);
    expect(Math.abs(noon.x)).toBeLessThan(0.1);
  });

  it("generates a brighter and cooler noon preset than midnight", () => {
    const midnight = getSolarEnvironmentPreset(0, defaultEnvironment);
    const noon = getSolarEnvironmentPreset(12, defaultEnvironment);

    expect(noon.directionalIntensity).toBeGreaterThan(midnight.directionalIntensity);
    expect(noon.ambientIntensity).toBeGreaterThan(midnight.ambientIntensity);
    expect(noon.colorTemperatureKelvin).toBeGreaterThan(midnight.colorTemperatureKelvin);
  });

  it("uses noon as the brightness peak", () => {
    expect(getSolarDaylightRatio(12)).toBe(1);
    expect(getSolarDaylightRatio(11)).toBeLessThan(1);
    expect(getSolarDaylightRatio(13)).toBeLessThan(1);
  });

  it("starts dawn at 6:00 and switches to fixed night at 19:00", () => {
    const dawn = getSolarEnvironmentPreset(6, defaultEnvironment);
    const night = getSolarEnvironmentPreset(19, defaultEnvironment);
    const lateNight = getSolarEnvironmentPreset(23, defaultEnvironment);
    const earlyMorning = getSolarEnvironmentPreset(5, defaultEnvironment);

    expect(dawn.colorTemperatureKelvin).not.toBe(5000);
    expect(dawn.directionalPosition.x).toBeGreaterThan(0);
    expect(night).toMatchObject({
      ambientIntensity: 0.5,
      directionalIntensity: 0.5,
      colorTemperatureKelvin: 5000,
    });
    expect(lateNight).toMatchObject({
      ambientIntensity: 0.5,
      directionalIntensity: 0.5,
      colorTemperatureKelvin: 5000,
    });
    expect(earlyMorning).toMatchObject({
      ambientIntensity: 0.5,
      directionalIntensity: 0.5,
      colorTemperatureKelvin: 5000,
    });
  });
});
