import {
  Boxes,
  Copy,
  DoorOpen,
  Lightbulb,
  Link2,
  Move3D,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { removeHaBinding } from "../../lib/ha-bindings";
import { defaultLightCapabilityConfig } from "../../lib/ha-capabilities/light";
import { getEntityDomain } from "../../lib/ha-client";
import type { HaRuntimeConfig } from "../../lib/ha-config";
import { getSolarEnvironmentPreset } from "../../lib/environment-lighting";
import { radiansToDegreesVector } from "../../lib/rotation";
import { cn } from "../../lib/utils";
import type {
  EnvironmentConfig,
  EditorRegion,
  ObjectRegionAssignment,
  ObjectMetadata,
  PerformanceConfig,
  RenderBackend,
  RenderQuality,
  SelectionTransformInfo,
  TransformMode,
  Vector3Values,
} from "../../types/editor";
import type {
  HaBinding,
  HaConnectionStatus,
  HaCoverCapabilityConfig,
  HaCoverOpenMode,
  HaEntityState,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "../../types/ha";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type RightInspectorProps = {
  environment: EnvironmentConfig;
  performance: PerformanceConfig;
  haConfig: HaRuntimeConfig;
  haStatus: HaConnectionStatus;
  haStatusMessage: string;
  metadata: ObjectMetadata | null;
  selectionTransform: SelectionTransformInfo | null;
  selectionBindings: HaBinding[];
  selectedCount: number;
  transformMode: TransformMode;
  onEnvironmentChange: (config: EnvironmentConfig) => void;
  onPerformanceChange: (config: PerformanceConfig) => void;
  onHaConfigChange: (config: HaRuntimeConfig) => void;
  onRetryHaConnection: () => void;
  onPositionChange: (position: Vector3Values) => void;
  onScaleChange: (scale: Vector3Values) => void;
  onSizeChange: (size: Vector3Values) => void;
  onCenterChange: (center: Vector3Values) => void;
  onUniformScale: (multiplier: number) => void;
  onSelectionRotationChange: (rotationDegrees: Vector3Values) => void;
  onRotateSelection: (rotationDegrees: Vector3Values) => void;
  onTransformModeChange: (mode: TransformMode) => void;
  regions: EditorRegion[];
  onOpenBindingDialog: () => void;
  onBindingsChange: (bindings: HaBinding[]) => void;
  onCoverCapabilityChange: (config: HaCoverCapabilityConfig) => void;
  onLightCapabilityChange: (config: HaLightCapabilityConfig) => void;
  onManualDeviceTypeChange: (deviceType: HaManualDeviceType) => void;
  onRegionAssignmentChange: (assignment: ObjectRegionAssignment) => void;
  haStates: Record<string, HaEntityState>;
  onGroupSelected: () => void;
  onDeleteSelected: () => void;
  defaultTab?: "environment" | "model";
};

const NONE_VALUE = "__none";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-3 p-3 pt-0">{children}</CardContent>
    </Card>
  );
}

function AccordionPanel({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-md border border-border bg-card px-3">
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent className="grid gap-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const formatNumber = (next: number) => (Number.isFinite(next) ? String(next) : "0");
  const [draft, setDraft] = useState(formatNumber(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatNumber(value));
    }
  }, [focused, value]);

  const commitDraft = (rawValue: string) => {
    setDraft(rawValue);
    if (
      rawValue.trim() === "" ||
      rawValue === "-" ||
      rawValue === "." ||
      rawValue === "-."
    ) {
      return;
    }
    const next = Number(rawValue);
    if (!Number.isFinite(next)) {
      return;
    }
    const normalized = rawValue.match(/^-?0\d+$/) ? String(next) : rawValue;
    if (normalized !== rawValue) {
      setDraft(normalized);
    }
    onChange(next);
  };

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={draft}
        min={min}
        max={max}
        step={step}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const next = Number(draft);
          if (!Number.isFinite(next)) {
            setDraft(formatNumber(value));
          }
        }}
        onChange={(event) => commitDraft(event.target.value)}
      />
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 0.1,
  suffix = "",
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const displayValue = formatValue
    ? formatValue(value)
    : `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Badge variant="secondary" className="shrink-0">
          {displayValue}
        </Badge>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground" title={String(value)}>
        {value}
      </span>
    </div>
  );
}

function CopyableInfoRow({ label, value }: { label: string; value: string }) {
  const copyValue = async () => {
    if (!value || value === "-") {
      return;
    }
    await navigator.clipboard?.writeText(value);
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 truncate text-right text-foreground" title={value}>
          {value}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-6 shrink-0"
          disabled={!value || value === "-"}
          onClick={copyValue}
        >
          <Copy data-icon="icon" />
        </Button>
      </div>
    </div>
  );
}

function formatMeters(value: number) {
  if (!Number.isFinite(value)) {
    return "0 m";
  }
  const rounded = value.toFixed(3).replace(/\.?0+$/, "");
  return `${rounded || "0"} m`;
}

function CompactDimensionRows({
  size,
  center,
}: {
  size: Vector3Values;
  center?: Vector3Values;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-background/50 p-2">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="min-w-0 rounded-sm bg-secondary/45 px-1.5 py-1 text-center">
          <div className="text-[10px] leading-3 text-muted-foreground">长</div>
          <div className="truncate text-[11px] leading-4" title={formatMeters(size.x)}>
            {formatMeters(size.x)}
          </div>
        </div>
        <div className="min-w-0 rounded-sm bg-secondary/45 px-1.5 py-1 text-center">
          <div className="text-[10px] leading-3 text-muted-foreground">宽</div>
          <div className="truncate text-[11px] leading-4" title={formatMeters(size.z)}>
            {formatMeters(size.z)}
          </div>
        </div>
        <div className="min-w-0 rounded-sm bg-secondary/45 px-1.5 py-1 text-center">
          <div className="text-[10px] leading-3 text-muted-foreground">高</div>
          <div className="truncate text-[11px] leading-4" title={formatMeters(size.y)}>
            {formatMeters(size.y)}
          </div>
        </div>
      </div>
      {center ? (
        <InfoRow
          label="中心点"
          value={`${formatMeters(center.x)}, ${formatMeters(center.y)}, ${formatMeters(center.z)}`}
        />
      ) : null}
    </div>
  );
}

function VectorFields({
  value,
  min,
  step = 0.1,
  labels = ["X", "Y", "Z"],
  onChange,
}: {
  value: Vector3Values;
  min?: number;
  step?: number;
  labels?: [string, string, string];
  onChange: (value: Vector3Values) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <NumberField
        label={labels[0]}
        min={min}
        step={step}
        value={value.x}
        onChange={(x) => onChange({ ...value, x })}
      />
      <NumberField
        label={labels[1]}
        min={min}
        step={step}
        value={value.y}
        onChange={(y) => onChange({ ...value, y })}
      />
      <NumberField
        label={labels[2]}
        min={min}
        step={step}
        value={value.z}
        onChange={(z) => onChange({ ...value, z })}
      />
    </div>
  );
}

function RegionAssignmentSelect({
  regions,
  assignment,
  resolvedRegionId,
  onChange,
}: {
  regions: EditorRegion[];
  assignment: ObjectRegionAssignment;
  resolvedRegionId: string | null;
  onChange: (assignment: ObjectRegionAssignment) => void;
}) {
  const resolvedRegion = regions.find((region) => region.id === resolvedRegionId);
  return (
    <div className="grid gap-1.5">
      <Label>所属区域</Label>
      <Select
        value={assignment.mode === "manual" && assignment.regionId ? assignment.regionId : NONE_VALUE}
        onValueChange={(value) =>
          onChange(
            value === NONE_VALUE
              ? { mode: "auto", regionId: null, initialized: false }
              : { mode: "manual", regionId: value, initialized: false },
          )
        }
      >
        <SelectTrigger aria-label="所属区域">
          <SelectValue placeholder="自动匹配" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NONE_VALUE}>自动匹配</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className="text-[10px] leading-4 text-muted-foreground">
        {assignment.mode === "manual"
          ? "手动指定后不会跟随位置变化。"
          : `自动匹配${resolvedRegion ? `：${resolvedRegion.name}` : "：暂无匹配"}`}
      </div>
    </div>
  );
}

function DirectionSliders({
  value,
  onChange,
}: {
  value: Vector3Values;
  onChange: (value: Vector3Values) => void;
}) {
  return (
    <div className="grid gap-3">
      <SliderField
        label="东西方向"
        min={-12}
        max={12}
        step={0.1}
        value={value.x}
        formatValue={(next) =>
          next === 0 ? "中轴" : next > 0 ? `东 ${next.toFixed(1)}` : `西 ${Math.abs(next).toFixed(1)}`
        }
        onChange={(x) => onChange({ ...value, x })}
      />
      <SliderField
        label="太阳高度"
        min={0}
        max={16}
        step={0.1}
        value={value.y}
        formatValue={(next) => next.toFixed(1)}
        onChange={(y) => onChange({ ...value, y })}
      />
      <SliderField
        label="南北方向"
        min={-12}
        max={12}
        step={0.1}
        value={value.z}
        formatValue={(next) =>
          next === 0 ? "中轴" : next > 0 ? `南 ${next.toFixed(1)}` : `北 ${Math.abs(next).toFixed(1)}`
        }
        onChange={(z) => onChange({ ...value, z })}
      />
    </div>
  );
}

function haStatusLabel(status: HaConnectionStatus) {
  if (status === "connected") {
    return "已连接";
  }
  if (status === "connecting") {
    return "连接中";
  }
  if (status === "not_configured") {
    return "未配置";
  }
  return "未连接";
}

function HaGlobalConfigPanel({
  config,
  status,
  statusMessage,
  onChange,
  onRetry,
}: {
  config: HaRuntimeConfig;
  status: HaConnectionStatus;
  statusMessage: string;
  onChange: (config: HaRuntimeConfig) => void;
  onRetry: () => void;
}) {
  const connected = status === "connected";
  const update = (patch: Partial<HaRuntimeConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span
            className={cn(
              "size-2 rounded-full shadow-[0_0_10px_currentColor]",
              connected
                ? "bg-emerald-400 text-emerald-400"
                : status === "connecting"
                  ? "bg-yellow-400 text-yellow-400"
                  : "bg-destructive text-destructive",
            )}
          />
          <span className="truncate text-muted-foreground" title={statusMessage || status}>
            {haStatusLabel(status)}
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          连接
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ha-api-url">HA 地址</Label>
        <Input
          id="ha-api-url"
          value={config.apiUrl}
          placeholder="http://homeassistant.local:8123"
          onChange={(event) => update({ apiUrl: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ha-token">长期访问令牌</Label>
        <Input
          id="ha-token"
          type="password"
          value={config.token}
          placeholder="Long-Lived Access Token"
          onChange={(event) => update({ token: event.target.value })}
        />
      </div>
      <div className="text-[10px] leading-4 text-muted-foreground">
        配置会保存到浏览器本地存储，刷新后自动恢复并连接。
      </div>
    </div>
  );
}

function SizeScalePanel({
  selectionTransform,
  metadata,
  transformMode,
  onScaleChange,
  onSizeChange,
  onCenterChange,
  onUniformScale,
  onSelectionRotationChange,
  onRotateSelection,
  onTransformModeChange,
}: {
  selectionTransform: SelectionTransformInfo | null;
  metadata: ObjectMetadata | null;
  transformMode: TransformMode;
  onScaleChange: (scale: Vector3Values) => void;
  onSizeChange: (size: Vector3Values) => void;
  onCenterChange: (center: Vector3Values) => void;
  onUniformScale: (multiplier: number) => void;
  onSelectionRotationChange: (rotationDegrees: Vector3Values) => void;
  onRotateSelection: (rotationDegrees: Vector3Values) => void;
  onTransformModeChange: (mode: TransformMode) => void;
}) {
  const [uniformScale, setUniformScale] = useState(1);
  const [batchRotation, setBatchRotation] = useState<Vector3Values>({
    x: 0,
    y: 0,
    z: 0,
  });

  if (!selectionTransform) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label>渲染器操作手柄</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={transformMode === "translate" ? "default" : "secondary"}
            size="sm"
            onClick={() => onTransformModeChange("translate")}
          >
            <Move3D data-icon="inline-start" />
            移动
          </Button>
          <Button
            type="button"
            variant={transformMode === "rotate" ? "default" : "secondary"}
            size="sm"
            onClick={() => onTransformModeChange("rotate")}
          >
            <RotateCcw data-icon="inline-start" />
            旋转
          </Button>
        </div>
      </div>
      <VectorFields
        labels={["长", "宽", "高"]}
        min={0.001}
        step={0.05}
        value={{
          x: selectionTransform.size.x,
          y: selectionTransform.size.z,
          z: selectionTransform.size.y,
        }}
        onChange={(size) => onSizeChange({ x: size.x, y: size.z, z: size.y })}
      />
      <div className="grid gap-2">
        <Label>中心点</Label>
        <VectorFields
          labels={["X", "高度Y", "Z"]}
          step={0.05}
          value={selectionTransform.center}
          onChange={onCenterChange}
        />
      </div>
      {metadata ? (
        <div className="grid gap-2">
          <Label>对象缩放</Label>
          <VectorFields
            min={0.001}
            step={0.05}
            value={metadata.scale}
            onChange={onScaleChange}
          />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label>{metadata ? "对象旋转" : "整体旋转"}</Label>
        <VectorFields
          labels={["X°", "Y°", "Z°"]}
          step={1}
          value={
            metadata
              ? {
                  ...radiansToDegreesVector(metadata.rotation),
                }
              : batchRotation
          }
          onChange={(rotation) => {
            if (metadata) {
              onSelectionRotationChange(rotation);
              return;
            }
            setBatchRotation(rotation);
          }}
        />
        {!metadata ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onRotateSelection(batchRotation)}
          >
            <RotateCcw data-icon="inline-start" />
            应用整体旋转
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <NumberField
          label="等比倍率"
          min={0.001}
          step={0.05}
          value={uniformScale}
          onChange={setUniformScale}
        />
        <Button variant="default" size="sm" onClick={() => onUniformScale(uniformScale)}>
          应用
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={() => onUniformScale(0.9)}>
          90%
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onUniformScale(1.1)}>
          110%
        </Button>
      </div>
    </div>
  );
}

function HaBindingPanel({
  bindings,
  haStates,
  onOpenBindingDialog,
  onBindingsChange,
}: {
  bindings: HaBinding[];
  haStates: Record<string, HaEntityState>;
  onOpenBindingDialog: () => void;
  onBindingsChange: (bindings: HaBinding[]) => void;
}) {
  return (
    <Section title="Home Assistant 绑定">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Badge variant="secondary">{bindings.length} 项</Badge>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto shrink-0"
          onClick={onOpenBindingDialog}
        >
          <Link2 data-icon="inline-start" />
          绑定实体
        </Button>
      </div>
      <div className="grid min-w-0 gap-1 overflow-hidden">
        {bindings.length === 0 ? (
          <div className="truncate text-xs text-muted-foreground">暂未绑定实体</div>
        ) : (
          bindings.map((binding) => {
            const id = binding.type === "entity" ? binding.entityId : binding.deviceId;
            const entityIds =
              binding.type === "entity" ? [binding.entityId] : binding.entityIds;
            const names = entityIds
              .map((entityId) =>
                String(haStates[entityId]?.attributes.friendly_name ?? entityId),
              )
              .join(" / ");
            return (
              <div
                key={`${binding.type}:${id}`}
                className="min-w-0 overflow-hidden rounded-md border border-border bg-background/50 p-2"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="truncate text-xs" title={id}>
                      {binding.type === "entity" ? "实体" : "设备"} · {id}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground" title={names}>
                      {names}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => onBindingsChange(removeHaBinding(bindings, id))}
                  >
                    <X data-icon="icon" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Section>
  );
}

const DEVICE_TYPE_OPTIONS: Array<{ value: HaManualDeviceType; label: string }> = [
  { value: "auto", label: "自动识别" },
  { value: "light", label: "灯光" },
  { value: "cover", label: "窗帘 / 门" },
  { value: "climate", label: "空调" },
  { value: "media_player", label: "媒体播放器" },
  { value: "switch", label: "开关" },
  { value: "button", label: "按钮" },
  { value: "fan", label: "风扇" },
  { value: "sensor", label: "传感器" },
  { value: "number", label: "数值" },
  { value: "select", label: "选择" },
  { value: "text", label: "文本输入" },
];

function DeviceTypeSelect({
  value,
  onChange,
}: {
  value: HaManualDeviceType;
  onChange: (value: HaManualDeviceType) => void;
}) {
  return (
    <Section title="设备类型">
      <Select value={value} onValueChange={(next) => onChange(next as HaManualDeviceType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {DEVICE_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Section>
  );
}

function entityLabel(entityId: string, states: Record<string, HaEntityState>) {
  return String(states[entityId]?.attributes.friendly_name ?? entityId);
}

function EntitySelect({
  label,
  value,
  entityIds,
  states,
  onChange,
}: {
  label: string;
  value?: string;
  entityIds: string[];
  states: Record<string, HaEntityState>;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(next) => onChange(next === NONE_VALUE ? undefined : next)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NONE_VALUE}>不绑定</SelectItem>
            {entityIds.map((entityId) => (
              <SelectItem key={entityId} value={entityId}>
                {entityLabel(entityId, states)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function LightCapabilityPanel({
  bindings,
  config,
  haStates,
  onChange,
  manualDeviceType,
}: {
  bindings: HaBinding[];
  config: HaLightCapabilityConfig | null;
  haStates: Record<string, HaEntityState>;
  onChange: (config: HaLightCapabilityConfig) => void;
  manualDeviceType: HaManualDeviceType;
}) {
  const entityIds = bindings.flatMap((binding) =>
    binding.type === "entity" ? [binding.entityId] : binding.entityIds,
  );
  const hasLightEntity = entityIds.some((entityId) => getEntityDomain(entityId) === "light");
  const current = { ...defaultLightCapabilityConfig(), ...(config ?? {}) };

  if (!hasLightEntity && manualDeviceType !== "light" && !current.enabled) {
    return null;
  }

  const numericEntityIds = entityIds.filter((entityId) =>
    ["light", "number", "input_number", "sensor"].includes(getEntityDomain(entityId)),
  );
  const powerEntityIds = entityIds.filter((entityId) =>
    ["light", "switch", "input_boolean", "binary_sensor"].includes(
      getEntityDomain(entityId),
    ),
  );
  const update = (patch: Partial<HaLightCapabilityConfig>) =>
    onChange({ ...current, ...patch });

  return (
    <Section title="灯光能力" description="绑定为真实 Three.js 光源">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Lightbulb className="shrink-0 text-primary" />
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            启用后会根据 HA 状态同步发光
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={current.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
          <Label className="text-xs">作为光源</Label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label>光源类型</Label>
          <Select
            value={current.lightType}
            onValueChange={(lightType) =>
              update({ lightType: lightType as HaLightCapabilityConfig["lightType"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="point">点光源</SelectItem>
                <SelectItem value="spot">聚光灯</SelectItem>
                <SelectItem value="area">面光源</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>发光位置</Label>
          <Select
            value={current.emissionMode}
            onValueChange={(emissionMode) =>
              update({
                emissionMode:
                  emissionMode as HaLightCapabilityConfig["emissionMode"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="whole">整体发光</SelectItem>
                <SelectItem value="bottom">底部发光</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="发光角度"
          min={5}
          max={120}
          step={1}
          value={current.coneAngle}
          onChange={(coneAngle) => update({ coneAngle })}
        />
        <NumberField
          label="照明范围"
          min={1}
          max={80}
          step={1}
          value={current.lightRange}
          onChange={(lightRange) => update({ lightRange })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="光强上限"
          min={0.1}
          max={80}
          step={0.1}
          value={current.maxIntensity}
          onChange={(maxIntensity) => update({ maxIntensity })}
        />
        <NumberField
          label="最大亮度"
          min={1}
          max={1000}
          step={1}
          value={current.maxBrightness}
          onChange={(maxBrightness) => update({ maxBrightness })}
        />
      </div>
      <NumberField
        label="固定色温 K"
        min={1800}
        max={6500}
        step={50}
        value={current.fixedColorTemperatureKelvin}
        onChange={(fixedColorTemperatureKelvin) =>
          update({ fixedColorTemperatureKelvin })
        }
      />
      <EntitySelect
        label="亮灭状态实体"
        value={current.powerEntityId}
        entityIds={powerEntityIds}
        states={haStates}
        onChange={(powerEntityId) => update({ powerEntityId })}
      />
      <div className="text-[10px] leading-4 text-muted-foreground">
        不绑定亮灭状态实体时，会使用主绑定实体本身的开关状态。
      </div>
      <EntitySelect
        label="亮度实体"
        value={current.brightnessEntityId}
        entityIds={numericEntityIds}
        states={haStates}
        onChange={(brightnessEntityId) => update({ brightnessEntityId })}
      />
      <EntitySelect
        label="色温实体"
        value={current.colorTemperatureEntityId}
        entityIds={numericEntityIds}
        states={haStates}
        onChange={(colorTemperatureEntityId) =>
          update({ colorTemperatureEntityId })
        }
      />
    </Section>
  );
}

const COVER_OPEN_MODE_OPTIONS: Array<{ value: HaCoverOpenMode; label: string }> = [
  { value: "symmetrical", label: "对称开" },
  { value: "left", label: "往左开" },
  { value: "right", label: "往右开" },
  { value: "down", label: "往下开" },
  { value: "up", label: "往上开" },
];

function CoverCapabilityPanel({
  bindings,
  config,
  manualDeviceType,
  onChange,
}: {
  bindings: HaBinding[];
  config: HaCoverCapabilityConfig | null;
  manualDeviceType: HaManualDeviceType;
  onChange: (config: HaCoverCapabilityConfig) => void;
}) {
  const entityIds = bindings.flatMap((binding) =>
    binding.type === "entity" ? [binding.entityId] : binding.entityIds,
  );
  const hasCoverEntity = entityIds.some((entityId) => getEntityDomain(entityId) === "cover");
  const current: HaCoverCapabilityConfig = {
    enabled: true,
    openMode: "symmetrical",
    ...(config ?? {}),
  };

  if (!hasCoverEntity && manualDeviceType !== "cover" && !config?.enabled) {
    return null;
  }

  const update = (patch: Partial<HaCoverCapabilityConfig>) =>
    onChange({ ...current, ...patch });

  return (
    <Section title="窗帘动画" description="根据 HA 开合比例模拟模型开合">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <DoorOpen className="shrink-0 text-primary" />
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            0% 关闭，100% 完全打开
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={current.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
          <Label className="text-xs">启用</Label>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>开合方式</Label>
        <Select
          value={current.openMode}
          onValueChange={(openMode) => update({ openMode: openMode as HaCoverOpenMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {COVER_OPEN_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <NumberField
        label="收起保留距离 m"
        min={0.01}
        step={0.01}
        value={current.closedVisibleDistance ?? 0.1}
        onChange={(closedVisibleDistance) =>
          update({ closedVisibleDistance: Math.max(closedVisibleDistance, 0.01) })
        }
      />
      <NumberField
        label="100%打开距离 m"
        min={0}
        step={0.01}
        value={current.openTravelDistance ?? 1}
        onChange={(openTravelDistance) =>
          update({ openTravelDistance: Math.max(openTravelDistance, 0) })
        }
      />
      <NumberField
        label="开合速度 m/s"
        min={0.1}
        step={0.1}
        value={current.animationSpeedMetersPerSecond ?? 0.5}
        onChange={(animationSpeedMetersPerSecond) =>
          update({
            animationSpeedMetersPerSecond:
              Math.round(Math.max(animationSpeedMetersPerSecond, 0.1) * 10) / 10,
          })
        }
      />
      {current.openMode === "symmetrical" ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label>左帘对象ID</Label>
            <Input
              value={current.leftObjectId ?? ""}
              placeholder="objectId"
              onChange={(event) => update({ leftObjectId: event.target.value.trim() })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>右帘对象ID</Label>
            <Input
              value={current.rightObjectId ?? ""}
              placeholder="objectId"
              onChange={(event) => update({ rightObjectId: event.target.value.trim() })}
            />
          </div>
        </div>
      ) : null}
      <div className="text-[10px] leading-4 text-muted-foreground">
        对称开可填写左右帘对象ID；其他方式默认控制当前选中模型。
      </div>
    </Section>
  );
}

export function RightInspector({
  environment,
  performance,
  haConfig,
  haStatus,
  haStatusMessage,
  metadata,
  selectionTransform,
  selectionBindings,
  selectedCount,
  transformMode,
  onEnvironmentChange,
  onPerformanceChange,
  onHaConfigChange,
  onRetryHaConnection,
  onPositionChange,
  onScaleChange,
  onSizeChange,
  onCenterChange,
  onUniformScale,
  onSelectionRotationChange,
  onRotateSelection,
  onTransformModeChange,
  regions,
  onOpenBindingDialog,
  onBindingsChange,
  onCoverCapabilityChange,
  onLightCapabilityChange,
  onManualDeviceTypeChange,
  onRegionAssignmentChange,
  haStates,
  onGroupSelected,
  onDeleteSelected,
  defaultTab = "environment",
}: RightInspectorProps) {
  const updateEnvironment = (patch: Partial<EnvironmentConfig>) => {
    onEnvironmentChange({ ...environment, ...patch });
  };
  const updatePerformance = (patch: Partial<PerformanceConfig>) => {
    onPerformanceChange({ ...performance, ...patch });
  };

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">配置栏</div>
        <div className="mt-1 text-xs text-muted-foreground">全局与选中模型属性</div>
      </div>
      <Tabs defaultValue={defaultTab} className="min-h-0 flex-1 px-4 py-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="environment">全局配置</TabsTrigger>
          <TabsTrigger value="model">模型信息</TabsTrigger>
        </TabsList>
        <TabsContent value="environment" className="h-[calc(100%-44px)]">
          <ScrollArea className="h-full pr-3">
            <div className="grid gap-3">
              <Accordion type="multiple" className="grid gap-3">
                <AccordionItem value="performance" className="rounded-md border border-border bg-card px-3">
                  <AccordionTrigger>性能设置</AccordionTrigger>
                  <AccordionContent className="grid gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <Label>WebGPU 渲染</Label>
                        <div className="text-xs text-muted-foreground">
                          开启后优先使用 WebGPU，浏览器不支持时自动回退 WebGL。刷新后生效。
                        </div>
                      </div>
                      <Switch
                        checked={performance.renderBackend === "webgpu"}
                        onCheckedChange={(checked) =>
                          updatePerformance({
                            renderBackend: checked ? "webgpu" : "webgl",
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>渲染器</Label>
                      <Select
                        value={performance.renderBackend}
                        onValueChange={(renderBackend) =>
                          updatePerformance({
                            renderBackend: renderBackend as RenderBackend,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="webgl">WebGL</SelectItem>
                            <SelectItem value="webgpu">WebGPU</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>画面质量</Label>
                      <Select
                        value={performance.quality}
                        onValueChange={(quality) =>
                          updatePerformance({
                            quality: quality as RenderQuality,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="low">低质量</SelectItem>
                            <SelectItem value="medium">中等质量</SelectItem>
                            <SelectItem value="high">高质量</SelectItem>
                            <SelectItem value="ultra">超高质量</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        高质量保持当前默认效果；低质量降低像素比并关闭阴影，超高质量增强阴影细节。
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <Label>超写实渲染</Label>
                        <div className="text-xs text-muted-foreground">
                          开启后增强玻璃、金属、布料材质和环境反射，适合最终预览。
                        </div>
                      </div>
                      <Switch
                        checked={performance.realisticRenderingEnabled}
                        onCheckedChange={(checked) =>
                          updatePerformance({
                            realisticRenderingEnabled: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <Label>模型阴影</Label>
                        <div className="text-xs text-muted-foreground">
                          关闭可显著减少大量家具模型的阴影渲染开销，不影响模型几何。
                        </div>
                      </div>
                      <Switch
                        checked={performance.modelShadowsEnabled}
                        onCheckedChange={(checked) =>
                          updatePerformance({
                            modelShadowsEnabled: checked,
                          })
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="ha-config" className="rounded-md border border-border bg-card px-3">
                  <AccordionTrigger>Home Assistant</AccordionTrigger>
                  <AccordionContent className="grid gap-3">
                    <HaGlobalConfigPanel
                      config={haConfig}
                      status={haStatus}
                      statusMessage={haStatusMessage}
                      onChange={onHaConfigChange}
                      onRetry={onRetryHaConnection}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Section title="日照时间轴" description="24 档环境光预设，按上北下南左西右东计算太阳方向。">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={environment.realtimeTimeEnabled ?? true}
                    onCheckedChange={(checked) =>
                      onEnvironmentChange({
                        ...environment,
                        realtimeTimeEnabled: checked === true,
                      })
                    }
                  />
                  <span>实时当前时间</span>
                </label>
                <SliderField
                  label="时间"
                  min={0}
                  max={23}
                  step={1}
                  value={environment.timeOfDay}
                  formatValue={(value) => `${String(value).padStart(2, "0")}:00`}
                  onChange={(timeOfDay) =>
                    onEnvironmentChange({
                      ...getSolarEnvironmentPreset(timeOfDay, environment),
                      realtimeTimeEnabled: false,
                    })
                  }
                />
                <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                  <span>00 夜间</span>
                  <span>06 东升</span>
                  <span>12 南中</span>
                  <span>19 夜间</span>
                </div>
              </Section>
              <Accordion type="multiple" className="grid gap-3">
                <AccordionItem value="environment-light" className="rounded-md border border-border bg-card px-3">
                  <AccordionTrigger>环境光照</AccordionTrigger>
                  <AccordionContent className="grid gap-3">
                    <SliderField
                      label="环境光强度"
                      min={0}
                      max={3}
                      step={0.05}
                      value={environment.ambientIntensity}
                      onChange={(ambientIntensity) => updateEnvironment({ ambientIntensity })}
                    />
                    <SliderField
                      label="主光强度"
                      min={0}
                      max={5}
                      step={0.05}
                      value={environment.directionalIntensity}
                      onChange={(directionalIntensity) =>
                        updateEnvironment({ directionalIntensity })
                      }
                    />
                    <SliderField
                      label="环境色温"
                      min={1800}
                      max={7500}
                      step={50}
                      suffix="K"
                      value={environment.colorTemperatureKelvin}
                      onChange={(colorTemperatureKelvin) =>
                        updateEnvironment({ colorTemperatureKelvin })
                      }
                    />
                    <SliderField
                      label="曝光"
                      min={0.2}
                      max={2.5}
                      step={0.05}
                      value={environment.exposure}
                      onChange={(exposure) => updateEnvironment({ exposure })}
                    />
                    <SliderField
                      label="墙体透明度"
                      min={0.08}
                      max={1}
                      step={0.02}
                      value={environment.wallOpacity}
                      onChange={(wallOpacity) => updateEnvironment({ wallOpacity })}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="environment-sun" className="rounded-md border border-border bg-card px-3">
                  <AccordionTrigger>太阳方向</AccordionTrigger>
                  <AccordionContent className="grid gap-3">
                    <DirectionSliders
                      value={environment.directionalPosition}
                      onChange={(directionalPosition) =>
                        updateEnvironment({ directionalPosition })
                      }
                    />
                    <Separator />
                    <div className="flex items-center justify-between gap-3">
                      <Label>显示网格</Label>
                      <Switch
                        checked={environment.gridVisible}
                        onCheckedChange={(gridVisible) => updateEnvironment({ gridVisible })}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="model" className="h-[calc(100%-44px)]">
          <ScrollArea className="h-full pr-3">
            {selectedCount > 1 ? (
              <div className="grid gap-4">
                <Accordion type="multiple" className="grid gap-3">
                  <AccordionPanel value="batch-info" title="批量选择">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">已选零件</span>
                      <Badge>{selectedCount}</Badge>
                    </div>
                    {selectionTransform ? (
                      <CompactDimensionRows
                        size={selectionTransform.size}
                        center={selectionTransform.center}
                      />
                    ) : null}
                  </AccordionPanel>
                  <AccordionPanel value="size" title="尺寸与缩放/旋转">
                    <SizeScalePanel
                      selectionTransform={selectionTransform}
                      metadata={null}
                      transformMode={transformMode}
                      onScaleChange={onScaleChange}
                      onSizeChange={onSizeChange}
                      onCenterChange={onCenterChange}
                      onUniformScale={onUniformScale}
                      onSelectionRotationChange={onSelectionRotationChange}
                      onRotateSelection={onRotateSelection}
                      onTransformModeChange={onTransformModeChange}
                    />
                  </AccordionPanel>
                </Accordion>
                <Button variant="secondary" onClick={onGroupSelected}>
                  <Boxes data-icon="inline-start" />
                  组合为新模型
                </Button>
                <HaBindingPanel
                  bindings={selectionBindings}
                  haStates={haStates}
                  onOpenBindingDialog={onOpenBindingDialog}
                  onBindingsChange={onBindingsChange}
                />
                <Button variant="destructive" onClick={onDeleteSelected}>
                  <Trash2 data-icon="inline-start" />
                  删除选中零件
                </Button>
              </div>
            ) : metadata ? (
              <div className="grid gap-4">
                <Accordion type="multiple" className="grid gap-3">
                  <AccordionPanel value="basic" title="基础信息">
                    <CopyableInfoRow label="对象ID" value={metadata.objectId ?? "-"} />
                    <InfoRow label="名称" value={metadata.name} />
                    <InfoRow label="类型" value={metadata.type} />
                    <InfoRow label="父级" value={metadata.parentName ?? "-"} />
                    <InfoRow label="子节点" value={metadata.childCount} />
                    <InfoRow label="网格数" value={metadata.meshCount} />
                    <InfoRow label="绑定组" value={metadata.bindingGroupId ?? "-"} />
                    <InfoRow label="HA实体" value={metadata.entityId ?? "-"} />
                    <InfoRow label="UUID" value={metadata.id} />
                    {selectionTransform ? (
                      <>
                        <Separator />
                        <CompactDimensionRows
                          size={selectionTransform.size}
                          center={selectionTransform.center}
                        />
                      </>
                    ) : null}
                  </AccordionPanel>
                  <AccordionPanel value="position" title="位置">
                    <VectorFields
                      labels={["X", "高度Y", "Z"]}
                      value={metadata.position}
                      onChange={onPositionChange}
                    />
                    <RegionAssignmentSelect
                      regions={regions}
                      assignment={metadata.regionAssignment}
                      resolvedRegionId={metadata.resolvedRegionId}
                      onChange={onRegionAssignmentChange}
                    />
                  </AccordionPanel>
                  <AccordionPanel value="size" title="尺寸与缩放/旋转">
                    <SizeScalePanel
                      selectionTransform={selectionTransform}
                      metadata={metadata}
                      transformMode={transformMode}
                      onScaleChange={onScaleChange}
                      onSizeChange={onSizeChange}
                      onCenterChange={onCenterChange}
                      onUniformScale={onUniformScale}
                      onSelectionRotationChange={onSelectionRotationChange}
                      onRotateSelection={onRotateSelection}
                      onTransformModeChange={onTransformModeChange}
                    />
                  </AccordionPanel>
                </Accordion>
                <HaBindingPanel
                  bindings={metadata.bindings}
                  haStates={haStates}
                  onOpenBindingDialog={onOpenBindingDialog}
                  onBindingsChange={onBindingsChange}
                />
                <DeviceTypeSelect
                  value={metadata.deviceType}
                  onChange={onManualDeviceTypeChange}
                />
                <CoverCapabilityPanel
                  bindings={metadata.bindings}
                  config={metadata.coverCapability}
                  manualDeviceType={metadata.deviceType}
                  onChange={onCoverCapabilityChange}
                />
                <LightCapabilityPanel
                  bindings={metadata.bindings}
                  config={metadata.lightCapability}
                  haStates={haStates}
                  manualDeviceType={metadata.deviceType}
                  onChange={onLightCapabilityChange}
                />
                <Section title="旋转">
                  <InfoRow
                    label="欧拉角"
                    value={`${metadata.rotation.x}, ${metadata.rotation.y}, ${metadata.rotation.z}`}
                  />
                </Section>
                <Button variant="destructive" onClick={onDeleteSelected}>
                  <Trash2 data-icon="inline-start" />
                  删除选中零件
                </Button>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-center text-sm text-muted-foreground">
                请选择一个模型零件
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
