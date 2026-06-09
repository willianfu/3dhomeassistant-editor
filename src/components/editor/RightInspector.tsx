import { Trash2 } from "lucide-react";
import type { EnvironmentConfig, ObjectMetadata, Vector3Values } from "../../types/editor";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type RightInspectorProps = {
  environment: EnvironmentConfig;
  metadata: ObjectMetadata | null;
  selectedCount: number;
  onEnvironmentChange: (config: EnvironmentConfig) => void;
  onPositionChange: (position: Vector3Values) => void;
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
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">{value}</span>
    </div>
  );
}

export function RightInspector({
  environment,
  metadata,
  selectedCount,
  onEnvironmentChange,
  onPositionChange,
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
        <div className="mt-1 text-xs text-muted-foreground">环境与选中零件属性</div>
      </div>
      <Tabs defaultValue="environment" className="min-h-0 flex-1 px-4 py-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="environment">环境配置</TabsTrigger>
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
                  <InfoRow label="UUID" value={metadata.id} />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    位置
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField
                      label="X"
                      value={metadata.position.x}
                      onChange={(x) => onPositionChange({ ...metadata.position, x })}
                    />
                    <NumberField
                      label="Y"
                      value={metadata.position.y}
                      onChange={(y) => onPositionChange({ ...metadata.position, y })}
                    />
                    <NumberField
                      label="Z"
                      value={metadata.position.z}
                      onChange={(z) => onPositionChange({ ...metadata.position, z })}
                    />
                  </div>
                </div>
                <div className="grid gap-2 rounded-md border border-border bg-background/50 p-3">
                  <InfoRow
                    label="旋转"
                    value={`${metadata.rotation.x}, ${metadata.rotation.y}, ${metadata.rotation.z}`}
                  />
                  <InfoRow
                    label="缩放"
                    value={`${metadata.scale.x}, ${metadata.scale.y}, ${metadata.scale.z}`}
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
