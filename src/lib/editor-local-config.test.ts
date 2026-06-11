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
  getManualDeviceType,
  getObjectBindings,
  setLightCapabilityConfig,
  setManualDeviceType,
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

    const config = createEditorLocalConfig(root, defaultEnvironment, {
      mode: "rain-medium",
    });

    expect(config.weather.mode).toBe("rain-medium");
    expect(config.objects["home/lamp"]).toMatchObject({
      deviceType: "light",
      bindings: [{ type: "entity", entityId: "light.kitchen" }],
      lightCapability: { lightType: "area", emissionMode: "bottom" },
    });
  });

  it("restores object HA config onto a reloaded model", () => {
    const source = createModel();
    setObjectBindings(source.lamp, [{ type: "entity", entityId: "light.kitchen" }]);
    setManualDeviceType(source.lamp, "light");
    const config = createEditorLocalConfig(source.root, defaultEnvironment, defaultWeather);
    const target = createModel();

    applyEditorLocalConfig(target.root, config);

    expect(getObjectBindings(target.lamp)).toEqual([
      { type: "entity", entityId: "light.kitchen" },
    ]);
    expect(getManualDeviceType(target.lamp)).toBe("light");
  });

  it("round trips through local storage as json", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const { root } = createModel();
    const config = createEditorLocalConfig(root, defaultEnvironment, {
      mode: "cloudy",
    });

    saveEditorLocalConfig(config, adapter);

    expect(loadEditorLocalConfig(adapter)?.weather.mode).toBe("cloudy");
    expect(JSON.parse([...storage.values()][0]).version).toBe(1);
    expect(getLightCapabilityConfig(root)).toBeNull();
  });
});
