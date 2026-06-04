const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface FridgeStatus {
  temperature: string;
  humidity: string;
  mango: string;
  milk: string;
  door: string;
  alert: string;
  alertTime: string;
  lastUpdated: string;
  settings: {
    maxTemp: number;
    minTemp: number;
    mangoThreshold: number;
    milkThreshold: number;
  };
}

export interface HistoryPoint {
  value: string;
  created_at: string;
}

export interface FridgeHistory {
  feed: string;
  data: HistoryPoint[];
}

export async function fetchStatus(): Promise<FridgeStatus> {
  const res = await fetch(`${BASE}/../api/fridge/status`);
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.status}`);
  return res.json();
}

export async function fetchHistory(feed: string, limit = 50): Promise<FridgeHistory> {
  const res = await fetch(`${BASE}/../api/fridge/history/${feed}?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  return res.json();
}

export async function sendAioValue(feed: string, value: string): Promise<void> {
  const res = await fetch(`${BASE}/../api/fridge/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feed, value }),
  });
  if (!res.ok) throw new Error(`Failed to send value: ${res.status}`);
}
