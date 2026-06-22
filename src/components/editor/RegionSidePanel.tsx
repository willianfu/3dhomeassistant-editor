import { Layers3 } from "lucide-react";
import type { EditorRegion } from "../../types/editor";
import type { HaEntityState } from "../../types/ha";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { RegionDevicePanel, type RegionDevicePanelItem } from "./RegionDevicePanel";

type RegionSidePanelProps = {
  regions: EditorRegion[];
  selectedRegionId: string | null;
  expanded: boolean;
  devices: RegionDevicePanelItem[];
  states: Record<string, HaEntityState>;
  onToggleExpanded: () => void;
  onSelectRegion: (regionId: string) => void;
  onCall: (
    entityId: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
};

export function RegionSidePanel({
  regions,
  selectedRegionId,
  expanded,
  devices,
  states,
  onToggleExpanded,
  onSelectRegion,
  onCall,
}: RegionSidePanelProps) {
  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? null;
  if (regions.length === 0) {
    return null;
  }

  return (
    <section className="pointer-events-none absolute right-3 top-3 z-30 flex max-w-[min(620px,calc(100vw-340px))] flex-col items-end gap-2">
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <div
          data-testid="region-chip-strip"
          data-state={expanded ? "open" : "closed"}
          aria-hidden={!expanded}
          className={cn(
            "pointer-events-auto flex min-w-0 max-w-[min(548px,calc(100vw-410px))] origin-right items-center gap-1.5 overflow-x-auto rounded-md border border-border/60 bg-background/35 p-1 shadow-lg backdrop-blur-xl transition-[opacity,transform,max-width] duration-200 ease-out motion-reduce:transition-none",
            expanded
              ? "max-w-[min(548px,calc(100vw-410px))] translate-x-0 scale-100 opacity-100"
              : "max-w-0 translate-x-2 scale-[0.98] opacity-0 pointer-events-none",
          )}
        >
          {regions.map((region) => (
            <Button
              key={region.id}
              type="button"
              size="sm"
              variant="ghost"
              disabled={!expanded}
              aria-pressed={region.id === selectedRegionId}
              className={cn(
                "h-8 shrink-0 rounded-md px-2.5 text-xs",
                region.id === selectedRegionId
                  ? "bg-primary text-primary-foreground"
                  : "bg-panel/55 text-secondary-foreground backdrop-blur-xl",
              )}
              onClick={() => onSelectRegion(region.id)}
            >
              <span className="max-w-[96px] truncate">{region.name}</span>
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="icon"
          variant={expanded ? "default" : "secondary"}
          aria-label={expanded ? "折叠区域列表" : "展开区域列表"}
          className="pointer-events-auto size-9 shrink-0 border border-border/60 shadow-lg backdrop-blur-xl"
          onClick={onToggleExpanded}
        >
          <Layers3 data-icon="icon" />
        </Button>
      </div>
      <div
        data-testid="region-device-stack"
        data-state={expanded && selectedRegion ? "open" : "closed"}
        aria-hidden={!(expanded && selectedRegion)}
        className={cn(
          "origin-top-right overflow-hidden transition-[opacity,transform,max-height] duration-200 ease-out motion-reduce:transition-none",
          expanded && selectedRegion
            ? "max-h-[calc(100vh-96px)] translate-y-0 scale-100 opacity-100"
            : "max-h-0 -translate-y-1 scale-[0.98] opacity-0 pointer-events-none",
        )}
      >
        {selectedRegion ? (
          <RegionDevicePanel devices={devices} states={states} onCall={onCall} />
        ) : null}
      </div>
    </section>
  );
}
