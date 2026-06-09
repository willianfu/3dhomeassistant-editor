export type HaRuntimeConfig = {
  apiUrl: string;
  token: string;
};

export function getHaRuntimeConfig(): HaRuntimeConfig {
  return {
    apiUrl: import.meta.env.VITE_HA_API || import.meta.env.HA_API || "",
    token: import.meta.env.VITE_HA_KEY || import.meta.env.HA_KEY || "",
  };
}
