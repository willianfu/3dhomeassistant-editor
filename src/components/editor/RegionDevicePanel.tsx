import { getBoundEntityIds } from "../../lib/ha-bindings";
import { getEntityDomain } from "../../lib/ha-client";
import { cn } from "../../lib/utils";
import type {
  HaBinding,
  HaCoverCapabilityConfig,
  HaEntityState,
  HaLightCapabilityConfig,
} from "../../types/ha";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { HaClimateControl } from "./HaClimateControl";
import { HaEntityControl } from "./HaEntityControl";
import { HaLightControl } from "./HaLightControl";

export type RegionDevicePanelItem = {
  id: string;
  name: string;
  objectIds: string[];
  bindings: HaBinding[];
  coverCapability: HaCoverCapabilityConfig | null;
  lightCapability: HaLightCapabilityConfig | null;
};

type RegionDevicePanelProps = {
  devices: RegionDevicePanelItem[];
  states: Record<string, HaEntityState>;
  onCall: (
    entityId: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
  className?: string;
};

function getRegionDeviceDisplayName(
  device: RegionDevicePanelItem,
  states: Record<string, HaEntityState>,
) {
  const entityIds = getBoundEntityIds(device.bindings);
  const friendlyNames = entityIds
    .map((entityId) => states[entityId]?.attributes?.friendly_name)
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name) => name.trim());

  if (friendlyNames.length > 0) {
    return friendlyNames.join(" / ");
  }

  return entityIds[0] ?? device.name;
}

export function RegionDevicePanel({
  devices,
  states,
  onCall,
  className,
}: RegionDevicePanelProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-[300px] max-w-[calc(100vw-24px)] overflow-hidden",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>区域设备</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {devices.length}
        </Badge>
      </div>
      <ScrollArea className="max-h-[calc(100vh-176px)] pr-2">
        {devices.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/55 bg-panel/25 px-3 py-5 text-center text-xs text-muted-foreground shadow-lg backdrop-blur-2xl">
            该区域内暂无绑定实体的设备
          </div>
        ) : (
          <div className="grid gap-1.5">
            {devices.map((device) => {
              const entityIds = getBoundEntityIds(device.bindings);
              const displayName = getRegionDeviceDisplayName(device, states);
              const visibleEntityIds = entityIds.filter(
                (entityId) => !["light", "climate"].includes(getEntityDomain(entityId)),
              );

              return (
                <Card
                  key={device.id}
                  className="overflow-hidden border-border/45 bg-panel/30 shadow-lg shadow-background/15 backdrop-blur-2xl"
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-2 p-2 pb-1">
                    <CardTitle className="min-w-0 truncate text-xs" title={displayName}>
                      {displayName}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
                      {entityIds.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="grid gap-1 p-2 pt-0">
                    <HaLightControl
                      entityIds={entityIds}
                      config={device.lightCapability}
                      states={states}
                      onCall={onCall}
                    />
                    <HaClimateControl
                      entityIds={entityIds}
                      states={states}
                      onCall={onCall}
                    />
                    {visibleEntityIds.map((entityId) => (
                      <HaEntityControl
                        key={entityId}
                        entityId={entityId}
                        state={states[entityId]}
                        coverCapability={device.coverCapability}
                        onCall={onCall}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
