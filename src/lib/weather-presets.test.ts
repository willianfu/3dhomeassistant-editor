import { describe, expect, test } from "vitest";
import { resolveWeatherBackground } from "./weather-presets";

describe("resolveWeatherBackground", () => {
  test("uses different clear-weather backgrounds for dark and light themes", () => {
    expect(resolveWeatherBackground("none", "dark")).toBe(0x0b1017);
    expect(resolveWeatherBackground("none", "light")).toBe(0xd9e7f2);
  });

  test("keeps rainy and lightning light-theme backgrounds darker than clear light theme", () => {
    const clear = resolveWeatherBackground("none", "light");

    expect(resolveWeatherBackground("rain-heavy", "light")).toBeLessThan(clear);
    expect(resolveWeatherBackground("lightning", "light")).toBeLessThan(
      resolveWeatherBackground("rain-heavy", "light"),
    );
  });
});
