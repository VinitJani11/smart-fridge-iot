import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { FEEDS } from "@/constants/aio";
import { getStoredAioKey, getStoredAioUsername } from "@/constants/storage";

const API_BASE = "https://io.adafruit.com/api/v2";

async function fetchLast(feedKey: string, aioKey: string, username: string) {
  const res = await fetch(`${API_BASE}/${username}/feeds/${feedKey}/data/last`, {
    headers: { "X-AIO-Key": aioKey },
  });
  if (!res.ok) throw new Error(`${feedKey}: ${res.status}`);
  return res.json() as Promise<{ value: string; created_at: string }>;
}

async function fetchHist(feedKey: string, limit: number, aioKey: string, username: string) {
  const res = await fetch(`${API_BASE}/${username}/feeds/${feedKey}/data?limit=${limit}`, {
    headers: { "X-AIO-Key": aioKey },
  });
  if (!res.ok) throw new Error(`${feedKey} history: ${res.status}`);
  return res.json() as Promise<Array<{ value: string; created_at: string }>>;
}

export async function sendValueWithKey(feedKey: string, value: string, aioKey: string, username: string) {
  const res = await fetch(`${API_BASE}/${username}/feeds/${feedKey}/data`, {
    method: "POST",
    headers: { "X-AIO-Key": aioKey, "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`send ${feedKey}: ${res.status}`);
}

export type FridgeData = {
  temperature: string;
  humidity: string;
  mango: string;
  milk: string;
  door: string;
  alertMsg: string;
  alertTime: string;
  tempHistory: Array<{ time: string; temp: number }>;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  noKey: boolean;
  aioKey: string;
  aioUsername: string;
  refresh: () => void;
  reloadKey: () => Promise<void>;
  mangoThreshold: number;
  milkThreshold: number;
  minTemp: number;
  maxTemp: number;
};

const FridgeContext = createContext<FridgeData | null>(null);

export function FridgeProvider({ children }: { children: React.ReactNode }) {
  const [temperature, setTemperature] = useState<string>("--");
  const [humidity, setHumidity] = useState<string>("--");
  const [mango, setMango] = useState<string>("--");
  const [milk, setMilk] = useState<string>("--");
  const [door, setDoor] = useState<string>("--");
  const [alertMsg, setAlertMsg] = useState<string>("");
  const [alertTime, setAlertTime] = useState<string>("");
  const [tempHistory, setTempHistory] = useState<Array<{ time: string; temp: number }>>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mangoThreshold, setMangoThreshold] = useState<number>(50);
  const [milkThreshold, setMilkThreshold] = useState<number>(2);
  const [minTemp, setMinTemp] = useState<number>(0);
  const [maxTemp, setMaxTemp] = useState<number>(8);
  const [aioKey, setAioKey] = useState<string>("");
  const [aioUsername, setAioUsername] = useState<string>("VinitIOT");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyRef = useRef<string>("");
  const usernameRef = useRef<string>("VinitIOT");

  const noKey = !aioKey;

  const reloadKey = useCallback(async () => {
    const k = await getStoredAioKey();
    const u = await getStoredAioUsername();
    keyRef.current = k;
    usernameRef.current = u;
    setAioKey(k);
    setAioUsername(u);
  }, []);

  const refresh = useCallback(async () => {
    const k = keyRef.current;
    const u = usernameRef.current;
    if (!k) {
      setLoading(false);
      return;
    }

    try {
      const [tData, hData, mData, milkData, doorData, alertData, hist,
             mangoThreshData, milkThreshData, minTempData, maxTempData] = await Promise.all([
        fetchLast(FEEDS.temperature, k, u).catch(() => ({ value: "--", created_at: "" })),
        fetchLast(FEEDS.humidity, k, u).catch(() => ({ value: "--", created_at: "" })),
        fetchLast(FEEDS.mango, k, u).catch(() => ({ value: "--", created_at: "" })),
        fetchLast(FEEDS.milk, k, u).catch(() => ({ value: "--", created_at: "" })),
        fetchLast(FEEDS.door, k, u).catch(() => ({ value: "--", created_at: "" })),
        fetchLast(FEEDS.alert, k, u).catch(() => ({ value: "", created_at: "" })),
        fetchHist(FEEDS.temperature, 10, k, u).catch(() => [] as Array<{ value: string; created_at: string }>),
        fetchLast(FEEDS.mangoThreshold, k, u).catch(() => ({ value: "50", created_at: "" })),
        fetchLast(FEEDS.milkThreshold, k, u).catch(() => ({ value: "2", created_at: "" })),
        fetchLast(FEEDS.minTemp, k, u).catch(() => ({ value: "0", created_at: "" })),
        fetchLast(FEEDS.maxTemp, k, u).catch(() => ({ value: "8", created_at: "" })),
      ]);

      setTemperature(tData.value);
      setHumidity(hData.value);
      setMango(mData.value);
      setMilk(milkData.value);
      setDoor(doorData.value);

      const parsedMangoThresh = parseFloat(mangoThreshData.value);
      if (!isNaN(parsedMangoThresh)) setMangoThreshold(parsedMangoThresh);

      const parsedMilkThresh = parseFloat(milkThreshData.value);
      if (!isNaN(parsedMilkThresh)) setMilkThreshold(parsedMilkThresh);

      const parsedMinTemp = parseFloat(minTempData.value);
      if (!isNaN(parsedMinTemp)) setMinTemp(parsedMinTemp);

      const parsedMaxTemp = parseFloat(maxTempData.value);
      if (!isNaN(parsedMaxTemp)) setMaxTemp(parsedMaxTemp);

      if (alertData.value) {
        setAlertMsg(alertData.value);
        setAlertTime(alertData.created_at ? new Date(alertData.created_at).toLocaleTimeString() : "");
      }

      if (hist.length > 0) {
        setTempHistory(
          [...hist].reverse().map((d) => ({
            time: new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            temp: parseFloat(d.value),
          }))
        );
      }

      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError("Could not reach Adafruit IO.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadKey().then(() => {
      refresh();
      intervalRef.current = setInterval(refresh, 15000);
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [reloadKey, refresh]);

  return (
    <FridgeContext.Provider
      value={{
        temperature, humidity, mango, milk, door,
        alertMsg, alertTime, tempHistory, lastUpdated, loading, error,
        noKey, aioKey, aioUsername, refresh, reloadKey,
        mangoThreshold, milkThreshold, minTemp, maxTemp,
      }}
    >
      {children}
    </FridgeContext.Provider>
  );
}

export function useFridge() {
  const ctx = useContext(FridgeContext);
  if (!ctx) throw new Error("useFridge must be used within FridgeProvider");
  return ctx;
}
