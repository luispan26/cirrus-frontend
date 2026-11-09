import React, { useMemo } from "react";
import { cellOutlinePath, cellRuns, zoneColor } from "./planDraw.js";

// The generated lab drawn the way Cirrus's report draws it
// (cirrus-frontend src/components/LayoutFloorPlan.tsx): drafting-paper
// background, hatched walls broken at doors with a swing, zone floor tints,
// the aisle object, door clearances (outlined where an aisle crosses them),
// benches colored by zone, equipment as white footprints with pipette work
// areas dashed, dimensions, north arrow and scale bar. Protocol routes are
// drawn on top along the exact aisle cells the engine scored.

const INK = "#22242f", INK_SOFT = "rgba(34,36,47,.55)", PAPER = "#fbfbfa";
const AISLE_FILL = "rgba(52,98,201,.17)", DOOR_FILL = "rgba(214,79,79,.13)", DOOR_EDGE = "rgba(214,79,79,.75)";
const WALL_T = 0.35, DIM_GAP = 1.05, DIM_EXT = 0.32;

const feetLabel = ft => { const inches = Math.round(ft * 12); return `${Math.floor(inches / 12)}'-${inches % 12}"`; };
function truncate(text, availableFt, fontSize) {
  const max = Math.max(3, Math.floor(availableFt / (fontSize * 0.58)));
  return text.length <= max ? text : text.slice(0, Math.max(1, max - 1)) + "…";
}
function bounds(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}
function wallSide(b, room) {
  return [["top", b.top], ["bottom", room.heightFt - b.bottom], ["left", b.left], ["right", room.widthFt - b.right]].reduce((a, e) => (e[1] < a[1] ? e : a))[0];
}
function doorGap(b, side, room) {
  const pad = 0.06;
  if (side === "top") return `M ${b.left} ${-WALL_T - pad} H ${b.right} V ${WALL_T + pad} H ${b.left} Z`;
  if (side === "bottom") return `M ${b.left} ${room.heightFt - WALL_T - pad} H ${b.right} V ${room.heightFt + WALL_T + pad} H ${b.left} Z`;
  if (side === "left") return `M ${-WALL_T - pad} ${b.top} V ${b.bottom} H ${WALL_T + pad} V ${b.top} Z`;
  return `M ${room.widthFt - WALL_T - pad} ${b.top} V ${b.bottom} H ${room.widthFt + WALL_T + pad} V ${b.top} Z`;
}
function DoorSwing({ b, side, room }) {
  const along = side === "top" || side === "bottom";
  const width = along ? b.right - b.left : b.bottom - b.top;
  const mid = along ? (b.left + b.right) / 2 : (b.top + b.bottom) / 2;
  const wall = side === "top" ? 0 : side === "bottom" ? room.heightFt : side === "left" ? 0 : room.widthFt;
  const dir = along ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const normal = { top: { x: 0, y: 1 }, bottom: { x: 0, y: -1 }, left: { x: 1, y: 0 }, right: { x: -1, y: 0 } }[side];
  const center = along ? { x: mid, y: wall } : { x: wall, y: mid };
  const hinge = { x: center.x - dir.x * width / 2, y: center.y - dir.y * width / 2 };
  const tip = { x: hinge.x + normal.x * width, y: hinge.y + normal.y * width };
  const arc = Array.from({ length: 17 }, (_, i) => {
    const t = (i / 16) * Math.PI / 2;
    return `${hinge.x + (normal.x * Math.cos(t) + dir.x * Math.sin(t)) * width},${hinge.y + (normal.y * Math.cos(t) + dir.y * Math.sin(t)) * width}`;
  }).join(" ");
  return <g><line x1={hinge.x} y1={hinge.y} x2={tip.x} y2={tip.y} stroke={INK} strokeWidth={0.05} /><polyline points={arc} fill="none" stroke={INK_SOFT} strokeWidth={0.03} /></g>;
}

export default function FloorPlan({ layout, placements = [], workAreas = [], routes = [], colorOf = () => INK, visibleRunIds = null, focusRunIds = null, focusZoneId = null, movedIds = null, emptyBenchIds = null, title, ariaLabel = "Lab floor plan" }) {
  const plan = layout.plan;
  const cellFt = plan.gridInches / 12;
  const room = { widthFt: layout.room?.widthFt ?? plan.columns * cellFt, heightFt: layout.room?.heightFt ?? plan.rows * cellFt };
  const zoneIds = useMemo(() => plan.zones.map(z => z.id), [plan]);
  const zoneName = useMemo(() => new Map(plan.zones.map(z => [z.id, z.name])), [plan]);
  const layers = useMemo(() => ({
    zones: plan.zones.map(z => ({ id: z.id, runs: cellRuns(z.cells ?? []) })),
    aisle: cellRuns(plan.aisle.cells),
    door: cellRuns(plan.doorClearance.cells),
    obstacles: cellRuns(plan.obstacles.cells),
    doorOutline: plan.doorClearance.aisleCells?.length ? cellOutlinePath([...plan.doorClearance.cells, ...plan.doorClearance.aisleCells], cellFt) : "",
  }), [plan, cellFt]);
  const openings = (layout.baseObjects ?? []).filter(o => (o.kind === "door" || o.kind === "window") && o.footprint?.points?.length).map(o => { const b = bounds(o.footprint.points); return { o, b, side: wallSide(b, room) }; });
  const others = (layout.baseObjects ?? []).filter(o => !["door", "window", "utility_connection", "electrical_point", "plumbing_point", "ventilation_point"].includes(o.kind) && o.footprint?.points?.length >= 3);
  const wallPath = [`M ${-WALL_T} ${-WALL_T} H ${room.widthFt + WALL_T} V ${room.heightFt + WALL_T} H ${-WALL_T} Z`, `M 0 0 H ${room.widthFt} V ${room.heightFt} H 0 Z`, ...openings.map(({ b, side }) => doorGap(b, side, room))].join(" ");
  const vbX = -(WALL_T + DIM_GAP + 0.9), vbY = -2.7, vbW = room.widthFt - vbX + 0.7, vbH = room.heightFt - vbY + WALL_T + DIM_GAP + 0.8;
  const px = ([r, c], o = 0) => `${((c + 0.5) * cellFt + o).toFixed(3)},${((r + 0.5) * cellFt + o).toFixed(3)}`;
  const shown = routes.filter(p => !p.inactive && (!visibleRunIds || visibleRunIds.has(p.id)));
  // Protocols share aisles, and shortest paths through the same aisle cells
  // coincide exactly, so drawn on the cells themselves every route would
  // stack into one line. Each protocol instead gets its own lane: the whole
  // route translated by a small constant, which moves horizontal legs up or
  // down and vertical legs left or right. The followed protocol sits on the
  // scored cells themselves and is drawn last, over everything else; a
  // followed group (a zone) keeps its lanes and is drawn over the rest.
  // Focus: one protocol (drawn on the exact cells, numbered) or a group,
  // e.g. every protocol of a zone (each keeps its own lane, all bold).
  const focus = focusRunIds?.length ? new Set(focusRunIds) : null;
  const focusRoute = focus?.size === 1 ? shown.find(p => focus.has(p.id)) : null;
  const laneMembers = focus ? shown.filter(p => focus.has(p.id)) : shown;
  const laneOf = new Map(shown.map(p => [p.id, 0]));
  if (!focusRoute) laneMembers.forEach((p, i) => laneOf.set(p.id, (i - (laneMembers.length - 1) / 2) * (laneMembers.length > 1 ? Math.min(0.2, 1.4 / (laneMembers.length - 1)) : 0)));
  const drawOrder = [...shown.filter(p => !focus?.has(p.id)), ...shown.filter(p => focus?.has(p.id))];
  const styleOf = p => !focus ? { casing: 0.2, line: 0.1, opacity: 0.95 } : !focus.has(p.id) ? { casing: 0, line: 0.07, opacity: 0.18 } : focusRoute ? { casing: 0.36, line: 0.2, opacity: 1 } : { casing: 0.26, line: 0.13, opacity: 1 };
  const id = useMemo(() => `fp${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="plan-wrap">
      {title && <div className="plan-title">{title}</div>}
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} role="img" aria-label={ariaLabel}>
        <defs>
          <filter id={`${id}-shadow`} x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0.18" stdDeviation="0.22" floodColor="#14161F" floodOpacity=".28" /></filter>
          <pattern id={`${id}-hatch`} width="0.5" height="0.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.5" height="0.5" fill={PAPER} /><line x1="0" y1="0" x2="0" y2="0.5" stroke={INK_SOFT} strokeWidth="0.07" /></pattern>
          <pattern id={`${id}-grid`} width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(34,36,47,.08)" strokeWidth="0.015" /></pattern>
          <pattern id={`${id}-empty`} width="0.4" height="0.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="0.4" stroke={INK_SOFT} strokeWidth="0.05" /></pattern>
        </defs>
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill={PAPER} />
        <ScaleBar /><NorthArrow room={room} />
        <rect x={0} y={0} width={room.widthFt} height={room.heightFt} fill={`url(#${id}-grid)`} />
        <g style={{ pointerEvents: "none" }}>
          {layers.zones.map(z => <g key={z.id} fill={zoneColor(z.id, zoneIds)} fillOpacity={0.07}>{z.runs.map((r, i) => <rect key={i} x={r.column * cellFt} y={r.row * cellFt} width={r.width * cellFt + 0.01} height={cellFt + 0.01} />)}</g>)}
          <g fill={DOOR_FILL}>{layers.door.map((r, i) => <rect key={i} x={r.column * cellFt} y={r.row * cellFt} width={r.width * cellFt + 0.01} height={cellFt + 0.01} />)}</g>
          <g fill={AISLE_FILL}>{layers.aisle.map((r, i) => <rect key={i} x={r.column * cellFt} y={r.row * cellFt} width={r.width * cellFt + 0.01} height={cellFt + 0.01} />)}</g>
          <g fill="rgba(34,36,47,.10)">{layers.obstacles.map((r, i) => <rect key={i} x={r.column * cellFt} y={r.row * cellFt} width={r.width * cellFt + 0.01} height={cellFt + 0.01} />)}</g>
          {layers.doorOutline && <path d={layers.doorOutline} fill="none" stroke={DOOR_EDGE} strokeWidth={0.06} strokeDasharray=".25 .15" />}
        </g>
        {others.map(o => <polygon key={o.id} points={o.footprint.points.map(p => `${p.x},${p.y}`).join(" ")} fill="rgba(34,36,47,.06)" stroke={INK_SOFT} strokeWidth={0.03} strokeDasharray=".12 .09" />)}
        <path d={wallPath} fillRule="evenodd" fill={`url(#${id}-hatch)`} stroke={INK} strokeWidth={0.055} />
        {openings.filter(x => x.o.kind === "window").map(({ o, b }) => <rect key={o.id} x={b.left} y={b.top} width={b.right - b.left} height={b.bottom - b.top} fill={PAPER} stroke={INK} strokeWidth={0.035} />)}
        {openings.filter(x => x.o.kind === "door").map(({ o, b, side }) => <DoorSwing key={o.id} b={b} side={side} room={room} />)}

        {plan.benches.map(b => {
          const x = b.rect.column * cellFt, y = b.rect.row * cellFt, w = b.rect.width * cellFt, h = b.rect.height * cellFt;
          const color = zoneColor(b.zoneId, zoneIds), label = zoneName.get(b.zoneId) ?? b.zoneId;
          const empty = emptyBenchIds?.includes(b.id);
          const fs = Math.min(0.4, Math.max(0.22, Math.min(w, h) * 0.28));
          return (
            <g key={b.id}>
              <title>{`${b.id} — ${label} zone, ${b.kind} bench facing ${b.facing}${empty ? " (empty)" : ""}`}</title>
              <rect x={x} y={y} width={w} height={h} filter={`url(#${id}-shadow)`} fill={color} fillOpacity={focusZoneId && b.zoneId !== focusZoneId ? 0.1 : 0.4} stroke={INK} strokeWidth={0.055} />
              <rect x={x + 0.12} y={y + 0.12} width={Math.max(0, w - 0.24)} height={Math.max(0, h - 0.24)} fill="none" stroke={INK_SOFT} strokeWidth={0.025} />
              {empty && <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-empty)`} style={{ pointerEvents: "none" }} />}
              <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fontFamily="var(--mono)" fill={INK} opacity={placements.length ? 0.35 : 1} transform={w >= h ? undefined : `rotate(-90 ${x + w / 2} ${y + h / 2})`} style={{ pointerEvents: "none" }}>
                {truncate(label, Math.max(w, h) - 0.3, fs)}
              </text>
            </g>
          );
        })}

        {workAreas.map(a => (
          <rect key={a.id} x={a.xFt} y={a.yFt} width={a.spanXFt} height={a.spanYFt} rx={0.06} fill="none" stroke="#263b46" strokeOpacity={0.6} strokeWidth={0.045} strokeDasharray="0.2 0.12">
            <title>Pipette work area (working space, moves with its pipettes)</title>
          </rect>
        ))}
        {placements.map(p => {
          const w = p.spanXFt ?? p.widthFt, h = p.spanYFt ?? p.depthFt, cx = p.xFt + w / 2, cy = p.yFt + h / 2;
          const moved = movedIds?.has(p.instanceId);
          return (
            <g key={p.instanceId}>
              <title>{`${p.name}${p.fixed ? " (fixed)" : ""}${p.placeholderSize ? " — placeholder size" : ""}\n${p.instanceId}${p.benchId ? ` on ${p.benchId}` : " (floor)"}${moved ? "\nMoved by the optimizer" : ""}`}</title>
              <rect x={p.xFt} y={p.yFt} width={w} height={h} rx={0.06} fill={moved ? "#e6fbfb" : "#fff"} fillOpacity={0.92} stroke={moved ? "#049295" : "#263b46"} strokeWidth={moved ? 0.09 : 0.05} strokeDasharray={p.placeholderSize ? "0.12 0.08" : undefined} />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={0.18} fill="#263b46" transform={h > w ? `rotate(-90 ${cx} ${cy})` : undefined} style={{ pointerEvents: "none" }}>
                {truncate(p.name, Math.max(w, h) - 0.1, 0.18)}{p.fixed ? " *" : ""}
              </text>
            </g>
          );
        })}

        {/* Dark outlines first, then every colored line, so an outline never covers another protocol's color. */}
        <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
          {drawOrder.map(p => {
            const { casing } = styleOf(p), o = laneOf.get(p.id);
            return casing > 0 && <g key={p.id} strokeWidth={casing} strokeOpacity={0.85}>
              {p.legs.map((leg, j) => leg.cells?.length > 1 && <polyline key={j} points={leg.cells.map(c => px(c, o)).join(" ")} />)}
            </g>;
          })}
        </g>
        {drawOrder.map(p => {
          const { line, opacity } = styleOf(p), o = laneOf.get(p.id);
          return (
            <g key={p.id} stroke={colorOf(p.id)} fill="none" opacity={opacity} strokeWidth={line} strokeLinecap="round" strokeLinejoin="round">
              {p.legs.map((leg, j) => leg.cells?.length > 1 && (
                <polyline key={j} points={leg.cells.map(c => px(c, o)).join(" ")}>
                  <title>{`${p.name}: visit ${p.visits[j].index} (step ${p.visits[j].stepLabel}) → visit ${p.visits[j + 1].index} (step ${p.visits[j + 1].stepLabel}), ${leg.distanceFt.toFixed(1)} ft`}</title>
                </polyline>
              ))}
            </g>
          );
        })}
        {focusRoute && <VisitMarkers route={focusRoute} color={colorOf(focusRoute.id)} cellFt={cellFt} />}
        <StepBubbles routes={drawOrder.filter(p => !focus || focus.has(p.id))} placements={placements} benches={plan.benches} cellFt={cellFt} colorOf={colorOf} />
        <WidthDimension room={room} /><HeightDimension room={room} />
      </svg>
    </div>
  );
}

// The followed protocol's stops on the aisle: a ringed dot where it starts,
// a plain dot at every other stop (step numbers are in the bench bubbles).
function VisitMarkers({ route, color, cellFt }) {
  const stops = new Map(route.visits.map(v => [v.accessCell.join(","), v.accessCell]));
  const start = route.visits[0]?.accessCell.join(",");
  return (
    <g style={{ pointerEvents: "none" }}>
      {[...stops].map(([key, cell]) => {
        const cx = (cell[1] + 0.5) * cellFt, cy = (cell[0] + 0.5) * cellFt;
        return key === start
          ? <g key={key}><circle cx={cx} cy={cy} r={0.3} fill={PAPER} stroke={INK} strokeWidth={0.1} /><circle cx={cx} cy={cy} r={0.14} fill={color} /></g>
          : <circle key={key} cx={cx} cy={cy} r={0.2} fill={color} stroke={INK} strokeWidth={0.06} />;
      })}
    </g>
  );
}

// Every bench (or floor unit) a shown protocol stops at gets a bubble per
// stay, outlined in the protocol's color: one step is a round bubble ("4"),
// consecutive steps there an oval with the range ("2.1–3.6"). A protocol
// that comes back later gets another bubble. Bubbles flow in rows across
// the bench, centred, and spill past it when there are many.
const BUBBLE_FS = 0.42, BUBBLE_H = 0.62, BUBBLE_GAP = 0.1;
export function stepStays(route, locationOf) {
  const stays = [];
  for (const v of route.visits) {
    const loc = locationOf(v.instanceId);
    if (!loc) continue;
    const last = stays.at(-1);
    if (last && last.loc === loc) { if (last.labels.at(-1) !== v.stepLabel) last.labels.push(v.stepLabel); last.visits.push(v); }
    else stays.push({ loc, labels: [v.stepLabel], visits: [v] });
  }
  return stays.map(s => ({ ...s, text: s.labels.length === 1 ? s.labels[0] : `${s.labels[0]}–${s.labels.at(-1)}` }));
}
function StepBubbles({ routes, placements, benches, cellFt, colorOf }) {
  const byInstance = new Map(placements.map(p => [p.instanceId, p]));
  const locationOf = id => { const p = byInstance.get(id); return p ? (p.benchId ?? `floor:${id}`) : null; };
  const boxes = new Map(benches.map(b => [b.id, { x: b.rect.column * cellFt, y: b.rect.row * cellFt, w: b.rect.width * cellFt, h: b.rect.height * cellFt }]));
  for (const p of placements) if (p.benchId === null) boxes.set(`floor:${p.instanceId}`, { x: p.xFt, y: p.yFt, w: p.spanXFt ?? p.widthFt, h: p.spanYFt ?? p.depthFt });
  const atLoc = new Map();
  for (const route of routes) for (const stay of stepStays(route, locationOf)) {
    const list = atLoc.get(stay.loc) ?? atLoc.set(stay.loc, []).get(stay.loc);
    list.push({ ...stay, route, width: Math.max(BUBBLE_H, stay.text.length * BUBBLE_FS * 0.56 + 0.3) });
  }
  const out = [];
  for (const [loc, bubbles] of atLoc) {
    const box = boxes.get(loc);
    if (!box) continue;
    const rows = [[]], inner = Math.max(BUBBLE_H, box.w - 0.16);
    let used = 0;
    for (const b of bubbles) {
      if (rows.at(-1).length && used + BUBBLE_GAP + b.width > inner) { rows.push([]); used = 0; }
      used += (rows.at(-1).length ? BUBBLE_GAP : 0) + b.width;
      rows.at(-1).push(b);
    }
    const blockH = rows.length * BUBBLE_H + (rows.length - 1) * BUBBLE_GAP;
    let y = box.y + Math.max(0.08, (box.h - blockH) / 2);
    for (const row of rows) {
      const rowW = row.reduce((t, b) => t + b.width, 0) + (row.length - 1) * BUBBLE_GAP;
      let x = box.x + (box.w - rowW) / 2;
      for (const b of row) out.push({ ...b, x, y, key: `${loc}|${b.route.id}|${b.visits[0].index}` }), x += b.width + BUBBLE_GAP;
      y += BUBBLE_H + BUBBLE_GAP;
    }
  }
  return (
    <g>
      {out.map(b => (
        <g key={b.key}>
          <title>{`${b.route.name}: step${b.labels.length > 1 ? "s" : ""} ${b.labels.join(", ")}\n${b.visits.map(v => `Visit ${v.index} — step ${v.stepLabel}: ${v.equipmentId}`).join("\n")}`}</title>
          <rect x={b.x} y={b.y} width={b.width} height={BUBBLE_H} rx={BUBBLE_H / 2} fill="#fff" stroke={colorOf(b.route.id)} strokeWidth={0.1} />
          <text x={b.x + b.width / 2} y={b.y + BUBBLE_H / 2 + 0.01} textAnchor="middle" dominantBaseline="middle" fontSize={BUBBLE_FS} fontWeight={700} fill={INK} style={{ pointerEvents: "none" }}>{b.text}</text>
        </g>
      ))}
    </g>
  );
}

function WidthDimension({ room }) {
  const y = room.heightFt + WALL_T + DIM_GAP;
  return <g>
    <line x1={0} y1={room.heightFt + WALL_T + 0.06} x2={0} y2={y + DIM_EXT} stroke={INK_SOFT} strokeWidth={0.02} />
    <line x1={room.widthFt} y1={room.heightFt + WALL_T + 0.06} x2={room.widthFt} y2={y + DIM_EXT} stroke={INK_SOFT} strokeWidth={0.02} />
    <line x1={0} y1={y} x2={room.widthFt} y2={y} stroke={INK} strokeWidth={0.028} />
    <text x={room.widthFt / 2} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={0.42} fontFamily="var(--mono)" fill={INK} stroke={PAPER} strokeWidth={0.16} paintOrder="stroke">{feetLabel(room.widthFt)}</text>
  </g>;
}
function HeightDimension({ room }) {
  const x = -(WALL_T + DIM_GAP);
  return <g>
    <line x1={-WALL_T - 0.06} y1={0} x2={x - DIM_EXT} y2={0} stroke={INK_SOFT} strokeWidth={0.02} />
    <line x1={-WALL_T - 0.06} y1={room.heightFt} x2={x - DIM_EXT} y2={room.heightFt} stroke={INK_SOFT} strokeWidth={0.02} />
    <line x1={x} y1={0} x2={x} y2={room.heightFt} stroke={INK} strokeWidth={0.028} />
    <text x={x} y={room.heightFt / 2} textAnchor="middle" dominantBaseline="middle" fontSize={0.42} fontFamily="var(--mono)" fill={INK} stroke={PAPER} strokeWidth={0.16} paintOrder="stroke" transform={`rotate(-90 ${x} ${room.heightFt / 2})`}>{feetLabel(room.heightFt)}</text>
  </g>;
}
function NorthArrow({ room }) {
  const cx = room.widthFt - 0.6, cy = -1.5, r = 0.5;
  return <g>
    <circle cx={cx} cy={cy} r={r} fill={PAPER} stroke={INK} strokeWidth={0.03} />
    <polygon points={`${cx},${cy - r + 0.12} ${cx - 0.15},${cy + 0.18} ${cx},${cy + 0.05} ${cx + 0.15},${cy + 0.18}`} fill={INK} />
    <text x={cx - r - 0.2} y={cy + 0.1} textAnchor="end" fontSize={0.3} fontFamily="var(--mono)" fill={INK}>N</text>
  </g>;
}
function ScaleBar() {
  const y = -1.6;
  return <g>
    {[0, 1, 2, 3, 4].map(i => <rect key={i} x={i} y={y} width={1} height={0.16} fill={i % 2 ? PAPER : INK} stroke={INK} strokeWidth={0.02} />)}
    <text x={0} y={y - 0.14} fontSize={0.24} fontFamily="var(--mono)" fill={INK}>0</text>
    <text x={5} y={y - 0.14} textAnchor="end" fontSize={0.24} fontFamily="var(--mono)" fill={INK}>5' scale</text>
  </g>;
}
