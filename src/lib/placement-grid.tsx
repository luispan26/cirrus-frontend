// Shared bench-placement rendering — used by both BenchPlacementTestPage
// (standalone placeBenches testing) and ZoneGenerationTestPage (the
// combined generateZonesAndPlaceBenches flow). Extracted rather than
// duplicated once a second page needed the identical bench-overlay
// rendering; see PlacementGrid's own comment for why benches are drawn as
// one rectangle per placed bench rather than painted per-cell.
//
// Mirrors cirrus-backend/src/bench-placement/bench-placement.types.ts — no
// shared types package between the two repos, same manually-kept-in-sync
// tradeoff ZoneGenerationTestPage's own copy makes for
// zone-generation.types.ts.
export interface Cell { row: number; column: number; }
export interface ZoneHandoffZone {
  id: string;
  family: string;
  cells: Cell[];
  minimumWidthCells: number;
  circulationAccessCells: Cell[];
}
export interface ZoneHandoff {
  grid: { rows: number; columns: number; cellSizeInches: number; usableCells: Cell[]; blockedCells: Cell[]; reservedCirculationCells: Cell[] };
  fixedFeatures: { id: string; type: string; cells: Cell[]; clearanceCells?: Cell[] }[];
  zones: ZoneHandoffZone[];
}
export interface PlacedBench {
  id: string;
  requirementId: string;
  zoneId: string;
  origin: Cell;
  rotationDegrees: number;
  footprintCells: Cell[];
  accessSide: string;
  accessCells: Cell[];
}
export interface PlacementGridInfo {
  rows: number;
  columns: number;
  cellSizeInches: number;
  sourceCellSizeInches: number;
  scaleFactor: number;
}
export interface BenchPlacementResult {
  solveStatus: string | null;
  accessConnectivityMode: string;
  validation: {
    state: 'VALID' | 'INVALID' | 'NOT_RUN';
    violations: string[];
    // ROUTED_36IN_V1 only: ids of benches whose aisle no 36" corridor
    // reaches, and every cell such a corridor CAN occupy from a door
    // (footprints as obstacles) — the audit trail for accessibility.
    unroutableBenchIds?: string[] | null;
    navigableRegionCells?: Cell[] | null;
  };
  placementGrid: PlacementGridInfo;
  remainingZoneCells: Cell[];
  remainingPlaceableCells: Cell[];
  benches: PlacedBench[];
}

export const ZONE_COLORS = ['#049295', '#C41678', '#8A6FE8', '#E8A13F', '#3F8FE8'];
export const BENCH_FILL = '#2b2b2b';
export const ACCESS_FILL = '#F2C94C';

// --- shared shell / wall / door classification ------------------------
// One source of truth for "what is at this original cell" so the pure
// zoning view (ZoneGenerationTestPage's ZoneGrid) and the combined
// zone+bench view (PlacementGrid) cannot diverge on it again. They used
// to: the combined renderer folded EVERY fixed-feature cell — sinks,
// plumbing, AND the Entrance/Exit doorways — into one black "blocked"
// layer, painting shut the deliberate gaps the walls were built around,
// while the pure zoning view (which ignored features entirely) still
// showed them.
export const WALL_FILL = '#2b2b2b';        // outside the shell, a declared obstacle, or a non-portal fixed feature
export const CIRCULATION_FILL = '#d8d8d8'; // reserved circulation corridor
export const UNASSIGNED_FILL = '#fbfbfa';  // usable floor no zone claimed
export const PORTAL_FILL = '#fbfbfa';      // a doorway: the wall is absent here, so it reads as floor showing through

// Entrance/Exit are the wall openings ("portals"): walkable for routing,
// unavailable for a bench footprint, and NEVER part of the black wall
// layer. Every other FixedFeatureKind is a solid obstacle.
//
// These are the code-first-GraphQL enum KEYS ('Entrance'/'Exit'), which
// is what NestJS puts on the wire — not the 'entrance'/'exit' runtime
// values. Same gotcha as GridEdgeSide / ZoneGenerationValidationState;
// see this file's accessSide switch and the backend enum comments.
export const PORTAL_FEATURE_TYPES: ReadonlySet<string> = new Set(['Entrance', 'Exit']);

export type ShellCellKind = 'wall' | 'zone' | 'portal' | 'circulation' | 'unassigned';

export interface ShellSets {
  usableSet: Set<string>;
  blockedSet: Set<string>;
  circulationSet: Set<string>;
  portalSet: Set<string>;          // Entrance/Exit feature cells
  blockedFeatureSet: Set<string>;  // every other feature's cells + all clearance cells
}

type ShellGrid = { usableCells: Cell[]; blockedCells: Cell[]; reservedCirculationCells: Cell[] };
type ShellFeature = { type: string; cells: Cell[]; clearanceCells?: Cell[] };

const cellKey = (c: Cell) => `${c.row},${c.column}`;

export function buildShellSets(grid: ShellGrid, fixedFeatures: readonly ShellFeature[] = []): ShellSets {
  const portalSet = new Set<string>();
  const blockedFeatureSet = new Set<string>();
  for (const feature of fixedFeatures) {
    if (PORTAL_FEATURE_TYPES.has(feature.type)) {
      for (const c of feature.cells) portalSet.add(cellKey(c));
    } else {
      for (const c of feature.cells) blockedFeatureSet.add(cellKey(c));
    }
    // Clearance is impassable for every feature type, doorway swing
    // included — but a door's own opening cells stay walkable.
    for (const c of feature.clearanceCells ?? []) blockedFeatureSet.add(cellKey(c));
  }
  return {
    usableSet: new Set(grid.usableCells.map(cellKey)),
    blockedSet: new Set(grid.blockedCells.map(cellKey)),
    circulationSet: new Set(grid.reservedCirculationCells.map(cellKey)),
    portalSet,
    blockedFeatureSet,
  };
}

// Precedence, highest first: wall (outside shell / declared obstacle /
// non-portal feature) > zone > portal > circulation > unassigned. A
// portal cell is deliberately never a wall — it is the gap the wall was
// built around. Pass the ORIGINAL (not subgrid) "row,column" key.
export function shellCellKind(originalKey: string, sets: ShellSets, hasZone: boolean): ShellCellKind {
  if (!sets.usableSet.has(originalKey) || sets.blockedSet.has(originalKey) || sets.blockedFeatureSet.has(originalKey)) return 'wall';
  if (hasZone) return 'zone';
  if (sets.portalSet.has(originalKey)) return 'portal';
  if (sets.circulationSet.has(originalKey)) return 'circulation';
  return 'unassigned';
}

interface BBox { minRow: number; maxRow: number; minCol: number; maxCol: number; }
export function bboxOf(cells: Cell[]): BBox {
  return {
    minRow: Math.min(...cells.map((c) => c.row)),
    maxRow: Math.max(...cells.map((c) => c.row)),
    minCol: Math.min(...cells.map((c) => c.column)),
    maxCol: Math.max(...cells.map((c) => c.column)),
  };
}
export function formatFeet(feet: number): string {
  return `${Number(feet.toFixed(2)).toString().replace(/\.?0+$/, '')}′`;
}

// Renders at the placement subgrid resolution throughout (not the coarser
// zone grid) — zone color comes from looking up which zone owns the
// parent original cell under each subcell. Benches and their aisles are
// NOT painted per-cell on top of that grid — a per-cell fill makes
// adjacent bench footprints visually merge into one undifferentiated
// mass, indistinguishable as separate objects. Each PlacedBench instead
// gets one rectangle computed from its footprint's bounding box (a bench
// footprint is always a solid rectangle by construction — see
// BENCH_PLACEMENT_MODEL's footprint-containment constraint), with a
// small inset so touching benches still show a visible gap, a labeled
// working edge, and its aisle drawn as one hatched rectangle behind it.
export function PlacementGrid({ zoneHandoff, scale, result }: { zoneHandoff: ZoneHandoff; scale: number; result: BenchPlacementResult | null }) {
  const cellSize = 14;
  const { grid, zones } = zoneHandoff;
  const subRows = grid.rows * scale;
  const subCols = grid.columns * scale;
  const placementCellSizeInches = grid.cellSizeInches / scale;

  const zoneColorById = new Map(zones.map((z, i) => [z.id, ZONE_COLORS[i % ZONE_COLORS.length]]));
  const zoneByOriginalCell = new Map<string, string>();
  for (const zone of zones) for (const c of zone.cells) zoneByOriginalCell.set(`${c.row},${c.column}`, zone.id);
  const shellSets = buildShellSets(grid, zoneHandoff.fixedFeatures);

  const rects = [];
  for (let sr = 0; sr < subRows; sr++) {
    for (let sc = 0; sc < subCols; sc++) {
      const originalKey = `${Math.floor(sr / scale)},${Math.floor(sc / scale)}`;
      const subKey = `${sr},${sc}`;
      const zoneId = zoneByOriginalCell.get(originalKey);
      let fill: string;
      switch (shellCellKind(originalKey, shellSets, !!zoneId)) {
        case 'wall': fill = WALL_FILL; break;
        case 'zone': fill = zoneColorById.get(zoneId!) ?? '#999'; break;
        case 'portal': fill = PORTAL_FILL; break;
        case 'circulation': fill = CIRCULATION_FILL; break;
        default: fill = UNASSIGNED_FILL; break;
      }
      rects.push(
        <rect
          key={subKey}
          x={sc * cellSize} y={sr * cellSize} width={cellSize - 0.5} height={cellSize - 0.5}
          fill={fill} stroke="#00000015"
        />,
      );
    }
  }

  // Route witness (ROUTED_36IN_V1): the cells a 36" corridor can occupy
  // from a door, footprints as obstacles. Drawn as a translucent green
  // wash — coalesced into per-row runs so it stays a handful of rects —
  // so it is visible why each bench is or isn't reachable. A bench whose
  // aisle never touches this wash is in unroutableBenchIds.
  const navigableRuns: { x: number; y: number; w: number }[] = [];
  {
    const cells = (result?.validation.navigableRegionCells ?? []).slice().sort((a, b) => a.row - b.row || a.column - b.column);
    for (let k = 0; k < cells.length; k++) {
      const start = cells[k];
      let end = start.column;
      while (k + 1 < cells.length && cells[k + 1].row === start.row && cells[k + 1].column === end + 1) {
        end = cells[++k].column;
      }
      navigableRuns.push({ x: start.column * cellSize, y: start.row * cellSize, w: (end - start.column + 1) * cellSize });
    }
  }
  const unroutableSet = new Set(result?.validation.unroutableBenchIds ?? []);

  const benchOverlays = (result?.benches ?? []).map((bench, i) => {
    const footprintBox = bboxOf(bench.footprintCells);
    const inset = 1.5;
    const x = footprintBox.minCol * cellSize + inset;
    const y = footprintBox.minRow * cellSize + inset;
    const w = (footprintBox.maxCol - footprintBox.minCol + 1) * cellSize - inset * 2;
    const h = (footprintBox.maxRow - footprintBox.minRow + 1) * cellSize - inset * 2;

    const widthCells = footprintBox.maxCol - footprintBox.minCol + 1;
    const heightCells = footprintBox.maxRow - footprintBox.minRow + 1;
    const lengthCells = bench.rotationDegrees === 0 ? widthCells : heightCells;
    const depthCells = bench.rotationDegrees === 0 ? heightCells : widthCells;
    const dimLabel = `${formatFeet((lengthCells * placementCellSizeInches) / 12)} × ${formatFeet((depthCells * placementCellSizeInches) / 12)}`;
    const orientationGlyph = bench.rotationDegrees === 0 ? '↔' : '↕';

    // Highlighted working edge: a thicker line on whichever side of the
    // rect matches accessSide. GridEdgeSide's wire value is its TS enum
    // KEY ("North"/"South"/"East"/"West"), not its lowercase value — the
    // same code-first GraphQL enum gotcha hit twice already in this
    // codebase (see ZoneGenerationValidationState/BenchPlacementValidationState).
    let edgeLine: { x1: number; y1: number; x2: number; y2: number };
    switch (bench.accessSide) {
      case 'North': edgeLine = { x1: x, y1: y, x2: x + w, y2: y }; break;
      case 'South': edgeLine = { x1: x, y1: y + h, x2: x + w, y2: y + h }; break;
      case 'East': edgeLine = { x1: x + w, y1: y, x2: x + w, y2: y + h }; break;
      default: edgeLine = { x1: x, y1: y, x2: x, y2: y + h }; break; // West
    }

    let accessRect: { x: number; y: number; w: number; h: number } | null = null;
    if (bench.accessCells.length > 0) {
      const accessBox = bboxOf(bench.accessCells);
      accessRect = {
        x: accessBox.minCol * cellSize,
        y: accessBox.minRow * cellSize,
        w: (accessBox.maxCol - accessBox.minCol + 1) * cellSize,
        h: (accessBox.maxRow - accessBox.minRow + 1) * cellSize,
      };
    }

    return (
      <g key={bench.id}>
        {accessRect && (
          <rect
            x={accessRect.x} y={accessRect.y} width={accessRect.w} height={accessRect.h}
            fill="url(#aisle-hatch)" fillOpacity={0.65} stroke={ACCESS_FILL} strokeOpacity={0.8} strokeWidth={1} strokeDasharray="4 3"
          />
        )}
        <rect
          x={x} y={y} width={w} height={h}
          fill={BENCH_FILL} fillOpacity={0.82}
          stroke={unroutableSet.has(bench.id) ? '#E23D6D' : '#000'} strokeWidth={unroutableSet.has(bench.id) ? 2.5 : 1.5} rx={2}
        />
        <line {...edgeLine} stroke={ACCESS_FILL} strokeWidth={4} strokeLinecap="round" />
        <foreignObject x={x} y={y} width={w} height={h}>
          <div
            style={{
              width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'var(--mono)', lineHeight: 1.15, pointerEvents: 'none', overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700 }}>B{i + 1} {orientationGlyph}</span>
            <span style={{ fontSize: 9, opacity: 0.85 }}>{dimLabel}</span>
            {unroutableSet.has(bench.id) && <span style={{ fontSize: 8, fontWeight: 700, color: '#FFC2D3' }}>NO 36″ ROUTE</span>}
          </div>
        </foreignObject>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${subCols * cellSize} ${subRows * cellSize}`} style={{ width: '100%', maxWidth: 560, background: '#fbfbfa', border: '1px solid var(--br)', borderRadius: 10 }}>
      <defs>
        <pattern id="aisle-hatch" width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width={6} height={6} fill={ACCESS_FILL} fillOpacity={0.18} />
          <line x1={0} y1={0} x2={0} y2={6} stroke={ACCESS_FILL} strokeWidth={2.5} />
        </pattern>
      </defs>
      {rects}
      {navigableRuns.map((r, i) => (
        <rect key={`nav-${i}`} x={r.x} y={r.y} width={r.w} height={cellSize} fill="#2E9E6B" fillOpacity={0.16} />
      ))}
      {benchOverlays}
    </svg>
  );
}
