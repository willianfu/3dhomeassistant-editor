import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaLightControl } from "./HaLightControl";

describe("HaLightControl", () => {
  it("sends brightness updates only when the slider interaction commits", () => {
    const onCall = vi.fn();

    render(
      <HaLightControl
        entityIds={["light.lamp"]}
        config={{ enabled: true, maxBrightness: 255 } as never}
        states={{
          "light.lamp": {
            entity_id: "light.lamp",
            state: "on",
            attributes: { brightness: 128, color_temp_kelvin: 3000 },
          },
        }}
        onCall={onCall}
      />,
    );

    const slider = screen.getByRole("slider", { name: "亮度调节" });
    fireEvent.change(slider, { target: { value: "80" } });

    expect(onCall).not.toHaveBeenCalled();

    fireEvent.pointerUp(slider);

    expect(onCall).toHaveBeenCalledWith("light.lamp", "turn_on", {
      brightness_pct: 80,
    });
  });

  it("uses HA light brightness percent and entity color temperature range", () => {
    const onCall = vi.fn();

    render(
      <HaLightControl
        entityIds={["light.lamp"]}
        config={null}
        states={{
          "light.lamp": {
            entity_id: "light.lamp",
            state: "on",
            attributes: {
              brightness: 128,
              color_temp_kelvin: 3000,
              min_color_temp_kelvin: 2200,
              max_color_temp_kelvin: 5000,
              effect: "阅读模式",
              effect_list: ["阅读模式", "夜灯"],
            },
          },
        }}
        onCall={onCall}
      />,
    );

    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(screen.getByText("阅读模式")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "切换到色温调节" }));

    const colorTemperatureSlider = screen.getByRole("slider", {
      name: "色温调节",
    });
    expect(colorTemperatureSlider.getAttribute("min")).toBe("2200");
    expect(colorTemperatureSlider.getAttribute("max")).toBe("5000");
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });
});
