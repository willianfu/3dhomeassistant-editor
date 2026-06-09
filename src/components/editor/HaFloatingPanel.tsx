import { X } from "lucide-react";
import { getBoundEntityIds } from "../../lib/ha-bindings";
import type { HaBinding, HaEntityState } from "../../types/ha";
import { Button } from "../ui/button";
import { HaEntityControl } from "./HaEntityControl";

type HaFloatingPanelProps = {
  anchor: { x: number; y: number } | null;
  bindings: HaBinding[];
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
  states,
  onCall,
  onClose,
}: HaFloatingPanelProps) {
  const entityIds = getBoundEntityIds(bindings);

  if (!anchor || entityIds.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed z-30 w-[300px] max-w-[calc(100vw-24px)] overflow-hidden rounded-md border border-border bg-panel/95 p-3 shadow-2xl backdrop-blur"
      style={{
        left: `${Math.max(12, Math.min(anchor.x + 16, window.innerWidth - 312))}px`,
        top: `${Math.max(12, Math.min(anchor.y + 16, window.innerHeight - 280))}px`,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">设备控制</div>
          <div className="text-[10px] text-muted-foreground">{entityIds.length} 个实体</div>
        </div>
        <Button size="icon" variant="ghost" className="shrink-0" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>
      <div className="editor-scrollbar grid max-h-[320px] min-w-0 gap-2 overflow-x-hidden overflow-y-auto pr-1">
        {entityIds.map((entityId) => (
          <HaEntityControl
            key={entityId}
            entityId={entityId}
            state={states[entityId]}
            onCall={onCall}
          />
        ))}
      </div>
    </div>
  );
}
