import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  ChevronDown,
  DoorOpen,
  Gauge,
  Lock,
  MousePointerClick,
  Power,
  RadioReceiver,
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
    const position = Number(state?.attributes.current_position);
    return (
      <EntityCard>
        <div className="flex items-center justify-between gap-2">
          <EntityName name={name} />
          {Number.isFinite(position) ? (
            <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
              {position}%
            </Badge>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 min-w-0 px-2 text-xs"
            onClick={() => onCall(entityId, "open_cover")}
          >
            打开
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 min-w-0 px-2 text-xs"
            onClick={() => onCall(entityId, "stop_cover")}
          >
            停止
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 min-w-0 px-2 text-xs"
            onClick={() => onCall(entityId, "close_cover")}
          >
            关闭
          </Button>
        </div>
        {Number.isFinite(position) ? (
          <Slider
            min={0}
            max={100}
            value={[position]}
            onValueCommit={([value]) =>
              onCall(entityId, "set_cover_position", { position: value })
            }
          />
        ) : null}
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
