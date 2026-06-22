import { describe, expect, it } from "vitest";
import {
  defaultCoverCapabilityConfig,
  resolveCoverAnimationTransform,
  resolveCoverAnimationStepPercent,
  resolveCoverAnimationSpeedMetersPerSecond,
  resolveCoverPositionPercent,
  resolveSymmetricalCoverTargetMode,
} from "./cover";

function transformedBounds({
  min,
  max,
  scale,
  offset,
}: {
  min: number;
  max: number;
  scale: number;
  offset: number;
}) {
  return {
    min: min * scale + offset,
    max: max * scale + offset,
  };
}

describe("ha cover capabilities", () => {
  it("keeps a closed cover at its original size and position", () => {
    const transform = resolveCoverAnimationTransform({
      config: defaultCoverCapabilityConfig(),
      positionPercent: 0,
      size: { x: 4, y: 3, z: 0.2 },
    });

    expect(transform.scale).toEqual({ x: 1, y: 1, z: 1 });
    expect(transform.offset).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("rounds cover position to whole percent values", () => {
    const position = resolveCoverPositionPercent(["cover.main"], {
      "cover.main": {
        entity_id: "cover.main",
        state: "open",
        attributes: { current_position: 42.6 },
      },
    });

    expect(position).toBe(43);
  });

  it("shrinks a symmetrical cover around its center", () => {
    const transform = resolveCoverAnimationTransform({
      config: { enabled: true, openMode: "symmetrical" },
      positionPercent: 50,
      size: { x: 4, y: 3, z: 0.2 },
    });

    expect(transform.scale.x).toBeCloseTo(0.5);
    expect(transform.offset.x).toBeCloseTo(0);
  });

  it("keeps the right edge fixed when a cover opens to the left", () => {
    const transform = resolveCoverAnimationTransform({
      config: { enabled: true, openMode: "left" },
      positionPercent: 50,
      size: { x: 4, y: 3, z: 0.2 },
      localBounds: {
        min: { x: -1, y: -1.5, z: -0.1 },
        max: { x: 3, y: 1.5, z: 0.1 },
      },
    });
    const bounds = transformedBounds({
      min: -1,
      max: 3,
      scale: transform.scale.x,
      offset: transform.offset.x,
    });

    expect(transform.scale.x).toBeCloseTo(0.5);
    expect(bounds.min).toBeCloseTo(1);
    expect(bounds.max).toBeCloseTo(3);
  });

  it("keeps the left edge fixed when a cover opens to the right", () => {
    const transform = resolveCoverAnimationTransform({
      config: { enabled: true, openMode: "right" },
      positionPercent: 50,
      size: { x: 4, y: 3, z: 0.2 },
      localBounds: {
        min: { x: -1, y: -1.5, z: -0.1 },
        max: { x: 3, y: 1.5, z: 0.1 },
      },
    });
    const bounds = transformedBounds({
      min: -1,
      max: 3,
      scale: transform.scale.x,
      offset: transform.offset.x,
    });

    expect(transform.scale.x).toBeCloseTo(0.5);
    expect(bounds.min).toBeCloseTo(-1);
    expect(bounds.max).toBeCloseTo(1);
  });

  it("anchors a down-opening cover to the lower edge", () => {
    const transform = resolveCoverAnimationTransform({
      config: { enabled: true, openMode: "down" },
      positionPercent: 50,
      size: { x: 4, y: 3, z: 0.2 },
      localBounds: {
        min: { x: -2, y: 1, z: -0.1 },
        max: { x: 2, y: 4, z: 0.1 },
      },
    });
    const bounds = transformedBounds({
      min: 1,
      max: 4,
      scale: transform.scale.y,
      offset: transform.offset.y,
    });

    expect(transform.scale.y).toBeCloseTo(0.5);
    expect(bounds.min).toBeCloseTo(1);
    expect(bounds.max).toBeCloseTo(2.5);
  });

  it("anchors an up-opening cover to the upper edge", () => {
    const transform = resolveCoverAnimationTransform({
      config: { enabled: true, openMode: "up" },
      positionPercent: 50,
      size: { x: 4, y: 3, z: 0.2 },
      localBounds: {
        min: { x: -2, y: 1, z: -0.1 },
        max: { x: 2, y: 4, z: 0.1 },
      },
    });
    const bounds = transformedBounds({
      min: 1,
      max: 4,
      scale: transform.scale.y,
      offset: transform.offset.y,
    });

    expect(transform.scale.y).toBeCloseTo(0.5);
    expect(bounds.min).toBeCloseTo(2.5);
    expect(bounds.max).toBeCloseTo(4);
  });

  it("uses closed distance as retained visible size and 100% open distance as travel", () => {
    const transform = resolveCoverAnimationTransform({
      config: {
        enabled: true,
        openMode: "right",
        closedVisibleDistance: 0.4,
        openTravelDistance: 2.5,
      },
      positionPercent: 100,
      size: { x: 4, y: 3, z: 0.2 },
      localBounds: {
        min: { x: -1, y: -1.5, z: -0.1 },
        max: { x: 3, y: 1.5, z: 0.1 },
      },
    });
    const bounds = transformedBounds({
      min: -1,
      max: 3,
      scale: transform.scale.x,
      offset: transform.offset.x,
    });

    expect(bounds.min).toBeCloseTo(-1);
    expect(bounds.max).toBeCloseTo(0.5);
  });

  it("normalizes cover animation speed to one decimal place", () => {
    expect(resolveCoverAnimationSpeedMetersPerSecond({ animationSpeedMetersPerSecond: 0.26 })).toBe(
      0.3,
    );
    expect(resolveCoverAnimationSpeedMetersPerSecond({ animationSpeedMetersPerSecond: -1 })).toBe(
      0.1,
    );
  });

  it("converts cover animation speed from meters per second to percent step", () => {
    const step = resolveCoverAnimationStepPercent({
      config: {
        enabled: true,
        openMode: "right",
        closedVisibleDistance: 0.1,
        openTravelDistance: 1,
        animationSpeedMetersPerSecond: 0.5,
      },
      size: { x: 2, y: 3, z: 0.2 },
      deltaSeconds: 0.5,
    });

    expect(step).toBeCloseTo(25);
  });

  it("maps linked symmetrical targets outward from the center", () => {
    expect(resolveSymmetricalCoverTargetMode("left")).toBe("left");
    expect(resolveSymmetricalCoverTargetMode("right")).toBe("right");
  });
});
