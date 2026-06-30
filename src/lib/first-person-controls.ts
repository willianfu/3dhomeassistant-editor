import type { Vector3Values } from "../types/editor";

export type FirstPersonMoveState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  fast: boolean;
};

export type FirstPersonBounds = {
  min: Vector3Values;
  max: Vector3Values;
};

export type FirstPersonDirection = "forward" | "backward" | "left" | "right";

export function getFirstPersonSpawnPosition(bounds: FirstPersonBounds) {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
}

export function getFirstPersonVelocity(
  state: FirstPersonMoveState,
  yaw: number,
  speed: number,
) {
  const forwardIntent = Number(state.forward) - Number(state.backward);
  const sideIntent = Number(state.right) - Number(state.left);
  const length = Math.hypot(forwardIntent, sideIntent);
  if (length === 0 || speed <= 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const normalizedForward = forwardIntent / length;
  const normalizedSide = sideIntent / length;

  return {
    x: (forwardX * normalizedForward + rightX * normalizedSide) * speed,
    y: 0,
    z: (forwardZ * normalizedForward + rightZ * normalizedSide) * speed,
  };
}

export function clampToFirstPersonBounds(
  position: Vector3Values,
  bounds: FirstPersonBounds,
) {
  return {
    x: Math.min(Math.max(position.x, bounds.min.x), bounds.max.x),
    y: Math.min(Math.max(position.y, bounds.min.y), bounds.max.y),
    z: Math.min(Math.max(position.z, bounds.min.z), bounds.max.z),
  };
}
