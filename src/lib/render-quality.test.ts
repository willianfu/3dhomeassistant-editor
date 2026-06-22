import { describe, expect, it } from "vitest";
import {
  getRenderQualityProfile,
  resolveToneMappingExposure,
} from "./render-quality";

describe("render quality profiles", () => {
  it("uses a low-cost profile for low quality", () => {
    expect(getRenderQualityProfile("low")).toMatchObject({
      pixelRatioCap: 1,
      shadowEnabled: false,
      shadowMapSize: 512,
      shadowType: "basic",
    });
  });

  it("keeps high quality aligned with the previous default renderer settings", () => {
    expect(getRenderQualityProfile("high")).toMatchObject({
      pixelRatioCap: 2,
      shadowEnabled: true,
      shadowMapSize: 2048,
      shadowRadius: 2,
      shadowType: "soft",
    });
  });

  it("keeps ultra inside a safe GPU budget while improving shadow detail", () => {
    const medium = getRenderQualityProfile("medium");
    const high = getRenderQualityProfile("high");
    const ultra = getRenderQualityProfile("ultra");

    expect(medium.pixelRatioCap).toBeLessThan(high.pixelRatioCap);
    expect(medium.shadowMapSize).toBeLessThan(high.shadowMapSize);
    expect(ultra.pixelRatioCap).toBeLessThanOrEqual(2);
    expect(ultra.shadowMapSize).toBeLessThanOrEqual(2048);
    expect(ultra.shadowRadius).toBeGreaterThan(high.shadowRadius);
  });

  it("reduces tone mapping exposure when realistic rendering adds HDR environment light", () => {
    expect(
      resolveToneMappingExposure({
        exposure: 1.18,
        weatherExposureOffset: 0.14,
        realisticRenderingEnabled: false,
      }),
    ).toBeCloseTo(1.32);

    expect(
      resolveToneMappingExposure({
        exposure: 1.18,
        weatherExposureOffset: 0.14,
        realisticRenderingEnabled: true,
      }),
    ).toBeLessThanOrEqual(0.95);
  });

  it("keeps lightning flashes visible without blowing out realistic rendering", () => {
    expect(
      resolveToneMappingExposure({
        exposure: 1.18,
        weatherExposureOffset: -0.08,
        lightningExposureBoost: 0.26,
        realisticRenderingEnabled: true,
      }),
    ).toBeLessThanOrEqual(1.05);
  });
});
