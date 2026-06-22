import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createRainLineEffect,
  createWindLineEffect,
  updateRainLineEffect,
  updateWindLineEffect,
  type WeatherEffectBounds,
} from "./weather-effects";

const bounds: WeatherEffectBounds = {
  minX: -10,
  maxX: 10,
  minY: 0,
  maxY: 20,
  minZ: -8,
  maxZ: 8,
};

describe("weather effects", () => {
  it("creates rain as line particles with faded tails", () => {
    const rain = createRainLineEffect({
      bounds,
      count: 12,
      speed: 0.8,
      drift: 0.2,
      opacity: 0.6,
      length: 1.2,
      color: 0xf4f1ea,
    });
    const colors = rain.geometry.attributes.color.array as Float32Array;

    expect(rain.kind).toBe("rain");
    expect(rain.object.type).toBe("LineSegments");
    expect(rain.geometry.attributes.position.count).toBe(24);
    expect(colors[0]).toBeGreaterThan(colors[3]);
    expect(rain.particles).toHaveLength(12);
  });

  it("keeps rain particles inside the weather bounds while falling", () => {
    const rain = createRainLineEffect({
      bounds,
      count: 8,
      speed: 10,
      drift: 0.4,
      opacity: 0.5,
      length: 0.9,
      color: 0xffffff,
    });

    updateRainLineEffect(rain, 4, 2);

    for (const particle of rain.particles) {
      expect(particle.position.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(particle.position.x).toBeLessThanOrEqual(bounds.maxX);
      expect(particle.position.y).toBeLessThanOrEqual(bounds.maxY + 4);
      expect(particle.position.z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(particle.position.z).toBeLessThanOrEqual(bounds.maxZ);
    }
  });

  it("creates wind as reusable curved sweep meshes", () => {
    const wind = createWindLineEffect({
      bounds,
      count: 5,
      speed: 0.2,
      opacity: 0.35,
      color: 0xd7f3ff,
      length: 5,
    });

    expect(wind.kind).toBe("wind");
    expect(wind.object.children).toHaveLength(5);
    expect(wind.lines.every((line) => line.material.uniforms.uProgress.value === 1)).toBe(true);
  });

  it("cycles wind line progress and repositions finished lines", () => {
    const wind = createWindLineEffect({
      bounds,
      count: 2,
      speed: 0.5,
      opacity: 0.4,
      color: 0xffffff,
      length: 5,
    });
    const before = wind.lines[0].mesh.position.clone();

    updateWindLineEffect(wind, 3);

    expect(wind.lines[0].material.uniforms.uProgress.value).toBeLessThan(1);
    expect(wind.lines[0].mesh.position.equals(before)).toBe(false);
  });

  it("disposes nested wind and rain resources", () => {
    const rain = createRainLineEffect({
      bounds,
      count: 1,
      speed: 1,
      drift: 0,
      opacity: 1,
      length: 1,
      color: 0xffffff,
    });
    const wind = createWindLineEffect({
      bounds,
      count: 1,
      speed: 1,
      opacity: 1,
      color: 0xffffff,
      length: 1,
    });

    rain.dispose();
    wind.dispose();

    expect(rain.geometry.attributes.position.count).toBe(2);
    expect(wind.object.children).toHaveLength(0);
  });
});
