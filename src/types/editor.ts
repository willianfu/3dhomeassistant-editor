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
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: Vector3Values;
  exposure: number;
  gridVisible: boolean;
  wallOpacity: number;
};

export type ViewMode = "perspective" | "top" | "front" | "side";

export const defaultEnvironment: EnvironmentConfig = {
  ambientIntensity: 0.68,
  directionalIntensity: 1.1,
  directionalPosition: { x: -6, y: 10, z: 5 },
  exposure: 1.05,
  gridVisible: true,
  wallOpacity: 0.28,
};
