import { useState, useEffect, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const AIO_KEY      = import.meta.env.VITE_AIO_KEY      ?? "";
const AIO_USERNAME = import.meta.env.VITE_AIO_USERNAME ?? "";
const API_BASE     = "https://io.adafruit.com/api/v2";

const FEEDS = {
  temp:       "fridge-temperature",
  humidity:   "fridge-humidity",
  mango:      "mango-weight",
  milk:       "milk-count",
  door:       "fridge-door",
  alert:      "fridge-alert",
  resetMilk:  "reset-milk",
  maxTemp:    "max-temp-setting",
  setMango:   "mango-weight-set",
};

// ── API ───────────────────────────────────────────────────────────────────────
const hdr = () => ({ "X-AIO-Key": AIO_KEY, "Content-Type": "application/json" });

const getLast = async (feed) => {
  const r = await fetch(`${API_BASE}/${AIO_USERNAME}/feeds/${feed}/data/last`, { headers: hdr() });
  if (!r.ok) throw new Error(feed);
  return r.json();
};

const getHistory = async (feed, limit = 14) => {
  const r = await fetch(`${API_BASE}/${AIO_USERNAME}/feeds/${feed}/data?limit=${limit}`, { headers: hdr() });
  if (!r.ok) throw new Error(feed);
  return r.json();
};

const postData = async (feed, value) => {
  const r = await fetch(`${API_BASE}/${AIO_USERNAME}/feeds/${feed}/data`, {
    method: "POST", headers: hdr(), body: JSON.stringify({ value }),
  });
  if (!r.ok) throw new Error(feed);
};

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, style: s = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}>
    <path d={d} />
  </svg>
);
const Thermometer = (p) => <Icon {...p} d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />;
const Droplets    = (p) => <Icon {...p} d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />;
const Scale       = (p) => <Icon {...p} d="M16 16h.01M8 16h.01M3 9l1-4h16l1 4M3 9h18M3 9a10 10 0 0 0 18 0" />;
const MilkIcon    = (p) => <Icon {...p} d="M8 2h8l1 6H7L8 2zM7 8v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8" />;
const DoorOpen    = (p) => <Icon {...p} d="M13 4H6a1 1 0 0 0-1 1v16h14V5a1 1 0 0 0-1-1h-1M13 4V2m0 2v18M9 12h.01" />;
const DoorClosed  = (p) => <Icon {...p} d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14M2 20h20M14 12h.01" />;
const AlertIcon   = (p) => <Icon {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />;
const RefreshIcon = (p) => <Icon {...p} d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />;
const ChevronDown = (p) => <Icon {...p} d="M6 9l6 6 6-6" />;
const SettingsIcon= (p) => <Icon {...p} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />;

// ── SPARKLINE ─────────────────────────────────────────────────────────────────
function Sparkline({ data, danger }) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => d.temp).filter((v) => !isNaN(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 300, H = 64;
  const pt = (v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 10) - 5;
    return `${x},${y}`;
  };
  const pts = vals.map(pt).join(" ");
  const last = vals[vals.length - 1];
  const [lx, ly] = pt(last, vals.length - 1).split(",");
  const color = danger ? "#ef4444" : "#059669";
  const area = `M0,${H} L${vals.map(pt).join(" L")} L${W},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 64, display: "block" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.5" fill={color} />
    </svg>
  );
}

// ── TEMP GAUGE ────────────────────────────────────────────────────────────────
function TempGauge({ value }) {
  const num = parseFloat(value);
  const safe = !isNaN(num);
  const pct = safe ? Math.max(0, Math.min(1, (num + 5) / 25)) : 0;
  const angle = -120 + pct * 240;
  const color = !safe ? "#d1d5db" : num < 0 ? "#3b82f6" : num <= 8 ? "#059669" : num <= 12 ? "#f59e0b" : "#ef4444";
  const R = 44, CX = 52, CY = 54;
  const arc = (deg) => { const r = (deg - 90) * Math.PI / 180; return { x: CX + R * Math.cos(r), y: CY + R * Math.sin(r) }; };
  const start = arc(-120), end = arc(angle);
  const large = pct > 0.5 ? 1 : 0;
  return (
    <svg viewBox="0 0 104 68" style={{ width: 104, height: 68 }}>
      <path d={`M${arc(-120).x},${arc(-120).y} A${R},${R} 0 1 1 ${arc(120).x},${arc(120).y}`}
        fill="none" stroke="#e5e7eb" strokeWidth="6" strokeLinecap="round" />
      {safe && (
        <path d={`M${start.x},${start.y} A${R},${R} 0 ${large} 1 ${end.x},${end.y}`}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      )}
      <text x={CX} y={CY - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {safe ? `${num.toFixed(1)}°` : "--"}
      </text>
      <text x={CX} y={CY + 5} textAnchor="middle" fontSize="7" fill="#9ca3af">TEMP °C</text>
    </svg>
  );
}

// ── METRIC CARD ───────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, unit, status, badge }) {
  const ok = status === "ok";
  const accent = ok ? "#059669" : "#ef4444";
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderTop: `3px solid ${accent}`,
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{label}</span>
        <span style={{ color: ok ? "#d1d5db" : "#f87171" }}>{icon}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: ok ? "#111827" : "#ef4444", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "#9ca3af" }}>{unit}</span>}
        {badge && (
          <span style={{ marginLeft: "auto", background: "#fef2f2", color: "#ef4444", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ── CONTROL BUTTON ────────────────────────────────────────────────────────────
function CtrlBtn({ onClick, disabled, color = "#059669", bg = "#f0fdf4", border = "#bbf7d0", children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "9px 0", borderRadius: 8,
      background: disabled ? "#f9fafb" : bg,
      border: `1px solid ${disabled ? "#e5e7eb" : border}`,
      color: disabled ? "#9ca3af" : color,
      fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.15s",
    }}>
      {children}
    </button>
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#fff1f2" : "#f0fdf4",
          border: `1px solid ${t.type === "error" ? "#fecaca" : "#bbf7d0"}`,
          color: t.type === "error" ? "#dc2626" : "#15803d",
          padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          animation: "slideIn 0.2s ease",
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 12 }}>
    {children}
  </p>
);

// ── DIVIDER ───────────────────────────────────────────────────────────────────
const Divider = () => <div style={{ borderTop: "1px solid #f3f4f6", margin: "16px 0" }} />;

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]               = useState({});
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [spinning, setSpinning]       = useState(false);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [maxTempInput, setMaxTempInput] = useState("8");
  const [mangoInput, setMangoInput]   = useState("100");
  const [sending, setSending]         = useState(false);
  const [simOpen, setSimOpen]         = useState(false);
  const [toasts, setToasts]           = useState([]);
  const [alertMsg, setAlertMsg]       = useState(null);

  const toast = (message, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const fetchAll = useCallback(async (showSpin = false) => {
    if (!AIO_KEY || !AIO_USERNAME) {
      setError("Missing VITE_AIO_KEY / VITE_AIO_USERNAME env vars.");
      setLoading(false); return;
    }
    if (showSpin) setSpinning(true);
    try {
      const [t, h, m, milk, door, alert_, hist] = await Promise.all([
        getLast(FEEDS.temp).catch(() => ({ value: "--" })),
        getLast(FEEDS.humidity).catch(() => ({ value: "--" })),
        getLast(FEEDS.mango).catch(() => ({ value: "--" })),
        getLast(FEEDS.milk).catch(() => ({ value: "--" })),
        getLast(FEEDS.door).catch(() => ({ value: "--" })),
        getLast(FEEDS.alert).catch(() => ({ value: "--", created_at: null })),
        getHistory(FEEDS.temp).catch(() => []),
      ]);
      setData({ temp: t.value, humidity: h.value, mango: m.value, milk: milk.value, door: door.value });
      if (alert_.value && alert_.value !== "--")
        setAlertMsg({ msg: alert_.value, time: alert_.created_at ? new Date(alert_.created_at).toLocaleTimeString() : "" });
      setHistory([...hist].reverse().map((d) => ({
        time: new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temp: parseFloat(d.value),
      })));
      setLastUpdated(new Date());
      setError(null);
    } catch { setError("Failed to fetch Adafruit IO data."); }
    finally { setLoading(false); setSpinning(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(() => fetchAll(), 15000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const withSending = async (fn) => { setSending(true); try { await fn(); } finally { setSending(false); } };

  const handleReset   = () => withSending(async () => { await postData(FEEDS.resetMilk, "1"); toast("Milk counter reset to 10 ✓"); fetchAll(); });
  const handleSetTemp = () => withSending(async () => { if (!maxTempInput) return; await postData(FEEDS.maxTemp, maxTempInput); toast(`Max temp set to ${maxTempInput}°C ✓`); });
  const handleSetMango= () => withSending(async () => {
    if (!mangoInput) return;
    const v = parseInt(mangoInput, 10);
    if (isNaN(v) || v < 0 || v > 500) { toast("Enter 0–500 g", "error"); return; }
    await postData(FEEDS.setMango, String(v));
    toast(`Mango weight set to ${v}g ✓`);
    fetchAll();
  });

  const tempNum  = parseFloat(data.temp);
  const mangoNum = parseFloat(data.mango);
  const milkNum  = parseFloat(data.milk);
  const isDoorOpen = (data.door ?? "").includes("OPEN");
  const isTempBad  = !isNaN(tempNum)  && (tempNum < 0 || tempNum > 8);
  const isMangoLow = !isNaN(mangoNum) && mangoNum <= 50;
  const isMilkLow  = !isNaN(milkNum)  && milkNum <= 2;
  const hasAlerts  = isTempBad || isMangoLow || isMilkLow || isDoorOpen;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Mono:wght@700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f8fafc; color: #111827; font-family: 'Plus Jakarta Sans', sans-serif; min-height: 100vh; }
    .mono { font-family: 'Space Mono', monospace; }
    @keyframes slideIn  { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:none; } }
    @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.25} }
    @keyframes spin     { to { transform:rotate(360deg); } }
    .spin { animation: spin 0.9s linear infinite; }
    input[type=number], input[type=range] { font-family: inherit; }
    input[type=number] {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
      color: #111827; padding: 8px 10px; font-size: 14px; outline: none; width: 84px;
    }
    input[type=number]:focus { border-color: #6366f1; box-shadow: 0 0 0 3px #6366f115; }
    input[type=range] {
      -webkit-appearance: none; width: 100%; height: 4px;
      background: #e5e7eb; border-radius: 99px; outline: none; cursor: pointer;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 16px; height: 16px;
      border-radius: 50%; background: #f59e0b; border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15); cursor: pointer;
    }
    button { cursor: pointer; font-family: inherit; border: none; outline: none; }
  `;

  if (loading) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #6366f1", borderRadius: "50%" }} className="spin" />
        <span style={{ color: "#9ca3af", fontSize: 12, letterSpacing: "0.08em", fontWeight: 600 }}>CONNECTING TO ADAFRUIT IO</span>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 14, padding: "28px 32px", maxWidth: 400, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <AlertIcon size={28} style={{ color: "#ef4444", display: "block", margin: "0 auto 12px" }} />
          <p style={{ color: "#ef4444", fontSize: 14 }}>{error}</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>

      {/* ── TOP NAV BAR ─────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14 }}>❄</span>
            </div>
            <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>SmartFridge</span>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>· VinitIOT</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              background: hasAlerts ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${hasAlerts ? "#fecaca" : "#bbf7d0"}`,
              color: hasAlerts ? "#dc2626" : "#15803d",
              borderRadius: 99, padding: "3px 10px",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: hasAlerts ? "#ef4444" : "#22c55e", display: "inline-block", animation: "pulseDot 2s infinite" }} />
              {hasAlerts ? "ALERT" : "NOMINAL"}
            </span>
            {lastUpdated && <span style={{ fontSize: 11, color: "#9ca3af" }}>{lastUpdated.toLocaleTimeString()}</span>}
            <button onClick={() => fetchAll(true)} style={{
              background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "6px 12px", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
            }}>
              <span className={spinning ? "spin" : ""} style={{ display: "flex" }}><RefreshIcon size={14} /></span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "24px 20px 64px" }}>

        {/* ── ALERT BANNER ──────────────────────────────────────────────────── */}
        {hasAlerts && (
          <div style={{
            background: "#fff5f5", border: "1px solid #fecaca", borderLeft: "4px solid #ef4444",
            borderRadius: 10, padding: "14px 18px", marginBottom: 20,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <AlertIcon size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Attention Required</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px" }}>
                {isTempBad  && <span style={{ fontSize: 13, color: "#b91c1c" }}>⚠ Temperature out of safe range ({data.temp}°C)</span>}
                {isMangoLow && <span style={{ fontSize: 13, color: "#b91c1c" }}>⚠ Mango weight low ({data.mango}g)</span>}
                {isMilkLow  && <span style={{ fontSize: 13, color: "#b91c1c" }}>⚠ Milk running low ({data.milk} units)</span>}
                {isDoorOpen && <span style={{ fontSize: 13, color: "#b91c1c" }}>⚠ Door is open</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── METRIC CARDS ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard icon={<Thermometer size={16} />} label="Temperature" value={isNaN(tempNum) ? "--" : tempNum.toFixed(1)} unit="°C" status={isTempBad ? "warn" : "ok"} />
          <MetricCard icon={<Droplets size={16} />}    label="Humidity"    value={data.humidity ?? "--"} unit="%" status="ok" />
          <MetricCard icon={<Scale size={16} />}       label="Mangoes"     value={isNaN(mangoNum) ? "--" : mangoNum} unit="g" status={isMangoLow ? "warn" : "ok"} badge={isMangoLow ? "LOW" : null} />
          <MetricCard icon={<MilkIcon size={16} />}    label="Milk"        value={isNaN(milkNum) ? "--" : milkNum} unit="units" status={isMilkLow ? "warn" : "ok"} badge={isMilkLow ? "LOW" : null} />
          <MetricCard icon={isDoorOpen ? <DoorOpen size={16} /> : <DoorClosed size={16} />} label="Door" value={isDoorOpen ? "OPEN" : "CLOSED"} status={isDoorOpen ? "warn" : "ok"} />
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: 16, marginBottom: 16 }}>

          {/* Temperature chart card */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <SectionLabel>Temperature History</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
              <TempGauge value={data.temp} />
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
                <div>Safe range: <strong style={{ color: "#111827" }}>0 – 8°C</strong></div>
                <div>{history.length} readings logged</div>
                <div style={{ marginTop: 4, display: "flex", gap: 12 }}>
                  {history.length > 0 && <>
                    <span>Min: <strong style={{ color: "#3b82f6" }}>{Math.min(...history.map(d => d.temp)).toFixed(1)}°</strong></span>
                    <span>Max: <strong style={{ color: "#ef4444" }}>{Math.max(...history.map(d => d.temp)).toFixed(1)}°</strong></span>
                  </>}
                </div>
              </div>
            </div>
            {history.length > 1 ? (
              <>
                <Sparkline data={history} danger={isTempBad} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{history[0]?.time}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{history[Math.floor(history.length / 2)]?.time}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{history[history.length - 1]?.time}</span>
                </div>
              </>
            ) : (
              <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No history yet</div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Latest alert */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <SectionLabel>Latest System Alert</SectionLabel>
              {alertMsg ? (
                <>
                  <p style={{ fontSize: 13, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>{alertMsg.msg}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af" }}>{alertMsg.time}</p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No recent alerts</p>
              )}
            </div>

            {/* Device controls */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px", flex: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <SettingsIcon size={13} style={{ color: "#9ca3af" }} />
                <SectionLabel>Device Controls</SectionLabel>
              </div>

              {/* Milk reset */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 2 }}>Reset Milk Counter</p>
                <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>Resets to 10 when restocked.</p>
                <CtrlBtn onClick={handleReset} disabled={sending} color="#15803d" bg="#f0fdf4" border="#bbf7d0">
                  {sending ? "Sending…" : "🥛 Reset to 10"}
                </CtrlBtn>
              </div>

              {/* Mango weight control */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 2 }}>Set Mango Weight</p>
                <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>Send a new weight (0–500g) to the device.</p>
                {/* Slider */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>0g</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{mangoInput}g</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>500g</span>
                  </div>
                  <input type="range" min="0" max="500" step="5"
                    value={mangoInput}
                    onChange={(e) => setMangoInput(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={mangoInput} min="0" max="500"
                    onChange={(e) => setMangoInput(e.target.value)} placeholder="e.g. 200" />
                  <button onClick={handleSetMango} disabled={sending} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    background: sending ? "#f9fafb" : "#fffbeb",
                    border: `1px solid ${sending ? "#e5e7eb" : "#fde68a"}`,
                    color: sending ? "#9ca3af" : "#92400e",
                    fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  }}>
                    {sending ? "Sending…" : "🥭 Update"}
                  </button>
                </div>
              </div>

              {/* Max temp */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 2 }}>Max Temp Threshold</p>
                <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>Alert triggers above this °C.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={maxTempInput} onChange={(e) => setMaxTempInput(e.target.value)} placeholder="8" />
                  <button onClick={handleSetTemp} disabled={sending || !maxTempInput} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    background: sending ? "#f9fafb" : "#eff6ff",
                    border: `1px solid ${sending ? "#e5e7eb" : "#bfdbfe"}`,
                    color: sending ? "#9ca3af" : "#1d4ed8",
                    fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  }}>
                    {sending ? "Sending…" : "🌡 Update"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── WOKWI SIMULATION (collapsible, simulation-only) ───────────────── */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, marginBottom: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <button
            onClick={() => setSimOpen((v) => !v)}
            style={{
              width: "100%", background: "none", padding: "16px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              color: "#374151", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: simOpen ? "#22c55e" : "#d1d5db" }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Live Circuit Simulation</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 99, letterSpacing: "0.06em" }}>WOKWI</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a
                href="https://wokwi.com/projects/464730115732465665"
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 11, color: "#6b7280", textDecoration: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontWeight: 500 }}
              >
                ↗ Open full
              </a>
              <span style={{ color: "#9ca3af", transform: simOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s", display: "flex" }}>
                <ChevronDown size={16} />
              </span>
            </div>
          </button>

          <div style={{ height: simOpen ? 560 : 0, overflow: "hidden", transition: "height 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
            <div style={{ position: "relative", height: 560, borderTop: "1px solid #e5e7eb" }}>
              {/* simulatorOnly=1 hides code + JSON + all file tabs (Wokwi Plus feature) */}
              <iframe
                src="https://wokwi.com/projects/464730115732465665?embed=1&theme=light&simulatorOnly=1"
                title="Smart Fridge Wokwi Simulation"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="fullscreen"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <SectionLabel>How It Works</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px 28px" }}>
            {[
              { color: "#3b82f6", label: "Temp & Humidity",  desc: "DHT22 sensor. Alerts above your set threshold (default 8°C)." },
              { color: "#f59e0b", label: "Mango Weight",     desc: "Potentiometer → 0–500g scale. Alert below 50g. Control via dashboard." },
              { color: "#38bdf8", label: "Milk Counter",     desc: "Push button per carton taken. Alert at ≤2 units." },
              { color: "#f97316", label: "Door Sensor",      desc: "Slide switch. Alert if open more than 30 seconds." },
              { color: "#ef4444", label: "Red LED + Buzzer", desc: "ON when any alert is active." },
              { color: "#22c55e", label: "Green LED",        desc: "ON when all conditions are normal." },
            ].map(({ color, label, desc }) => (
              <div key={label} style={{ display: "flex", gap: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 32, fontWeight: 500, letterSpacing: "0.06em" }}>
          VINITIOT CONTROL ROOM · ADAFRUIT IO · AUTO-REFRESH 15s
        </p>
      </div>

      <Toast toasts={toasts} />
    </>
  );
}
