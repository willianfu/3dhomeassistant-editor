import type { Vector3Values } from "../types/editor";

export function getIncrementalTransformDelta(
  previous: Vector3Values,
  current: Vector3Values,
): Vector3Values {
  return {
    x: current.x - previous.x,
    y: current.y - previous.y,
    z: current.z - previous.z,
  };
}
