import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { HaFloatingPanel } from "./HaFloatingPanel";

vi.mock("../../lib/floating-panel-placement", () => ({
  placeFloatingPanel: () => ({ left: 0, top: 0 }),
}));

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
});

describe("HaFloatingPanel", () => {
  it("does not duplicate bound light entities in the generic entity list", () => {
    render(
      <HaFloatingPanel
        anchor={{ x: 10, y: 10 }}
        bindings={[
          { type: "entity", entityId: "light.lamp" },
          { type: "entity", entityId: "switch.socket" },
        ]}
        lightCapability={null}
        states={{
          "light.lamp": {
            entity_id: "light.lamp",
            state: "on",
            attributes: { friendly_name: "客厅灯", brightness: 128 },
          },
          "switch.socket": {
            entity_id: "switch.socket",
            state: "off",
            attributes: { friendly_name: "插座" },
          },
        }}
        onCall={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("亮度调节")).toBeTruthy();
    expect(screen.queryByTitle("客厅灯")).toBeNull();
    expect(screen.getByTitle("插座")).toBeTruthy();
  });
});
