import { describe, expect, it } from "vitest";
import { getEntityDomain, toHomeAssistantWebSocketUrl } from "./ha-client";

describe("ha-client helpers", () => {
  it("converts http api urls to websocket urls", () => {
    expect(toHomeAssistantWebSocketUrl("http://home.local:8123")).toBe(
      "ws://home.local:8123/api/websocket",
    );
    expect(toHomeAssistantWebSocketUrl("https://home.local")).toBe(
      "wss://home.local/api/websocket",
    );
  });

  it("keeps explicit websocket urls", () => {
    expect(toHomeAssistantWebSocketUrl("ws://10.0.0.2:8123/api/websocket")).toBe(
      "ws://10.0.0.2:8123/api/websocket",
    );
  });

  it("extracts entity domains", () => {
    expect(getEntityDomain("light.kitchen")).toBe("light");
    expect(getEntityDomain("badentity")).toBe("unknown");
  });
});
