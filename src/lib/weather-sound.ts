import type { WeatherMode } from "./weather-presets";

const rainSoundSource = "/sounds/rain.mp3";
const thunderRainSoundSource = "/sounds/dalei.mp3";

export function resolveWeatherSoundSource(mode: WeatherMode) {
  if (mode === "lightning") {
    return thunderRainSoundSource;
  }
  if (mode.startsWith("rain")) {
    return rainSoundSource;
  }
  return null;
}
