import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  BellRing,
  ChevronDown,
  ChevronsLeftRight,
  DoorOpen,
  Gauge,
  Lock,
  Pause,
  Play,
  MousePointerClick,
  Power,
  RadioReceiver,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { getEntityDomain } from "../../lib/ha-client";
import type { HaEntityState } from "../../types/ha";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";

type HaEntityControlProps = {
  entityId: string;
  state?: HaEntityState;
  onCall: (
    entityId: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
};

function friendlyName(entityId: string, state?: HaEntityState) {
  return String(state?.attributes.friendly_name ?? entityId);
}

function numericAttribute(
  state: HaEntityState | undefined,
  key: string,
  fallback: number,
) {
  const value = Number(state?.attributes[key]);
  return Number.isFinite(value) ? value : fallback;
}

function optionList(state?: HaEntityState) {
  const rawOptions = state?.attributes.options;
  return Array.isArray(rawOptions)
    ? rawOptions.map(String).filter((value) => value.length > 0)
    : [];
}

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function percentFromClientX(
  clientX: number,
  element: HTMLElement,
  invert = false,
  fallback = 0,
) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || !Number.isFinite(clientX)) {
    return clampPercent(fallback);
  }
  const ratio = clampPercent(((clientX - rect.left) / rect.width) * 100);
  return invert ? 100 - ratio : ratio;
}

function numericStateValue(
  state: HaEntityState | undefined,
  keys: string[],
  fallback: number,
) {
  for (const key of keys) {
    const value = Number(state?.attributes[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

function EntityName({ name }: { name: string }) {
  return (
    <div className="max-w-[128px] truncate text-xs font-medium leading-5" title={name}>
      {name}
    </div>
  );
}

function EntityCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5 overflow-hidden rounded-md border border-border bg-background/60 p-2">
      {children}
    </div>
  );
}

function CoverCurtainSlider({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    setDraft(value);
    draftRef.current = value;
  }, [value]);

  const updateDraft = (nextValue: number) => {
    const next = clampPercent(nextValue);
    draftRef.current = next;
    setDraft(next);
  };

  const commitDraft = () => onCommit(draftRef.current);
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const next = percentFromClientX(event.clientX, track, false, draftRef.current);
    updateDraft(next);
  };
  const startPointer = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    updateFromPointer(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      updateFromPointer(event);
    }
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    updateFromPointer(event);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    commitDraft();
  };

  const left = (100 - draft) / 2;
  const right = 100 - left;

  return (
    <div className="grid gap-1.5">
      <div
        ref={trackRef}
        className="relative h-9 overflow-hidden rounded-md border border-sky-200 bg-sky-100 shadow-inner"
        aria-label="窗帘开合比例"
        onPointerDown={startPointer}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          className="absolute inset-y-0 bg-sky-200/90"
          style={{ left: `${left}%`, right: `${100 - right}%` }}
        />
        <div
          className="absolute inset-y-1 left-1 rounded-sm bg-sky-500/85"
          style={{ width: `${left}%` }}
        />
        <div
          className="absolute inset-y-1 right-1 rounded-sm bg-sky-500/85"
          style={{ width: `${100 - right}%` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-sky-500 bg-background shadow-lg"
          style={{ left: `${left}%` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-sky-500 bg-background shadow-lg"
          style={{ left: `${right}%` }}
        />
        <ChevronsLeftRight className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-900/60" />
        <input
          aria-label="窗帘开合滑条"
          type="range"
          min={0}
          max={100}
          step={1}
          value={draft}
          className="pointer-events-none absolute inset-0 z-10 size-full cursor-ew-resize opacity-0"
          onChange={(event) => updateDraft(Number(event.target.value))}
          onTouchEnd={commitDraft}
          onKeyUp={commitDraft}
        />
      </div>
      <div className="flex items-center justify-between px-0.5 text-[10px] text-muted-foreground">
        <span>关闭</span>
        <span>{draft}%</span>
        <span>打开</span>
      </div>
    </div>
  );
}

function MediaVolumeSlider({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    setDraft(value);
    draftRef.current = value;
  }, [value]);

  const updateDraft = (nextValue: number) => {
    const next = clampPercent(nextValue);
    draftRef.current = next;
    setDraft(next);
  };

  const commitDraft = () => onCommit(draftRef.current);
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const next = percentFromClientX(event.clientX, track, false, draftRef.current);
    updateDraft(next);
  };
  const startPointer = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    updateFromPointer(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      updateFromPointer(event);
    }
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    updateFromPointer(event);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    commitDraft();
  };

  return (
    <div
      ref={trackRef}
      className="relative h-[30px] overflow-hidden rounded-md border border-sky-200 bg-sky-100 shadow-inner"
      aria-label="音量滑条"
      onPointerDown={startPointer}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div
        className="absolute inset-y-0 bg-sky-200/90"
        style={{ left: "0%", right: `${100 - draft}%` }}
      />
      <div
        className="absolute inset-y-1 left-1 rounded-sm bg-sky-500/85"
        style={{ width: `${draft}%` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-sky-500 bg-background shadow-lg"
        style={{ left: `${draft}%` }}
      />
      <input
        aria-label="音量"
        type="range"
        min={0}
        max={100}
        step={1}
        value={draft}
        className="pointer-events-none absolute inset-0 z-10 size-full cursor-ew-resize opacity-0"
        onChange={(event) => updateDraft(Number(event.target.value))}
        onTouchEnd={commitDraft}
        onKeyUp={commitDraft}
      />
    </div>
  );
}

function StatusBadge({ stateText }: { stateText: string }) {
  return (
    <Badge variant="secondary" className="max-w-[96px] shrink truncate" title={stateText}>
      <Power data-icon="inline-start" />
      {stateText}
    </Badge>
  );
}

export function HaEntityControl({ entityId, state, onCall }: HaEntityControlProps) {
  const domain = getEntityDomain(entityId);
  const isOn = state?.state === "on" || state?.state === "open" || state?.state === "unlocked";
  const stateText = state?.state ?? "unknown";
  const name = friendlyName(entityId, state);
  const brightnessValue = Number(state?.attributes.brightness ?? 128);
  const [brightnessDraft, setBrightnessDraft] = useState(brightnessValue);
  const numberValue = Number(state?.state);
  const numberMin = numericAttribute(state, "min", 0);
  const numberMax = numericAttribute(state, "max", 100);
  const numberStep = numericAttribute(state, "step", 1);
  const [numberDraft, setNumberDraft] = useState(
    Number.isFinite(numberValue) ? String(numberValue) : "",
  );
  const [textDraft, setTextDraft] = useState(
    domain === "input_text" || domain === "text" ? stateText : "",
  );
  const options = useMemo(() => optionList(state), [state]);
  const fanPercentage = Number(state?.attributes.percentage);
  const mediaVolume = Math.round(
    clampPercent(numericStateValue(state, ["volume_level"], 0.35) * 100),
  );

  useEffect(() => {
    setBrightnessDraft(brightnessValue);
  }, [brightnessValue]);

  useEffect(() => {
    setNumberDraft(Number.isFinite(numberValue) ? String(numberValue) : "");
  }, [numberValue]);

  useEffect(() => {
    if (domain === "input_text" || domain === "text") {
      setTextDraft(stateText);
    }
  }, [domain, stateText]);

  if (domain === "button" || domain === "input_button") {
    return (
      <EntityCard>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onCall(entityId, "press")}
          >
            <MousePointerClick data-icon="inline-start" />
            按下
          </Button>
        </div>
      </EntityCard>
    );
  }

  if (domain === "scene" || domain === "script") {
    return (
      <EntityCard>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onCall(entityId, "turn_on")}
          >
            <BellRing data-icon="inline-start" />
            执行
          </Button>
        </div>
      </EntityCard>
    );
  }

  if (["light", "switch", "input_boolean"].includes(domain)) {
    return (
      <EntityCard>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
          </div>
          <Button
            size="sm"
            variant={isOn ? "default" : "secondary"}
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onCall(entityId, isOn ? "turn_off" : "turn_on")}
          >
            {isOn ? <ToggleRight data-icon="inline-start" /> : <ToggleLeft data-icon="inline-start" />}
            {isOn ? "关闭" : "打开"}
          </Button>
        </div>
        {domain === "light" ? (
          <Slider
            min={1}
            max={255}
            value={[brightnessDraft]}
            onValueChange={([brightness]) => setBrightnessDraft(brightness)}
            onValueCommit={([brightness]) =>
              onCall(entityId, "turn_on", { brightness })
            }
          />
        ) : null}
      </EntityCard>
    );
  }

  if (domain === "fan") {
    return (
      <EntityCard>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
          </div>
          <Button
            size="sm"
            variant={isOn ? "default" : "secondary"}
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onCall(entityId, isOn ? "turn_off" : "turn_on")}
          >
            {isOn ? <ToggleRight data-icon="inline-start" /> : <ToggleLeft data-icon="inline-start" />}
            {isOn ? "关闭" : "打开"}
          </Button>
        </div>
        {Number.isFinite(fanPercentage) ? (
          <div className="grid gap-1">
            <div className="text-[10px] text-muted-foreground">风速 {fanPercentage}%</div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[fanPercentage]}
              onValueCommit={([percentage]) =>
                onCall(entityId, "set_percentage", { percentage })
              }
            />
          </div>
        ) : null}
      </EntityCard>
    );
  }

  if (domain === "media_player") {
    const isPlaying = state?.state === "playing";
    const source = String(
      state?.attributes.media_title ??
        state?.attributes.source ??
        state?.attributes.app_name ??
        "",
    );
    return (
      <EntityCard>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
            {source ? (
              <div className="truncate text-[10px] text-muted-foreground" title={source}>
                {source}
              </div>
            ) : null}
          </div>
          <Badge variant={isPlaying ? "default" : "secondary"} className="shrink-0 px-1.5 text-[10px]">
            {stateText}
          </Badge>
        </div>
        <div className="grid grid-cols-5 gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="size-8 rounded-md"
            title="上一首"
            onClick={() => onCall(entityId, "media_previous_track")}
          >
            <SkipBack data-icon="icon" />
          </Button>
          <Button
            size="icon"
            variant={isPlaying ? "default" : "secondary"}
            className="size-8 rounded-md"
            title={isPlaying ? "暂停" : "播放"}
            onClick={() =>
              onCall(entityId, isPlaying ? "media_pause" : "media_play")
            }
          >
            {isPlaying ? <Pause data-icon="icon" /> : <Play data-icon="icon" />}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="size-8 rounded-md"
            title="停止"
            onClick={() => onCall(entityId, "media_stop")}
          >
            <Square data-icon="icon" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="size-8 rounded-md"
            title="下一首"
            onClick={() => onCall(entityId, "media_next_track")}
          >
            <SkipForward data-icon="icon" />
          </Button>
          <Button
            size="icon"
            variant={state?.state === "off" ? "secondary" : "ghost"}
            className="size-8 rounded-md"
            title={state?.state === "off" ? "打开" : "关闭"}
            onClick={() =>
              onCall(entityId, state?.state === "off" ? "turn_on" : "turn_off")
            }
          >
            <Power data-icon="icon" />
          </Button>
        </div>
        <div className="grid gap-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Volume2 data-icon="inline-start" />
              音量
            </span>
            <span>{mediaVolume}%</span>
          </div>
          <MediaVolumeSlider
            value={mediaVolume}
            onCommit={(volume) =>
              onCall(entityId, "volume_set", { volume_level: volume / 100 })
            }
          />
        </div>
      </EntityCard>
    );
  }

  if (domain === "lock") {
    return (
      <EntityCard>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
          </div>
          <Button
            size="sm"
            variant={state?.state === "locked" ? "secondary" : "default"}
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onCall(entityId, state?.state === "locked" ? "unlock" : "lock")}
          >
            <Lock data-icon="inline-start" />
            {state?.state === "locked" ? "解锁" : "上锁"}
          </Button>
        </div>
      </EntityCard>
    );
  }

  if (domain === "cover") {
    const position = clampPercent(
      numericStateValue(state, ["current_position", "position"], 0),
    );
    const presetPositions = [0, 25, 55, 75, 100];
    return (
      <EntityCard>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
          </div>
          <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
            {position}%
          </Badge>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 min-w-0 px-2 text-xs"
            onClick={() => onCall(entityId, "open_cover")}
          >
            <DoorOpen data-icon="inline-start" />
            打开
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 min-w-0 px-2 text-xs"
            onClick={() => onCall(entityId, "stop_cover")}
          >
            <Pause data-icon="inline-start" />
            暂停
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 min-w-0 px-2 text-xs"
            onClick={() => onCall(entityId, "close_cover")}
          >
            <Square data-icon="inline-start" />
            关闭
          </Button>
          <Select
            onValueChange={(value) =>
              onCall(entityId, "set_cover_position", { position: Number(value) })
            }
          >
            <SelectTrigger className="h-7 min-w-0 px-2 text-xs">
              <SelectValue placeholder="比例" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {presetPositions.map((preset) => (
                  <SelectItem key={preset} value={String(preset)}>
                    {preset}%
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <CoverCurtainSlider
          value={position}
          onCommit={(nextPosition) =>
            onCall(entityId, "set_cover_position", { position: nextPosition })
          }
        />
      </EntityCard>
    );
  }

  if (domain === "number" || domain === "input_number") {
    const inputId = `${entityId}-number`;
    const commitNumber = () => {
      const value = Number(numberDraft);
      if (Number.isFinite(value)) {
        onCall(entityId, "set_value", { value });
      }
    };
    return (
      <EntityCard>
        <Label htmlFor={inputId} className="truncate text-xs" title={`${name} 数值`}>
          {name} 数值
        </Label>
        <Input
          id={inputId}
          aria-label={`${name} 数值`}
          type="number"
          min={numberMin}
          max={numberMax}
          step={numberStep}
          value={numberDraft}
          className="h-7 text-xs"
          onChange={(event) => setNumberDraft(event.target.value)}
          onBlur={commitNumber}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitNumber();
            }
          }}
        />
      </EntityCard>
    );
  }

  if ((domain === "select" || domain === "input_select") && options.length > 0) {
    return (
      <EntityCard>
        <div className="flex items-center justify-between gap-2">
          <EntityName name={name} />
          <ChevronDown className="shrink-0 text-muted-foreground" />
        </div>
        <Select
          value={options.includes(stateText) ? stateText : undefined}
          onValueChange={(value) => onCall(entityId, "select_option", { option: value })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </EntityCard>
    );
  }

  if (domain === "input_text" || domain === "text") {
    const inputId = `${entityId}-text`;
    const commitText = () => {
      onCall(entityId, "set_value", { value: textDraft });
    };
    return (
      <EntityCard>
        <Label htmlFor={inputId} className="truncate text-xs" title={`${name} 文本`}>
          {name} 文本
        </Label>
        <Input
          id={inputId}
          aria-label={`${name} 文本`}
          value={textDraft}
          className="h-7 text-xs"
          onChange={(event) => setTextDraft(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitText();
            }
          }}
        />
      </EntityCard>
    );
  }

  if (["sensor", "binary_sensor"].includes(domain)) {
    return (
      <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md border border-border bg-background/60 p-2">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {domain === "binary_sensor" ? (
            <RadioReceiver className="shrink-0 text-muted-foreground" />
          ) : (
            <Gauge className="shrink-0 text-muted-foreground" />
          )}
          <EntityName name={name} />
        </div>
        <StatusBadge stateText={stateText} />
      </div>
    );
  }

  if (domain === "valve") {
    return (
      <EntityCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <DoorOpen className="shrink-0 text-muted-foreground" />
            <EntityName name={name} />
          </div>
          <Button
            size="sm"
            variant={isOn ? "default" : "secondary"}
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onCall(entityId, isOn ? "close" : "open")}
          >
            {isOn ? "关闭" : "打开"}
          </Button>
        </div>
      </EntityCard>
    );
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md border border-border bg-background/60 p-2">
      <div className="min-w-0 flex-1 overflow-hidden">
        <EntityName name={name} />
      </div>
      <StatusBadge stateText={stateText} />
    </div>
  );
}
