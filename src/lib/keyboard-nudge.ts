import type { Vector3Values } from "../types/editor";

const NUDGE_STEP_METERS = 0.01;

type KeyboardNudgeEvent = {
  key: string;
  ctrlKey: boolean;
};

export function getKeyboardNudgeDelta(
  event: KeyboardNudgeEvent,
): Vector3Values | null {
  if (event.ctrlKey) {
    if (event.key === "ArrowUp") {
      return { x: 0, y: NUDGE_STEP_METERS, z: 0 };
    }
    if (event.key === "ArrowDown") {
      return { x: 0, y: -NUDGE_STEP_METERS, z: 0 };
    }
    return null;
  }

  if (event.key === "ArrowLeft") {
    return { x: -NUDGE_STEP_METERS, y: 0, z: 0 };
  }
  if (event.key === "ArrowRight") {
    return { x: NUDGE_STEP_METERS, y: 0, z: 0 };
  }
  if (event.key === "ArrowUp") {
    return { x: 0, y: 0, z: -NUDGE_STEP_METERS };
  }
  if (event.key === "ArrowDown") {
    return { x: 0, y: 0, z: NUDGE_STEP_METERS };
  }

  return null;
}
