export type HaRuntimeConfig = {
  apiUrl: string;
  token: string;
};

export function defaultHaRuntimeConfig(): HaRuntimeConfig {
  return {
    apiUrl: "",
    token: "",
  };
}

export function normalizeHaRuntimeConfig(
  config: Partial<HaRuntimeConfig> | null | undefined,
): HaRuntimeConfig {
  return {
    apiUrl: String(config?.apiUrl ?? "").trim(),
    token: String(config?.token ?? "").trim(),
  };
}
