import type {
  HaBinding,
  HaCoverCapabilityConfig,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "./ha";

export type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

export type RegionPoint = {
  x: number;
  z: number;
};

export type EditorRegion = {
  id: string;
  name: string;
  hidden?: boolean;
  highlightMode?: EditorRegionHighlightMode;
  points: RegionPoint[];
};

export type EditorRegionHighlightMode =
  | "none"
  | "faces"
  | "edges"
  | "bottom"
  | "top";

export type ObjectRegionAssignment = {
  mode: "auto" | "manual";
  regionId: string | null;
  initialized?: boolean;
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
  coverCapability: HaCoverCapabilityConfig | null;
  lightCapability: HaLightCapabilityConfig | null;
  regionAssignment: ObjectRegionAssignment;
  resolvedRegionId: string | null;
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
  realtimeTimeEnabled?: boolean;
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: Vector3Values;
  colorTemperatureKelvin: number;
  exposure: number;
  gridVisible: boolean;
  wallOpacity: number;
};

export type RenderBackend = "webgl" | "webgpu";
export type RenderQuality = "low" | "medium" | "high" | "ultra";

export type PerformanceConfig = {
  renderBackend: RenderBackend;
  quality: RenderQuality;
  realisticRenderingEnabled: boolean;
};

export const defaultPerformance: PerformanceConfig = {
  renderBackend: "webgl",
  quality: "high",
  realisticRenderingEnabled: false,
};

export type ViewMode = "perspective" | "top" | "front" | "side";
export type PreviewCameraMode = "manual" | "auto";

export const defaultEnvironment: EnvironmentConfig = {
  timeOfDay: 12,
  realtimeTimeEnabled: true,
  ambientIntensity: 0.78,
  directionalIntensity: 1.45,
  directionalPosition: { x: 0, y: 11, z: 7.5 },
  colorTemperatureKelvin: 6200,
  exposure: 1.18,
  gridVisible: true,
  wallOpacity: 0.28,
};
