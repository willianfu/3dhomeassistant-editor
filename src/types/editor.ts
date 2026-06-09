export type Vector3Values = {
  x: number;
  y: number;
  z: number;
};

export type ModelTreeNode = {
  id: string;
  name: string;
  type: string;
  depth: number;
  childCount: number;
  children: ModelTreeNode[];
};

export type ObjectMetadata = {
  id: string;
  name: string;
  type: string;
  parentName: string | null;
  childCount: number;
  meshCount: number;
  position: Vector3Values;
  rotation: Vector3Values;
  scale: Vector3Values;
};

export type EnvironmentConfig = {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: Vector3Values;
  exposure: number;
  gridVisible: boolean;
};

export type ViewMode = "perspective" | "top" | "front" | "side";

export const defaultEnvironment: EnvironmentConfig = {
  ambientIntensity: 0.68,
  directionalIntensity: 1.1,
  directionalPosition: { x: -6, y: 10, z: 5 },
  exposure: 1.05,
  gridVisible: true,
};
