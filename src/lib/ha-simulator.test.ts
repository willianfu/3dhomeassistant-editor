import { describe, expect, it } from "vitest";
import { applySimulatedServiceCall } from "./ha-simulator";
import type { HaEntityState } from "../types/ha";

const lightState: HaEntityState = {
  entity_id: "light.kitchen",
  state: "off",
  attributes: {
    brightness: 80,
    color_temp_kelvin: 3000,
    friendly_name: "Kitchen",
  },
};

describe("ha-simulator", () => {
  it("turns a light on and updates brightness and color temperature", () => {
    const next = applySimulatedServiceCall(
      { "light.kitchen": lightState },
      "light.kitchen",
      "turn_on",
      { brightness: 180, color_temp_kelvin: 4200 },
    );

    expect(next["light.kitchen"]).toMatchObject({
      entity_id: "light.kitchen",
      state: "on",
      attributes: {
        brightness: 180,
        color_temp_kelvin: 4200,
      },
    });
  });

  it("turns switch-like entities off", () => {
    const next = applySimulatedServiceCall(
      {
        "switch.wall": {
          entity_id: "switch.wall",
          state: "on",
          attributes: {},
        },
      },
      "switch.wall",
      "turn_off",
    );

    expect(next["switch.wall"].state).toBe("off");
  });

  it("creates a missing state for local-only simulation", () => {
    const next = applySimulatedServiceCall({}, "number.light_level", "set_value", {
      value: 65,
    });

    expect(next["number.light_level"]).toMatchObject({
      entity_id: "number.light_level",
      state: "65",
    });
  });

  it("updates mapped color temperature number entities", () => {
    const next = applySimulatedServiceCall(
      {
        "input_number.light_kelvin": {
          entity_id: "input_number.light_kelvin",
          state: "3000",
          attributes: {},
        },
      },
      "input_number.light_kelvin",
      "set_value",
      { value: 4600 },
    );

    expect(next["input_number.light_kelvin"].state).toBe("4600");
  });
});
