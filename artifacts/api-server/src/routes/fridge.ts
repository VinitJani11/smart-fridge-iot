import { Router } from "express";

const router = Router();

const AIO_KEY = process.env.EXPO_PUBLIC_AIO_KEY ?? "";
const AIO_USERNAME = process.env.EXPO_PUBLIC_AIO_USERNAME ?? "VinitIOT";
const API_BASE = "https://io.adafruit.com/api/v2";

const FEED_KEYS = {
  temperature: "fridge-temperature",
  humidity: "fridge-humidity",
  mango: "mango-weight",
  milk: "milk-count",
  door: "fridge-door",
  alert: "fridge-alert",
  maxTemp: "max-temp-setting",
  minTemp: "min-temp-setting",
  mangoThreshold: "mango-threshold",
  milkThreshold: "milk-threshold",
} as const;

type FeedName = keyof typeof FEED_KEYS;

async function aioFetch(path: string) {
  const res = await fetch(`${API_BASE}/${AIO_USERNAME}${path}`, {
    headers: { "X-AIO-Key": AIO_KEY },
  });
  if (!res.ok) throw new Error(`AIO ${res.status}: ${path}`);
  return res.json() as Promise<Record<string, unknown>>;
}

router.get("/fridge/status", async (req, res) => {
  try {
    const [temp, hum, mango, milk, door, alert, maxTemp, minTemp, mangoThresh, milkThresh] =
      await Promise.all([
        aioFetch(`/feeds/${FEED_KEYS.temperature}/data/last`).catch(() => ({ value: "--", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.humidity}/data/last`).catch(() => ({ value: "--", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.mango}/data/last`).catch(() => ({ value: "--", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.milk}/data/last`).catch(() => ({ value: "--", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.door}/data/last`).catch(() => ({ value: "--", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.alert}/data/last`).catch(() => ({ value: "", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.maxTemp}/data/last`).catch(() => ({ value: "8", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.minTemp}/data/last`).catch(() => ({ value: "0", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.mangoThreshold}/data/last`).catch(() => ({ value: "50", created_at: "" })),
        aioFetch(`/feeds/${FEED_KEYS.milkThreshold}/data/last`).catch(() => ({ value: "2", created_at: "" })),
      ]);

    res.json({
      temperature: temp.value,
      humidity: hum.value,
      mango: mango.value,
      milk: milk.value,
      door: door.value,
      alert: alert.value,
      alertTime: alert.created_at,
      lastUpdated: temp.created_at || new Date().toISOString(),
      settings: {
        maxTemp: parseFloat(maxTemp.value as string) || 8,
        minTemp: parseFloat(minTemp.value as string) || 0,
        mangoThreshold: parseFloat(mangoThresh.value as string) || 50,
        milkThreshold: parseFloat(milkThresh.value as string) || 2,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch fridge status");
    res.status(500).json({ error: "Failed to fetch fridge status" });
  }
});

router.get("/fridge/history/:feed", async (req, res) => {
  const feedName = req.params.feed as FeedName;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  const feedKey = FEED_KEYS[feedName];
  if (!feedKey) {
    res.status(400).json({ error: `Unknown feed: ${feedName}` });
    return;
  }

  try {
    const raw = await aioFetch(`/feeds/${feedKey}/data?limit=${limit}`);
    const data = (Array.isArray(raw) ? raw : []) as Array<{ value: string; created_at: string }>;
    res.json({ feed: feedName, data: data.reverse() });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch fridge history");
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.post("/fridge/send", async (req, res) => {
  const { feed, value } = req.body as { feed?: string; value?: string };
  const feedName = feed as FeedName | undefined;
  if (!feedName || value === undefined) {
    res.status(400).json({ error: "feed and value are required" });
    return;
  }
  const feedKey = FEED_KEYS[feedName];
  if (!feedKey) {
    res.status(400).json({ error: `Unknown feed: ${feedName}` });
    return;
  }
  try {
    const result = await aioFetch(`/feeds/${feedKey}/data`) as unknown;
    // aioFetch only does GET; do a POST manually
    const r = await fetch(`${API_BASE}/${AIO_USERNAME}/feeds/${feedKey}/data`, {
      method: "POST",
      headers: { "X-AIO-Key": AIO_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!r.ok) throw new Error(`AIO POST ${r.status}`);
    void result;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to send fridge value");
    res.status(500).json({ error: "Failed to send value" });
  }
});

export default router;
