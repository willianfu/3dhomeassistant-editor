import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { defaultEnvironment } from "../types/editor";
import { defaultWeather } from "./weather-presets";
import {
  applyEditorLocalConfig,
  createEditorLocalConfig,
  loadEditorLocalConfig,
  saveEditorLocalConfig,
} from "./editor-local-config";
import {
  ensureModelObjectIds,
  getLightCapabilityConfig,
  getCoverCapabilityConfig,
  getManualDeviceType,
  getObjectRegionAssignment,
  getObjectBindings,
  setCoverCapabilityConfig,
  setLightCapabilityConfig,
  setManualDeviceType,
  setObjectRegionAssignment,
  setObjectBindings,
} from "./model-identity";

function createModel() {
  const root = new THREE.Group();
  root.name = "home";
  const lamp = new THREE.Mesh();
  lamp.name = "lamp";
  root.add(lamp);
  ensureModelObjectIds(root);
  return { root, lamp };
}

describe("editor local config", () => {
  it("serializes global config and object HA bindings by stable object id", () => {
    const { root, lamp } = createModel();
    setObjectBindings(lamp, [{ type: "entity", entityId: "light.kitchen" }]);
    setManualDeviceType(lamp, "light");
    setObjectRegionAssignment(lamp, {
      mode: "manual",
      regionId: "region-living",
    });
    setLightCapabilityConfig(lamp, {
      enabled: true,
      lightType: "area",
      emissionMode: "bottom",
      coneAngle: 45,
      maxIntensity: 8,
      lightRange: 14,
      maxBrightness: 255,
      fixedColorTemperatureKelvin: 3000,
    });

    const config = createEditorLocalConfig(
      root,
      defaultEnvironment,
      { mode: "rain-medium" },
      { apiUrl: "http://ha.local:8123", token: "token-1" },
      { renderBackend: "webgpu", quality: "ultra", realisticRenderingEnabled: true },
      [
        {
          id: "region-living",
          name: "客厅",
          points: [
            { x: 0, z: 0 },
            { x: 4, z: 0 },
            { x: 4, z: 3 },
            { x: 0, z: 3 },
          ],
        },
      ],
    );

    expect(config.weather.mode).toBe("rain-medium");
    expect(config.ha).toEqual({ apiUrl: "http://ha.local:8123", token: "token-1" });
    expect(config.performance.renderBackend).toBe("webgpu");
    expect(config.performance.quality).toBe("ultra");
    expect(config.performance.realisticRenderingEnabled).toBe(true);
    expect(config.objects["home/lamp"]).toMatchObject({
      deviceType: "light",
      regionAssignment: { mode: "manual", regionId: "region-living" },
      bindings: [{ type: "entity", entityId: "light.kitchen" }],
      lightCapability: { lightType: "area", emissionMode: "bottom" },
    });
    expect(config.regions).toEqual([
      {
          id: "region-living",
          name: "客厅",
          highlightMode: "edges",
          points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ]);
  });

  it("restores object HA config onto a reloaded model", () => {
    const source = createModel();
    setObjectBindings(source.lamp, [{ type: "entity", entityId: "light.kitchen" }]);
    setManualDeviceType(source.lamp, "light");
    setCoverCapabilityConfig(source.lamp, {
      enabled: true,
      openMode: "symmetrical",
      minVisiblePercent: 8,
      leftObjectId: "home/curtain_left",
      rightObjectId: "home/curtain_right",
    });
    setObjectRegionAssignment(source.lamp, {
      mode: "manual",
      regionId: "region-kitchen",
    });
    const config = createEditorLocalConfig(
      source.root,
      defaultEnvironment,
      defaultWeather,
      { apiUrl: "", token: "" },
    );
    const target = createModel();

    applyEditorLocalConfig(target.root, config);

    expect(getObjectBindings(target.lamp)).toEqual([
      { type: "entity", entityId: "light.kitchen" },
    ]);
    expect(getManualDeviceType(target.lamp)).toBe("light");
    expect(getCoverCapabilityConfig(target.lamp)).toMatchObject({
      openMode: "symmetrical",
      minVisiblePercent: 8,
      leftObjectId: "home/curtain_left",
      rightObjectId: "home/curtain_right",
    });
    expect(getObjectRegionAssignment(target.lamp)).toMatchObject({
      mode: "manual",
      regionId: "region-kitchen",
    });
  });

  it("normalizes stored region highlight modes and object region assignment", () => {
    const storage = new Map<string, string>();
    storage.set(
      "3dhomeassistant.editor.config",
      JSON.stringify({
        version: 1,
        environment: defaultEnvironment,
        weather: defaultWeather,
        objects: {
          "home/lamp": {
            regionAssignment: {
              mode: "auto",
              regionId: "region-living",
              initialized: true,
            },
          },
        },
        regions: [
          {
            id: "region-living",
            name: "客厅",
            highlightMode: "top",
            points: [
              { x: 0, z: 0 },
              { x: 1, z: 0 },
              { x: 1, z: 1 },
            ],
          },
          {
            id: "region-invalid",
            name: "无效效果",
            highlightMode: "sparkle",
            points: [
              { x: 2, z: 0 },
              { x: 3, z: 0 },
              { x: 3, z: 1 },
            ],
          },
        ],
      }),
    );
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    const config = loadEditorLocalConfig(adapter);

    expect(config?.regions[0].highlightMode).toBe("top");
    expect(config?.regions[1].highlightMode).toBe("edges");
    expect(config?.objects["home/lamp"].regionAssignment).toEqual({
      mode: "auto",
      regionId: "region-living",
      initialized: true,
    });
  });

  it("round trips through local storage as json", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const { root } = createModel();
    const config = createEditorLocalConfig(
      root,
      defaultEnvironment,
      { mode: "cloudy" },
      { apiUrl: "http://ha.local:8123", token: "secret" },
    );

    saveEditorLocalConfig(config, adapter);

    expect(loadEditorLocalConfig(adapter)?.weather.mode).toBe("cloudy");
    expect(loadEditorLocalConfig(adapter)?.ha.apiUrl).toBe("http://ha.local:8123");
    expect(loadEditorLocalConfig(adapter)?.performance.renderBackend).toBe("webgl");
    expect(loadEditorLocalConfig(adapter)?.performance.quality).toBe("high");
    expect(loadEditorLocalConfig(adapter)?.performance.realisticRenderingEnabled).toBe(false);
    expect(JSON.parse([...storage.values()][0]).version).toBe(1);
    expect(getLightCapabilityConfig(root)).toBeNull();
  });

  it("fills missing HA config when loading legacy config", () => {
    const storage = new Map<string, string>();
    storage.set(
      "3dhomeassistant.editor.config",
      JSON.stringify({
        version: 1,
        environment: defaultEnvironment,
        weather: defaultWeather,
        objects: {},
      }),
    );
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    expect(loadEditorLocalConfig(adapter)?.ha).toEqual({ apiUrl: "", token: "" });
    expect(loadEditorLocalConfig(adapter)?.performance.renderBackend).toBe("webgl");
    expect(loadEditorLocalConfig(adapter)?.performance.quality).toBe("high");
    expect(loadEditorLocalConfig(adapter)?.performance.realisticRenderingEnabled).toBe(false);
    expect(loadEditorLocalConfig(adapter)?.regions).toEqual([]);
  });

  it("falls back to default performance config for invalid stored values", () => {
    const storage = new Map<string, string>();
    storage.set(
      "3dhomeassistant.editor.config",
      JSON.stringify({
        version: 1,
        environment: defaultEnvironment,
        weather: defaultWeather,
        performance: { renderBackend: "canvas", quality: "cinematic" },
        objects: {},
      }),
    );
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    expect(loadEditorLocalConfig(adapter)?.performance).toEqual({
      renderBackend: "webgl",
      quality: "high",
      realisticRenderingEnabled: false,
    });
  });
});
