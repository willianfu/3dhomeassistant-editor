import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  assignFreshModelObjectIds,
  ensureModelObjectIds,
  getLightCapabilityConfig,
  getManualDeviceType,
  getModelObjectId,
  getObjectBindings,
  setManualDeviceType,
  setLightCapabilityConfig,
  syncCoverTargetBindings,
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

  it("assigns fresh ids that do not collide with existing model object ids", () => {
    const original = new THREE.Group();
    original.name = "curtain";
    const child = new THREE.Mesh();
    child.name = "panel";
    original.add(child);
    ensureModelObjectIds(original);

    const clone = original.clone(true);
    assignFreshModelObjectIds(clone, ["curtain", "curtain/panel"]);

    expect(getModelObjectId(clone)).toBe("curtain_2");
    expect(getModelObjectId(clone.children[0])).toBe("curtain_2/panel");
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

  it("copies cover host bindings to symmetrical target objects", () => {
    const root = new THREE.Group();
    root.name = "home";
    const host = new THREE.Mesh();
    host.name = "curtain";
    const left = new THREE.Mesh();
    left.name = "left_panel";
    const right = new THREE.Mesh();
    right.name = "right_panel";
    root.add(host, left, right);
    ensureModelObjectIds(root);
    host.userData.homeAssistant.bindings = [
      { type: "entity", entityId: "cover.living_room" },
    ];
    host.userData.homeAssistant.deviceType = "cover";

    syncCoverTargetBindings(root, host, {
      enabled: true,
      openMode: "symmetrical",
      leftObjectId: getModelObjectId(left) ?? "",
      rightObjectId: getModelObjectId(right) ?? "",
    });

    expect(getObjectBindings(left)).toEqual([
      { type: "entity", entityId: "cover.living_room" },
    ]);
    expect(getObjectBindings(right)).toEqual([
      { type: "entity", entityId: "cover.living_room" },
    ]);
    expect(getManualDeviceType(left)).toBe("cover");
    expect(getManualDeviceType(right)).toBe("cover");
  });
});
