import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Minus, Power, Plus, Snowflake, Thermometer, Wind } from "lucide-react";
import { getEntityDomain } from "../../lib/ha-client";
import {
  resolveHaClimateCapabilities,
  roundClimateTemperature,
} from "../../lib/ha-capabilities/climate";
import { cn } from "../../lib/utils";
import type { HaEntityState } from "../../types/ha";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type HaClimateControlProps = {
  entityIds: string[];
  states: Record<string, HaEntityState>;
  onCall: (
    entityId: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
};

type ArcTone = "cool" | "heat" | "neutral";

const ARC_VIEW_BOX = {
  width: 224,
  height: 168,
};
const ARC_CENTER = {
  x: 112,
  y: 100,
};
const ARC_RADIUS = 80;
const ARC_START_ANGLE = 210;
const ARC_SWEEP_ANGLE = 240;

function getClimateEntityId(entityIds: string[]) {
  return entityIds.find((entityId) => getEntityDomain(entityId) === "climate") ?? null;
}

function climateTone(hvacMode: string): ArcTone {
  if (hvacMode === "cool") {
    return "cool";
  }
  if (hvacMode === "heat") {
    return "heat";
  }
  return "neutral";
}

function climateGradient(tone: ArcTone) {
  if (tone === "cool") {
    return ["#387DEE", "#B9D3FF"] as const;
  }
  if (tone === "heat") {
    return ["#FFE0B3", "#FE8C01"] as const;
  }
  return ["#41B27E", "#41B27E"] as const;
}

function climateTrackShadow(tone: ArcTone) {
  if (tone === "cool") {
    return "shadow-[0_0_24px_rgba(56,125,238,0.25)]";
  }
  if (tone === "heat") {
    return "shadow-[0_0_24px_rgba(254,140,1,0.25)]";
  }
  return "shadow-[0_0_24px_rgba(65,178,126,0.18)]";
}

function mixHexColor(startHex: string, endHex: string, ratio: number) {
  const read = (hex: string, index: number) =>
    Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const channel = (index: number) =>
    Math.round(read(startHex, index) + (read(endHex, index) - read(startHex, index)) * ratio);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function ratioToArcPoint(ratio: number) {
  const angle = ARC_START_ANGLE - ratio * ARC_SWEEP_ANGLE;
  const radians = (angle * Math.PI) / 180;
  return {
    x: ARC_CENTER.x + Math.cos(radians) * ARC_RADIUS,
    y: ARC_CENTER.y - Math.sin(radians) * ARC_RADIUS,
  };
}

function arcPath() {
  const start = ratioToArcPoint(0);
  const end = ratioToArcPoint(1);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${ARC_RADIUS} ${ARC_RADIUS} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function arcControlPosition(ratio: number) {
  const point = ratioToArcPoint(ratio);
  const inwardOffset = ratio === 0 ? 20 : ratio === 1 ? -20 : 0;
  return {
    left: `calc(${(point.x / ARC_VIEW_BOX.width) * 100}% + ${inwardOffset}px)`,
    top: `${((point.y + 14) / ARC_VIEW_BOX.height) * 100}%`,
  };
}

function arcKnobPosition(ratio: number) {
  const point = ratioToArcPoint(ratio);
  return {
    left: `${(point.x / ARC_VIEW_BOX.width) * 100}%`,
    top: `${(point.y / ARC_VIEW_BOX.height) * 100}%`,
  };
}

function pointerRatioOnArc(
  event: PointerEvent<HTMLElement>,
  element: HTMLElement,
) {
  const rect = element.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * ARC_VIEW_BOX.width;
  const y = ((event.clientY - rect.top) / rect.height) * ARC_VIEW_BOX.height;
  const rawAngle = (Math.atan2(ARC_CENTER.y - y, x - ARC_CENTER.x) * 180) / Math.PI;
  const angle = rawAngle < 0 ? rawAngle + 360 : rawAngle;
  const clockwiseDelta = (ARC_START_ANGLE - angle + 360) % 360;
  const ratio = clockwiseDelta / ARC_SWEEP_ANGLE;
  return Math.min(Math.max(ratio, 0), 1);
}

function temperatureLabel(value: number, unit: string) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}${unit}`;
}

function optionLabel(value: string) {
  const labels: Record<string, string> = {
    auto: "自动",
    cool: "制冷",
    heat: "制热",
    dry: "除湿",
    fan_only: "送风",
    heat_cool: "冷热",
    off: "关闭",
    low: "低",
    medium: "中",
    high: "高",
  };
  return labels[value] ?? value;
}

function ClimateSelect({
  ariaLabel,
  value,
  options,
  placeholder,
  onValueChange,
}: {
  ariaLabel: string;
  value: string | null;
  options: string[];
  placeholder: string;
  onValueChange: (value: string) => void;
}) {
  if (options.length === 0) {
    return (
      <div className="flex h-8 min-w-0 items-center justify-center rounded-md bg-secondary px-2 text-xs text-muted-foreground">
        {placeholder}
      </div>
    );
  }

  return (
    <Select value={value ?? undefined} onValueChange={onValueChange}>
      <SelectTrigger aria-label={ariaLabel} className="h-8 min-w-0 px-2 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {optionLabel(option)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function HaClimateControl({
  entityIds,
  states,
  onCall,
}: HaClimateControlProps) {
  const entityId = getClimateEntityId(entityIds);
  const state = entityId ? states[entityId] : undefined;
  const capabilities = useMemo(
    () => (entityId ? resolveHaClimateCapabilities(entityId, state) : null),
    [entityId, state],
  );
  const [draftTemperature, setDraftTemperature] = useState(
    capabilities?.targetTemperature ?? 24,
  );
  const draftRef = useRef(draftTemperature);
  const arcRef = useRef<HTMLDivElement | null>(null);
  const [draggingKnob, setDraggingKnob] = useState(false);

  useEffect(() => {
    const next = capabilities?.targetTemperature ?? 24;
    setDraftTemperature(next);
    draftRef.current = next;
  }, [capabilities?.targetTemperature]);

  if (!entityId || !capabilities) {
    return null;
  }

  const tone = climateTone(capabilities.hvacMode);
  const [gradientStart, gradientEnd] = climateGradient(tone);
  const trackPath = arcPath();
  const decreasePosition = arcControlPosition(0);
  const increasePosition = arcControlPosition(1);
  const ratio =
    capabilities.maxTemperature === capabilities.minTemperature
      ? 0
      : (draftTemperature - capabilities.minTemperature) /
        (capabilities.maxTemperature - capabilities.minTemperature);
  const knob = ratioToArcPoint(Math.min(Math.max(ratio, 0), 1));
  const knobPosition = arcKnobPosition(Math.min(Math.max(ratio, 0), 1));
  const knobColor = mixHexColor(
    gradientStart,
    gradientEnd,
    Math.min(Math.max(ratio, 0), 1),
  );
  const commitTemperature = (value: number) => {
    const next = Math.min(
      Math.max(
        roundClimateTemperature(value, capabilities.temperatureStep),
        capabilities.minTemperature,
      ),
      capabilities.maxTemperature,
    );
    draftRef.current = next;
    setDraftTemperature(next);
    onCall(entityId, "set_temperature", {
      temperature: next,
      hvac_mode: capabilities.hvacMode === "off" ? undefined : capabilities.hvacMode,
    });
  };
  const updateDraft = (value: number) => {
    const next = Math.min(
      Math.max(Number(value), capabilities.minTemperature),
      capabilities.maxTemperature,
    );
    draftRef.current = next;
    setDraftTemperature(next);
  };
  const updateDraftFromPointer = (event: PointerEvent<HTMLElement>) => {
    if (!arcRef.current) {
      return;
    }
    const nextRatio = pointerRatioOnArc(event, arcRef.current);
    updateDraft(
      capabilities.minTemperature +
        nextRatio * (capabilities.maxTemperature - capabilities.minTemperature),
    );
  };
  const handleKnobPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDraggingKnob(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateDraftFromPointer(event);
  };
  const handleKnobPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggingKnob) {
      return;
    }
    updateDraftFromPointer(event);
  };
  const handleKnobPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggingKnob) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDraggingKnob(false);
    commitTemperature(draftRef.current);
  };
  const handleKnobKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      nudge(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      nudge(-1);
    }
  };
  const nudge = (direction: -1 | 1) => {
    commitTemperature(draftRef.current + direction * capabilities.temperatureStep);
  };

  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-border bg-background/65 p-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Thermometer className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 truncate text-xs font-medium" title={capabilities.friendlyName}>
            {capabilities.friendlyName}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
          {capabilities.currentTemperature === null
            ? optionLabel(capabilities.hvacMode)
            : temperatureLabel(capabilities.currentTemperature, capabilities.temperatureUnit)}
        </Badge>
      </div>

      <div ref={arcRef} className="relative mx-auto h-[166px] w-full max-w-[236px]">
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${ARC_VIEW_BOX.width} ${ARC_VIEW_BOX.height}`}
          className={cn("pointer-events-none absolute inset-x-0 top-0", climateTrackShadow(tone))}
        >
          <defs>
            <linearGradient
              id={`climate-arc-${entityId}`}
              gradientUnits="userSpaceOnUse"
              x1="20"
              y1="104"
              x2="204"
              y2="104"
            >
              <stop offset="0%" stopColor={gradientStart} />
              <stop offset="100%" stopColor={gradientEnd} />
            </linearGradient>
          </defs>
          <path
            d={trackPath}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeLinecap="round"
            strokeWidth="18"
            opacity="0.42"
          />
          <path
            d={trackPath}
            fill="none"
            stroke={`url(#climate-arc-${entityId})`}
            strokeLinecap="round"
            strokeWidth="18"
          />
        </svg>
        <button
          aria-label="空调温度"
          type="button"
          role="slider"
          aria-valuemin={capabilities.minTemperature}
          aria-valuemax={capabilities.maxTemperature}
          aria-valuenow={draftTemperature}
          aria-valuetext={temperatureLabel(draftTemperature, capabilities.temperatureUnit)}
          className="absolute size-9 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-[5px] bg-background shadow-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-105"
          style={{ ...knobPosition, borderColor: knobColor }}
          onPointerDown={handleKnobPointerDown}
          onPointerMove={handleKnobPointerMove}
          onPointerUp={handleKnobPointerUp}
          onPointerCancel={handleKnobPointerUp}
          onKeyDown={handleKnobKeyDown}
        >
          <span className="sr-only">拖动调节温度</span>
        </button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={decreasePosition}
          aria-label="降低温度"
          onClick={() => nudge(-1)}
        >
          <Minus data-icon="icon" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={increasePosition}
          aria-label="升高温度"
          onClick={() => nudge(1)}
        >
          <Plus data-icon="icon" />
        </Button>
        <div className="pointer-events-none absolute inset-x-12 bottom-[48px] flex flex-col items-center">
          <div className="text-4xl font-semibold leading-none tracking-normal">
            {temperatureLabel(draftTemperature, capabilities.temperatureUnit)}
          </div>
          <div className="mt-1 flex max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground">
            <Wind data-icon="inline-start" />
            <span className="truncate">
              {capabilities.fanMode ? optionLabel(capabilities.fanMode) : "风速未声明"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={capabilities.isOn ? "default" : "secondary"}
          className="min-w-0 px-2"
          onClick={() =>
            onCall(entityId, capabilities.isOn ? "turn_off" : "turn_on")
          }
        >
          <Power data-icon="inline-start" />
          {capabilities.isOn ? "关闭" : "开启"}
        </Button>
        <ClimateSelect
          ariaLabel="风速"
          value={capabilities.fanMode}
          options={capabilities.fanModes}
          placeholder="风速"
          onValueChange={(fan_mode) => onCall(entityId, "set_fan_mode", { fan_mode })}
        />
        <ClimateSelect
          ariaLabel="模式"
          value={capabilities.hvacMode}
          options={capabilities.hvacModes}
          placeholder="模式"
          onValueChange={(hvac_mode) => onCall(entityId, "set_hvac_mode", { hvac_mode })}
        />
      </div>

      {capabilities.presetModes.length > 0 || capabilities.swingModes.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          <ClimateSelect
            ariaLabel="预设模式"
            value={capabilities.presetMode}
            options={capabilities.presetModes}
            placeholder="预设"
            onValueChange={(preset_mode) =>
              onCall(entityId, "set_preset_mode", { preset_mode })
            }
          />
          <ClimateSelect
            ariaLabel="摆风"
            value={capabilities.swingMode}
            options={capabilities.swingModes}
            placeholder="摆风"
            onValueChange={(swing_mode) =>
              onCall(entityId, "set_swing_mode", { swing_mode })
            }
          />
        </div>
      ) : null}

      <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>
          {temperatureLabel(capabilities.minTemperature, capabilities.temperatureUnit)} -{" "}
          {temperatureLabel(capabilities.maxTemperature, capabilities.temperatureUnit)}
        </span>
        <span className="flex items-center gap-1">
          <Snowflake data-icon="inline-start" />
          {optionLabel(capabilities.hvacMode)}
        </span>
      </div>
    </div>
  );
}
