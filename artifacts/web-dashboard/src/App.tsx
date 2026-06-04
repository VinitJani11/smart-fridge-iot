import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useState, useRef } from "react";
import { fetchStatus, fetchHistory, type FridgeStatus, type HistoryPoint } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 14_000, refetchInterval: 15_000 } },
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/../api`;

function formatTime(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
}
function formatDateTime(iso: string | Date) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return String(iso); }
}
function toChartData(points: HistoryPoint[]) {
  return points.map(p => ({ time: formatTime(p.created_at), value: parseFloat(p.value), raw: p.created_at })).filter(p => !isNaN(p.value));
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ok ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]" : "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--destructive))]"}`} />
      {label}
    </span>
  );
}

function SensorCard({ label, value, unit, icon, status, badge, sub }: {
  label: string; value: string; unit?: string; icon: string;
  status: "ok" | "warn" | "loading"; badge?: string; sub?: string;
}) {
  const border = status === "ok" ? "border-[hsl(var(--success)/0.5)]" : status === "warn" ? "border-[hsl(var(--destructive)/0.5)]" : "border-border";
  const color = status === "warn" ? "text-[hsl(var(--destructive))]" : "text-foreground";
  return (
    <div className={`bg-card rounded-xl border-2 ${border} p-5 flex flex-col gap-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold tabular-nums ${color}`}>{value}</span>
        {unit && value !== "--" && <span className="text-base text-muted-foreground mb-0.5">{unit}</span>}
        {badge && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]">{badge}</span>}
      </div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, data, color, unit, refMin, refMax, loading }: {
  title: string; subtitle?: string; data: Array<{ time: string; value: number }>;
  color: string; unit?: string; refMin?: number; refMax?: number; loading?: boolean;
}) {
  const id = color.replace(/[^a-z0-9]/gi, "");
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {loading || data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">{loading ? "Loading…" : "No data yet"}</div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v: number) => [`${v}${unit ?? ""}`, title]}
              labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 2 }} />
            {refMin !== undefined && <ReferenceLine y={refMin} stroke="hsl(var(--warning))" strokeDasharray="4 2" strokeWidth={1.5} />}
            {refMax !== undefined && <ReferenceLine y={refMax} stroke="hsl(var(--destructive))" strokeDasharray="4 2" strokeWidth={1.5} />}
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#g-${id})`} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function AlertBanner({ status }: { status: FridgeStatus | undefined }) {
  if (!status) return null;
  const s = status.settings;
  const tempNum = parseFloat(status.temperature);
  const mangoNum = parseFloat(status.mango);
  const milkNum = parseFloat(status.milk);
  const doorOpen = status.door?.includes("OPEN");
  const issues: string[] = [];
  if (!isNaN(tempNum) && (tempNum < s.minTemp || tempNum > s.maxTemp))
    issues.push(`Temperature ${tempNum.toFixed(1)}°C outside safe range (${s.minTemp}–${s.maxTemp}°C)`);
  if (!isNaN(mangoNum) && mangoNum <= s.mangoThreshold)
    issues.push(`Mango weight low (${mangoNum}g ≤ ${s.mangoThreshold}g)`);
  if (!isNaN(milkNum) && milkNum <= s.milkThreshold)
    issues.push(`Milk supply low (${milkNum} units ≤ ${s.milkThreshold})`);
  if (doorOpen) issues.push("Fridge door is open");
  const ok = issues.length === 0 && status.temperature !== "--";
  return (
    <div className={`rounded-xl border px-5 py-4 flex items-start gap-4 ${ok ? "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.07)]" : "border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.06)]"}`}>
      <span className={`mt-0.5 text-xl ${ok ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"}`}>{ok ? "✓" : "⚠"}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${ok ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"}`}>{ok ? "All Clear — Fridge operating normally" : "Attention Required"}</p>
        {!ok && <ul className="mt-1.5 space-y-0.5">{issues.map((m, i) => <li key={i} className="text-xs text-[hsl(var(--destructive))] flex items-center gap-1.5"><span className="text-[10px]">•</span>{m}</li>)}</ul>}
        {status.alert && <p className="mt-2 text-xs text-muted-foreground">Latest alert: <span className="text-foreground">{status.alert}</span>{status.alertTime && ` · ${formatDateTime(status.alertTime)}`}</p>}
      </div>
    </div>
  );
}

function HistoryTable({ title, data, loading }: { title: string; data: HistoryPoint[]; loading?: boolean }) {
  const rows = [...data].reverse().slice(0, 30);
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border"><h3 className="font-semibold text-sm text-foreground">{title}</h3></div>
      {loading ? <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        : rows.length === 0 ? <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">No data</div>
          : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</th>
            </tr></thead>
            <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-5 py-2.5 text-muted-foreground text-xs">{formatDateTime(row.created_at)}</td>
              <td className="px-5 py-2.5 text-right font-mono font-medium text-foreground">{row.value}</td>
            </tr>)}</tbody>
          </table></div>}
    </div>
  );
}

// ── Shelves tab ───────────────────────────────────────────────────────────────
interface SimStatus {
  sensor: { temperature?: number; doorOpen?: boolean; recordedAt?: string } | null;
  shelf1: { count: number; totalCount: number; lowCount: number } | null;
  shelf2: { weightG: number; lowWeightG: number } | null;
  alerts: Array<{ level: string; message: string }>;
  unread: number;
}

function ProgressBar({ pct, level }: { pct: number; level: "ok" | "warn" | "critical" }) {
  const color = level === "critical" ? "bg-[hsl(var(--destructive))]" : level === "warn" ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--success))]";
  return (
    <div className="bg-muted rounded-full h-2.5 overflow-hidden mt-3">
      <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ShelfBadge({ label, variant }: { label: string; variant: "ok" | "warn" | "critical" }) {
  const cls = variant === "critical" ? "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]"
    : variant === "warn" ? "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]"
      : "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]";
  return <span className={`inline-block mt-3 px-3 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>;
}

function ShelvesTab() {
  const qc = useQueryClient();
  const [restockCount, setRestockCount] = useState(8);

  const { data, isLoading } = useQuery<SimStatus>({
    queryKey: ["sim-status"],
    queryFn: () => fetch(`${API}/status`).then(r => r.json()),
    refetchInterval: 3000,
    staleTime: 2000,
  });
  const { data: notifs } = useQuery<{ notifications: Array<{ id: number; message: string; level: string; createdAt: string; isRead: boolean }> }>({
    queryKey: ["sim-notifications"],
    queryFn: () => fetch(`${API}/notifications`).then(r => r.json()),
    refetchInterval: 6000,
  });

  const restock = useMutation({
    mutationFn: () => fetch(`${API}/shelf1/restock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: restockCount }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sim-status"] }); },
  });
  const markRead = useMutation({
    mutationFn: () => fetch(`${API}/notifications/read`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sim-status"] }); qc.invalidateQueries({ queryKey: ["sim-notifications"] }); },
  });

  const MAX_BOTTLES = 8;
  const MAX_WEIGHT = 1000;
  const s1 = data?.shelf1;
  const s2 = data?.shelf2;
  const sensor = data?.sensor;

  const bottles = s1?.count ?? 0;
  const maxBottles = Math.max(s1?.totalCount ?? MAX_BOTTLES, 1);
  const s1Pct = Math.min(100, (bottles / maxBottles) * 100);
  const s1Level = bottles === 0 ? "critical" : bottles <= (s1?.lowCount ?? 3) ? "warn" : "ok";

  const weight = s2?.weightG ?? 0;
  const s2Pct = Math.min(100, (weight / MAX_WEIGHT) * 100);
  const s2Level = weight === 0 ? "critical" : weight <= (s2?.lowWeightG ?? 200) ? "warn" : "ok";

  const temp = sensor?.temperature;
  const tempColor = temp == null ? "text-foreground" : temp > 8 ? "text-[hsl(var(--destructive))]" : temp > 6 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]";

  if (isLoading && !data) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading shelf data…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Active alerts */}
      {data?.alerts && data.alerts.length > 0 ? (
        <div className="space-y-2">
          {data.alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${a.level === "critical" ? "bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))]" : a.level === "warning" ? "bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))]" : "bg-[hsl(var(--chart-1)/0.1)] border border-[hsl(var(--chart-1)/0.3)] text-[hsl(var(--chart-1))]"}`}>
              <span>{a.level === "critical" ? "🔴" : a.level === "warning" ? "🟡" : "ℹ️"}</span>
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.3)] text-sm text-[hsl(var(--success))]">
          <span>✓</span> All clear — no alerts
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Shelf 1 — Milk Bottles */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Shelf 1 — Milk Bottles</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums text-foreground">{bottles}</span>
            <span className="text-base text-muted-foreground mb-1">bottles</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Button press on Arduino = 1 bottle removed</p>
          <ProgressBar pct={s1Pct} level={s1Level} />
          <ShelfBadge label={bottles === 0 ? "OUT OF STOCK" : bottles <= (s1?.lowCount ?? 3) ? "LOW STOCK" : "In stock"} variant={s1Level} />
          <div className="flex items-center gap-2 mt-4">
            <label className="text-xs text-muted-foreground">Restock to:</label>
            <input type="number" min={1} max={50} value={restockCount} onChange={e => setRestockCount(Number(e.target.value))}
              className="w-16 bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button onClick={() => restock.mutate()}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity">
              Restock
            </button>
          </div>
        </div>

        {/* Shelf 2 — Mangoes */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Shelf 2 — Mangoes</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums text-foreground">{weight}</span>
            <span className="text-base text-muted-foreground mb-1">g</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Potentiometer simulates taking mangoes</p>
          <ProgressBar pct={s2Pct} level={s2Level} />
          <ShelfBadge label={weight === 0 ? "EMPTY" : weight <= (s2?.lowWeightG ?? 200) ? "LOW WEIGHT" : "Sufficient"} variant={s2Level} />
        </div>

        {/* Environment sensors */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Environment Sensors</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">Temperature</span>
              <span className={`font-bold text-base ${tempColor}`}>{temp != null ? `${temp.toFixed(1)} °C` : "—"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">Fridge Door</span>
              <span className={`font-bold text-base ${sensor?.doorOpen ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"}`}>
                {sensor ? (sensor.doorOpen ? "OPEN ⚠" : "Closed") : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last reading</span>
              <span className="text-xs text-muted-foreground">{sensor?.recordedAt ? formatDateTime(sensor.recordedAt) : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification log */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">Alert Log</h3>
            {(data?.unread ?? 0) > 0 && (
              <span className="bg-[hsl(var(--destructive))] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {data?.unread}
              </span>
            )}
          </div>
          <button onClick={() => markRead.mutate()}
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors">
            Mark all read
          </button>
        </div>
        {!notifs?.notifications?.length ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {notifs.notifications.map((n, i) => (
              <div key={i} className={`flex items-start gap-3 px-5 py-3 transition-colors ${n.isRead ? "opacity-50" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.level === "critical" ? "bg-[hsl(var(--destructive))]" : n.level === "warning" ? "bg-[hsl(var(--warning))]" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Simulator tab ─────────────────────────────────────────────────────────────
function SimulatorTab() {
  const apiUrl = `${window.location.protocol}//${window.location.host}${BASE}/../api/sensor`;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="text-2xl mt-0.5">🔌</span>
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-sm text-foreground">Wokwi Arduino Simulator</h3>
            <p className="text-xs text-muted-foreground">
              The simulator runs your fridge Arduino code in the browser. Configure your Arduino sketch to POST sensor data to:
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono text-foreground break-all">
                {apiUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(apiUrl)}
                className="flex-shrink-0 border border-border rounded-lg px-3 py-2 text-xs hover:bg-muted transition-colors">
                Copy
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expected payload: <code className="bg-muted rounded px-1">{"{ temperature, door_open, shelf1_button_pressed, shelf2_weight_g }"}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Wokwi iframe */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Live Simulator</h3>
          <a
            href="https://wokwi.com/projects/464730115732465665"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Open in Wokwi ↗
          </a>
        </div>
        <div style={{ height: "600px" }}>
          <iframe
            src="https://wokwi.com/projects/464730115732465665?embed=1&theme=dark"
            width="100%"
            height="100%"
            style={{ border: "none", display: "block" }}
            title="Smart Fridge Wokwi Simulator"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function Dashboard() {
  const [tab, setTab] = useState<"overview" | "charts" | "shelves" | "simulator" | "history">("overview");

  const { data: status, isLoading: statusLoading, dataUpdatedAt } = useQuery({
    queryKey: ["fridge-status"],
    queryFn: fetchStatus,
  });
  const { data: tempHistory, isLoading: tempLoading } = useQuery({ queryKey: ["fridge-history", "temperature"], queryFn: () => fetchHistory("temperature", 50) });
  const { data: humHistory, isLoading: humLoading } = useQuery({ queryKey: ["fridge-history", "humidity"], queryFn: () => fetchHistory("humidity", 50) });
  const { data: mangoHistory, isLoading: mangoLoading } = useQuery({ queryKey: ["fridge-history", "mango"], queryFn: () => fetchHistory("mango", 50) });
  const { data: milkHistory, isLoading: milkLoading } = useQuery({ queryKey: ["fridge-history", "milk"], queryFn: () => fetchHistory("milk", 50) });

  const s = status?.settings;
  const tempNum = parseFloat(status?.temperature ?? "");
  const mangoNum = parseFloat(status?.mango ?? "");
  const milkNum = parseFloat(status?.milk ?? "");
  const doorOpen = status?.door?.includes("OPEN");
  const dataLoaded = status?.temperature !== "--" && !statusLoading;
  const isTempOk = !dataLoaded || isNaN(tempNum) || (tempNum >= (s?.minTemp ?? 0) && tempNum <= (s?.maxTemp ?? 8));
  const isMangoLow = dataLoaded && !isNaN(mangoNum) && mangoNum <= (s?.mangoThreshold ?? 50);
  const isMilkLow = dataLoaded && !isNaN(milkNum) && milkNum <= (s?.milkThreshold ?? 2);

  const tempData = toChartData(tempHistory?.data ?? []);
  const humData = toChartData(humHistory?.data ?? []);
  const mangoData = toChartData(mangoHistory?.data ?? []);
  const milkData = toChartData(milkHistory?.data ?? []);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "shelves", label: "Shelves", icon: "🧊" },
    { id: "simulator", label: "Simulator", icon: "⚡" },
    { id: "charts", label: "Charts", icon: "📈" },
    { id: "history", label: "History", icon: "🕒" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧊</span>
            <div>
              <h1 className="font-bold text-sm leading-tight text-foreground">Smart Fridge</h1>
              <p className="text-[10px] text-muted-foreground">VinitIOT Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dataUpdatedAt > 0 && <span className="text-xs text-muted-foreground hidden sm:block">Updated {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            <StatusBadge ok={!statusLoading && !!status} label={statusLoading ? "Connecting…" : "Live"} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {(tab === "overview") && <AlertBanner status={status} />}

        <div className="flex gap-0.5 overflow-x-auto border-b border-border pb-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <span className="text-sm">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SensorCard label="Temperature" value={status?.temperature ?? "--"} unit="°C" icon="🌡️" status={statusLoading ? "loading" : isTempOk ? "ok" : "warn"} sub={s ? `Range: ${s.minTemp}–${s.maxTemp}°C` : undefined} />
              <SensorCard label="Humidity" value={status?.humidity ?? "--"} unit="%" icon="💧" status={statusLoading ? "loading" : "ok"} />
              <SensorCard label="Mango Weight" value={status?.mango ?? "--"} unit="g" icon="🥭" status={statusLoading ? "loading" : isMangoLow ? "warn" : "ok"} badge={isMangoLow ? "Low" : undefined} sub={s ? `Alert below ${s.mangoThreshold}g` : undefined} />
              <SensorCard label="Milk Supply" value={status?.milk ?? "--"} unit=" units" icon="🥛" status={statusLoading ? "loading" : isMilkLow ? "warn" : "ok"} badge={isMilkLow ? "Low" : undefined} sub={s ? `Alert below ${s.milkThreshold} units` : undefined} />
            </div>
            <div className={`rounded-xl border-2 p-5 flex items-center gap-5 bg-card shadow-sm ${doorOpen ? "border-[hsl(var(--destructive)/0.5)]" : "border-[hsl(var(--success)/0.5)]"}`}>
              <span className="text-3xl">{doorOpen ? "🔓" : "🔒"}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Door Status</p>
                <p className={`text-2xl font-bold mt-0.5 ${doorOpen ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--success))]"}`}>{status?.door === "--" ? "--" : doorOpen ? "Open" : "Closed"}</p>
              </div>
              <div className="ml-auto text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Last reading</p>
                <p className="text-sm font-medium text-foreground">{status?.lastUpdated ? formatDateTime(status.lastUpdated) : "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Temperature (last 10)" data={tempData.slice(-10)} color="#0369a1" unit="°C" refMin={s?.minTemp} refMax={s?.maxTemp} loading={tempLoading} />
              <ChartCard title="Humidity (last 10)" data={humData.slice(-10)} color="#10b981" unit="%" loading={humLoading} />
            </div>
          </div>
        )}

        {tab === "shelves" && <ShelvesTab />}
        {tab === "simulator" && <SimulatorTab />}

        {tab === "charts" && (
          <div className="space-y-5">
            <ChartCard title="Temperature History" subtitle={`Safe range: ${s?.minTemp ?? 0}–${s?.maxTemp ?? 8}°C`} data={tempData} color="#0369a1" unit="°C" refMin={s?.minTemp} refMax={s?.maxTemp} loading={tempLoading} />
            <ChartCard title="Humidity History" data={humData} color="#10b981" unit="%" loading={humLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Mango Weight History" subtitle={`Low alert ≤ ${s?.mangoThreshold ?? 50}g`} data={mangoData} color="#f59e0b" unit="g" refMin={s?.mangoThreshold} loading={mangoLoading} />
              <ChartCard title="Milk Count History" subtitle={`Low alert ≤ ${s?.milkThreshold ?? 2} units`} data={milkData} color="#8b5cf6" unit=" units" refMin={s?.milkThreshold} loading={milkLoading} />
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-5">
            <HistoryTable title="Temperature Readings (°C)" data={tempHistory?.data ?? []} loading={tempLoading} />
            <HistoryTable title="Humidity Readings (%)" data={humHistory?.data ?? []} loading={humLoading} />
            <HistoryTable title="Mango Weight (g)" data={mangoHistory?.data ?? []} loading={mangoLoading} />
            <HistoryTable title="Milk Count (units)" data={milkHistory?.data ?? []} loading={milkLoading} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
