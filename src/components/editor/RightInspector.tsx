import { Boxes, Lightbulb, Link2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { removeHaBinding } from "../../lib/ha-bindings";
import { defaultLightCapabilityConfig } from "../../lib/ha-capabilities/light";
import { getEntityDomain } from "../../lib/ha-client";
import type {
  EnvironmentConfig,
  ObjectMetadata,
  SelectionTransformInfo,
  Vector3Values,
} from "../../types/editor";
import type {
  HaBinding,
  HaEntityState,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "../../types/ha";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type RightInspectorProps = {
  environment: EnvironmentConfig;
  metadata: ObjectMetadata | null;
  selectionTransform: SelectionTransformInfo | null;
  selectionBindings: HaBinding[];
  selectedCount: number;
  onEnvironmentChange: (config: EnvironmentConfig) => void;
  onPositionChange: (position: Vector3Values) => void;
  onScaleChange: (scale: Vector3Values) => void;
  onSizeChange: (size: Vector3Values) => void;
  onUniformScale: (multiplier: number) => void;
  onOpenBindingDialog: () => void;
  onBindingsChange: (bindings: HaBinding[]) => void;
  onLightCapabilityChange: (config: HaLightCapabilityConfig) => void;
  onManualDeviceTypeChange: (deviceType: HaManualDeviceType) => void;
  haStates: Record<string, HaEntityState>;
  onGroupSelected: () => void;
  onDeleteSelected: () => void;
};

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
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground" title={String(value)}>
        {value}
      </span>
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

function SizeScalePanel({
  selectionTransform,
  metadata,
  onScaleChange,
  onSizeChange,
  onUniformScale,
}: {
  selectionTransform: SelectionTransformInfo | null;
  metadata: ObjectMetadata | null;
  onScaleChange: (scale: Vector3Values) => void;
  onSizeChange: (size: Vector3Values) => void;
  onUniformScale: (multiplier: number) => void;
}) {
  const [uniformScale, setUniformScale] = useState(1);

  if (!selectionTransform) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-md border border-border bg-background/50 p-3">
      <div className="text-xs font-medium text-muted-foreground">尺寸与缩放</div>
      <VectorFields
        labels={["长", "宽", "高"]}
        min={0.001}
        step={0.05}
        value={selectionTransform.size}
        onChange={onSizeChange}
      />
      {metadata ? (
        <div>
          <div className="mb-2 text-xs text-muted-foreground">对象缩放</div>
          <VectorFields
            min={0.001}
            step={0.05}
            value={metadata.scale}
            onChange={onScaleChange}
          />
        </div>
      ) : null}
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
    <div className="grid min-w-0 gap-2 overflow-hidden rounded-md border border-border bg-background/50 p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-xs font-medium text-muted-foreground">
          HA 绑定
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto shrink-0"
          onClick={onOpenBindingDialog}
        >
          <Link2 size={14} />
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
                className="min-w-0 overflow-hidden rounded-md border border-border bg-panel/70 p-2"
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
                    <X size={13} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const DEVICE_TYPE_OPTIONS: Array<{ value: HaManualDeviceType; label: string }> = [
  { value: "auto", label: "自动识别" },
  { value: "light", label: "灯光" },
  { value: "cover", label: "窗帘 / 门" },
  { value: "climate", label: "空调" },
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
    <div className="grid gap-1.5">
      <Label>设备类型</Label>
      <select
        className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value as HaManualDeviceType)}
      >
        {DEVICE_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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
      <select
        className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">不绑定</option>
        {entityIds.map((entityId) => (
          <option key={entityId} value={entityId}>
            {entityLabel(entityId, states)}
          </option>
        ))}
      </select>
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
    <div className="grid min-w-0 gap-3 rounded-md border border-amber-400/25 bg-amber-400/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Lightbulb size={15} className="shrink-0 text-amber-300" />
          <div className="min-w-0 truncate text-xs font-medium text-amber-100">
            灯光能力
          </div>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={current.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
          />
          作为光源
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label>光源类型</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={current.lightType}
            onChange={(event) =>
              update({ lightType: event.target.value as HaLightCapabilityConfig["lightType"] })
            }
          >
            <option value="point">点光源</option>
            <option value="spot">聚光灯</option>
            <option value="area">面光源</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>发光位置</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={current.emissionMode}
            onChange={(event) =>
              update({
                emissionMode: event.target
                  .value as HaLightCapabilityConfig["emissionMode"],
              })
            }
          >
            <option value="whole">整体发光</option>
            <option value="bottom">底部发光</option>
          </select>
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
    </div>
  );
}

export function RightInspector({
  environment,
  metadata,
  selectionTransform,
  selectionBindings,
  selectedCount,
  onEnvironmentChange,
  onPositionChange,
  onScaleChange,
  onSizeChange,
  onUniformScale,
  onOpenBindingDialog,
  onBindingsChange,
  onLightCapabilityChange,
  onManualDeviceTypeChange,
  haStates,
  onGroupSelected,
  onDeleteSelected,
}: RightInspectorProps) {
  const updateEnvironment = (patch: Partial<EnvironmentConfig>) => {
    onEnvironmentChange({ ...environment, ...patch });
  };
  const updateDirectionalPosition = (patch: Partial<Vector3Values>) => {
    updateEnvironment({
      directionalPosition: { ...environment.directionalPosition, ...patch },
    });
  };

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">配置栏</div>
        <div className="mt-1 text-xs text-muted-foreground">全局与选中模型属性</div>
      </div>
      <Tabs defaultValue="environment" className="min-h-0 flex-1 px-4 py-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="environment">全局配置</TabsTrigger>
          <TabsTrigger value="model">模型信息</TabsTrigger>
        </TabsList>
        <TabsContent value="environment" className="h-[calc(100%-44px)]">
          <ScrollArea className="h-full pr-3">
            <div className="grid gap-4">
              <NumberField
                label="环境光强度"
                min={0}
                max={3}
                step={0.05}
                value={environment.ambientIntensity}
                onChange={(ambientIntensity) => updateEnvironment({ ambientIntensity })}
              />
              <NumberField
                label="主光强度"
                min={0}
                max={5}
                step={0.05}
                value={environment.directionalIntensity}
                onChange={(directionalIntensity) =>
                  updateEnvironment({ directionalIntensity })
                }
              />
              <NumberField
                label="曝光"
                min={0.2}
                max={2.5}
                step={0.05}
                value={environment.exposure}
                onChange={(exposure) => updateEnvironment({ exposure })}
              />
              <NumberField
                label="墙体透明度"
                min={0.08}
                max={1}
                step={0.02}
                value={environment.wallOpacity}
                onChange={(wallOpacity) => updateEnvironment({ wallOpacity })}
              />
              <Separator />
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label="光源 X"
                  value={environment.directionalPosition.x}
                  onChange={(x) => updateDirectionalPosition({ x })}
                />
                <NumberField
                  label="光源 Y"
                  value={environment.directionalPosition.y}
                  onChange={(y) => updateDirectionalPosition({ y })}
                />
                <NumberField
                  label="光源 Z"
                  value={environment.directionalPosition.z}
                  onChange={(z) => updateDirectionalPosition({ z })}
                />
              </div>
              <label className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={environment.gridVisible}
                  onChange={(event) =>
                    updateEnvironment({ gridVisible: event.target.checked })
                  }
                />
                显示网格
              </label>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="model" className="h-[calc(100%-44px)]">
          <ScrollArea className="h-full pr-3">
            {selectedCount > 1 ? (
              <div className="grid gap-4">
                <div className="rounded-md border border-border bg-background/50 p-3 text-sm">
                  已选中 {selectedCount} 个零件
                </div>
                <Button variant="secondary" onClick={onGroupSelected}>
                  <Boxes size={15} />
                  组合为新模型
                </Button>
                <SizeScalePanel
                  selectionTransform={selectionTransform}
                  metadata={null}
                  onScaleChange={onScaleChange}
                  onSizeChange={onSizeChange}
                  onUniformScale={onUniformScale}
                />
                <HaBindingPanel
                  bindings={selectionBindings}
                  haStates={haStates}
                  onOpenBindingDialog={onOpenBindingDialog}
                  onBindingsChange={onBindingsChange}
                />
                <Button variant="destructive" onClick={onDeleteSelected}>
                  <Trash2 size={15} />
                  删除选中零件
                </Button>
              </div>
            ) : metadata ? (
              <div className="grid gap-4">
                <div className="grid gap-2 rounded-md border border-border bg-background/50 p-3">
                  <InfoRow label="名称" value={metadata.name} />
                  <InfoRow label="类型" value={metadata.type} />
                  <InfoRow label="父级" value={metadata.parentName ?? "-"} />
                  <InfoRow label="子节点" value={metadata.childCount} />
                  <InfoRow label="网格数" value={metadata.meshCount} />
                  <InfoRow label="对象ID" value={metadata.objectId ?? "-"} />
                  <InfoRow label="绑定组" value={metadata.bindingGroupId ?? "-"} />
                  <InfoRow label="HA实体" value={metadata.entityId ?? "-"} />
                  <InfoRow label="UUID" value={metadata.id} />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    位置
                  </div>
                  <VectorFields value={metadata.position} onChange={onPositionChange} />
                </div>
                <SizeScalePanel
                  selectionTransform={selectionTransform}
                  metadata={metadata}
                  onScaleChange={onScaleChange}
                  onSizeChange={onSizeChange}
                  onUniformScale={onUniformScale}
                />
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
                <LightCapabilityPanel
                  bindings={metadata.bindings}
                  config={metadata.lightCapability}
                  haStates={haStates}
                  manualDeviceType={metadata.deviceType}
                  onChange={onLightCapabilityChange}
                />
                <div className="grid gap-2 rounded-md border border-border bg-background/50 p-3">
                  <InfoRow
                    label="旋转"
                    value={`${metadata.rotation.x}, ${metadata.rotation.y}, ${metadata.rotation.z}`}
                  />
                </div>
                <Button variant="destructive" onClick={onDeleteSelected}>
                  <Trash2 size={15} />
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
