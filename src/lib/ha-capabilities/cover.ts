import { getEntityDomain } from "../ha-client";
import type {
  HaCoverCapabilityConfig,
  HaCoverOpenMode,
  HaEntityState,
} from "../../types/ha";

export type CoverVectorValues = {
  x: number;
  y: number;
  z: number;
};

export type CoverAnimationTransform = {
  scale: CoverVectorValues;
  offset: CoverVectorValues;
};

const minClosedScale = 0.03;
const defaultVisiblePercent = 3;
const defaultAnimationSpeedMetersPerSecond = 0.5;

export function defaultCoverCapabilityConfig(): HaCoverCapabilityConfig {
  return {
    enabled: true,
    openMode: "symmetrical",
    minVisiblePercent: defaultVisiblePercent,
    animationSpeedMetersPerSecond: defaultAnimationSpeedMetersPerSecond,
  };
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

function clampVisiblePercent(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return minClosedScale * 100;
  }
  return Math.min(Math.max(value ?? 0, 1), 50);
}

export function resolveCoverPositionPercent(
  entityIds: string[],
  states: Record<string, HaEntityState>,
) {
  const coverEntityId =
    entityIds.find((entityId) => getEntityDomain(entityId) === "cover") ??
    entityIds[0];
  const state = coverEntityId ? states[coverEntityId] : undefined;
  const rawValue =
    state?.attributes.current_position ??
    state?.attributes.position ??
    (state?.state === "open" ? 100 : state?.state === "closed" ? 0 : undefined);
  return Math.round(clampPercent(Number(rawValue)));
}

function clampDistance(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(value ?? 0, 0);
}

function scaleForMode(openMode: HaCoverOpenMode, visibleFraction: number) {
  if (openMode === "down" || openMode === "up") {
    return { x: 1, y: visibleFraction, z: 1 };
  }
  return { x: visibleFraction, y: 1, z: 1 };
}

function axisForMode(openMode: HaCoverOpenMode) {
  return openMode === "down" || openMode === "up" ? "y" : "x";
}

function fixedEdgeForMode(openMode: HaCoverOpenMode) {
  if (openMode === "left" || openMode === "up") {
    return "max";
  }
  return "min";
}

export function resolveSymmetricalCoverTargetMode(side: "left" | "right"): HaCoverOpenMode {
  return side;
}

export function resolveCoverAnimationSpeedMetersPerSecond(
  config: Pick<HaCoverCapabilityConfig, "animationSpeedMetersPerSecond"> | null,
) {
  const rawSpeed = config?.animationSpeedMetersPerSecond;
  const speed = Number.isFinite(rawSpeed) ? Math.max(rawSpeed ?? 0, 0.1) : defaultAnimationSpeedMetersPerSecond;
  return Math.round(speed * 10) / 10;
}

function resolveVisibleDistance({
  config,
  travelAxisSize,
  openRatio,
}: {
  config: HaCoverCapabilityConfig;
  travelAxisSize: number;
  openRatio: number;
}) {
  if (
    !Number.isFinite(config.closedVisibleDistance) &&
    !Number.isFinite(config.openTravelDistance)
  ) {
    const minVisibleScale = clampVisiblePercent(config.minVisiblePercent) / 100;
    return travelAxisSize * Math.max(1 - openRatio, minVisibleScale);
  }
  const minVisibleScale = clampVisiblePercent(config.minVisiblePercent) / 100;
  const defaultClosedVisibleDistance = travelAxisSize * minVisibleScale;
  const configuredClosedVisibleDistance = clampDistance(config.closedVisibleDistance);
  const closedVisibleDistance = Math.min(
    configuredClosedVisibleDistance ?? defaultClosedVisibleDistance,
    travelAxisSize,
  );
  const configuredTravelDistance = clampDistance(config.openTravelDistance);
  const maxTravelDistance = Math.max(travelAxisSize - closedVisibleDistance, 0);
  const travelDistance = Math.min(
    configuredTravelDistance ?? maxTravelDistance,
    maxTravelDistance,
  );
  return travelAxisSize - travelDistance * openRatio;
}

function resolveTravelDistance(config: HaCoverCapabilityConfig, travelAxisSize: number) {
  const minVisibleScale = clampVisiblePercent(config.minVisiblePercent) / 100;
  const defaultClosedVisibleDistance = travelAxisSize * minVisibleScale;
  const configuredClosedVisibleDistance = clampDistance(config.closedVisibleDistance);
  const closedVisibleDistance = Math.min(
    configuredClosedVisibleDistance ?? defaultClosedVisibleDistance,
    travelAxisSize,
  );
  const configuredTravelDistance = clampDistance(config.openTravelDistance);
  const maxTravelDistance = Math.max(travelAxisSize - closedVisibleDistance, 0);
  return Math.min(configuredTravelDistance ?? maxTravelDistance, maxTravelDistance);
}

export function resolveCoverAnimationStepPercent({
  config,
  size,
  deltaSeconds,
}: {
  config: HaCoverCapabilityConfig | null;
  size: CoverVectorValues;
  deltaSeconds: number;
}) {
  const merged = { ...defaultCoverCapabilityConfig(), ...(config ?? {}) };
  const axis = axisForMode(merged.openMode);
  const travelAxisSize = Math.max(size[axis], 0.001);
  const travelDistance = Math.max(resolveTravelDistance(merged, travelAxisSize), 0.001);
  const speed = resolveCoverAnimationSpeedMetersPerSecond(merged);
  return (speed * Math.max(deltaSeconds, 0) * 100) / travelDistance;
}

export function resolveCoverAnimationTransform({
  config,
  positionPercent,
  size,
  localBounds,
}: {
  config: HaCoverCapabilityConfig | null;
  positionPercent: number;
  size: CoverVectorValues;
  localBounds?: {
    min: CoverVectorValues;
    max: CoverVectorValues;
  };
}): CoverAnimationTransform {
  const merged = { ...defaultCoverCapabilityConfig(), ...(config ?? {}) };
  const openRatio = clampPercent(positionPercent) / 100;
  const axis = axisForMode(merged.openMode);
  const travelAxisSize = Math.max(size[axis], 0.001);
  const visibleDistance = resolveVisibleDistance({
    config: merged,
    travelAxisSize,
    openRatio,
  });
  const visibleFraction = Math.min(Math.max(visibleDistance / travelAxisSize, 0), 1);
  const scale = scaleForMode(merged.openMode, visibleFraction);
  const offset = { x: 0, y: 0, z: 0 };
  if (merged.openMode === "symmetrical") {
    return { scale, offset };
  }
  const axisBounds = localBounds
    ? { min: localBounds.min[axis], max: localBounds.max[axis] }
    : { min: -travelAxisSize / 2, max: travelAxisSize / 2 };
  const fixedEdge = fixedEdgeForMode(merged.openMode);
  const fixedValue = axisBounds[fixedEdge];
  offset[axis] = fixedValue - fixedValue * visibleFraction;

  return { scale, offset };
}
