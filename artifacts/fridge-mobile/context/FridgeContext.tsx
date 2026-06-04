import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AIO_KEY, FEEDS, fetchHistory, fetchLastValue } from "@/constants/aio";

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
  refresh: () => void;
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

  const noKey = !AIO_KEY;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (noKey) {
      setLoading(false);
      return;
    }

    try {
      const [tData, hData, mData, milkData, doorData, alertData, hist,
             mangoThreshData, milkThreshData, minTempData, maxTempData] = await Promise.all([
        fetchLastValue(FEEDS.temperature).catch(() => ({ value: "--", created_at: "" })),
        fetchLastValue(FEEDS.humidity).catch(() => ({ value: "--", created_at: "" })),
        fetchLastValue(FEEDS.mango).catch(() => ({ value: "--", created_at: "" })),
        fetchLastValue(FEEDS.milk).catch(() => ({ value: "--", created_at: "" })),
        fetchLastValue(FEEDS.door).catch(() => ({ value: "--", created_at: "" })),
        fetchLastValue(FEEDS.alert).catch(() => ({ value: "", created_at: "" })),
        fetchHistory(FEEDS.temperature, 10).catch(() => [] as Array<{ value: string; created_at: string }>),
        fetchLastValue(FEEDS.mangoThreshold).catch(() => ({ value: "50", created_at: "" })),
        fetchLastValue(FEEDS.milkThreshold).catch(() => ({ value: "2", created_at: "" })),
        fetchLastValue(FEEDS.minTemp).catch(() => ({ value: "0", created_at: "" })),
        fetchLastValue(FEEDS.maxTemp).catch(() => ({ value: "8", created_at: "" })),
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
  }, [noKey]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return (
    <FridgeContext.Provider
      value={{
        temperature, humidity, mango, milk, door,
        alertMsg, alertTime, tempHistory, lastUpdated, loading, error, noKey, refresh,
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
