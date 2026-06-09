import { ChevronDown, Link2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import type { HaBinding, HaDevice, HaEntityState } from "../../types/ha";
import { Button } from "../ui/button";

type HaBindingDialogProps = {
  open: boolean;
  devices: HaDevice[];
  states: Record<string, HaEntityState>;
  deviceEntities: Record<string, string[]>;
  onClose: () => void;
  onRefresh: () => void;
  onLoadDeviceEntities: (deviceId: string) => Promise<string[]>;
  onBind: (binding: HaBinding) => void;
};

function deviceName(device: HaDevice) {
  return device.name_by_user || device.name || device.id;
}

function entityName(entityId: string, state?: HaEntityState) {
  return String(state?.attributes.friendly_name ?? entityId);
}

export function HaBindingDialog({
  open,
  devices,
  states,
  deviceEntities,
  onClose,
  onRefresh,
  onLoadDeviceEntities,
  onBind,
}: HaBindingDialogProps) {
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  if (!open) {
    return null;
  }

  const filteredDevices = devices.filter((device) =>
    deviceName(device).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-background/50 backdrop-blur-sm">
      <div className="flex h-[76vh] w-[620px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-md border border-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">绑定 Home Assistant 实体</div>
            <div className="truncate text-xs text-muted-foreground">
              选择设备或设备下的单个实体
            </div>
          </div>
          <Button size="icon" variant="ghost" className="shrink-0" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
        <div className="flex min-w-0 items-center gap-2 border-b border-border p-3">
          <input
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            value={query}
            placeholder="搜索设备"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button size="sm" variant="secondary" className="shrink-0" onClick={onRefresh}>
            <RefreshCw size={14} />
            刷新
          </Button>
        </div>
        <div className="editor-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
          <div className="grid min-w-0 gap-2 overflow-hidden">
            {filteredDevices.map((device) => {
              const expanded = expandedDeviceId === device.id;
              const entities = deviceEntities[device.id] ?? [];
              return (
                <div
                  key={device.id}
                  className="min-w-0 overflow-hidden rounded-md border border-border bg-background/50"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2 p-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={async () => {
                        setExpandedDeviceId(expanded ? null : device.id);
                        if (!expanded) {
                          await onLoadDeviceEntities(device.id);
                        }
                      }}
                    >
                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition ${expanded ? "rotate-180" : ""}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm" title={deviceName(device)}>
                        {deviceName(device)}
                      </span>
                      <span
                        className="max-w-[120px] shrink truncate text-[10px] text-muted-foreground"
                        title={device.id}
                      >
                        {device.id}
                      </span>
                    </button>
                    <Button
                      size="sm"
                      className="ml-auto shrink-0"
                      onClick={async () => {
                        const entityIds = await onLoadDeviceEntities(device.id);
                        onBind({ type: "device", deviceId: device.id, entityIds });
                      }}
                    >
                      <Link2 size={14} />
                      绑定设备
                    </Button>
                  </div>
                  {expanded ? (
                    <div className="grid min-w-0 gap-1 border-t border-border p-2">
                      {entities.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground">
                          暂无实体
                        </div>
                      ) : (
                        entities.map((entityId) => {
                          const name = entityName(entityId, states[entityId]);
                          return (
                            <div
                              key={entityId}
                              className="flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-secondary"
                            >
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="truncate text-xs" title={name}>
                                  {name}
                                </div>
                                <div
                                  className="truncate text-[10px] text-muted-foreground"
                                  title={entityId}
                                >
                                  {entityId}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="ml-auto shrink-0"
                                onClick={() => onBind({ type: "entity", entityId })}
                              >
                                绑定实体
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
