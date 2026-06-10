import type { HaBinding, HaLightCapabilityConfig, HaManualDeviceType } from "./ha";

export type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

export type ModelTreeNode = {
  id: string;
  objectId: string | null;
  name: string;
  type: string;
  depth: number;
  childCount: number;
  children: ModelTreeNode[];
};

export type ObjectMetadata = {
  id: string;
  objectId: string | null;
  bindingGroupId: string | null;
  entityId: string | null;
  deviceType: HaManualDeviceType;
  bindings: HaBinding[];
  lightCapability: HaLightCapabilityConfig | null;
  name: string;
  type: string;
  parentName: string | null;
  childCount: number;
  meshCount: number;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
};

export type SelectionTransformInfo = {
  center: Vector3Values;
  size: Vector3Values;
  scale: Vector3Values;
};

export type EnvironmentConfig = {
  timeOfDay: number;
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: Vector3Values;
  colorTemperatureKelvin: number;
  exposure: number;
  gridVisible: boolean;
  wallOpacity: number;
};

export type ViewMode = "perspective" | "top" | "front" | "side";

export const defaultEnvironment: EnvironmentConfig = {
  timeOfDay: 12,
  ambientIntensity: 0.78,
  directionalIntensity: 1.45,
  directionalPosition: { x: 0, y: 11, z: 7.5 },
  colorTemperatureKelvin: 6200,
  exposure: 1.18,
  gridVisible: true,
  wallOpacity: 0.28,
};
