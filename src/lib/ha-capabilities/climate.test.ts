import { describe, expect, it } from "vitest";
import {
  resolveHaClimateCapabilities,
  roundClimateTemperature,
} from "./climate";

describe("ha climate capabilities", () => {
  it("uses HA climate temperature range, step, modes, and fan modes", () => {
    const capabilities = resolveHaClimateCapabilities("climate.living_room", {
      entity_id: "climate.living_room",
      state: "cool",
      attributes: {
        friendly_name: "Living AC",
        temperature: 25.5,
        current_temperature: 27,
        temperature_unit: "°F",
        min_temp: 18,
        max_temp: 32,
        target_temp_step: 0.5,
        hvac_modes: ["off", "cool", "heat"],
        fan_mode: "auto",
        fan_modes: ["auto", "low", "high"],
      },
    });

    expect(capabilities).toMatchObject({
      friendlyName: "Living AC",
      isOn: true,
      hvacMode: "cool",
      targetTemperature: 25.5,
      currentTemperature: 27,
      temperatureUnit: "°F",
      minTemperature: 18,
      maxTemperature: 32,
      temperatureStep: 0.5,
      fanMode: "auto",
      fanModes: ["auto", "low", "high"],
      hvacModes: ["off", "cool", "heat"],
    });
  });

  it("rounds target temperature to entity step", () => {
    expect(roundClimateTemperature(24.76, 0.5)).toBe(25);
    expect(roundClimateTemperature(24.24, 0.5)).toBe(24);
    expect(roundClimateTemperature(24.12, 0.1)).toBe(24.1);
  });
});
