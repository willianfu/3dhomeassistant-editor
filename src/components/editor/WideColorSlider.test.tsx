import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WideColorSlider } from "./WideColorSlider";

describe("WideColorSlider", () => {
  it("updates while dragging and commits only when released", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();

    render(
      <WideColorSlider
        ariaLabel="亮度"
        min={1}
        max={100}
        value={50}
        background="rgb(255, 190, 120)"
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );

    const slider = screen.getByRole("slider", { name: "亮度" });
    fireEvent.change(slider, { target: { value: "72" } });

    expect(onValueChange).toHaveBeenCalledWith(72);
    expect(onValueCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(slider);

    expect(onValueCommit).toHaveBeenCalledWith(72);
  });
});
