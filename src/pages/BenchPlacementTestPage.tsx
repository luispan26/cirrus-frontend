import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { PLACE_BENCHES_MUTATION } from '../graphql/operations';
import { ZONE_HANDOFF_SESSION_KEY } from './ZoneGenerationTestPage';

// Mirrors cirrus-backend/src/bench-placement/bench-placement.types.ts — no
// shared types package between the two repos, same manually-kept-in-sync
// tradeoff ZoneGenerationTestPage's own copy makes for zone-generation.types.ts.
interface Cell { row: number; column: number; }
interface ZoneHandoffZone {
  id: string;
  family: string;
  cells: Cell[];
  minimumWidthCells: number;
  circulationAccessCells: Cell[];
}
interface ZoneHandoff {
  grid: { rows: number; columns: number; cellSizeInches: number; usableCells: Cell[]; blockedCells: Cell[]; reservedCirculationCells: Cell[] };
  fixedFeatures: { id: string; type: string; cells: Cell[]; clearanceCells?: Cell[] }[];
  zones: ZoneHandoffZone[];
}
interface PlacedBench {
  id: string;
  requirementId: string;
  zoneId: string;
  origin: Cell;
  rotationDegrees: number;
  footprintCells: Cell[];
  accessSide: string;
  accessCells: Cell[];
}
interface PlacementGridInfo {
  rows: number;
  columns: number;
  cellSizeInches: number;
  sourceCellSizeInches: number;
  scaleFactor: number;
}
interface BenchPlacementResult {
  solveStatus: string | null;
  accessConnectivityMode: string;
  validation: { state: 'VALID' | 'INVALID' | 'NOT_RUN'; violations: string[] };
  placementGrid: PlacementGridInfo;
  remainingZoneCells: Cell[];
  remainingPlaceableCells: Cell[];
  benches: PlacedBench[];
}

// A standalone fixture — works without ever running zone generation, so
// bench-placement regressions can be tested without a zone solve
// obscuring which layer actually broke (see this feature's own "keep a
// standalone input mode" requirement).
function buildDefaultZoneHandoff(): ZoneHandoff {
  const rows = 10;
  const columns = 10;
  const usableCells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) usableCells.push({ row, column });
  }
  const prepCells: Cell[] = [];
  for (let row = 1; row < rows; row++) {
    for (let column = 0; column < columns; column++) prepCells.push({ row, column });
  }
  return {
    grid: {
      rows, columns, cellSizeInches: 12, usableCells,
      blockedCells: [],
      reservedCirculationCells: Array.from({ length: columns }, (_, column) => ({ row: 0, column })),
    },
    fixedFeatures: [],
    zones: [
      {
        id: 'prep', family: 'CleanMolecular', cells: prepCells, minimumWidthCells: 2,
        circulationAccessCells: Array.from({ length: columns }, (_, column) => ({ row: 1, column })),
      },
    ],
  };
}

function buildDefaultBenchRequirements() {
  return [
    { id: 'standard-bench', quantity: 2, lengthInches: 72, depthInches: 30, allowedRotations: [0, 90], workingAisleWidthInches: 36, allowedZoneIds: ['prep'] },
  ];
}

const ZONE_COLORS = ['#049295', '#C41678', '#8A6FE8', '#E8A13F', '#3F8FE8'];
const BENCH_FILL = '#2b2b2b';
const ACCESS_FILL = '#F2C94C';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

interface BBox { minRow: number; maxRow: number; minCol: number; maxCol: number; }
function bboxOf(cells: Cell[]): BBox {
  return {
    minRow: Math.min(...cells.map((c) => c.row)),
    maxRow: Math.max(...cells.map((c) => c.row)),
    minCol: Math.min(...cells.map((c) => c.column)),
    maxCol: Math.max(...cells.map((c) => c.column)),
  };
}
function formatFeet(feet: number): string {
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
function PlacementGrid({ zoneHandoff, scale, result }: { zoneHandoff: ZoneHandoff; scale: number; result: BenchPlacementResult | null }) {
  const cellSize = 14;
  const { grid, zones } = zoneHandoff;
  const subRows = grid.rows * scale;
  const subCols = grid.columns * scale;
  const placementCellSizeInches = grid.cellSizeInches / scale;

  const zoneColorById = new Map(zones.map((z, i) => [z.id, ZONE_COLORS[i % ZONE_COLORS.length]]));
  const zoneByOriginalCell = new Map<string, string>();
  for (const zone of zones) for (const c of zone.cells) zoneByOriginalCell.set(`${c.row},${c.column}`, zone.id);
  const usableSet = new Set(grid.usableCells.map((c) => `${c.row},${c.column}`));
  const blockedSet = new Set(grid.blockedCells.map((c) => `${c.row},${c.column}`));
  const circulationSet = new Set(grid.reservedCirculationCells.map((c) => `${c.row},${c.column}`));
  const featureBlockedSet = new Set<string>();
  for (const feature of zoneHandoff.fixedFeatures) {
    for (const c of [...feature.cells, ...(feature.clearanceCells ?? [])]) featureBlockedSet.add(`${c.row},${c.column}`);
  }

  const rects = [];
  for (let sr = 0; sr < subRows; sr++) {
    for (let sc = 0; sc < subCols; sc++) {
      const originalKey = `${Math.floor(sr / scale)},${Math.floor(sc / scale)}`;
      const subKey = `${sr},${sc}`;
      const zoneId = zoneByOriginalCell.get(originalKey);
      let fill: string;
      if (!usableSet.has(originalKey) || blockedSet.has(originalKey) || featureBlockedSet.has(originalKey)) {
        fill = '#2b2b2b';
      } else if (zoneId) {
        fill = zoneColorById.get(zoneId) ?? '#999';
      } else if (circulationSet.has(originalKey)) {
        fill = '#d8d8d8';
      } else {
        fill = '#fbfbfa';
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
        <rect x={x} y={y} width={w} height={h} fill={BENCH_FILL} fillOpacity={0.82} stroke="#000" strokeWidth={1.5} rx={2} />
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
      {benchOverlays}
    </svg>
  );
}

export function BenchPlacementTestPage() {
  const navigate = useNavigate();
  const [zoneHandoffText, setZoneHandoffText] = useState(() => JSON.stringify(buildDefaultZoneHandoff(), null, 2));
  const [benchRequirementsText, setBenchRequirementsText] = useState(() => JSON.stringify(buildDefaultBenchRequirements(), null, 2));
  const [placementCellSizeInches, setPlacementCellSizeInches] = useState(6);
  const [parseError, setParseError] = useState('');
  const [placeBenches, { data, loading, error }] = useMutation<{ placeBenches: BenchPlacementResult }>(PLACE_BENCHES_MUTATION);

  const zoneHandoff = useMemo<ZoneHandoff | null>(() => {
    try {
      return JSON.parse(zoneHandoffText);
    } catch {
      return null;
    }
  }, [zoneHandoffText]);

  function loadLastValidZoneResult() {
    const stored = sessionStorage.getItem(ZONE_HANDOFF_SESSION_KEY);
    if (!stored) {
      setParseError('No valid zone result saved this session yet — generate zones and click "Use for bench placement" first.');
      return;
    }
    setParseError('');
    setZoneHandoffText(JSON.stringify(JSON.parse(stored), null, 2));
  }

  function handleSubmit() {
    setParseError('');
    let handoff: ZoneHandoff;
    let benchRequirements: unknown;
    try {
      handoff = JSON.parse(zoneHandoffText);
    } catch {
      setParseError('Zone handoff is not valid JSON.');
      return;
    }
    try {
      benchRequirements = JSON.parse(benchRequirementsText);
    } catch {
      setParseError('Bench requirements is not valid JSON.');
      return;
    }
    const input = {
      grid: handoff.grid,
      fixedFeatures: handoff.fixedFeatures ?? [],
      zones: handoff.zones,
      placementCellSizeInches,
      benchRequirements,
    };
    placeBenches({ variables: { input } }).catch(() => {
      // surfaced via `error` below
    });
  }

  const result = data?.placeBenches;
  // Prefer the server's own placementGrid.scaleFactor once a result exists
  // — it's the authoritative record of what grid every cell field on the
  // result actually uses, rather than a client-side recomputation that
  // could silently drift from it (the exact class of bug this field was
  // added to prevent).
  const scale = result ? result.placementGrid.scaleFactor : zoneHandoff ? Math.round(zoneHandoff.grid.cellSizeInches / placementCellSizeInches) : 1;

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            BENCH PLACEMENT TEST PAGE
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>
            Feasibility only — no optimization objective yet. Access-to-circulation is a direct-adjacency approximation, not full path connectivity: a bench's aisle strip must be clear and must directly touch its zone's own circulation-adjacent cells, but a corridor that has to bend around obstacles to reach circulation isn't modeled yet.
          </div>
        </div>
        <button className="btn-out" onClick={() => navigate('/zone-generation-test')}>← Zone generation</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', minWidth: 360 }}>
            <div className="sec-head">Zone handoff <div className="sec-line" /></div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <button className="btn-out" onClick={loadLastValidZoneResult}>Load last valid zone result</button>
            </div>
            <textarea
              value={zoneHandoffText}
              onChange={(e) => setZoneHandoffText(e.target.value)}
              rows={14}
              style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 11, padding: 10, borderRadius: 8, border: '1px solid var(--br)', boxSizing: 'border-box' }}
              spellCheck={false}
            />

            <div className="sec-head" style={{ marginTop: 16 }}>Bench requirements <div className="sec-line" /></div>
            <textarea
              value={benchRequirementsText}
              onChange={(e) => setBenchRequirementsText(e.target.value)}
              rows={10}
              style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 11, padding: 10, borderRadius: 8, border: '1px solid var(--br)', boxSizing: 'border-box' }}
              spellCheck={false}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 6, alignItems: 'center' }}>
                placementCellSizeInches
                <input
                  type="number" min={1} value={placementCellSizeInches}
                  onChange={(e) => setPlacementCellSizeInches(Number(e.target.value) || 6)}
                  style={{ width: 60, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn-teal" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Placing…' : 'Place benches'}
              </button>
            </div>
            {parseError && <div style={{ color: '#a33', fontSize: 12, marginTop: 6 }}>{parseError}</div>}
            {error && (
              <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginTop: 12 }}>{errMsg(error)}</div>
            )}
          </div>

          <div style={{ flex: '1 1 460px', minWidth: 360 }}>
            <div className="sec-head">Result <div className="sec-line" /></div>
            {!result && !loading && <div style={{ fontSize: 12, color: 'var(--mid)' }}>Nothing placed yet.</div>}
            {loading && <div style={{ fontSize: 12, color: 'var(--mid)' }}>Solving — this can take a while.</div>}
            {result && zoneHandoff && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--tl)', color: 'var(--td)' }}>
                    {result.solveStatus ?? 'UNKNOWN'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999,
                      background: result.validation.state === 'VALID' ? 'var(--tl)' : result.validation.state === 'INVALID' ? '#FFEAF5' : '#eee',
                      color: result.validation.state === 'VALID' ? 'var(--td)' : result.validation.state === 'INVALID' ? '#C41678' : '#666',
                    }}
                  >
                    {result.validation.state}
                  </span>
                  <span
                    title="Which access-to-circulation check produced this result — an UNSATISFIABLE outcome only proves no placement exists under this mode's rule, not that no real layout can work."
                    style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#eee', color: '#666' }}
                  >
                    access: {result.accessConnectivityMode}
                  </span>
                </div>

                {result.validation.violations.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 12, marginBottom: 14 }}>
                    {result.validation.violations.map((v, i) => <div key={i}>{v}</div>)}
                  </div>
                )}
                {result.validation.state === 'NOT_RUN' && (
                  <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--mid)', marginBottom: 6 }}>
                    No candidate to show — MiniZinc returned no solution. Grid below shows the zone layout only.
                  </div>
                )}

                <PlacementGrid zoneHandoff={zoneHandoff} scale={scale} result={result.validation.state === 'NOT_RUN' ? null : result} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  {zoneHandoff.zones.map((z, i) => (
                    <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: ZONE_COLORS[i % ZONE_COLORS.length], display: 'inline-block' }} />
                      <span>{z.id} ({z.family})</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: BENCH_FILL, display: 'inline-block' }} />
                    <span>bench footprint</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: ACCESS_FILL, display: 'inline-block' }} />
                    <span>access / aisle</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#d8d8d8', display: 'inline-block' }} />
                    <span>circulation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#2b2b2b', display: 'inline-block' }} />
                    <span>blocked / feature / outside shell</span>
                  </div>
                </div>

                <details style={{ marginTop: 16 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--mid)' }}>Raw result JSON</summary>
                  <pre style={{ fontSize: 11, background: '#fbfbfa', border: '1px solid var(--br)', borderRadius: 8, padding: 12, overflowX: 'auto' }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
