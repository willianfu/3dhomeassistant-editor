import { describe, expect, test } from "vitest";
import { defaultAppearance } from "../types/appearance";
import { defaultEnvironment, defaultPerformance } from "../types/editor";
import { defaultHaRuntimeConfig } from "./ha-config";
import {
  EDITOR_LOCAL_CONFIG_KEY,
  loadEditorLocalConfig,
  normalizePerformanceConfig,
} from "./editor-local-config";
import { defaultWeather } from "./weather-presets";

function createStorage(value: unknown) {
  return {
    getItem: (key: string) =>
      key === EDITOR_LOCAL_CONFIG_KEY ? JSON.stringify(value) : null,
    setItem: () => undefined,
  };
}

describe("loadEditorLocalConfig", () => {
  test("backfills dark appearance for legacy saved config", () => {
    const config = loadEditorLocalConfig(
      createStorage({
        version: 1,
        environment: defaultEnvironment,
        performance: normalizePerformanceConfig(defaultPerformance),
        weather: defaultWeather,
        ha: defaultHaRuntimeConfig(),
        regions: [],
        objects: {},
      }),
    );

    expect(config?.appearance).toEqual(defaultAppearance);
  });

  test("keeps persisted light appearance", () => {
    const config = loadEditorLocalConfig(
      createStorage({
        version: 1,
        appearance: { theme: "light" },
        environment: defaultEnvironment,
        performance: normalizePerformanceConfig(defaultPerformance),
        weather: defaultWeather,
        ha: defaultHaRuntimeConfig(),
        regions: [],
        objects: {},
      }),
    );

    expect(config?.appearance.theme).toBe("light");
  });
});

describe("normalizePerformanceConfig", () => {
  test("keeps model shadows disabled for legacy performance configs", () => {
    expect(
      normalizePerformanceConfig({
        renderBackend: "webgl",
        quality: "high",
        realisticRenderingEnabled: false,
      }).modelShadowsEnabled,
    ).toBe(false);
  });

  test("keeps an explicit model shadows opt-in", () => {
    expect(
      normalizePerformanceConfig({
        ...defaultPerformance,
        modelShadowsEnabled: true,
      }).modelShadowsEnabled,
    ).toBe(true);
  });

});
