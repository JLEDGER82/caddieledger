import { useState, useMemo, useRef, useEffect } from "react";

// ─── Persistence ──────────────────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const DAYS_KEY = "cl_days_v4";
const EXP_KEY  = "cl_expenses_v4";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_EXPENSES = [
  { label: "Gas",           icon: "⛽" },
  { label: "Tolls",         icon: "🛣️" },
  { label: "Food",          icon: "🍔" },
  { label: "CR2 Batteries", icon: "🔋" },
  { label: "Rangefinder",   icon: "🔭" },
  { label: "Lodging",       icon: "🏨" },
  { label: "Gloves",        icon: "🧤" },
  { label: "Rain Gear",     icon: "🌧️" },
  { label: "Yardage Book",  icon: "📖" },
  { label: "Caddie Bib",    icon: "🦺" },
  { label: "Shoe Spikes",   icon: "👟" },
  { label: "Umbrella",      icon: "☂️" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const LOOP_TYPES = [
  { value: "regular", label: "Regular",      color: "#16a34a", pill: "#15803d" },
  { value: "outing",  label: "Outing",       color: "#2563eb", pill: "#1d4ed8" },
  { value: "mg1",     label: "Mem-Guest D1", color: "#9333ea", pill: "#7e22ce" },
  { value: "mg2",     label: "Mem-Guest D2", color: "#c026d3", pill: "#a21caf" },
  { value: "mg3",     label: "Mem-Guest D3", color: "#e11d48", pill: "#be123c" },
];

const getLT = val => LOOP_TYPES.find(t => t.value === val) || LOOP_TYPES[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt      = n  => `$${Math.abs(Number(n)).toFixed(2)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid      = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const normName = s  => s.trim().toLowerCase();

function displayDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${MONTHS[+m - 1]} ${+d}, ${y}`;
}

// Each saved day has: { id, date, loops: [{ id, type, bags: [{id,name,fee,tip,total}] }] }
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
      map[key].loops       += 1;
      map[key].totalEarned += Number(b.total) || 0;
      map[key].totalTip    += Number(b.tip)   || 0;
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
            background:  value === t.value ? t.color : "transparent",
            color:       value === t.value ? "#fff"  : "#64748b",
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
            background:  value === t.value ? t.color : "transparent",
            color:       value === t.value ? "#fff"  : "#64748b",
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
      borderRadius: 6,
      padding: "10px 10px",
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
  const isDouble  = loop.bags.length >= 2;
  return (
    <div style={{ ...S.golferBlock, borderColor: lt.color, marginBottom: loopIndex < loopCount - 1 ? 16 : 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: "0.14em" }}>
            LOOP {loopIndex + 1}
          </span>
          {isDouble && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: "#f59e0b",
              background: "#1c1000", border: "1px solid #44300a",
              borderRadius: 20, padding: "1px 8px", letterSpacing: "0.08em",
            }}>DOUBLE BAG</span>
          )}
        </div>
        {loopTotal > 0 && (
          <span style={{ fontSize: 13, fontWeight: 800, color: "#facc15" }}>{fmt(loopTotal)}</span>
        )}
      </div>

      {/* Type */}
      <div style={{ marginBottom: 12 }}>
        <LoopTypeSelector value={loop.type} onChange={onChangeType} />
      </div>

      {/* Bags */}
      {loop.bags.map((bag, bi) => (
        <BagRow
          key={bag.id}
          bag={bag}
          bagIndex={bi}
          onChange={(field, val) => onChange(loopIndex, bi, field, val)}
          onRemove={() => onRemoveBag(loopIndex, bi)}
          canRemove={bi === 1}
          roster={roster}
        />
      ))}

      {/* Add 2nd bag */}
      {!isDouble && (
        <button onClick={() => onAddBag(loopIndex)} style={{
          width: "100%", marginTop: 10, padding: "8px",
          border: "1px dashed #44300a", borderRadius: 6,
          background: "transparent", color: "#f59e0b",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
          letterSpacing: "0.08em", fontFamily: "'Courier New', monospace",
        }}>
          + Add 2nd Bag (Double)
        </button>
      )}
    </div>
  );
}

// ─── LOG DAY ──────────────────────────────────────────────────────────────────
function LogDay({ days, setDays, roster }) {
  const blankBag  = () => ({ id: uid(), name: "", fee: "", tip: "" });
  const blankLoop = () => ({ id: uid(), type: "regular", bags: [blankBag()] });

  const [date,  setDate]  = useState(todayStr);
  const [loops, setLoops] = useState([blankLoop()]);
  const [count, setCount] = useState(1);
  const [flash, setFlash] = useState(false);

  function syncCount(n) {
    setCount(n);
    setLoops(prev => {
      const next = [...prev];
      while (next.length < n) next.push(blankLoop());
      return next.slice(0, n);
    });
  }

  function updBag(li, bi, field, val) {
    setLoops(prev => prev.map((lp, i) => i !== li ? lp : {
      ...lp, bags: lp.bags.map((b, j) => j !== bi ? b : { ...b, [field]: val }),
    }));
  }

  function updType(li, val) {
    setLoops(prev => prev.map((lp, i) => i !== li ? lp : { ...lp, type: val }));
  }

  function addBag(li) {
    setLoops(prev => prev.map((lp, i) => i !== li ? lp : {
      ...lp, bags: [...lp.bags, blankBag()],
    }));
  }

  function removeBag(li, bi) {
    setLoops(prev => prev.map((lp, i) => i !== li ? lp : {
      ...lp, bags: lp.bags.filter((_, j) => j !== bi),
    }));
  }

  function save() {
    const activeLoops = loops.slice(0, count);
    const hasData = activeLoops.some(lp =>
      lp.bags.some(b => b.name.trim() || Number(b.fee) || Number(b.tip))
    );
    if (!hasData) return;

    const savedLoops = activeLoops.map(lp => ({
      ...lp,
      bags: lp.bags
        .filter(b => b.name.trim() || Number(b.fee) || Number(b.tip))
        .map(b => ({
          ...b,
          name:  b.name.trim(),
          fee:   Number(b.fee)  || 0,
          tip:   Number(b.tip)  || 0,
          total: (Number(b.fee) || 0) + (Number(b.tip) || 0),
        })),
    })).filter(lp => lp.bags.length > 0);

    const entry = { id: uid(), date, loops: savedLoops };
    const updated = [entry, ...days].sort((a, b) => b.date.localeCompare(a.date));
    setDays(updated);
    LS.set(DAYS_KEY, updated);
    setLoops([blankLoop()]); setCount(1); setDate(todayStr());
    setFlash(true); setTimeout(() => setFlash(false), 2200);
  }

  const dayTotal = loops.slice(0, count).reduce((s, lp) =>
    s + lp.bags.reduce((bs, b) => bs + (Number(b.fee)||0) + (Number(b.tip)||0), 0), 0);

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>Log a Day</h2>

      <SectionTitle>Date</SectionTitle>
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        style={{ ...S.input, marginBottom: 20 }} />

      <SectionTitle>Number of Loops</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[1,2,3,4].map(n => (
          <button key={n} onClick={() => syncCount(n)} style={{
            ...S.countBtn,
            background:  count === n ? "#facc15" : "#0a1525",
            color:       count === n ? "#080e1a" : "#64748b",
            borderColor: count === n ? "#facc15" : "#1e3a5f",
          }}>{n}</button>
        ))}
      </div>

      <SectionTitle>Loop Details</SectionTitle>
      {loops.slice(0, count).map((lp, li) => (
        <LoopBlock
          key={lp.id}
          loop={lp}
          loopIndex={li}
          loopCount={count}
          onChange={updBag}
          onChangeType={v => updType(li, v)}
          onAddBag={addBag}
          onRemoveBag={removeBag}
          roster={roster}
        />
      ))}

      {dayTotal > 0 && (
        <div style={S.totalPreview}>
          <span style={{ color: "#475569", fontSize: 12 }}>Day Total</span>
          <span style={{ color: "#facc15", fontWeight: 800, fontSize: 22 }}>{fmt(dayTotal)}</span>
        </div>
      )}

      <button onClick={save} style={{
        ...S.primaryBtn,
        background: flash ? "#15803d" : "#22c55e",
        color:      flash ? "#d1fae5" : "#080e1a",
      }}>
        {flash ? "✓ Day Saved!" : "Save Day"}
      </button>
    </div>
  );
}

// ─── GOLFER ROSTER ────────────────────────────────────────────────────────────
function GolferRoster({ roster }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return roster;
    const q = normName(search);
    return roster.filter(r => normName(r.name).includes(q));
  }, [roster, search]);

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>Golfer Roster</h2>
      {roster.length === 0 ? (
        <p style={{ color: "#475569", textAlign: "center", marginTop: 48, fontSize: 14 }}>
          No golfers logged yet.
        </p>
      ) : (
        <>
          <input type="text" placeholder="Search golfers…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...S.input, marginBottom: 16 }} />
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, letterSpacing: "0.08em" }}>
            {roster.length} golfer{roster.length !== 1 ? "s" : ""} · ranked by loops caddied
          </div>
          {filtered.map((r, i) => {
            const avg     = r.totalEarned / r.loops;
            const avgTip  = r.totalTip    / r.loops;
            const maxE    = filtered[0]?.totalEarned || 1;
            const rankBg  = i < 3 ? ["#facc15","#94a3b8","#b45309"][i] : "#1a2744";
            const rankClr = i < 3 ? "#080e1a" : "#475569";
            return (
              <div key={r.name} style={S.rosterRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: rankBg, color: rankClr,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0", flex: 1 }}>{r.name}</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#facc15" }}>{fmt(r.totalEarned)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                  {[["Loops", r.loops], ["Avg/Loop", fmt(avg)], ["Avg Tip", fmt(avgTip)], ["Total", fmt(r.totalEarned)]].map(([l, v]) => (
                    <div key={l} style={S.rosterStat}>
                      <div style={{ fontSize: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: "#1a2744" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: "#facc15", width: `${Math.round((r.totalEarned / maxE) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────
function Expenses({ expenses, setExpenses }) {
  const [pending, setPending]       = useState([]);
  const [prompt, setPrompt]         = useState(null);
  const [promptAmt, setPromptAmt]   = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customAmt, setCustomAmt]   = useState("");
  const [expDate, setExpDate]       = useState(todayStr);
  const [flash, setFlash]           = useState(false);

  function openPreset(item) { setPrompt(item); setPromptAmt(""); }
  function confirmPreset() {
    if (!promptAmt) return;
    setPending(p => [...p, { id: uid(), label: prompt.label, icon: prompt.icon, amount: Number(promptAmt) }]);
    setPrompt(null); setPromptAmt("");
  }
  function addCustom() {
    if (!customDesc.trim() || !customAmt) return;
    setPending(p => [...p, { id: uid(), label: customDesc.trim(), icon: "📝", amount: Number(customAmt) }]);
    setCustomDesc(""); setCustomAmt("");
  }
  function removePending(id) { setPending(p => p.filter(x => x.id !== id)); }
  function savePending() {
    if (!pending.length) return;
    const entries = pending.map(p => ({ ...p, date: expDate, id: uid() }));
    const updated = [...entries, ...expenses].sort((a, b) => b.date.localeCompare(a.date));
    setExpenses(updated); LS.set(EXP_KEY, updated);
    setPending([]);
    setFlash(true); setTimeout(() => setFlash(false), 2200);
  }
  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>Expenses</h2>
      {prompt && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{prompt.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18, color: "#e2e8f0" }}>{prompt.label}</div>
            <AmtInput value={promptAmt} onChange={setPromptAmt} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setPrompt(null)} style={{ ...S.primaryBtn, flex: 1, background: "#1a2744", color: "#64748b" }}>Cancel</button>
              <button onClick={confirmPreset} style={{ ...S.primaryBtn, flex: 1, background: "#ef4444", color: "#fff" }}>Add</button>
            </div>
          </div>
        </div>
      )}

      <SectionTitle>Date for these expenses</SectionTitle>
      <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
        style={{ ...S.input, marginBottom: 20 }} />

      <SectionTitle>Quick Add</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 22 }}>
        {PRESET_EXPENSES.map(item => (
          <button key={item.label} onClick={() => openPreset(item)} style={S.presetBtn}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, color: "#64748b", marginTop: 4, lineHeight: 1.2, textAlign: "center" }}>{item.label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Custom Expense</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, marginBottom: 10 }}>
        <input type="text" placeholder="Description" value={customDesc}
          onChange={e => setCustomDesc(e.target.value)} style={S.input} />
        <AmtInput value={customAmt} onChange={setCustomAmt} />
      </div>
      <button onClick={addCustom} style={{ ...S.primaryBtn, background: "#1e3a5f", color: "#93c5fd", marginBottom: 24, fontSize: 12 }}>
        + Add to Pending
      </button>

      {pending.length > 0 && (
        <>
          <SectionTitle>Pending — Review Before Saving ({pending.length})</SectionTitle>
          {pending.map(p => (
            <div key={p.id} style={S.pendingRow}>
              <span style={{ fontSize: 17 }}>{p.icon}</span>
              <span style={{ flex: 1, fontSize: 14, color: "#e2e8f0" }}>{p.label}</span>
              <span style={{ fontWeight: 800, color: "#f87171", fontSize: 14 }}>{fmt(p.amount)}</span>
              <button onClick={() => removePending(p.id)} style={S.xBtn}>✕</button>
            </div>
          ))}
          <div style={S.totalPreview}>
            <span style={{ color: "#475569", fontSize: 12 }}>Pending Total</span>
            <span style={{ color: "#f87171", fontWeight: 800, fontSize: 20 }}>{fmt(pendingTotal)}</span>
          </div>
          <button onClick={savePending} style={{
            ...S.primaryBtn,
            background: flash ? "#7f1d1d" : "#ef4444",
            color:      flash ? "#fecaca" : "#fff",
          }}>
            {flash ? "✓ Expenses Saved!" : `Save ${pending.length} Expense${pending.length > 1 ? "s" : ""}`}
          </button>
        </>
      )}
    </div>
  );
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function History({ days, expenses, setDays, setExpenses }) {
  const groups = useMemo(() => {
    const map = {};
    days.forEach(d => {
      if (!map[d.date]) map[d.date] = { date: d.date, days: [], exps: [] };
      map[d.date].days.push(d);
    });
    expenses.forEach(e => {
      if (!map[e.date]) map[e.date] = { date: e.date, days: [], exps: [] };
      map[e.date].exps.push(e);
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [days, expenses]);

  function delDay(id) { const u = days.filter(d => d.id !== id); setDays(u); LS.set(DAYS_KEY, u); }
  function delExp(id) { const u = expenses.filter(e => e.id !== id); setExpenses(u); LS.set(EXP_KEY, u); }

  if (!groups.length) return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>History</h2>
      <p style={{ color: "#475569", textAlign: "center", marginTop: 48, fontSize: 14 }}>Nothing logged yet.</p>
    </div>
  );

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>History</h2>
      {groups.map(g => {
        const inc = g.days.reduce((s, d) =>
          s + (d.loops || []).reduce((ls, lp) =>
            ls + lp.bags.reduce((bs, b) => bs + (Number(b.total) || 0), 0), 0), 0);
        const exp = g.exps.reduce((s, e) => s + e.amount, 0);
        return (
          <div key={g.date} style={{ marginBottom: 22 }}>
            <div style={S.histDateRow}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{displayDate(g.date)}</span>
              <span>
                {inc > 0 && <span style={{ color: "#22c55e", marginRight: 10, fontWeight: 700 }}>+{fmt(inc)}</span>}
                {exp > 0 && <span style={{ color: "#f87171", fontWeight: 700 }}>−{fmt(exp)}</span>}
              </span>
            </div>

            {g.days.map(day => {
              const dayInc = (day.loops || []).reduce((s, lp) =>
                s + lp.bags.reduce((bs, b) => bs + (Number(b.total) || 0), 0), 0);
              return (
                <div key={day.id} style={{ ...S.histCard, borderLeft: "3px solid #22c55e" }}>
                  <div style={S.histHead}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      ⛳ {(day.loops || []).length} Loop{(day.loops || []).length !== 1 ? "s" : ""}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{ color: "#facc15", fontWeight: 800, fontSize: 15 }}>{fmt(dayInc)}</span>
                    <button onClick={() => delDay(day.id)} style={S.xBtn}>✕</button>
                  </div>

                  {(day.loops || []).map((lp, li) => {
                    const lt = getLT(lp.type);
                    const lpTotal = lp.bags.reduce((s, b) => s + (Number(b.total) || 0), 0);
                    return (
                      <div key={lp.id} style={{
                        marginTop: 8, paddingLeft: 8,
                        borderLeft: `2px solid ${lt.color}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: "0.1em" }}>
                            LOOP {li + 1}
                          </span>
                          <Pill color={lt.pill}>{lt.label}</Pill>
                          {lp.bags.length > 1 && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, color: "#f59e0b",
                              background: "#1c1000", border: "1px solid #44300a",
                              borderRadius: 20, padding: "1px 6px",
                            }}>DOUBLE</span>
                          )}
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 12, color: "#facc15", fontWeight: 700 }}>{fmt(lpTotal)}</span>
                        </div>
                        {lp.bags.map((b, bi) => (
                          <div key={b.id} style={S.golferRow}>
                            <span style={{
                              fontSize: 9, color: bi === 0 ? "#64748b" : "#f59e0b",
                              fontWeight: 800, letterSpacing: "0.08em", width: 42, flexShrink: 0,
                            }}>BAG {bi + 1}</span>
                            <span style={{ flex: 1, color: "#cbd5e1", fontSize: 13 }}>{b.name || "—"}</span>
                            <span style={{ color: "#64748b", fontSize: 12 }}>Fee {fmt(b.fee)}</span>
                            <span style={{ color: "#4ade80", fontSize: 12, marginLeft: 6 }}>+{fmt(b.tip)} tip</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {g.exps.map(exp => (
              <div key={exp.id} style={{ ...S.histCard, borderLeft: "3px solid #ef4444" }}>
                <div style={S.histHead}>
                  <span style={{ fontSize: 18 }}>{exp.icon}</span>
                  <span style={{ flex: 1, fontSize: 14, color: "#e2e8f0", marginLeft: 8 }}>{exp.label}</span>
                  <span style={{ color: "#f87171", fontWeight: 800, fontSize: 14 }}>−{fmt(exp.amount)}</span>
                  <button onClick={() => delExp(exp.id)} style={S.xBtn}>✕</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
function Summary({ days, expenses }) {
  const st = useMemo(() => {
    const bags     = days.flatMap(d => allBags(d));
    const earned   = bags.reduce((s, b) => s + (Number(b.total) || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const net      = earned - totalExp;
    const loops    = days.reduce((s, d) => s + (d.loops || []).length, 0);
    const bags2    = bags.length; // total bags carried (could be > loops if doubles)
    const daysW    = days.length;
    const avgLoop  = loops ? earned / loops : 0;

    // Double bag count
    const doubles = days.reduce((s, d) =>
      s + (d.loops || []).filter(lp => lp.bags.length >= 2).length, 0);

    // Per loop-type
    const typeStats = {};
    LOOP_TYPES.forEach(lt => { typeStats[lt.value] = { loops: 0, bags: 0, total: 0 }; });
    days.forEach(d => {
      (d.loops || []).forEach(lp => {
        const k = lp.type || "regular";
        if (!typeStats[k]) typeStats[k] = { loops: 0, bags: 0, total: 0 };
        typeStats[k].loops += 1;
        typeStats[k].bags  += lp.bags.length;
        typeStats[k].total += lp.bags.reduce((s, b) => s + (Number(b.total) || 0), 0);
      });
    });

    // Expense categories
    const catMap = {};
    expenses.forEach(e => {
      if (!catMap[e.label]) catMap[e.label] = { label: e.label, icon: e.icon, amount: 0 };
      catMap[e.label].amount += e.amount;
    });
    const cats = Object.values(catMap).sort((a, b) => b.amount - a.amount);

    return { earned, totalExp, net, loops, bags2, doubles, daysW, avgLoop, typeStats, cats };
  }, [days, expenses]);

  const empty = !days.length && !expenses.length;

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>All-Time Summary</h2>
      {empty ? (
        <p style={{ color: "#475569", textAlign: "center", marginTop: 48, fontSize: 14 }}>No data yet.</p>
      ) : (
        <>
          <div style={S.heroBanner}>
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Net Take-Home</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: st.net >= 0 ? "#facc15" : "#f87171", fontFamily: "'Georgia', serif" }}>
              {st.net >= 0 ? "" : "−"}{fmt(st.net)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <BigStat label="Total Earned"   value={fmt(st.earned)}   color="#22c55e" />
            <BigStat label="Total Expenses" value={fmt(st.totalExp)} color="#ef4444" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
            <SmStat label="Loops"    value={st.loops} />
            <SmStat label="Bags"     value={st.bags2} />
            <SmStat label="Doubles"  value={st.doubles} />
            <SmStat label="Days"     value={st.daysW} />
          </div>
          <div style={{ ...S.totalPreview, marginBottom: 24 }}>
            <span style={{ color: "#475569", fontSize: 12 }}>Avg Earned / Loop</span>
            <span style={{ color: "#facc15", fontWeight: 800, fontSize: 18 }}>{st.loops ? fmt(st.avgLoop) : "—"}</span>
          </div>

          <SectionTitle>Loop Type Breakdown</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {LOOP_TYPES.map(lt => {
              const ts = st.typeStats[lt.value] || { loops: 0, bags: 0, total: 0 };
              return (
                <SplitBox key={lt.value} label={lt.label} color={lt.color}
                  loops={ts.loops} bags={ts.bags} total={ts.total}
                  avg={ts.loops ? ts.total / ts.loops : 0} />
              );
            })}
          </div>

          {st.cats.length > 0 && (
            <>
              <SectionTitle>Expenses Ranked by Cost</SectionTitle>
              {st.cats.map(c => (
                <div key={c.label} style={S.catRow}>
                  <span style={{ fontSize: 16, width: 26, flexShrink: 0 }}>{c.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "#cbd5e1" }}>{c.label}</span>
                  <div style={{ width: 90, marginRight: 10 }}>
                    <div style={{ height: 3, borderRadius: 2, background: "#1a2744" }}>
                      <div style={{
                        height: "100%", borderRadius: 2, background: "#ef4444",
                        width: `${st.totalExp > 0 ? Math.round((c.amount / st.totalExp) * 100) : 0}%`,
                      }} />
                    </div>
                  </div>
                  <span style={{ color: "#f87171", fontWeight: 800, fontSize: 13, minWidth: 60, textAlign: "right" }}>
                    {fmt(c.amount)}
                  </span>
                </div>
              ))}
              <div style={{ ...S.totalPreview, marginTop: 14 }}>
                <span style={{ color: "#475569", fontSize: 12 }}>Total Expenses</span>
                <span style={{ color: "#f87171", fontWeight: 800, fontSize: 18 }}>{fmt(st.totalExp)}</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-stat components ──────────────────────────────────────────────────────
function BigStat({ label, value, color }) {
  return (
    <div style={{ background: "#060b16", border: "1px solid #1a2744", borderTop: `3px solid ${color}`, borderRadius: 8, padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function SmStat({ label, value }) {
  return (
    <div style={{ background: "#060b16", border: "1px solid #1a2744", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>{value}</div>
    </div>
  );
}

function SplitBox({ label, color, loops, bags, total, avg }) {
  return (
    <div style={{ background: "#060b16", border: "1px solid #1a2744", borderTop: `3px solid ${color}`, borderRadius: 8, padding: "12px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {[["Loops", loops], ["Bags", bags], ["Total", total ? fmt(total) : "$0.00"], ["Avg/Loop", loops ? fmt(avg) : "—"]].map(([l, v]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{l}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "log",      label: "Log",     icon: "⛳" },
  { id: "roster",   label: "Golfers", icon: "👥" },
  { id: "expenses", label: "Expenses",icon: "💸" },
  { id: "history",  label: "History", icon: "📋" },
  { id: "summary",  label: "Summary", icon: "📊" },
];

export default function CaddieLedger() {
  const [tab,      setTab]      = useState("log");
  const [days,     setDays]     = useState(() => LS.get(DAYS_KEY, []));
  const [expenses, setExpenses] = useState(() => LS.get(EXP_KEY, []));

  const roster  = useMemo(() => buildRoster(days), [days]);
  const earned  = days.flatMap(d => allBags(d)).reduce((s, b) => s + (Number(b.total)||0), 0);
  const spent   = expenses.reduce((s, e) => s + e.amount, 0);
  const net     = earned - spent;
  const hasData = days.length > 0 || expenses.length > 0;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div>
            <div style={S.logo}>⛳ Caddie Ledger</div>
            <div style={S.logoSub}>Every loop · every dollar · every day</div>
          </div>
          {hasData && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Net</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: net >= 0 ? "#facc15" : "#f87171" }}>
                {net >= 0 ? "" : "−"}{fmt(net)}
              </div>
            </div>
          )}
        </div>
      </header>

      <nav style={S.nav}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...S.navBtn,
            borderBottom: tab === t.id ? "2px solid #facc15" : "2px solid transparent",
            color:        tab === t.id ? "#facc15" : "#475569",
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 8, marginTop: 3, letterSpacing: "0.07em", textTransform: "uppercase", display: "block" }}>
              {t.label}
            </span>
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {tab === "log"      && <LogDay       days={days} setDays={setDays} roster={roster} />}
        {tab === "roster"   && <GolferRoster roster={roster} />}
        {tab === "expenses" && <Expenses     expenses={expenses} setExpenses={setExpenses} />}
        {tab === "history"  && <History      days={days} expenses={expenses} setDays={setDays} setExpenses={setExpenses} />}
        {tab === "summary"  && <Summary      days={days} expenses={expenses} />}
      </main>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  root:         { minHeight: "100vh", background: "#070d1a", color: "#e2e8f0", fontFamily: "'Courier New', Courier, monospace" },
  header:       { background: "linear-gradient(160deg,#0b1528 0%,#0d1f3c 100%)", borderBottom: "1px solid #1a2e50", padding: "14px 18px" },
  headerInner:  { maxWidth: 640, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo:         { fontSize: 20, fontWeight: 800, color: "#facc15", fontFamily: "'Georgia',serif", letterSpacing: "0.03em" },
  logoSub:      { fontSize: 9, color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 },
  nav:          { display: "flex", background: "#0a1120", borderBottom: "1px solid #1a2744", maxWidth: 640, margin: "0 auto" },
  navBtn:       { flex: 1, padding: "9px 2px 7px", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s", fontFamily: "'Courier New',monospace", textAlign: "center" },
  main:         { maxWidth: 640, margin: "0 auto", padding: "16px 14px 90px" },
  card:         { background: "#0a1425", border: "1px solid #1a2744", borderRadius: 10, padding: "20px 16px" },
  cardTitle:    { fontSize: 20, fontWeight: 800, color: "#facc15", marginBottom: 22, letterSpacing: "0.02em", fontFamily: "'Georgia',serif" },
  input:        { width: "100%", boxSizing: "border-box", background: "#060b16", border: "1px solid #1a2e50", borderRadius: 5, color: "#e2e8f0", padding: "9px 10px", fontSize: 14, fontFamily: "'Courier New',monospace", outline: "none" },
  miniLabel:    { fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5, fontWeight: 700 },
  countBtn:     { flex: 1, padding: "10px 4px", border: "2px solid", borderRadius: 6, fontSize: 20, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", fontFamily: "'Courier New',monospace" },
  typeBtn:      { padding: "5px 8px", border: "1.5px solid", borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Courier New',monospace", transition: "all 0.15s" },
  golferBlock:  { border: "2px solid", borderRadius: 8, padding: "12px 12px", transition: "border-color 0.2s" },
  primaryBtn:   { width: "100%", padding: "13px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", transition: "all 0.2s", fontFamily: "'Courier New',monospace", background: "#22c55e", color: "#080e1a" },
  totalPreview: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#060b16", border: "1px solid #1a2744", borderRadius: 8, padding: "12px 16px", marginBottom: 14 },
  presetBtn:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "11px 6px", background: "#080f1e", border: "1px solid #1a2744", borderRadius: 8, cursor: "pointer", gap: 4, fontFamily: "'Courier New',monospace" },
  pendingRow:   { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#060b16", border: "1px solid #1a2744", borderRadius: 6, marginBottom: 6 },
  xBtn:         { background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 14, padding: "0 4px", fontFamily: "'Courier New',monospace" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal:        { background: "#0a1425", border: "1px solid #1a2e50", borderRadius: 14, padding: 30, maxWidth: 310, width: "100%", textAlign: "center" },
  histDateRow:  { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#64748b", borderBottom: "1px solid #1a2744", paddingBottom: 8, marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" },
  histCard:     { background: "#060b16", border: "1px solid #1a2744", borderRadius: 6, padding: "10px 12px", marginBottom: 7 },
  histHead:     { display: "flex", alignItems: "center", gap: 6 },
  golferRow:    { display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid #1a2744", fontSize: 13 },
  catRow:       { display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: "1px solid #1a2744" },
  heroBanner:   { background: "#060b16", border: "1px solid #1a2744", borderRadius: 10, padding: "20px", textAlign: "center", marginBottom: 16 },
  dropdown:     { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#0d1a2e", border: "1px solid #1a3a5f", borderRadius: 6, marginTop: 2, maxHeight: 220, overflowY: "auto" },
  dropdownItem: { display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid #1a2744" },
  rosterRow:    { background: "#060b16", border: "1px solid #1a2744", borderRadius: 8, padding: "14px 14px", marginBottom: 10 },
  rosterStat:   { background: "#0a1425", border: "1px solid #1a2744", borderRadius: 6, padding: "8px 10px" },
};
