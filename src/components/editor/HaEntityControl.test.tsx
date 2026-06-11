import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaEntityControl } from "./HaEntityControl";

describe("HaEntityControl", () => {
  it("renders button entities as a press action", () => {
    const onCall = vi.fn();

    render(
      <HaEntityControl
        entityId="button.scene_reset"
        state={{
          entity_id: "button.scene_reset",
          state: "unknown",
          attributes: { friendly_name: "场景重置" },
        }}
        onCall={onCall}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "按下" }));

    expect(onCall).toHaveBeenCalledWith("button.scene_reset", "press");
  });

  it("renders switch entities as on/off controls", () => {
    const onCall = vi.fn();

    render(
      <HaEntityControl
        entityId="switch.socket"
        state={{
          entity_id: "switch.socket",
          state: "off",
          attributes: { friendly_name: "插座" },
        }}
        onCall={onCall}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开" }));

    expect(onCall).toHaveBeenCalledWith("switch.socket", "turn_on");
  });

  it("commits number entity value after editing", () => {
    const onCall = vi.fn();

    render(
      <HaEntityControl
        entityId="number.volume"
        state={{
          entity_id: "number.volume",
          state: "30",
          attributes: { friendly_name: "音量", min: 0, max: 100, step: 1 },
        }}
        onCall={onCall}
      />,
    );

    const input = screen.getByLabelText("音量 数值");
    fireEvent.change(input, { target: { value: "45" } });
    fireEvent.blur(input);

    expect(onCall).toHaveBeenCalledWith("number.volume", "set_value", {
      value: 45,
    });
  });

  it("runs scene entities as one-click actions", () => {
    const onCall = vi.fn();

    render(
      <HaEntityControl
        entityId="scene.movie"
        state={{
          entity_id: "scene.movie",
          state: "scening",
          attributes: { friendly_name: "观影模式" },
        }}
        onCall={onCall}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "执行" }));

    expect(onCall).toHaveBeenCalledWith("scene.movie", "turn_on");
  });
});
