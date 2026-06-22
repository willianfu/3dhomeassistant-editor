import { describe, expect, it } from "vitest";
import {
  getEditorRegionBounds,
  isPointInEditorRegion,
  normalizeEditorRegions,
} from "./editor-regions";
import type { EditorRegion } from "../types/editor";

const livingRoom: EditorRegion = {
  id: "region-living",
  name: "客厅",
  highlightMode: "edges",
  points: [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
    { x: 0, z: 3 },
  ],
};

describe("editor regions", () => {
  it("detects points inside polygon regions including edges", () => {
    expect(isPointInEditorRegion({ x: 2, z: 1.5 }, livingRoom)).toBe(true);
    expect(isPointInEditorRegion({ x: 4, z: 1.5 }, livingRoom)).toBe(true);
    expect(isPointInEditorRegion({ x: 4.2, z: 1.5 }, livingRoom)).toBe(false);
    expect(isPointInEditorRegion({ x: 2, z: -0.1 }, livingRoom)).toBe(false);
  });

  it("returns stable region bounds for focusing and hit surfaces", () => {
    expect(getEditorRegionBounds(livingRoom)).toEqual({
      minX: 0,
      maxX: 4,
      minZ: 0,
      maxZ: 3,
      center: { x: 2, z: 1.5 },
      size: { x: 4, z: 3 },
    });
  });

  it("drops invalid persisted regions and keeps valid polygon regions", () => {
    expect(
      normalizeEditorRegions([
        livingRoom,
        { ...livingRoom, id: "hidden", hidden: true },
        { id: "", name: "bad", points: livingRoom.points },
        { id: "line", name: "线", points: livingRoom.points.slice(0, 2) },
      ]),
    ).toEqual([livingRoom, { ...livingRoom, id: "hidden", hidden: true }]);
  });
});
