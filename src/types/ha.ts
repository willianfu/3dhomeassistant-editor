export type HaConnectionStatus =
  | "not_configured"
  | "connecting"
  | "connected"
  | "error"
  | "closed";

export type HaEntityState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
};

export type HaDevice = {
  id: string;
  name?: string;
  name_by_user?: string;
  manufacturer?: string;
  model?: string;
  area_id?: string;
};

export type HaManualDeviceType =
  | "auto"
  | "light"
  | "cover"
  | "climate"
  | "switch"
  | "button"
  | "fan"
  | "sensor"
  | "number"
  | "select"
  | "text";

export type HaBinding =
  | {
      type: "entity";
      entityId: string;
    }
  | {
      type: "device";
      deviceId: string;
      entityIds: string[];
    };

export type HaLightCapabilityConfig = {
  enabled: boolean;
  lightType: "point" | "spot" | "area";
  emissionMode: "whole" | "bottom";
  coneAngle: number;
  maxIntensity: number;
  lightRange: number;
  maxBrightness: number;
  fixedColorTemperatureKelvin: number;
  powerEntityId?: string;
  brightnessEntityId?: string;
  colorTemperatureEntityId?: string;
};

export type HaServiceTarget = {
  entity_id: string;
};
