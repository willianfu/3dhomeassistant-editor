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
  } else if (service === "press") {
    next.state = "pressed";
  } else if (service === "open" || service === "open_cover") {
    next.state = "open";
  } else if (service === "close" || service === "close_cover") {
    next.state = "closed";
  } else if (service === "stop_cover") {
    next.state = "stopped";
  } else if (service === "lock") {
    next.state = "locked";
  } else if (service === "unlock") {
    next.state = "unlocked";
  } else if (service === "set_value") {
    const value = serviceData.value;
    next.state = value === undefined ? current.state : String(value);
  } else if (service === "select_option") {
    const value = serviceData.option;
    next.state = value === undefined ? current.state : String(value);
  } else if (service === "set_cover_position") {
    const value = serviceData.position;
    if (value !== undefined) {
      next.state = Number(value) > 0 ? "open" : "closed";
      next.attributes.current_position = value;
    }
  } else if (service === "set_percentage") {
    const value = serviceData.percentage;
    if (value !== undefined) {
      next.state = Number(value) > 0 ? "on" : "off";
      next.attributes.percentage = value;
    }
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
    if (serviceData.brightness_pct !== undefined) {
      next.attributes.brightness = Math.round((Number(serviceData.brightness_pct) / 100) * 255);
    }
    if (serviceData.effect !== undefined) {
      next.attributes.effect = serviceData.effect;
    }
  }

  if (domain === "climate") {
    if (service === "turn_on") {
      const modes = next.attributes.hvac_modes;
      next.state = Array.isArray(modes) && modes.includes("cool") ? "cool" : "heat_cool";
    } else if (service === "turn_off") {
      next.state = "off";
    } else if (service === "set_temperature") {
      if (serviceData.temperature !== undefined) {
        next.attributes.temperature = serviceData.temperature;
      }
      if (serviceData.hvac_mode !== undefined) {
        next.state = String(serviceData.hvac_mode);
      }
    } else if (service === "set_hvac_mode") {
      if (serviceData.hvac_mode !== undefined) {
        next.state = String(serviceData.hvac_mode);
      }
    } else if (service === "set_fan_mode") {
      if (serviceData.fan_mode !== undefined) {
        next.attributes.fan_mode = serviceData.fan_mode;
      }
    } else if (service === "set_preset_mode") {
      if (serviceData.preset_mode !== undefined) {
        next.attributes.preset_mode = serviceData.preset_mode;
      }
    } else if (service === "set_swing_mode") {
      if (serviceData.swing_mode !== undefined) {
        next.attributes.swing_mode = serviceData.swing_mode;
      }
    }
  }

  return {
    ...states,
    [entityId]: next,
  };
}
