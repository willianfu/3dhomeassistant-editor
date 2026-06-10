import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  ensureModelObjectIds,
  getLightCapabilityConfig,
  getManualDeviceType,
  getModelObjectId,
  setManualDeviceType,
  setLightCapabilityConfig,
} from "./model-identity";

describe("model-identity", () => {
  it("assigns persistent object ids without merging repeated names", () => {
    const root = new THREE.Group();
    root.name = "home";
    const first = new THREE.Mesh();
    first.name = "lamp";
    const second = new THREE.Mesh();
    second.name = "lamp";
    root.add(first, second);

    ensureModelObjectIds(root);

    expect(getModelObjectId(first)).toBe("home/lamp");
    expect(getModelObjectId(second)).toBe("home/lamp_2");
  });

  it("keeps existing persistent object ids", () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh();
    mesh.userData.homeAssistant = { objectId: "custom-lamp-id" };
    root.add(mesh);

    ensureModelObjectIds(root);

    expect(getModelObjectId(mesh)).toBe("custom-lamp-id");
  });

  it("stores light capability config independently from bindings", () => {
    const mesh = new THREE.Mesh();

    setLightCapabilityConfig(mesh, {
      enabled: true,
      lightType: "spot",
      emissionMode: "whole",
      coneAngle: 38,
      maxIntensity: 3,
      lightRange: 16,
      maxBrightness: 100,
      fixedColorTemperatureKelvin: 4000,
      brightnessEntityId: "number.lamp_level",
    });

    expect(getLightCapabilityConfig(mesh)).toMatchObject({
      enabled: true,
      lightType: "spot",
      coneAngle: 38,
      brightnessEntityId: "number.lamp_level",
    });
  });

  it("stores a manual device type separately from capability config", () => {
    const mesh = new THREE.Mesh();

    setManualDeviceType(mesh, "light");

    expect(getManualDeviceType(mesh)).toBe("light");
    expect(getLightCapabilityConfig(mesh)).toBeNull();
  });
});
