import { getEntityDomain } from "./ha-client";
import type { HaEntityState } from "../types/ha";

function nowIso() {
  return new Date().toISOString();
}

function existingOrDefault(
  states: Record<string, HaEntityState>,
  entityId: string,
): HaEntityState {
  return (
    states[entityId] ?? {
      entity_id: entityId,
      state: "unknown",
      attributes: {},
    }
  );
}

export function applySimulatedServiceCall(
  states: Record<string, HaEntityState>,
  entityId: string,
  service: string,
  serviceData: Record<string, unknown> = {},
) {
  const current = existingOrDefault(states, entityId);
  const domain = getEntityDomain(entityId);
  const next: HaEntityState = {
    ...current,
    attributes: { ...current.attributes },
    last_changed: nowIso(),
    last_updated: nowIso(),
  };

  if (service === "turn_on") {
    next.state = "on";
  } else if (service === "turn_off") {
    next.state = "off";
  } else if (service === "toggle") {
    next.state = current.state === "on" ? "off" : "on";
  } else if (service === "set_value") {
    const value = serviceData.value;
    next.state = value === undefined ? current.state : String(value);
  } else if (service === "set_color_temp") {
    const value = serviceData.value ?? serviceData.color_temp_kelvin;
    next.state = value === undefined ? current.state : String(value);
  }

  if (domain === "light" && service === "turn_on") {
    for (const key of ["brightness", "color_temp", "color_temp_kelvin", "kelvin"]) {
      if (serviceData[key] !== undefined) {
        next.attributes[key] = serviceData[key];
      }
    }
  }

  return {
    ...states,
    [entityId]: next,
  };
}
