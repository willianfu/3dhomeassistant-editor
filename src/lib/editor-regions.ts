import type {
  EditorRegion,
  EditorRegionHighlightMode,
  RegionPoint,
} from "../types/editor";

export type EditorRegionBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  center: RegionPoint;
  size: RegionPoint;
};

const EPSILON = 1e-9;
const defaultHighlightMode: EditorRegionHighlightMode = "edges";
const highlightModes: EditorRegionHighlightMode[] = [
  "none",
  "faces",
  "edges",
  "bottom",
  "top",
];

function isFinitePoint(point: RegionPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.z);
}

function isPointOnSegment(point: RegionPoint, start: RegionPoint, end: RegionPoint) {
  const cross =
    (point.z - start.z) * (end.x - start.x) -
    (point.x - start.x) * (end.z - start.z);
  if (Math.abs(cross) > EPSILON) {
    return false;
  }
  const dot =
    (point.x - start.x) * (end.x - start.x) +
    (point.z - start.z) * (end.z - start.z);
  if (dot < -EPSILON) {
    return false;
  }
  const squaredLength =
    (end.x - start.x) * (end.x - start.x) +
    (end.z - start.z) * (end.z - start.z);
  return dot <= squaredLength + EPSILON;
}

export function isPointInEditorRegion(point: RegionPoint, region: EditorRegion) {
  if (!isFinitePoint(point) || region.points.length < 3) {
    return false;
  }

  let inside = false;
  for (let index = 0, previousIndex = region.points.length - 1; index < region.points.length; previousIndex = index, index += 1) {
    const current = region.points[index];
    const previous = region.points[previousIndex];
    if (!isFinitePoint(current) || !isFinitePoint(previous)) {
      return false;
    }
    if (isPointOnSegment(point, previous, current)) {
      return true;
    }
    const intersects =
      current.z > point.z !== previous.z > point.z &&
      point.x <
        ((previous.x - current.x) * (point.z - current.z)) /
          (previous.z - current.z) +
          current.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export function getEditorRegionBounds(region: EditorRegion): EditorRegionBounds | null {
  if (region.points.length < 3 || region.points.some((point) => !isFinitePoint(point))) {
    return null;
  }
  const xs = region.points.map((point) => point.x);
  const zs = region.points.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
    size: { x: maxX - minX, z: maxZ - minZ },
  };
}

export function normalizeEditorRegions(value: unknown): EditorRegion[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((region): EditorRegion[] => {
    if (!region || typeof region !== "object") {
      return [];
    }
    const candidate = region as EditorRegion;
    const valid =
      typeof candidate.id === "string" &&
      candidate.id.trim().length > 0 &&
      typeof candidate.name === "string" &&
      Array.isArray(candidate.points) &&
      candidate.points.length >= 3 &&
      candidate.points.every(isFinitePoint);
    if (!valid) {
      return [];
    }
    const normalized: EditorRegion = {
      id: candidate.id,
      name: candidate.name,
      highlightMode: highlightModes.includes(
        candidate.highlightMode as EditorRegionHighlightMode,
      )
        ? (candidate.highlightMode as EditorRegionHighlightMode)
        : defaultHighlightMode,
      points: candidate.points.map((point) => ({ x: point.x, z: point.z })),
    };
    if (candidate.hidden === true) {
      normalized.hidden = true;
    }
    return [normalized];
  });
}
