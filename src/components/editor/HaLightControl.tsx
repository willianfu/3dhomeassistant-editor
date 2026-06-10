import { Lightbulb, Thermometer, Zap } from "lucide-react";
import {
  defaultLightCapabilityConfig,
  resolveLightCapability,
} from "../../lib/ha-capabilities/light";
import type { HaLightCapabilityConfig, HaEntityState } from "../../types/ha";
import { Button } from "../ui/button";

type HaLightControlProps = {
  entityIds: string[];
  config: HaLightCapabilityConfig | null;
  states: Record<string, HaEntityState>;
  onCall: (
    entityId: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
};

export function HaLightControl({
  entityIds,
  config,
  states,
  onCall,
}: HaLightControlProps) {
  const currentConfig = { ...defaultLightCapabilityConfig(), ...(config ?? {}) };
  const resolved = resolveLightCapability({
    config: currentConfig,
    entityIds,
    states,
  });
  const powerEntityId = currentConfig.powerEntityId ?? resolved.sourceEntityId;
  const brightnessEntityId =
    currentConfig.brightnessEntityId ?? resolved.sourceEntityId;
  const colorTemperatureEntityId =
    currentConfig.colorTemperatureEntityId ?? resolved.sourceEntityId;

  if (!resolved.enabled || !powerEntityId) {
    return null;
  }

  const brightnessValue = Math.round(
    resolved.brightnessRatio * currentConfig.maxBrightness,
  );

  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Lightbulb size={14} className="shrink-0 text-amber-300" />
          <div className="min-w-0 truncate text-xs font-medium">灯光</div>
        </div>
        <Button
          size="sm"
          variant={resolved.isOn ? "default" : "secondary"}
          className="shrink-0"
          onClick={() =>
            onCall(powerEntityId, resolved.isOn ? "turn_off" : "turn_on")
          }
        >
          {resolved.isOn ? "关闭" : "开启"}
        </Button>
      </div>
      {brightnessEntityId ? (
        <label className="grid min-w-0 gap-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap size={12} />
            亮度 {brightnessValue}
          </span>
          <input
            type="range"
            className="w-full min-w-0 accent-amber-300"
            min={0}
            max={currentConfig.maxBrightness}
            value={brightnessValue}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (brightnessEntityId === resolved.sourceEntityId) {
                onCall(brightnessEntityId, "turn_on", { brightness: value });
              } else {
                onCall(brightnessEntityId, "set_value", { value });
              }
            }}
          />
        </label>
      ) : null}
      {colorTemperatureEntityId ? (
        <label className="grid min-w-0 gap-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Thermometer size={12} />
            色温 {resolved.colorTemperatureKelvin}K
          </span>
          <input
            type="range"
            className="w-full min-w-0 accent-amber-300"
            min={1800}
            max={6500}
            step={50}
            value={resolved.colorTemperatureKelvin}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (colorTemperatureEntityId === resolved.sourceEntityId) {
                onCall(colorTemperatureEntityId, "turn_on", {
                  color_temp_kelvin: value,
                });
              } else {
                onCall(colorTemperatureEntityId, "set_value", { value });
              }
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
