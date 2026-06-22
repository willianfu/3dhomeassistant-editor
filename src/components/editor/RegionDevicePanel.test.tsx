import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegionDevicePanel } from "./RegionDevicePanel";

describe("RegionDevicePanel", () => {
  it("renders all controllable devices for the selected region", () => {
    const onCall = vi.fn();

    render(
      <RegionDevicePanel
        devices={[
          {
            id: "lamp",
            name: "主灯模型",
            objectIds: ["lamp"],
            bindings: [{ type: "entity", entityId: "light.living_room" }],
            lightCapability: null,
            coverCapability: null,
          },
          {
            id: "socket",
            name: "插座模型",
            objectIds: ["socket"],
            bindings: [{ type: "entity", entityId: "switch.socket" }],
            lightCapability: null,
            coverCapability: null,
          },
        ]}
        states={{
          "light.living_room": {
            entity_id: "light.living_room",
            state: "on",
            attributes: { friendly_name: "客厅灯", brightness: 128 },
          },
          "switch.socket": {
            entity_id: "switch.socket",
            state: "off",
            attributes: { friendly_name: "插座" },
          },
        }}
        onCall={onCall}
      />,
    );

    expect(screen.getByText("区域设备")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("客厅灯")).toBeTruthy();
    expect(screen.getAllByText("插座").length).toBeGreaterThan(0);
    expect(screen.queryByText("主灯模型")).toBeNull();
    expect(screen.queryByText("插座模型")).toBeNull();
    expect(screen.getByText("亮度调节")).toBeTruthy();
    expect(screen.getAllByTitle("插座").length).toBeGreaterThan(0);
  });
});
