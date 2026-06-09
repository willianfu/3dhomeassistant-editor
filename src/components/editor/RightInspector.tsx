import { Boxes, Link2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { removeHaBinding } from "../../lib/ha-bindings";
import type {
  EnvironmentConfig,
  ObjectMetadata,
  SelectionTransformInfo,
  Vector3Values,
} from "../../types/editor";
import type { HaBinding, HaEntityState } from "../../types/ha";
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
