import { Power, ToggleLeft, ToggleRight } from "lucide-react";
import { getEntityDomain } from "../../lib/ha-client";
import type { HaEntityState } from "../../types/ha";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";

type HaEntityControlProps = {
  entityId: string;
  state?: HaEntityState;
  onCall: (
    entityId: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
};

function friendlyName(entityId: string, state?: HaEntityState) {
  return String(state?.attributes.friendly_name ?? entityId);
}

function EntityName({ name }: { name: string }) {
  return (
    <div className="max-w-[128px] truncate text-xs font-medium leading-5" title={name}>
      {name}
    </div>
  );
}

export function HaEntityControl({ entityId, state, onCall }: HaEntityControlProps) {
  const domain = getEntityDomain(entityId);
  const isOn = state?.state === "on" || state?.state === "open";
  const stateText = state?.state ?? "unknown";
  const name = friendlyName(entityId, state);

  if (["light", "switch", "fan", "input_boolean"].includes(domain)) {
    return (
      <div className="grid min-w-0 gap-2 overflow-hidden rounded-md border border-border bg-background/60 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EntityName name={name} />
          </div>
          <Button
            size="sm"
            variant={isOn ? "default" : "secondary"}
            className="shrink-0"
            onClick={() => onCall(entityId, isOn ? "turn_off" : "turn_on")}
          >
            {isOn ? <ToggleRight data-icon="inline-start" /> : <ToggleLeft data-icon="inline-start" />}
            {isOn ? "关闭" : "开启"}
          </Button>
        </div>
        {domain === "light" ? (
          <Slider
            min={1}
            max={255}
            value={[Number(state?.attributes.brightness ?? 128)]}
            onValueChange={([brightness]) =>
              onCall(entityId, "turn_on", { brightness })
            }
          />
        ) : null}
      </div>
    );
  }

  if (domain === "cover") {
    return (
      <div className="grid min-w-0 gap-2 overflow-hidden rounded-md border border-border bg-background/60 p-2">
        <EntityName name={name} />
        <div className="grid grid-cols-3 gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="min-w-0 px-2"
            onClick={() => onCall(entityId, "open_cover")}
          >
            打开
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-w-0 px-2"
            onClick={() => onCall(entityId, "stop_cover")}
          >
            停止
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-w-0 px-2"
            onClick={() => onCall(entityId, "close_cover")}
          >
            关闭
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md border border-border bg-background/60 p-2">
      <div className="min-w-0 flex-1 overflow-hidden">
        <EntityName name={name} />
      </div>
      <Badge variant="secondary" className="max-w-[96px] shrink truncate" title={stateText}>
        <Power data-icon="inline-start" />
        {stateText}
      </Badge>
    </div>
  );
}
