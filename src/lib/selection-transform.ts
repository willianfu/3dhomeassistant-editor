import type { Vector3Values } from "../types/editor";

function ratio(current: number, target: number) {
  if (!Number.isFinite(current) || Math.abs(current) < 0.000001) {
    return 1;
  }
  return target / current;
}

export function getResizeRatios(
  currentSize: Vector3Values,
  targetSize: Vector3Values,
): Vector3Values {
  return {
    x: ratio(currentSize.x, targetSize.x),
    y: ratio(currentSize.y, targetSize.y),
    z: ratio(currentSize.z, targetSize.z),
  };
}

export function scalePointAroundCenter(
  point: Vector3Values,
  center: Vector3Values,
  ratios: Vector3Values,
): Vector3Values {
  return {
    x: center.x + (point.x - center.x) * ratios.x,
    y: center.y + (point.y - center.y) * ratios.y,
    z: center.z + (point.z - center.z) * ratios.z,
  };
}
