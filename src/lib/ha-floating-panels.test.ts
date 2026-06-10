import { describe, expect, it } from "vitest";
import {
  closeHaFloatingPanel,
  openHaFloatingPanel,
  removeMissingHaFloatingPanels,
} from "./ha-floating-panels";

describe("ha-floating-panels", () => {
  it("keeps panels for multiple selected objects open at the same time", () => {
    const first = openHaFloatingPanel([], ["lamp"]);
    const second = openHaFloatingPanel(first, ["fan"]);

    expect(second.map((panel) => panel.objectIds)).toEqual([["lamp"], ["fan"]]);
  });

  it("reuses an existing panel for the same object target", () => {
    const panels = openHaFloatingPanel(
      [{ id: "lamp", objectIds: ["lamp"] }],
      ["lamp"],
    );

    expect(panels).toEqual([{ id: "lamp", objectIds: ["lamp"] }]);
  });

  it("only closes the panel whose close button was clicked", () => {
    const panels = [
      { id: "lamp", objectIds: ["lamp"] },
      { id: "fan", objectIds: ["fan"] },
    ];

    expect(closeHaFloatingPanel(panels, "lamp")).toEqual([
      { id: "fan", objectIds: ["fan"] },
    ]);
  });

  it("removes panels whose target objects no longer exist", () => {
    const panels = [
      { id: "lamp", objectIds: ["lamp"] },
      { id: "fan", objectIds: ["fan"] },
    ];

    expect(removeMissingHaFloatingPanels(panels, new Set(["fan"]))).toEqual([
      { id: "fan", objectIds: ["fan"] },
    ]);
  });
});
