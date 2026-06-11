import { useEffect, useMemo, useState } from "react";
import { CircleDot, Lightbulb, Power, SunMedium } from "lucide-react";
import { getEntityDomain } from "../../lib/ha-client";
import {
  defaultLightCapabilityConfig,
  percentToBrightness,
  resolveHaLightControlCapabilities,
  resolveLightCapability,
} from "../../lib/ha-capabilities/light";
import type { HaEntityState, HaLightCapabilityConfig } from "../../types/ha";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { WideColorSlider } from "./WideColorSlider";

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

type LightAdjustmentMode = "brightness" | "temperature";

function getLightEntityId(entityIds: string[]) {
  return entityIds.find((entityId) => getEntityDomain(entityId) === "light") ?? null;
}

function kelvinToCssColor(kelvin: number) {
  const temperature = Math.min(Math.max(kelvin, 1000), 12000) / 100;
  let red: number;
  let green: number;
  let blue: number;

  if (temperature <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
    blue =
      temperature <= 19
        ? 0
        : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
    blue = 255;
  }

  const channel = (value: number) => Math.round(Math.min(Math.max(value, 0), 255));
  return `rgb(${channel(red)}, ${channel(green)}, ${channel(blue)})`;
}

export function HaLightControl({
  entityIds,
  config,
  states,
  onCall,
}: HaLightControlProps) {
  const lightEntityId = getLightEntityId(entityIds);
  const currentConfig = { ...defaultLightCapabilityConfig(), ...(config ?? {}) };
  const resolved = resolveLightCapability({
    config: currentConfig,
    entityIds,
    states,
  });
  const powerEntityId =
    lightEntityId ?? currentConfig.powerEntityId ?? resolved.sourceEntityId;
  const lightState = lightEntityId ? states[lightEntityId] : undefined;
  const capabilities = useMemo(
    () => resolveHaLightControlCapabilities(lightState),
    [lightState],
  );
  const brightnessEntityId = lightEntityId
    ? lightEntityId
    : currentConfig.brightnessEntityId ?? resolved.sourceEntityId;
  const colorTemperatureEntityId = lightEntityId
    ? lightEntityId
    : currentConfig.colorTemperatureEntityId ?? resolved.sourceEntityId;
  const brightnessPercent = lightEntityId
    ? capabilities.brightnessPercent
    : Math.max(1, Math.round(resolved.brightnessRatio * 100));
  const colorTemperatureKelvin = lightEntityId
    ? capabilities.colorTemperatureKelvin
    : resolved.colorTemperatureKelvin;
  const minKelvin = lightEntityId
    ? capabilities.minColorTemperatureKelvin
    : 1800;
  const maxKelvin = lightEntityId
    ? capabilities.maxColorTemperatureKelvin
    : 6500;
  const supportsBrightness = lightEntityId
    ? capabilities.supportsBrightness
    : Boolean(brightnessEntityId);
  const supportsColorTemperature = lightEntityId
    ? capabilities.supportsColorTemperature
    : Boolean(colorTemperatureEntityId);
  const initialMode: LightAdjustmentMode = supportsBrightness
    ? "brightness"
    : "temperature";
  const [mode, setMode] = useState<LightAdjustmentMode>(initialMode);
  const [brightnessDraft, setBrightnessDraft] = useState(brightnessPercent);
  const [colorTemperatureDraft, setColorTemperatureDraft] = useState(
    colorTemperatureKelvin,
  );

  useEffect(() => {
    setBrightnessDraft(brightnessPercent);
  }, [brightnessPercent]);

  useEffect(() => {
    setColorTemperatureDraft(colorTemperatureKelvin);
  }, [colorTemperatureKelvin]);

  useEffect(() => {
    if (mode === "brightness" && !supportsBrightness && supportsColorTemperature) {
      setMode("temperature");
    } else if (
      mode === "temperature" &&
      !supportsColorTemperature &&
      supportsBrightness
    ) {
      setMode("brightness");
    }
  }, [mode, supportsBrightness, supportsColorTemperature]);

  const commitBrightness = (value: number) => {
    if (!brightnessEntityId) {
      return;
    }
    const percent = Math.min(Math.max(Math.round(value), 1), 100);
    if (lightEntityId) {
      onCall(brightnessEntityId, "turn_on", { brightness_pct: percent });
    } else if (brightnessEntityId === resolved.sourceEntityId) {
      onCall(brightnessEntityId, "turn_on", {
        brightness: percentToBrightness(percent),
      });
    } else {
      onCall(brightnessEntityId, "set_value", { value: percent });
    }
  };

  const commitColorTemperature = (value: number) => {
    if (!colorTemperatureEntityId) {
      return;
    }
    const kelvin = Math.min(Math.max(Math.round(value), minKelvin), maxKelvin);
    if (lightEntityId || colorTemperatureEntityId === resolved.sourceEntityId) {
      onCall(colorTemperatureEntityId, "turn_on", {
        color_temp_kelvin: kelvin,
      });
    } else {
      onCall(colorTemperatureEntityId, "set_value", { value: kelvin });
    }
  };

  if (!resolved.enabled || !powerEntityId) {
    return null;
  }

  const warmColor = kelvinToCssColor(minKelvin);
  const coolColor = kelvinToCssColor(maxKelvin);
  const activeColor = kelvinToCssColor(colorTemperatureDraft);
  const isBrightnessMode = mode === "brightness";

  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-border bg-background/65 p-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center rounded-full bg-secondary/70 p-1">
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "size-8 rounded-full",
              resolved.isOn && "bg-background text-foreground shadow-sm",
            )}
            aria-label={resolved.isOn ? "关闭灯光" : "打开灯光"}
            onClick={() =>
              onCall(powerEntityId, resolved.isOn ? "turn_off" : "turn_on")
            }
          >
            <Power data-icon="icon" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button
            size="icon"
            variant="ghost"
            disabled={!supportsBrightness}
            className={cn(
              "size-8 rounded-full",
              isBrightnessMode && "bg-background text-foreground shadow-sm",
            )}
            aria-label="切换到亮度调节"
            onClick={() => setMode("brightness")}
          >
            <SunMedium data-icon="icon" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={!supportsColorTemperature}
            className={cn(
              "size-8 rounded-full",
              !isBrightnessMode && "bg-background text-foreground shadow-sm",
            )}
            aria-label="切换到色温调节"
            onClick={() => setMode("temperature")}
          >
            <Lightbulb data-icon="icon" />
          </Button>
        </div>
        {capabilities.effects.length > 0 && lightEntityId ? (
          <Select
            value={capabilities.effect ?? undefined}
            onValueChange={(effect) =>
              onCall(lightEntityId, "turn_on", { effect })
            }
          >
            <SelectTrigger className="h-10 min-w-0 flex-1 rounded-2xl border-0 bg-secondary/70 px-3 text-xs shadow-none">
              <CircleDot data-icon="inline-start" />
              <SelectValue placeholder="灯光效果" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {capabilities.effects.map((effect) => (
                  <SelectItem key={effect} value={effect}>
                    {effect}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <div className="min-w-0 flex-1 truncate rounded-2xl bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
            {isBrightnessMode ? "亮度调节" : "色温调节"}
          </div>
        )}
      </div>

      {isBrightnessMode && supportsBrightness ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>亮度</span>
            <span className="font-medium text-foreground">{brightnessDraft}%</span>
          </div>
          <WideColorSlider
            ariaLabel="亮度调节"
            min={1}
            max={100}
            value={brightnessDraft}
            background={activeColor}
            onValueChange={setBrightnessDraft}
            onValueCommit={commitBrightness}
          />
        </div>
      ) : null}

      {!isBrightnessMode && supportsColorTemperature ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>色温</span>
            <span className="font-medium text-foreground">
              {colorTemperatureDraft}K
            </span>
          </div>
          <WideColorSlider
            ariaLabel="色温调节"
            min={minKelvin}
            max={maxKelvin}
            step={50}
            value={colorTemperatureDraft}
            background={`linear-gradient(90deg, ${warmColor}, ${coolColor})`}
            onValueChange={setColorTemperatureDraft}
            onValueCommit={commitColorTemperature}
          />
        </div>
      ) : null}

      {!supportsBrightness && !supportsColorTemperature ? (
        <div className="rounded-2xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          此灯光实体未声明亮度或色温能力
        </div>
      ) : null}
    </div>
  );
}
