import { MOUSE } from "three";
import type { ViewMode } from "../types/editor";

export function getViewControlMode(viewMode: ViewMode) {
  if (viewMode === "perspective") {
    return {
      enabled: true,
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
      mouseButtons: {
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      },
    };
  }

  return {
    enabled: true,
    enableRotate: false,
    enableZoom: true,
    enablePan: true,
    mouseButtons: {
      LEFT: null,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    },
  };
}
