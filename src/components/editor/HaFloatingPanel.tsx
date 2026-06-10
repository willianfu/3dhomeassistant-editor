import { useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getBoundEntityIds } from "../../lib/ha-bindings";
import { placeFloatingPanel } from "../../lib/floating-panel-placement";
import type { HaBinding, HaEntityState, HaLightCapabilityConfig } from "../../types/ha";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { HaEntityControl } from "./HaEntityControl";
import { HaLightControl } from "./HaLightControl";

type HaFloatingPanelProps = {
  anchor: { x: number; y: number } | null;
  bindings: HaBinding[];
  lightCapability: HaLightCapabilityConfig | null;
  states: Record<string, HaEntityState>;
  onCall: (
    entityId: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
  onClose: () => void;
};

export function HaFloatingPanel({
  anchor,
  bindings,
  lightCapability,
  states,
  onCall,
  onClose,
}: HaFloatingPanelProps) {
  const entityIds = getBoundEntityIds(bindings);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelSize, setPanelSize] = useState({ width: 300, height: 240 });

  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element) {
      return;
    }
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setPanelSize((current) =>
        Math.abs(current.width - rect.width) < 1 &&
        Math.abs(current.height - rect.height) < 1
          ? current
          : { width: rect.width, height: rect.height },
      );
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [entityIds.length]);

  if (!anchor || entityIds.length === 0) {
    return null;
  }

  const position = placeFloatingPanel({
    anchor,
    panel: panelSize,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  });

  return (
    <Card
      ref={panelRef}
      className="pointer-events-auto fixed z-30 w-[300px] max-w-[calc(100vw-24px)] overflow-hidden bg-panel/86 shadow-2xl backdrop-blur-md"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-3 pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-xs">设备控制</CardTitle>
          <Badge variant="secondary" className="mt-1">
            {entityIds.length} 个实体
          </Badge>
        </div>
        <Button size="icon" variant="ghost" className="shrink-0" onClick={onClose}>
          <X data-icon="icon" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="max-h-[360px] pr-2">
          <div className="grid min-w-0 gap-2">
            <HaLightControl
              entityIds={entityIds}
              config={lightCapability}
              states={states}
              onCall={onCall}
            />
            {entityIds.map((entityId) => (
              <HaEntityControl
                key={entityId}
                entityId={entityId}
                state={states[entityId]}
                onCall={onCall}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
