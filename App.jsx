import { useState, useMemo, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";


// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  "https://atjjcfmgzlozyxaalpfn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ampjZm1nemxvenl4YWFscGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzE5NzgsImV4cCI6MjA5Mzc0Nzk3OH0.9PbPEgwbZPHfRVoaIighm4PS1QRRxLU0s_GBa_qYdwE"
);

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_EXPENSES = [
  { label: "Gas", icon: "⛽" },
  { label: "Tolls", icon: "🛣️" },
  { label: "Food", icon: "🍔" },
  { label: "CR2 Batteries", icon: "🔋" },
  { label: "Rangefinder", icon: "🔭" },
  { label: "Lodging", icon: "🏨" },
  { label: "Gloves", icon: "🧤" },
  { label: "Rain Gear", icon: "🌧️" },
  { label: "Yardage Book", icon: "📖" },
  { label: "Caddie Bib", icon: "🦺" },
  { label: "Shoe Spikes", icon: "👟" },
  { label: "Umbrella", icon: "☂️" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const LOOP_TYPES = [
  { value: "regular", label: "Regular", color: "#16a34a", pill: "#15803d" },
  { value: "outing", label: "Outing", color: "#2563eb", pill: "#1d4ed8" },
  { value: "mg1", label: "Mem-Guest D1", color: "#9333ea", pill: "#7e22ce" },
  { value: "mg2", label: "Mem-Guest D2", color: "#c026d3", pill: "#a21caf" },
  { value: "mg3", label: "Mem-Guest D3", color: "#e11d48", pill: "#be123c" },
];
const getLT = val => LOOP_TYPES.find(t => t.value === val) || LOOP_TYPES[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => `$${Math.abs(Number(n)).toFixed(2)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const normName = s => s.trim().toLowerCase();
function displayDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${MONTHS[+m - 1]} ${+d}, ${y}`;
}
function allBags(day) {
  return (day.loops || []).flatMap(lp => lp.bags.map(b => ({ ...b, type: lp.type })));
}
function buildRoster(days) {
  const map = {};
  days.forEach(day => {
    allBags(day).forEach(b => {
      if (!b.name || !b.name.trim()) return;
      const key = normName(b.name);
      if (!map[key]) map[key] = { name: b.name.trim(), loops: 0, totalEarned: 0, totalTip: 0 };
      map[key].loops += 1;
      map[key].totalEarned += Number(b.total) || 0;
      map[key].totalTip += Number(b.tip) || 0;
    });
  });
  return Object.values(map).sort((a, b) => b.loops - a.loops);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Pill({ children, color = "#15803d" }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 20,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
      textTransform: "uppercase", background: color, color: "#fff",
      verticalAlign: "middle", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.18em",
      textTransform: "uppercase", color: "#475569",
      borderBottom: "1px solid #1a2744", paddingBottom: 7, marginBottom: 13,
    }}>{children}</div>
  );
}
function AmtInput({ value, onChange, placeholder = "0.00" }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{
        position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
        color: "#475569", fontSize: 13, pointerEvents: "none",
      }}>$</span>
      <input type="number" min="0" step="0.01" value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...S.input, paddingLeft: 20 }} />
    </div>
  );
}
function NameInput({ value, onChange, roster }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const matches = useMemo(() => {
    if (!value.trim()) return roster.slice(0, 8);
    const q = normName(value);
    return roster.filter(r => normName(r.name).includes(q)).slice(0, 8);
  }, [value, roster]);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input type="text" placeholder="Golfer name" value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={S.input} />
      {open && matches.length > 0 && (
        <div style={S.dropdown}>
          {matches.map(r => (
            <div key={r.name} onClick={() => { onChange(r.name); setOpen(false); }}
              style={S.dropdownItem}>
              <span style={{ flex: 1, fontSize: 13 }}>{r.name}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>
                {r.loops} loop{r.loops !== 1 ? "s" : ""} · avg {fmt(r.totalEarned / r.loops)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function LoopTypeSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", gap: 5 }}>
        {LOOP_TYPES.slice(0, 2).map(t => (
          <button key={t.value} onClick={() => onChange(t.value)} style={{
            ...S.typeBtn, flex: 1,
            background: value === t.value ? t.color : "transparent",
            color: value === t.value ? "#fff" : "#64748b",
            borderColor: value === t.value ? t.color : "#1e3a5f",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <span style={{
          fontSize: 9, color: "#475569", textTransform: "uppercase",
          letterSpacing: "0.1em", whiteSpace: "nowrap", flexShrink: 0, marginRight: 2,
        }}>Mem-Guest</span>
        {LOOP_TYPES.slice(2).map(t => (
          <button key={t.value} onClick={() => onChange(t.value)} style={{
            ...S.typeBtn, flex: 1, fontSize: 10, padding: "4px 4px",
            background: value === t.value ? t.color : "transparent",
            color: value === t.value ? "#fff" : "#64748b",
            borderColor: value === t.value ? t.color : "#1e3a5f",
          }}>Day {t.value.replace("mg","")}</button>
        ))}
      </div>
    </div>
  );
}

// ─── BAG ROW ─────────────────────────────────────────────────────────────────
function BagRow({ bag, bagIndex, onChange, onRemove, canRemove, roster }) {
  const rosterEntry = bag.name.trim()
    ? roster.find(r => normName(r.name) === normName(bag.name))
    : null;
  const bagTotal = (Number(bag.fee) || 0) + (Number(bag.tip) || 0);
  return (
    <div style={{
      background: "#04080f",
      border: bagIndex === 1 ? "1px dashed #44300a" : "1px dashed #1a3050",
      borderRadius: 6, padding: "10px 10px",
      marginTop: bagIndex === 1 ? 10 : 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
          color: bagIndex === 0 ? "#64748b" : "#f59e0b",
        }}>
          {bagIndex === 0 ? "🎒 Bag 1" : "🎒 Bag 2 — Double"}
        </span>
        {canRemove && (
          <button onClick={onRemove} style={{
            background: "transparent", border: "1px solid #44300a", borderRadius: 4,
            color: "#f59e0b", fontSize: 10, fontWeight: 700, cursor: "pointer",
            padding: "2px 8px", fontFamily: "'Courier New', monospace",
          }}>Remove</button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
        <div>
          <div style={S.miniLabel}>Golfer Name</div>
          <NameInput value={bag.name} onChange={v => onChange("name", v)} roster={roster} />
        </div>
        <div>
          <div style={S.miniLabel}>Caddie Fee</div>
          <AmtInput value={bag.fee} onChange={v => onChange("fee", v)} />
        </div>
        <div>
          <div style={S.miniLabel}>Tip</div>
          <AmtInput value={bag.tip} onChange={v => onChange("tip", v)} />
        </div>
      </div>
      {rosterEntry && rosterEntry.loops > 0 && (
        <div style={{ marginTop: 7, fontSize: 10, color: "#64748b" }}>
          📋 {rosterEntry.loops} prior loop{rosterEntry.loops !== 1 ? "s" : ""} · avg {fmt(rosterEntry.totalEarned / rosterEntry.loops)} · avg tip {fmt(rosterEntry.totalTip / rosterEntry.loops)}
        </div>
      )}
      {bagTotal > 0 && (
        <div style={{ marginTop: 6, textAlign: "right", fontSize: 11, color: "#94a3b8" }}>
          Bag total: {fmt(bagTotal)}
        </div>
      )}
    </div>
  );
}

// ─── LOOP BLOCK ───────────────────────────────────────────────────────────────
function LoopBlock({ loop, loopIndex, loopCount, onChange, onChangeType, onAddBag, onRemoveBag, roster }) {
  const lt = getLT(loop.type);
  const loopTotal = loop.bags.reduce((s, b) => s + (Number(b.fee)||0) + (Number(b.tip)||0), 0);
  const isDouble = loop.bags.length >= 2;
  return (
    <div style={{ ...S.golferBlock, borderColor: lt.color, marginBottom: loopIndex < loopCount - 1 ? 16 : 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center",​​​​​​​​​​​​​​​​ gap:  8 }}>
