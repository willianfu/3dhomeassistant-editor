import { describe, expect, it } from "vitest";
import { resolveWeatherSoundSource } from "./weather-sound";

describe("weather sound source", () => {
  it("uses rain audio for pure rain modes", () => {
    expect(resolveWeatherSoundSource("rain-light")).toBe("/sounds/rain.mp3");
    expect(resolveWeatherSoundSource("rain-medium")).toBe("/sounds/rain.mp3");
    expect(resolveWeatherSoundSource("rain-heavy")).toBe("/sounds/rain.mp3");
  });

  it("uses thunder audio only for lightning weather", () => {
    expect(resolveWeatherSoundSource("lightning")).toBe("/sounds/dalei.mp3");
  });

  it("does not play audio for non-rain weather", () => {
    expect(resolveWeatherSoundSource("none")).toBeNull();
    expect(resolveWeatherSoundSource("sunny")).toBeNull();
    expect(resolveWeatherSoundSource("cloudy")).toBeNull();
    expect(resolveWeatherSoundSource("overcast")).toBeNull();
    expect(resolveWeatherSoundSource("wind")).toBeNull();
  });
});
