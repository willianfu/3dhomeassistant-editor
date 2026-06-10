import { Lightbulb, Thermometer, Zap } from "lucide-react";
import {
  defaultLightCapabilityConfig,
  resolveLightCapability,
} from "../../lib/ha-capabilities/light";
import type { HaLightCapabilityConfig, HaEntityState } from "../../types/ha";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";

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
    <div className="grid min-w-0 gap-3 rounded-md border border-border bg-background/60 p-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Lightbulb className="shrink-0 text-primary" />
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
        <div className="grid min-w-0 gap-2">
          <Label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Zap />
            亮度 {brightnessValue}
          </Label>
          <Slider
            min={0}
            max={currentConfig.maxBrightness}
            value={[brightnessValue]}
            onValueChange={([value]) => {
              if (brightnessEntityId === resolved.sourceEntityId) {
                onCall(brightnessEntityId, "turn_on", { brightness: value });
              } else {
                onCall(brightnessEntityId, "set_value", { value });
              }
            }}
          />
        </div>
      ) : null}
      {colorTemperatureEntityId ? (
        <div className="grid min-w-0 gap-2">
          <Label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Thermometer />
            色温 {resolved.colorTemperatureKelvin}K
          </Label>
          <Slider
            min={1800}
            max={6500}
            step={50}
            value={[resolved.colorTemperatureKelvin]}
            onValueChange={([value]) => {
              if (colorTemperatureEntityId === resolved.sourceEntityId) {
                onCall(colorTemperatureEntityId, "turn_on", {
                  color_temp_kelvin: value,
                });
              } else {
                onCall(colorTemperatureEntityId, "set_value", { value });
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
