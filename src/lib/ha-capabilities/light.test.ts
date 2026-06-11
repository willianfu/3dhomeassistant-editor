import { describe, expect, it } from "vitest";
import {
  resolveLightRenderIntensity,
  defaultLightCapabilityConfig,
  resolveLightCapability,
  resolveHaLightControlCapabilities,
} from "./light";
import type { HaEntityState } from "../../types/ha";

const states: Record<string, HaEntityState> = {
  "light.kitchen": {
    entity_id: "light.kitchen",
    state: "on",
    attributes: {
      brightness: 128,
      color_temp_kelvin: 3200,
      min_color_temp_kelvin: 2200,
      max_color_temp_kelvin: 6500,
      effect: "reading",
      effect_list: ["reading", "relax"],
      friendly_name: "Kitchen light",
    },
  },
  "switch.kitchen_light": {
    entity_id: "switch.kitchen_light",
    state: "off",
    attributes: {},
  },
  "number.kitchen_brightness": {
    entity_id: "number.kitchen_brightness",
    state: "60",
    attributes: {},
  },
  "input_number.kitchen_kelvin": {
    entity_id: "input_number.kitchen_kelvin",
    state: "4200",
    attributes: {},
  },
  "custom.kitchen_lamp": {
    entity_id: "custom.kitchen_lamp",
    state: "on",
    attributes: {
      brightness: 90,
    },
  },
};

describe("light capability", () => {
  it("resolves light state from a bound light entity", () => {
    const resolved = resolveLightCapability({
      config: defaultLightCapabilityConfig(),
      entityIds: ["light.kitchen"],
      states,
    });

    expect(resolved).toEqual({
      enabled: true,
      isOn: true,
      brightnessRatio: 128 / 255,
      colorTemperatureKelvin: 3200,
      sourceEntityId: "light.kitchen",
      lightType: "point",
      emissionMode: "whole",
      coneAngle: 45,
      maxIntensity: 8,
      lightRange: 14,
    });
  });

  it("uses HA brightness as a 0-255 value and amplifies the real light source by 10x", () => {
    const resolved = resolveLightCapability({
      config: defaultLightCapabilityConfig(),
      entityIds: ["light.kitchen"],
      states,
    });

    const intensity = resolveLightRenderIntensity(resolved);

    expect(resolved.brightnessRatio).toBeCloseTo(128 / 255);
    expect(intensity.emissiveIntensity).toBeCloseTo((128 / 255) * 8);
    expect(intensity.lightIntensity).toBeCloseTo((128 / 255) * 8 * 10);
  });

  it("allows switch, brightness, and color temperature mappings to override the light entity", () => {
    const resolved = resolveLightCapability({
      config: {
        ...defaultLightCapabilityConfig(),
        powerEntityId: "switch.kitchen_light",
        brightnessEntityId: "number.kitchen_brightness",
        colorTemperatureEntityId: "input_number.kitchen_kelvin",
        maxBrightness: 100,
        fixedColorTemperatureKelvin: 3000,
      },
      entityIds: ["light.kitchen"],
      states,
    });

    expect(resolved).toMatchObject({
      enabled: true,
      isOn: false,
      brightnessRatio: 0.6,
      colorTemperatureKelvin: 4200,
    });
  });

  it("does not enable light effects without a light entity or explicit config", () => {
    const resolved = resolveLightCapability({
      config: null,
      entityIds: ["switch.kitchen_light"],
      states,
    });

    expect(resolved.enabled).toBe(false);
  });

  it("uses the first bound entity as the light source when device type is manually set to light", () => {
    const resolved = resolveLightCapability({
      config: {
        ...defaultLightCapabilityConfig(),
        enabled: true,
      },
      entityIds: ["custom.kitchen_lamp"],
      states,
    });

    expect(resolved).toMatchObject({
      enabled: true,
      isOn: true,
      sourceEntityId: "custom.kitchen_lamp",
      brightnessRatio: 90 / 255,
    });
  });

  it("supports area light configuration", () => {
    const resolved = resolveLightCapability({
      config: {
        ...defaultLightCapabilityConfig(),
        enabled: true,
        lightType: "area",
      },
      entityIds: ["custom.kitchen_lamp"],
      states,
    });

    expect(resolved.lightType).toBe("area");
  });

  it("resolves bottom emission placement and custom light range", () => {
    const resolved = resolveLightCapability({
      config: {
        ...defaultLightCapabilityConfig(),
        enabled: true,
        emissionMode: "bottom",
        lightRange: 22,
      },
      entityIds: ["custom.kitchen_lamp"],
      states,
    });

    expect(resolved).toMatchObject({
      emissionMode: "bottom",
      lightRange: 22,
    });
  });

  it("derives Home Assistant light control capabilities from entity attributes", () => {
    const capabilities = resolveHaLightControlCapabilities(states["light.kitchen"]);

    expect(capabilities).toEqual({
      brightnessPercent: 50,
      colorTemperatureKelvin: 3200,
      minColorTemperatureKelvin: 2200,
      maxColorTemperatureKelvin: 6500,
      effect: "reading",
      effects: ["reading", "relax"],
      supportsBrightness: true,
      supportsColorTemperature: true,
      supportsEffect: true,
    });
  });
});
