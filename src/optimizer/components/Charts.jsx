import React, { useMemo, useRef, useState } from "react";

export const fmt = (n, d = 1) => (n === null || n === undefined || !Number.isFinite(n) ? "–" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d }));
const INK = "#14161f", MUTED = "#69707f", GRID = "rgba(20,22,31,.08)", AXIS = "rgba(20,22,31,.25)";

function niceTicks(max, count = 5) {
  if (!(max > 0)) return [0, 1];
  const raw = max / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(+v.toFixed(6));
  if (ticks.at(-1) < max) ticks.push(+(ticks.at(-1) + step).toFixed(6));
  return ticks;
}
// Key for the initial-vs-optimized encodings: dashed vs solid lines, or
// light vs solid bars. Colors stay the protocol's/zone's, so the swatches
// are neutral ink.
export function CompareLegend({ kind = "bar" }) {
  const swatch = initial => kind === "line"
    ? <svg width="26" height="10" aria-hidden="true"><line x1="1" x2="25" y1="5" y2="5" stroke={INK} strokeWidth="2" strokeDasharray={initial ? "5 4" : undefined} opacity={initial ? 0.7 : 1} /></svg>
    : <span className="swatch box" style={{ background: INK, opacity: initial ? 0.35 : 1 }} />;
  return (
    <div className="legend compare-legend" aria-label="Chart legend">
      <span>{swatch(true)} Initial layout</span>
      <span>{swatch(false)} Optimized layout</span>
    </div>
  );
}

function usePointer(ref, width) {
  const [x, setX] = useState(null);
  const onMove = e => { const r = ref.current.getBoundingClientRect(); setX(((e.clientX - r.left) / r.width) * width); };
  return { x, onMove, onLeave: () => setX(null) };
}

// Weighted walking against ordered visit position, one line per protocol
// run: cumulative (ends at the run's weighted total) or each visit's
// incoming leg. Dashed = initial placement, solid = optimized.
export function StepChart({ baseline, best, colors, visible, legMode, period, optimized }) {
  const W = 680, H = 300, L = 60, R = 18, T = 14, B = 40;
  const key = legMode ? "weightedIncomingFt" : "weightedCumulativeFt";
  const runs = baseline.filter(p => visible.has(p.id) && !p.inactive);
  const pairs = runs.map(p => ({ id: p.id, name: p.name, base: p.visits, opt: best.find(q => q.id === p.id)?.visits ?? [] }));
  const maxX = Math.max(2, ...pairs.flatMap(s => [s.base.length, s.opt.length]));
  const ticks = niceTicks(Math.max(0, ...pairs.flatMap(s => [...s.base, ...s.opt].map(v => v[key]))));
  const maxY = ticks.at(-1) || 1;
  const x = i => L + ((i - 1) / (maxX - 1)) * (W - L - R), y = v => T + (1 - v / maxY) * (H - T - B);
  const ref = useRef(null), pointer = usePointer(ref, W);
  const idx = pointer.x === null ? null : Math.min(maxX, Math.max(1, Math.round(1 + ((pointer.x - L) / (W - L - R)) * (maxX - 1))));
  const xTicks = niceTicks(maxX - 1, 8).map(t => t + 1).filter(t => Number.isInteger(t) && t <= maxX);
  if (!pairs.length) return <p className="muted">No active protocol routes to chart yet.</p>;
  const path = vs => vs.map((v, i) => `${i ? "L" : "M"}${x(v.index).toFixed(1)},${y(v[key]).toFixed(1)}`).join("");
  return (
    <div className="chart">
      {optimized && <CompareLegend kind="line" />}
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${legMode ? "Incoming leg" : "Cumulative"} weighted walking by visit for each protocol`} onMouseMove={pointer.onMove} onMouseLeave={pointer.onLeave}>
        {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(t, 0)}</text></g>)}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={AXIS} />
        {xTicks.map(t => <text key={t} x={x(t)} y={H - B + 16} textAnchor="middle" fontSize="11" fill={MUTED}>{t}</text>)}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill={INK}>Visit (ordered equipment use)</text>
        <text x={12} y={T + (H - T - B) / 2} textAnchor="middle" fontSize="12" fill={INK} transform={`rotate(-90 12 ${T + (H - T - B) / 2})`}>{legMode ? "Incoming leg" : "Cumulative"}, weighted ft/{period ?? "run"}</text>
        {pairs.map(s => (
          <g key={s.id} fill="none" stroke={colors.get(s.id)} strokeWidth="2" strokeLinejoin="round">
            {optimized && <path d={path(s.base)} strokeDasharray="5 4" opacity=".7" />}
            <path d={path(optimized ? s.opt : s.base)} />
            {pairs.length <= 4 && (optimized ? s.opt : s.base).length > 0 && (() => { const last = (optimized ? s.opt : s.base).at(-1); return <text x={x(last.index) - 4} y={y(last[key]) - 7} textAnchor="end" fontSize="11" fill={INK} stroke="#fff" strokeWidth="3" paintOrder="stroke">{s.name.slice(0, 26)}</text>; })()}
          </g>
        ))}
        {idx && <line x1={x(idx)} x2={x(idx)} y1={T} y2={H - B} stroke={AXIS} strokeDasharray="3 3" />}
        {idx && pairs.map(s => { const v = (optimized ? s.opt : s.base)[idx - 1]; return v ? <circle key={s.id} cx={x(idx)} cy={y(v[key])} r="4.5" fill={colors.get(s.id)} stroke="#fff" strokeWidth="2" /> : null; })}
      </svg>
      {idx && (
        <div className="tip" style={{ left: `${Math.min(70, (x(idx) / W) * 100 + 2)}%`, top: 8 }}>
          <strong>Visit {idx}</strong>
          {pairs.map(s => {
            const o = s.opt[idx - 1], b = s.base[idx - 1], v = optimized ? o : b;
            if (!v) return null;
            return <div key={s.id}><span className="swatch box" style={{ background: colors.get(s.id) }} /><span>{s.name.slice(0, 22)} · step {v.stepLabel}</span><b style={{ marginLeft: "auto" }}>{fmt(v[key])}</b>{optimized && b && <span className="muted">(was {fmt(b[key])})</span>}</div>;
          })}
        </div>
      )}
    </div>
  );
}

// Total weighted walking, initial vs optimized, on one scale; each bar is
// stacked by protocol so a protocol's share lines up with its line color.
export function TotalBars({ baseline, best, colors, period, optimized, visible = null }) {
  const W = 520, rowH = 34, L = 86, R = 90, T = 6;
  const order = [...baseline.perProtocol].filter(p => !p.inactive && (!visible || visible.has(p.id))).sort((a, b) => b.weightedTravelFt - a.weightedTravelFt || a.id.localeCompare(b.id));
  const rows = [["Initial", baseline], ...(optimized ? [["Optimized", best]] : [])];
  const totalOf = snap => order.reduce((t, p) => t + (snap.perProtocol.find(q => q.id === p.id)?.weightedTravelFt ?? 0), 0);
  const max = Math.max(1, totalOf(baseline), totalOf(best));
  const scale = v => (v / max) * (W - L - R);
  return (
    <div className="chart">
      {optimized && <CompareLegend />}
      <svg viewBox={`0 0 ${W} ${T + rows.length * rowH + 4}`} role="img" aria-label="Total weighted walking, initial and optimized">
        {rows.map(([label, snap], r) => {
          let at = L;
          const y = T + r * rowH;
          return (
            <g key={label}>
              <text x={L - 8} y={y + 15} textAnchor="end" fontSize="12.5" fill={INK}>{label}</text>
              {order.map(p => {
                const v = snap.perProtocol.find(q => q.id === p.id)?.weightedTravelFt ?? 0, w = scale(v);
                const el = w > 0 ? <rect key={p.id} x={at} y={y + 4} width={Math.max(0, w - 2)} height={20} rx={3} fill={colors.get(p.id)} fillOpacity={optimized && snap === baseline ? 0.35 : 1}><title>{`${p.name}: ${fmt(v)} ft/${period}`}</title></rect> : null;
                at += w;
                return el;
              })}
              <text x={at + 6} y={y + 19} fontSize="12.5" fill={INK} fontWeight="700">{fmt(totalOf(snap), 0)} ft</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Best weighted walking found against elapsed milliseconds.
export function ProgressChart({ history, period }) {
  const W = 520, H = 190, L = 60, R = 14, T = 12, B = 34;
  const pts = useMemo(() => history.filter(h => h.hard === 0 || h.hard === undefined), [history]);
  if (pts.length < 2) return <p className="muted">The search accepted no moves.</p>;
  const maxX = Math.max(1, ...pts.map(h => h.elapsedMs)), ticks = niceTicks(Math.max(...pts.map(h => h.walk)));
  const maxY = ticks.at(-1) || 1;
  const x = v => L + (v / maxX) * (W - L - R), y = v => T + (1 - v / maxY) * (H - T - B);
  // Each point is a solution that lowered the objective; with soft rules
  // weighed in, its walking may rise when it fixes violations.
  const line = pts.map((h, i) => `${i ? "L" : "M"}${x(h.elapsedMs).toFixed(1)},${y(h.walk).toFixed(1)}`).join("");
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Search progress: best weighted walking against elapsed milliseconds">
        {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(t, 0)}</text></g>)}
        {pts.filter(h => h.restart).map(h => <line key={h.elapsedMs + "r"} x1={x(h.elapsedMs)} x2={x(h.elapsedMs)} y1={T} y2={H - B} stroke="#c41678" strokeDasharray="3 3"><title>{`Restart ${h.restart}`}</title></line>)}
        <path d={line} fill="none" stroke="#2a78d6" strokeWidth="2" />
        {pts.map((h, i) => <circle key={i} cx={x(h.elapsedMs)} cy={y(h.walk)} r="3" fill={h.restart ? "#c41678" : "#2a78d6"}><title>{`${fmt(h.elapsedMs, 0)} ms: ${fmt(h.walk)} ft/${period}${h.violations !== undefined ? ` · ${h.violations} soft violation(s)` : ""}${h.restart ? " (after restart)" : ""}`}</title></circle>)}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={AXIS} />
        <text x={L} y={H - B + 16} fontSize="11" fill={MUTED}>0</text>
        <text x={W - R} y={H - B + 16} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(maxX, 0)}</text>
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill={INK}>Elapsed milliseconds</text>
      </svg>
    </div>
  );
}
