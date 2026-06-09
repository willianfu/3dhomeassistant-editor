import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HomeAssistantWsClient, getEntityDomain } from "../lib/ha-client";
import { getHaRuntimeConfig } from "../lib/ha-config";
import type { HaConnectionStatus, HaDevice, HaEntityState } from "../types/ha";

export function useHomeAssistant() {
  const config = useMemo(() => getHaRuntimeConfig(), []);
  const clientRef = useRef<HomeAssistantWsClient | null>(null);
  const [status, setStatus] = useState<HaConnectionStatus>("not_configured");
  const [statusMessage, setStatusMessage] = useState("");
  const [states, setStates] = useState<Record<string, HaEntityState>>({});
  const [devices, setDevices] = useState<HaDevice[]>([]);
  const [deviceEntities, setDeviceEntities] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!config.apiUrl || !config.token) {
      setStatus("not_configured");
      return;
    }

    const client = new HomeAssistantWsClient({
      url: config.apiUrl,
      token: config.token,
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

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [config.apiUrl, config.token]);

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
      const client = clientRef.current;
      if (!client) {
        return;
      }
      await client.callService(getEntityDomain(entityId), service, {
        entity_id: entityId,
      }, serviceData);
    },
    [],
  );

  return {
    config,
    status,
    statusMessage,
    states,
    devices,
    deviceEntities,
    refresh,
    loadDeviceEntities,
    callEntity,
  };
}
