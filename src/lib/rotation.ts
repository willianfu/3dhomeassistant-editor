import type { Vector3Values } from "../types/editor";

export function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function roundRotationDegree(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function degreesToRadiansVector(rotation: Vector3Values): Vector3Values {
  return {
    x: degreesToRadians(rotation.x),
    y: degreesToRadians(rotation.y),
    z: degreesToRadians(rotation.z),
  };
}

export function radiansToDegreesVector(rotation: Vector3Values): Vector3Values {
  return {
    x: roundRotationDegree(radiansToDegrees(rotation.x)),
    y: roundRotationDegree(radiansToDegrees(rotation.y)),
    z: roundRotationDegree(radiansToDegrees(rotation.z)),
  };
}
