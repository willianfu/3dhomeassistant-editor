export type AppearanceTheme = "dark" | "light";

export const defaultAppearanceTheme: AppearanceTheme = "dark";

export type AppearanceConfig = {
  theme: AppearanceTheme;
};

export const defaultAppearance: AppearanceConfig = {
  theme: defaultAppearanceTheme,
};

export function normalizeAppearanceConfig(
  config: Partial<AppearanceConfig> | null | undefined,
): AppearanceConfig {
  return {
    theme: config?.theme === "light" ? "light" : defaultAppearance.theme,
  };
}
