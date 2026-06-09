import type { HaDevice, HaEntityState, HaServiceTarget } from "../types/ha";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type HaClientOptions = {
  url: string;
  token: string;
  onStatus?: (status: string, message?: string) => void;
  onStateChanged?: (state: HaEntityState) => void;
};

export function toHomeAssistantWebSocketUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed.endsWith("/api/websocket")
      ? trimmed
      : `${trimmed}/api/websocket`;
  }
  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length)}/api/websocket`;
  }
  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length)}/api/websocket`;
  }
  return `ws://${trimmed}/api/websocket`;
}

export function getEntityDomain(entityId: string) {
  const [domain] = entityId.split(".");
  return domain && domain !== entityId ? domain : "unknown";
}

export class HomeAssistantWsClient {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private pending = new Map<number, PendingRequest>();
  private stateSubscriptionId: number | null = null;

  constructor(private readonly options: HaClientOptions) {}

  connect() {
    if (!this.options.url || !this.options.token) {
      this.options.onStatus?.("not_configured");
      return;
    }
    this.options.onStatus?.("connecting");
    const ws = new WebSocket(toHomeAssistantWebSocketUrl(this.options.url));
    this.ws = ws;

    ws.onmessage = (event) => this.handleMessage(event.data);
    ws.onerror = () => this.options.onStatus?.("error", "Home Assistant 连接失败");
    ws.onclose = () => this.options.onStatus?.("closed");
  }

  close() {
    this.ws?.close();
    this.ws = null;
    this.rejectPending(new Error("Home Assistant WebSocket closed"));
  }

  async getStates() {
    return (await this.sendCommand("get_states")) as HaEntityState[];
  }

  async getDevices() {
    return (await this.sendCommand("config/device_registry/list")) as HaDevice[];
  }

  async getDeviceEntities(deviceId: string) {
    const result = (await this.sendCommand("search/related", {
      item_id: deviceId,
      item_type: "device",
    })) as { entity?: string[] };
    return result.entity ?? [];
  }

  async callService(
    domain: string,
    service: string,
    target: HaServiceTarget,
    serviceData: Record<string, unknown> = {},
  ) {
    return this.sendCommand("call_service", {
      domain,
      service,
      target,
      service_data: serviceData,
    });
  }

  private handleMessage(raw: string) {
    const message = JSON.parse(raw) as {
      id?: number;
      type: string;
      success?: boolean;
      result?: unknown;
      error?: { message?: string };
      event?: { event_type?: string; data?: { new_state?: HaEntityState } };
    };

    if (message.type === "auth_required") {
      this.ws?.send(
        JSON.stringify({ type: "auth", access_token: this.options.token }),
      );
      return;
    }
    if (message.type === "auth_ok") {
      this.options.onStatus?.("connected");
      void this.subscribeStateChanges();
      return;
    }
    if (message.type === "auth_invalid") {
      this.options.onStatus?.("error", "Home Assistant 令牌认证失败");
      return;
    }
    if (message.type === "result" && message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      if (message.success) {
        pending.resolve(message.result);
      } else {
        pending.reject(new Error(message.error?.message ?? "HA command failed"));
      }
      return;
    }
    if (
      message.type === "event" &&
      message.id === this.stateSubscriptionId &&
      message.event?.data?.new_state
    ) {
      this.options.onStateChanged?.(message.event.data.new_state);
    }
  }

  private async subscribeStateChanges() {
    const id = this.nextId();
    this.stateSubscriptionId = id;
    this.sendRaw({
      id,
      type: "subscribe_events",
      event_type: "state_changed",
    });
  }

  private sendCommand(type: string, payload: Record<string, unknown> = {}) {
    const id = this.nextId();
    this.sendRaw({ id, type, ...payload });
    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  private sendRaw(payload: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Home Assistant WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(payload));
  }

  private nextId() {
    const id = this.messageId;
    this.messageId += 1;
    return id;
  }

  private rejectPending(error: Error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}
