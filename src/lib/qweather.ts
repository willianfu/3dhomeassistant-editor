import type { WeatherMode } from "./weather-presets";

export type QWeatherNow = {
  obsTime?: string;
  temp?: string;
  feelsLike?: string;
  icon?: string;
  text?: string;
  wind360?: string;
  windDir?: string;
  windScale?: string;
  windSpeed?: string;
  humidity?: string;
  precip?: string;
  pressure?: string;
  vis?: string;
  cloud?: string;
  dew?: string;
};

export type QWeatherNowResult = {
  mode: WeatherMode;
  now: QWeatherNow;
};

type QWeatherNowResponse = {
  code?: string;
  now?: QWeatherNow;
};

function parseNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapQWeatherNowToMode(now: QWeatherNow): WeatherMode {
  const text = now.text ?? "";
  const icon = now.icon ?? "";
  const precip = parseNumber(now.precip);
  const windScale = parseNumber(now.windScale);

  if (/雷|闪电|thunder/i.test(text) || ["302", "303", "304"].includes(icon)) {
    return "lightning";
  }
  if (/暴雨|大暴雨|特大暴雨|heavy rain|storm/i.test(text) || precip >= 7.6) {
    return "rain-heavy";
  }
  if (/中雨|阵雨|shower|rain/i.test(text) || precip >= 2.5) {
    return "rain-medium";
  }
  if (/小雨|毛毛雨|细雨|light rain|drizzle/i.test(text) || precip > 0) {
    return "rain-light";
  }
  if (/大风|强风|风|wind/i.test(text) || windScale >= 5) {
    return "wind";
  }
  if (/阴|overcast/i.test(text) || icon === "104") {
    return "overcast";
  }
  if (/云|cloud/i.test(text) || ["101", "102", "103"].includes(icon)) {
    return "cloudy";
  }
  if (/晴|sunny|clear/i.test(text) || icon === "100") {
    return "sunny";
  }
  return "cloudy";
}

export async function fetchQWeatherNow({
  apiKey,
  location,
  apiHost = "https://devapi.qweather.com",
}: {
  apiKey: string;
  location: string;
  apiHost?: string;
}): Promise<QWeatherNowResult> {
  const baseUrl = apiHost.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/v7/weather/now`);
  url.searchParams.set("location", location);
  url.searchParams.set("lang", "zh");
  url.searchParams.set("unit", "m");

  const response = await fetch(url, {
    headers: {
      "X-QW-Api-Key": apiKey,
    },
  });
  if (!response.ok) {
    throw new Error(`和风天气请求失败：${response.status}`);
  }
  const payload = (await response.json()) as QWeatherNowResponse;
  if (payload.code !== "200" || !payload.now) {
    throw new Error(`和风天气返回异常：${payload.code ?? "unknown"}`);
  }
  return {
    mode: mapQWeatherNowToMode(payload.now),
    now: payload.now,
  };
}
