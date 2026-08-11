import { computeDoorSwing, polygonBounds, wallSideOfBounds, type SandboxBaseObject, type SandboxFixture, type SandboxLayout } from '../lib/layout-sandbox';

// Teal->magenta gradient rather than a categorical palette — every station
// gets a deterministic, distinct point along the same two-color gradient
// used everywhere else in the app (buttons, progress bar, scrollbar), by
// hashing its stationId to a position along it.
const GRADIENT_FROM = { r: 0x00, g: 0xd5, b: 0xd5 }; // var(--teal)
const GRADIENT_TO = { r: 0xff, g: 0x3f, b: 0xa4 }; // var(--pk)

export function stationColor(stationId?: string) {
  if (!stationId) return '#A7A2AD';
  let hash = 0;
  for (const character of stationId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  const t = (Math.abs(hash) % 997) / 997;
  const r = Math.round(GRADIENT_FROM.r + (GRADIENT_TO.r - GRADIENT_FROM.r) * t);
  const g = Math.round(GRADIENT_FROM.g + (GRADIENT_TO.g - GRADIENT_FROM.g) * t);
  const b = Math.round(GRADIENT_FROM.b + (GRADIENT_TO.b - GRADIENT_FROM.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// One glyph per zone (wet_lab / dry_lab / automation / unassigned) rather
// than per stationId — a finite, meaningful set instead of an arbitrary icon
// per station. Path data matches components/Icons.tsx's line-icon style
// (24x24 viewBox, round caps/joins) so these read as native to the app.
function ZoneIcon({ zone }: { zone: string }) {
  if (zone === 'wet_lab') {
    return <><path d="M9 3h6" /><path d="M10 3v6l-5.5 9.2a1.5 1.5 0 0 0 1.3 2.3h12.4a1.5 1.5 0 0 0 1.3-2.3L14 9V3" /><path d="M6.5 15h11" /></>;
  }
  if (zone === 'dry_lab') {
    return <><path d="M4 19h16" /><path d="M8 19v-6" /><path d="M13 19v-10" /><path d="M18 19v-4" /></>;
  }
  if (zone === 'automation') {
    return <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" /></>;
  }
  return <rect x="5" y="5" width="14" height="14" rx="2" />;
}

// Deliberately not layout-sandbox.ts's fixtureFootprint — that rounds up to
// whole grid cells (Math.ceil), which is correct for the sandbox's own
// integer-grid placement/collision system but wrong here: the generator
// places back-to-back bench pairs with zero real gap between them at exact
// fractional depths (BENCH_DEPTH_FT = 2.5ft), so rounding each one's
// rendered depth up to 3ft made adjacent benches visually overlap by the
// rounding error even though their true footprints never touch beyond their
// shared edge. This only needs to draw the real footprint, not snap it to a
// grid, so it uses the fixture's exact widthFt/depthFt instead.
function exactFootprint(fixture: SandboxFixture) {
  const vertical = fixture.orientation === 90 || fixture.orientation === 270;
  return vertical
    ? { width: fixture.depthFt, height: fixture.widthFt }
    : { width: fixture.widthFt, height: fixture.depthFt };
}

// Drafting-table palette: dark ink on light paper, independent of the
// station-color gradient (which is reserved for bench fills/legend so
// stations stay identifiable).
const INK = '#22242f';
const INK_SOFT = 'rgba(34,36,47,.55)';
const PAPER = '#fbfbfa';
const WALL_T = 0.35; // ft — drawn wall thickness
const DIM_GAP = 1.05; // ft — offset of a dimension line from the wall face
const DIM_EXT = 0.32; // ft — how far extension lines overshoot the dimension line

// "12'-6"" style architectural dimension label.
function feetLabel(ft: number): string {
  const totalInches = Math.round(ft * 12);
  return `${Math.floor(totalInches / 12)}'-${totalInches % 12}"`;
}

function truncateLabel(text: string, availableFt: number, fontSize: number): string {
  const charWidth = fontSize * 0.58;
  const maxChars = Math.max(3, Math.floor(availableFt / charWidth));
  return text.length <= maxChars ? text : text.slice(0, Math.max(1, maxChars - 1)) + '…';
}

// A rectangular notch through the wall band at the door's location, unioned
// (via the shared evenodd path) with the outer/inner wall rects so the
// hatch — and the wall's own outline stroke — breaks cleanly at the opening.
function doorGapPath(object: SandboxBaseObject, room: { widthFt: number; heightFt: number }): string {
  const bounds = polygonBounds(object.footprint);
  const side = wallSideOfBounds(bounds, room);
  const pad = 0.06;
  if (side === 'top') return `M ${bounds.left} ${-WALL_T - pad} H ${bounds.right} V ${WALL_T + pad} H ${bounds.left} Z`;
  if (side === 'bottom') {
    const y0 = room.heightFt - WALL_T - pad, y1 = room.heightFt + WALL_T + pad;
    return `M ${bounds.left} ${y0} H ${bounds.right} V ${y1} H ${bounds.left} Z`;
  }
  if (side === 'left') return `M ${-WALL_T - pad} ${bounds.top} V ${bounds.bottom} H ${WALL_T + pad} V ${bounds.top} Z`;
  const x0 = room.widthFt - WALL_T - pad, x1 = room.widthFt + WALL_T + pad;
  return `M ${x0} ${bounds.top} V ${bounds.bottom} H ${x1} V ${bounds.top} Z`;
}

function DoorSymbol({ object, room }: { object: SandboxBaseObject; room: { widthFt: number; heightFt: number } }) {
  const swing = computeDoorSwing(object, room);
  if (!swing) return null;
  return (
    <g>
      <line x1={swing.hinge.x} y1={swing.hinge.y} x2={swing.leafTip.x} y2={swing.leafTip.y} style={{ stroke: INK, strokeWidth: 0.05 }} />
      <polyline points={swing.arcPoints.map((p) => `${p.x},${p.y}`).join(' ')} style={{ stroke: INK_SOFT, strokeWidth: 0.03, fill: 'none' }} />
    </g>
  );
}

// A plain double-line notch (no swing) — windows are wall openings too, so
// they still cut the hatch, but read as glazing rather than a door.
function WindowSymbol({ object }: { object: SandboxBaseObject }) {
  if (!object.footprint.points.length) return null;
  const bounds = polygonBounds(object.footprint);
  return <rect x={bounds.left} y={bounds.top} width={bounds.right - bounds.left} height={bounds.bottom - bounds.top} style={{ fill: PAPER, stroke: INK, strokeWidth: 0.035 }} />;
}

const INFRA_POINT_LABEL: Record<string, string> = { electrical_point: 'ELEC', plumbing_point: 'PLMB', ventilation_point: 'VENT' };
const INFRA_POINT_COLOR: Record<string, string> = { electrical_point: '#c98a1f', plumbing_point: '#1f7fc9', ventilation_point: '#3f9c5e' };

function InfraPointSymbol({ object }: { object: SandboxBaseObject }) {
  const point = object.footprint.points[0];
  if (!point) return null;
  const color = INFRA_POINT_COLOR[object.kind] ?? INK_SOFT;
  const label = INFRA_POINT_LABEL[object.kind] ?? object.name.replace(' connection', '').toUpperCase();
  return (
    <g>
      <circle cx={point.x} cy={point.y} r={0.15} style={{ fill: PAPER, stroke: color, strokeWidth: 0.04 }} />
      <text x={point.x} y={point.y - 0.24} textAnchor="middle" fontSize={0.22} fontFamily="var(--mono)" fill={color}>{label}</text>
    </g>
  );
}

const POINT_KINDS = ['utility_connection', 'electrical_point', 'plumbing_point', 'ventilation_point'];
const WALL_OPENING_KINDS = ['door', 'window'];

function WidthDimension({ room }: { room: { widthFt: number; heightFt: number } }) {
  const y = room.heightFt + WALL_T + DIM_GAP;
  return (
    <g>
      <line x1={0} y1={room.heightFt + WALL_T + 0.06} x2={0} y2={y + DIM_EXT} style={{ stroke: INK_SOFT, strokeWidth: 0.02 }} />
      <line x1={room.widthFt} y1={room.heightFt + WALL_T + 0.06} x2={room.widthFt} y2={y + DIM_EXT} style={{ stroke: INK_SOFT, strokeWidth: 0.02 }} />
      <line x1={0} y1={y} x2={room.widthFt} y2={y} style={{ stroke: INK, strokeWidth: 0.028 }} />
      <line x1={-0.1} y1={y + 0.1} x2={0.1} y2={y - 0.1} style={{ stroke: INK, strokeWidth: 0.035 }} />
      <line x1={room.widthFt - 0.1} y1={y + 0.1} x2={room.widthFt + 0.1} y2={y - 0.1} style={{ stroke: INK, strokeWidth: 0.035 }} />
      <text x={room.widthFt / 2} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={0.42} fontFamily="var(--mono)" letterSpacing="0.02em" fill={INK} stroke={PAPER} strokeWidth={0.16} paintOrder="stroke">{feetLabel(room.widthFt)}</text>
    </g>
  );
}

function HeightDimension({ room }: { room: { widthFt: number; heightFt: number } }) {
  const x = -(WALL_T + DIM_GAP);
  return (
    <g>
      <line x1={-WALL_T - 0.06} y1={0} x2={x - DIM_EXT} y2={0} style={{ stroke: INK_SOFT, strokeWidth: 0.02 }} />
      <line x1={-WALL_T - 0.06} y1={room.heightFt} x2={x - DIM_EXT} y2={room.heightFt} style={{ stroke: INK_SOFT, strokeWidth: 0.02 }} />
      <line x1={x} y1={0} x2={x} y2={room.heightFt} style={{ stroke: INK, strokeWidth: 0.028 }} />
      <line x1={x - 0.1} y1={0.1} x2={x + 0.1} y2={-0.1} style={{ stroke: INK, strokeWidth: 0.035 }} />
      <line x1={x - 0.1} y1={room.heightFt + 0.1} x2={x + 0.1} y2={room.heightFt - 0.1} style={{ stroke: INK, strokeWidth: 0.035 }} />
      <text x={x} y={room.heightFt / 2} textAnchor="middle" dominantBaseline="middle" fontSize={0.42} fontFamily="var(--mono)" letterSpacing="0.02em" fill={INK} stroke={PAPER} strokeWidth={0.16} paintOrder="stroke" transform={`rotate(-90 ${x} ${room.heightFt / 2})`}>{feetLabel(room.heightFt)}</text>
    </g>
  );
}

function NorthArrow({ room }: { room: { widthFt: number } }) {
  const cx = room.widthFt - 0.6, cy = -2.05, r = 0.58;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} style={{ fill: PAPER, stroke: INK, strokeWidth: 0.03 }} />
      <polygon points={`${cx},${cy - r + 0.14} ${cx - 0.17},${cy + 0.2} ${cx},${cy + 0.05} ${cx + 0.17},${cy + 0.2}`} style={{ fill: INK }} />
      <text x={cx} y={cy + r + 0.32} textAnchor="middle" fontSize={0.3} fontFamily="var(--mono)" letterSpacing="0.06em" fill={INK}>N</text>
    </g>
  );
}

function ScaleBar() {
  const segs = 5, y = -2.0;
  return (
    <g>
      {Array.from({ length: segs }).map((_, i) => (
        <rect key={i} x={i} y={y} width={1} height={0.16} style={{ fill: i % 2 === 0 ? INK : PAPER, stroke: INK, strokeWidth: 0.02 }} />
      ))}
      <text x={0} y={y - 0.14} fontSize={0.24} fontFamily="var(--mono)" fill={INK}>0</text>
      <text x={segs} y={y - 0.14} textAnchor="end" fontSize={0.24} fontFamily="var(--mono)" fill={INK}>{segs}' scale</text>
    </g>
  );
}

// Shared floor-plan rendering, styled as an architectural blueprint sketch:
// hatched double-line walls with a proper door swing, a light graph-paper
// grid, dimensioned edges, a north arrow/scale bar, and labeled bench
// outlines. Used both by the full report (GeneratedLayoutPlan.tsx,
// interactive with hover) and the dashboard's compact thumbnails (static, no
// hover) so the two never drift into different visual treatments of the
// same data — thumbnails just drop the dimensioning/annotation layer since
// there isn't room to read it at that size.
export function LayoutFloorPlan({
  layout,
  hoveredId,
  onHoverChange,
  className = 'generated-layout-preview',
  ariaLabel = 'Generated laboratory floor plan',
  detailed,
}: {
  layout: SandboxLayout;
  hoveredId?: string | null;
  onHoverChange?: (id: string | null) => void;
  className?: string;
  ariaLabel?: string;
  detailed?: boolean;
}) {
  const interactive = !!onHoverChange;
  const showDetail = detailed ?? interactive;
  const { room } = layout;
  const marginLeft = showDetail ? WALL_T + DIM_GAP + 0.9 : 0;
  const marginBottom = showDetail ? WALL_T + DIM_GAP + 0.8 : 0;
  const marginTop = showDetail ? 2.7 : 0;
  const marginRight = showDetail ? 0.7 : 0;
  const vbX = -marginLeft, vbY = -marginTop;
  const vbW = room.widthFt + marginLeft + marginRight;
  const vbH = room.heightFt + marginTop + marginBottom;

  const wallPathD = [
    `M ${-WALL_T} ${-WALL_T} H ${room.widthFt + WALL_T} V ${room.heightFt + WALL_T} H ${-WALL_T} Z`,
    `M 0 0 H ${room.widthFt} V ${room.heightFt} H 0 Z`,
    ...layout.baseObjects.filter((o) => WALL_OPENING_KINDS.includes(o.kind) && o.footprint.points.length).map((opening) => doorGapPath(opening, room)),
  ].join(' ');

  return (
    <svg className={className} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} role="img" aria-label={ariaLabel}>
      <defs>
        {/* Soft shadow beneath each bench — not a border, just enough lift
            to read as a card sitting on the floor. */}
        <filter id="benchShadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0.18" stdDeviation="0.22" floodColor="#14161F" floodOpacity=".28" />
        </filter>
        <pattern id="lfp-hatch" width="0.5" height="0.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="0.5" height="0.5" fill={PAPER} />
          <line x1="0" y1="0" x2="0" y2="0.5" style={{ stroke: INK_SOFT, strokeWidth: 0.07 }} />
        </pattern>
        <pattern id="lfp-grid" width={layout.room.gridFt} height={layout.room.gridFt} patternUnits="userSpaceOnUse">
          <path d={`M ${layout.room.gridFt} 0 L 0 0 0 ${layout.room.gridFt}`} style={{ fill: 'none', stroke: 'rgba(34,36,47,.08)', strokeWidth: 0.015 }} />
        </pattern>
      </defs>

      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill={PAPER} />
      {showDetail && <ScaleBar />}
      {showDetail && <NorthArrow room={room} />}

      <rect x={0} y={0} width={room.widthFt} height={room.heightFt} fill="url(#lfp-grid)" />

      {showDetail && layout.baseObjects.filter((o) => !WALL_OPENING_KINDS.includes(o.kind) && !POINT_KINDS.includes(o.kind) && o.footprint.points.length >= 3).map((o) => (
        <polygon key={o.id} points={o.footprint.points.map((p) => `${p.x},${p.y}`).join(' ')} style={{ fill: 'rgba(34,36,47,.06)', stroke: INK_SOFT, strokeWidth: 0.03, strokeDasharray: '.12 .09' }} />
      ))}
      {showDetail && layout.baseObjects.filter((o) => POINT_KINDS.includes(o.kind) && o.footprint.points[0]).map((o) => <InfraPointSymbol key={o.id} object={o} />)}

      <path d={wallPathD} fillRule="evenodd" style={{ fill: 'url(#lfp-hatch)', stroke: INK, strokeWidth: 0.055 }} />

      {layout.baseObjects.filter((o) => o.kind === 'window' && o.footprint.points.length).map((window) => <WindowSymbol key={window.id} object={window} />)}
      {layout.baseObjects.filter((o) => o.kind === 'door' && o.footprint.points.length).map((door) => <DoorSymbol key={door.id} object={door} room={room} />)}

      {layout.fixtures.map((fixture) => {
        const size = exactFootprint(fixture);
        const x = fixture.x * layout.room.gridFt;
        const y = fixture.y * layout.room.gridFt;
        const { width, height } = size;
        const station = fixture.stations[0];
        const equipmentNames = fixture.stations.flatMap((assignment) => assignment.equipment.map((item) => item.name));
        const summary = `${station?.name ?? fixture.name}. ${equipmentNames.length ? `Equipment: ${equipmentNames.join(', ')}` : 'No equipment assigned.'}`;
        const color = stationColor(station?.stationId);
        const isHovered = hoveredId === fixture.instanceId;
        const iconSize = Math.min(0.85, Math.min(width, height) * 0.55);
        const canShowLabel = width >= 1.6 && height >= 0.75;
        const fontSize = Math.min(0.4, Math.max(0.22, height * 0.28));
        return (
          <g
            key={fixture.instanceId}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? 'button' : undefined}
            aria-label={interactive ? summary : undefined}
            onMouseEnter={interactive ? () => onHoverChange!(fixture.instanceId) : undefined}
            onMouseLeave={interactive ? () => onHoverChange!(null) : undefined}
            onFocus={interactive ? () => onHoverChange!(fixture.instanceId) : undefined}
            onBlur={interactive ? () => onHoverChange!(null) : undefined}
          >
            {interactive && <title>{summary}</title>}
            <rect
              x={x} y={y} width={width} height={height}
              filter="url(#benchShadow)"
              style={{ fill: color, fillOpacity: isHovered ? 0.3 : 0.14, stroke: INK, strokeWidth: isHovered ? 0.11 : 0.055, transition: 'fill-opacity .15s ease, stroke-width .15s ease' }}
            />
            {width > 0.5 && height > 0.5 && (
              <rect x={x + 0.12} y={y + 0.12} width={Math.max(0, width - 0.24)} height={Math.max(0, height - 0.24)} style={{ fill: 'none', stroke: INK_SOFT, strokeWidth: 0.025, pointerEvents: 'none' }} />
            )}
            {canShowLabel ? (
              <>
                <svg x={x + 0.15} y={y + height / 2 - iconSize / 2} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
                  <ZoneIcon zone={station?.zone ?? 'unassigned'} />
                </svg>
                <text x={x + 0.15 + iconSize + 0.12} y={y + height / 2} dominantBaseline="middle" fontSize={fontSize} fontFamily="var(--mono)" letterSpacing="0.01em" fill={INK} style={{ pointerEvents: 'none' }}>
                  {truncateLabel(station?.name ?? fixture.name, width - iconSize - 0.5, fontSize)}
                </text>
              </>
            ) : (
              <svg x={x + width / 2 - iconSize / 2} y={y + height / 2 - iconSize / 2} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
                <ZoneIcon zone={station?.zone ?? 'unassigned'} />
              </svg>
            )}
          </g>
        );
      })}

      {showDetail && <WidthDimension room={room} />}
      {showDetail && <HeightDimension room={room} />}
    </svg>
  );
}
