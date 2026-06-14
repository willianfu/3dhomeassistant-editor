import { useCallback, useEffect, useRef, useState } from "react";
import { HomeAssistantWsClient, getEntityDomain } from "../lib/ha-client";
import { normalizeHaRuntimeConfig, type HaRuntimeConfig } from "../lib/ha-config";
import { applySimulatedServiceCall } from "../lib/ha-simulator";
import type { HaConnectionStatus, HaDevice, HaEntityState } from "../types/ha";

export function useHomeAssistant(config: HaRuntimeConfig) {
  const normalizedConfig = normalizeHaRuntimeConfig(config);
  const clientRef = useRef<HomeAssistantWsClient | null>(null);
  const [status, setStatus] = useState<HaConnectionStatus>("not_configured");
  const [statusMessage, setStatusMessage] = useState("");
  const [states, setStates] = useState<Record<string, HaEntityState>>({});
  const [devices, setDevices] = useState<HaDevice[]>([]);
  const [deviceEntities, setDeviceEntities] = useState<Record<string, string[]>>({});

  const connect = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;

    if (!normalizedConfig.apiUrl || !normalizedConfig.token) {
      setStatus("not_configured");
      setStatusMessage("");
      setDevices([]);
      setDeviceEntities({});
      return;
    }

    const client = new HomeAssistantWsClient({
      url: normalizedConfig.apiUrl,
      token: normalizedConfig.token,
      onStatus: (nextStatus, message) => {
        setStatus(nextStatus as HaConnectionStatus);
        setStatusMessage(message ?? "");
      },
      onStateChanged: (state) => {
        setStates((current) => ({ ...current, [state.entity_id]: state }));
      },
    });
    clientRef.current = client;
    client.connect();
  }, [normalizedConfig.apiUrl, normalizedConfig.token]);

  useEffect(() => {
    connect();

    return () => {
      clientRef.current?.close();
      clientRef.current = null;
    };
  }, [connect]);

  const refresh = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      return;
    }
    const [nextStates, nextDevices] = await Promise.all([
      client.getStates(),
      client.getDevices(),
    ]);
    setStates(
      Object.fromEntries(nextStates.map((state) => [state.entity_id, state])),
    );
    setDevices(nextDevices);
  }, []);

  useEffect(() => {
    if (status === "connected") {
      void refresh();
    }
  }, [refresh, status]);

  const loadDeviceEntities = useCallback(
    async (deviceId: string) => {
      if (deviceEntities[deviceId]) {
        return deviceEntities[deviceId];
      }
      const entities = (await clientRef.current?.getDeviceEntities(deviceId)) ?? [];
      setDeviceEntities((current) => ({ ...current, [deviceId]: entities }));
      return entities;
    },
    [deviceEntities],
  );

  const callEntity = useCallback(
    async (
      entityId: string,
      service: string,
      serviceData: Record<string, unknown> = {},
    ) => {
      setStates((current) =>
        applySimulatedServiceCall(current, entityId, service, serviceData),
      );
      const client = clientRef.current;
      if (!client) {
        return;
      }
      try {
        await client.callService(getEntityDomain(entityId), service, {
          entity_id: entityId,
        }, serviceData);
      } catch {
        setStatus((current) => (current === "connected" ? "error" : current));
        setStatusMessage("Home Assistant service call failed, using local simulation");
      }
    },
    [],
  );

  return {
    config: normalizedConfig,
    status,
    statusMessage,
    states,
    devices,
    deviceEntities,
    refresh,
    retryConnection: connect,
    loadDeviceEntities,
    callEntity,
  };
}
