import { describe, expect, it } from "vitest";
import { getVirtualRange } from "./virtual-list";

describe("virtual-list", () => {
  it("returns the visible window with overscan", () => {
    expect(
      getVirtualRange({
        itemCount: 100,
        rowHeight: 32,
        scrollTop: 320,
        viewportHeight: 160,
        overscan: 2,
      }),
    ).toEqual({ start: 8, end: 17, offsetTop: 256, totalHeight: 3200 });
  });

  it("clamps the visible window at list boundaries", () => {
    expect(
      getVirtualRange({
        itemCount: 5,
        rowHeight: 32,
        scrollTop: 500,
        viewportHeight: 200,
        overscan: 4,
      }),
    ).toEqual({ start: 0, end: 5, offsetTop: 0, totalHeight: 160 });
  });

  it("handles empty lists", () => {
    expect(
      getVirtualRange({
        itemCount: 0,
        rowHeight: 32,
        scrollTop: 0,
        viewportHeight: 200,
        overscan: 2,
      }),
    ).toEqual({ start: 0, end: 0, offsetTop: 0, totalHeight: 0 });
  });
});
