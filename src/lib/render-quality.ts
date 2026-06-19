import type { RenderQuality } from "../types/editor";

export type RenderQualityProfile = {
  pixelRatioCap: number;
  shadowEnabled: boolean;
  shadowMapSize: number;
  shadowRadius: number;
  shadowType: "basic" | "soft";
};

const renderQualityProfiles: Record<RenderQuality, RenderQualityProfile> = {
  low: {
    pixelRatioCap: 1,
    shadowEnabled: false,
    shadowMapSize: 512,
    shadowRadius: 1,
    shadowType: "basic",
  },
  medium: {
    pixelRatioCap: 1.5,
    shadowEnabled: true,
    shadowMapSize: 1024,
    shadowRadius: 1,
    shadowType: "basic",
  },
  high: {
    pixelRatioCap: 2,
    shadowEnabled: true,
    shadowMapSize: 2048,
    shadowRadius: 2,
    shadowType: "soft",
  },
  ultra: {
    pixelRatioCap: 2,
    shadowEnabled: true,
    shadowMapSize: 2048,
    shadowRadius: 4,
    shadowType: "soft",
  },
};

export function getRenderQualityProfile(quality: RenderQuality) {
  return renderQualityProfiles[quality];
}
