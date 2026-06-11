import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaClimateControl } from "./HaClimateControl";

const climateState = {
  entity_id: "climate.living_room",
  state: "cool",
  attributes: {
    friendly_name: "客厅空调",
    temperature: 24,
    current_temperature: 26,
    min_temp: 18,
    max_temp: 30,
    target_temp_step: 0.5,
    hvac_modes: ["off", "cool", "heat", "dry", "fan_only"],
    fan_mode: "auto",
    fan_modes: ["auto", "low", "high"],
  },
};

describe("HaClimateControl", () => {
  it("renders climate temperature arc controls from HA attributes", () => {
    render(
      <HaClimateControl
        entityIds={["climate.living_room"]}
        states={{ "climate.living_room": climateState }}
        onCall={vi.fn()}
      />,
    );

    expect(screen.getByText("客厅空调")).toBeTruthy();
    const slider = screen.getByRole("slider", { name: "空调温度" });
    expect(slider.getAttribute("aria-valuemin")).toBe("18");
    expect(slider.getAttribute("aria-valuemax")).toBe("30");
    expect(slider.getAttribute("aria-valuenow")).toBe("24");
  });

  it("nudges temperature by the entity step", () => {
    const onCall = vi.fn();

    render(
      <HaClimateControl
        entityIds={["climate.living_room"]}
        states={{ "climate.living_room": climateState }}
        onCall={onCall}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "升高温度" }));

    expect(onCall).toHaveBeenCalledWith("climate.living_room", "set_temperature", {
      temperature: 24.5,
      hvac_mode: "cool",
    });
  });

  it("adjusts temperature from the knob keyboard interaction", () => {
    const onCall = vi.fn();

    render(
      <HaClimateControl
        entityIds={["climate.living_room"]}
        states={{ "climate.living_room": climateState }}
        onCall={onCall}
      />,
    );

    fireEvent.keyDown(screen.getByRole("slider", { name: "空调温度" }), {
      key: "ArrowUp",
    });

    expect(onCall).toHaveBeenCalledWith("climate.living_room", "set_temperature", {
      temperature: 24.5,
      hvac_mode: "cool",
    });
  });
});
