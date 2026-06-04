export const AIO_KEY = process.env.EXPO_PUBLIC_AIO_KEY ?? "";
export const AIO_USERNAME = process.env.EXPO_PUBLIC_AIO_USERNAME ?? "VinitIOT";
export const API_BASE = "https://io.adafruit.com/api/v2";

export const FEEDS = {
  temperature: "fridge-temperature",
  humidity: "fridge-humidity",
  mango: "mango-weight",
  milk: "milk-count",
  door: "fridge-door",
  alert: "fridge-alert",
  maxTemp: "max-temp-setting",
  minTemp: "min-temp-setting",
  resetMilk: "reset-milk",
  mangoThreshold: "mango-threshold",
  milkThreshold: "milk-threshold",
} as const;

export async function fetchLastValue(feedKey: string): Promise<{ value: string; created_at: string }> {
  const res = await fetch(`${API_BASE}/${AIO_USERNAME}/feeds/${feedKey}/data/last`, {
    headers: { "X-AIO-Key": AIO_KEY },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${feedKey}: ${res.status}`);
  return res.json();
}

export async function fetchHistory(feedKey: string, limit = 10): Promise<Array<{ value: string; created_at: string }>> {
  const res = await fetch(`${API_BASE}/${AIO_USERNAME}/feeds/${feedKey}/data?limit=${limit}`, {
    headers: { "X-AIO-Key": AIO_KEY },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${feedKey} history: ${res.status}`);
  return res.json();
}

export async function sendValue(feedKey: string, value: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${AIO_USERNAME}/feeds/${feedKey}/data`, {
    method: "POST",
    headers: { "X-AIO-Key": AIO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`Failed to send to ${feedKey}: ${res.status}`);
}
