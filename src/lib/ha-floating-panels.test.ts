import { describe, expect, it } from "vitest";
import {
  closeHaFloatingPanel,
  shouldUpdateFloatingPanelAnchors,
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

  it("keeps the same panel array reference when no targets are removed", () => {
    const panels = [
      { id: "lamp", objectIds: ["lamp"] },
      { id: "fan", objectIds: ["fan"] },
    ];

    expect(removeMissingHaFloatingPanels(panels, new Set(["lamp", "fan"]))).toBe(
      panels,
    );
  });

  it("throttles anchor updates during camera movement", () => {
    expect(
      shouldUpdateFloatingPanelAnchors({
        now: 1010,
        lastUpdateTime: 1000,
        intervalMs: 50,
      }),
    ).toBe(false);
    expect(
      shouldUpdateFloatingPanelAnchors({
        now: 1050,
        lastUpdateTime: 1000,
        intervalMs: 50,
      }),
    ).toBe(true);
  });

  it("allows a forced anchor update when panels change", () => {
    expect(
      shouldUpdateFloatingPanelAnchors({
        now: 1010,
        lastUpdateTime: 1000,
        intervalMs: 50,
        force: true,
      }),
    ).toBe(true);
  });
});
