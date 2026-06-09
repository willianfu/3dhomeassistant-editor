import type { Vector3Values } from "../types/editor";

export function isVerticalWallLikeBox(size: Vector3Values) {
  const horizontal = [size.x, size.z].sort((a, b) => a - b);
  const thickness = horizontal[0];
  const length = horizontal[1];
  return size.y > 1 && length > 1 && thickness / Math.max(length, 0.001) < 0.08;
}
