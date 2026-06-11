import type { HaConnectionStatus } from "../types/ha";

export function canRetryHaConnection(status: HaConnectionStatus) {
  return status !== "connected" && status !== "connecting";
}
