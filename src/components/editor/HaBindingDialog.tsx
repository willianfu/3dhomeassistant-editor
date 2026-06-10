import { ChevronDown, Link2, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { HaBinding, HaDevice, HaEntityState } from "../../types/ha";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";

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

  const filteredDevices = devices.filter((device) =>
    deviceName(device).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="flex h-[76vh] w-[620px] max-w-[calc(100vw-40px)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>绑定 Home Assistant 实体</DialogTitle>
          <DialogDescription>选择设备，或展开设备绑定单个实体。</DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 items-center gap-2 border-b border-border p-3">
          <Input
            className="min-w-0 flex-1"
            value={query}
            placeholder="搜索设备"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button size="sm" variant="secondary" className="shrink-0" onClick={onRefresh}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1 p-3">
          <div className="grid min-w-0 gap-2 overflow-hidden pr-3">
            {filteredDevices.map((device) => {
              const expanded = expandedDeviceId === device.id;
              const entities = deviceEntities[device.id] ?? [];
              return (
                <div
                  key={device.id}
                  className="min-w-0 overflow-hidden rounded-md border border-border bg-background/50"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2 p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-w-0 flex-1 justify-start px-2"
                      onClick={async () => {
                        setExpandedDeviceId(expanded ? null : device.id);
                        if (!expanded) {
                          await onLoadDeviceEntities(device.id);
                        }
                      }}
                    >
                      <ChevronDown
                        data-icon="inline-start"
                        className={`transition ${expanded ? "rotate-180" : ""}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-left" title={deviceName(device)}>
                        {deviceName(device)}
                      </span>
                      <Badge variant="secondary" className="max-w-[120px] shrink truncate">
                        {device.id}
                      </Badge>
                    </Button>
                    <Button
                      size="sm"
                      className="ml-auto shrink-0"
                      onClick={async () => {
                        const entityIds = await onLoadDeviceEntities(device.id);
                        onBind({ type: "device", deviceId: device.id, entityIds });
                      }}
                    >
                      <Link2 data-icon="inline-start" />
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
