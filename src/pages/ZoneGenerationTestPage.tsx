import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { GENERATE_ZONES_AND_PLACE_BENCHES_MUTATION, GENERATE_ZONES_MUTATION } from '../graphql/operations';
import { PlacementGrid, ZONE_COLORS, buildShellSets, shellCellKind, WALL_FILL, CIRCULATION_FILL, UNASSIGNED_FILL, PORTAL_FILL } from '../lib/placement-grid';
import type { BenchPlacementResult, ZoneHandoff } from '../lib/placement-grid';

// Mirrors cirrus-backend/src/zoning/zone-generation.types.ts — no shared
// types package between the two repos, same manually-kept-in-sync
// tradeoff FloorPlanParserTestPage's own copy already makes.
interface Cell { row: number; column: number; }
interface BoundingBox { minimumRow: number; maximumRow: number; minimumColumn: number; maximumColumn: number; }
interface GridEdge { side: string; cell: Cell; }
interface UtilityAccess { featureId: string; type: string; distanceCells: number; }
interface GeneratedZone {
  id: string;
  family: string;
  areaCells: number;
  minimumWidthCells: number;
  cells: Cell[];
  boundingBox: BoundingBox;
  boundaryEdges: GridEdge[];
  circulationAccessCells: Cell[];
  adjacentFeatureIds: string[];
  nearbyUtilities: UtilityAccess[];
}
interface ZoneGenerationResult {
  solveStatus: string | null;
  validation: { state: 'VALID' | 'INVALID' | 'NOT_RUN'; violations: string[] };
  unassignedCells: Cell[];
  circulationCells: Cell[];
  zones: GeneratedZone[];
}

// The grid facts ZoneGrid renders from — parsed straight out of the
// request textarea, not inferred from the result. blocked/circulation/
// unusable are properties of the physical shell the caller declared; they
// exist (or don't) whether or not the solver ever produced a candidate,
// so deriving them from the request is what makes "no candidate" still
// render as the correct input shell instead of guessing.
interface RequestGrid {
  rows: number;
  columns: number;
  usableCells: Cell[];
  blockedCells: Cell[];
  reservedCirculationCells: Cell[];
}
type RequestFeature = { id?: string; type: string; cells: Cell[]; clearanceCells?: Cell[] };
const EMPTY_REQUEST_GRID: RequestGrid = { rows: 0, columns: 0, usableCells: [], blockedCells: [], reservedCirculationCells: [] };

// A small, fast-to-solve example exercising every constraint type this
// generator supports: a blocked column, a top circulation corridor, a
// sink a zone requires adjacency to, an entrance, and a must_separate
// pair. Regenerated fresh each "Reset to example" click rather than a
// static literal, since usableCells/reservedCirculationCells need every
// cell of the grid enumerated.
function buildExampleInput() {
  const rows = 6;
  const columns = 8;
  const usableCells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) usableCells.push({ row, column });
  }
  return {
    grid: {
      rows,
      columns,
      cellSizeInches: 12,
      usableCells,
      blockedCells: [{ row: 3, column: 4 }],
      reservedCirculationCells: Array.from({ length: columns }, (_, column) => ({ row: 0, column })),
    },
    fixedFeatures: [
      { id: 'sink-1', type: 'Sink', cells: [{ row: 4, column: 1 }] },
      { id: 'door-1', type: 'Entrance', cells: [{ row: 0, column: 0 }] },
    ],
    zones: [
      { id: 'prep', family: 'CleanMolecular', minimumAreaCells: 8, minimumWidthCells: 2, requiredUtilities: [{ utilityType: 'Sink', mustBeAdjacent: true }] },
      { id: 'culture', family: 'MicrobialCulture', minimumAreaCells: 10, minimumWidthCells: 2 },
      { id: 'shared', family: 'SharedAnalytical', minimumAreaCells: 6, minimumWidthCells: 2 },
    ],
    zoneRelationships: [
      { zoneA: 'prep', zoneB: 'culture', relationship: 'MustSeparate' },
    ],
  };
}

// Bench requirements to go with buildExampleInput's own "prep"/"culture"
// zone ids — deliberately doesn't reference "shared" at all, same as any
// real request that only needs benches in some of its requested zones.
function buildExampleBenchRequirements() {
  return [
    { id: 'prep-bench', quantity: 1, lengthInches: 72, depthInches: 30, allowedRotations: [0, 90], workingAisleWidthInches: 36, allowedZoneIds: ['prep'] },
    { id: 'culture-bench', quantity: 1, lengthInches: 72, depthInches: 30, allowedRotations: [0, 90], workingAisleWidthInches: 36, allowedZoneIds: ['culture'] },
  ];
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

// Renders the request's physical shell (usable/blocked/circulation, all
// read from the request itself, never inferred) with any solved zones
// overlaid on top. This still renders something sensible with zero zones
// — result.zones is empty for a NOT_RUN (no-candidate) result, so the grid
// naturally falls back to "just the input shell" without a special case:
// every usable, non-blocked, non-circulation cell with no zone is
// unassigned by construction, not by checking a result-provided
// unassignedCells list (which is deliberately empty when there's no
// candidate — treating that as "these cells are blocked" was the bug).
function ZoneGrid({ grid, zones, fixedFeatures }: { grid: RequestGrid; zones: GeneratedZone[]; fixedFeatures: RequestFeature[] }) {
  const cellSize = 28;
  const zoneColorById = new Map(zones.map((z, i) => [z.id, ZONE_COLORS[i % ZONE_COLORS.length]]));
  const zoneByCell = new Map<string, string>();
  for (const zone of zones) for (const c of zone.cells) zoneByCell.set(`${c.row},${c.column}`, zone.id);

  // Same wall/door classification the combined bench view uses (see
  // placement-grid.tsx) so the two can't paint the shell differently —
  // an Entrance/Exit doorway stays an opening on both.
  const shellSets = buildShellSets(grid, fixedFeatures);

  const rects = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let column = 0; column < grid.columns; column++) {
      const key = `${row},${column}`;
      const zoneId = zoneByCell.get(key);
      let fill: string;
      let label = '';
      switch (shellCellKind(key, shellSets, !!zoneId)) {
        case 'wall': fill = WALL_FILL; break; // outside the shell, a declared obstacle, or a non-portal fixed feature
        case 'zone':
          fill = zoneColorById.get(zoneId!) ?? '#999';
          label = zoneId![0]?.toUpperCase() ?? '';
          break;
        case 'portal': fill = PORTAL_FILL; break; // Entrance/Exit doorway — an opening, never a wall
        case 'circulation': fill = CIRCULATION_FILL; break;
        default: fill = UNASSIGNED_FILL; break; // usable floor no zone claimed
      }
      rects.push(
        <g key={key}>
          <rect
            x={column * cellSize} y={row * cellSize} width={cellSize - 1} height={cellSize - 1}
            fill={fill} stroke="#00000022"
          />
          {label && (
            <text x={column * cellSize + cellSize / 2} y={row * cellSize + cellSize / 2 + 4} textAnchor="middle" fontSize="11" fill="#fff" fontFamily="var(--mono)">
              {label}
            </text>
          )}
        </g>,
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${grid.columns * cellSize} ${grid.rows * cellSize}`} style={{ width: '100%', maxWidth: 500, background: '#fbfbfa', border: '1px solid var(--br)', borderRadius: 10 }}>
      {rects}
    </svg>
  );
}

// Shared with BenchPlacementTestPage — sessionStorage (not localStorage)
// on purpose: this is a one-shot handoff for the current testing session,
// not something that should silently persist and go stale across browser
// restarts.
export const ZONE_HANDOFF_SESSION_KEY = 'cirrus:lastValidZoneHandoff';

interface PipelineResult {
  zoneResult: ZoneGenerationResult;
  benchResult: BenchPlacementResult | null;
}

export function ZoneGenerationTestPage() {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState(() => JSON.stringify(buildExampleInput(), null, 2));
  const [benchRequirementsText, setBenchRequirementsText] = useState(() => JSON.stringify(buildExampleBenchRequirements(), null, 2));
  const [placementCellSizeInches, setPlacementCellSizeInches] = useState(6);
  const [parseError, setParseError] = useState('');
  // Which mutation's result the Result panel currently shows — the two
  // response shapes (a flat ZoneGenerationResult vs. {zoneResult,
  // benchResult}) are different enough that rendering them from one
  // unified shape would just reintroduce the same "is this really a
  // GeneratedZoneInput or a ZoneSpecInput" confusion this feature exists
  // to remove; branching on which mutation last ran keeps that explicit.
  const [lastRun, setLastRun] = useState<'zones' | 'pipeline'>('zones');
  const [generateZones, { data, loading, error }] = useMutation<{ generateZones: ZoneGenerationResult }>(GENERATE_ZONES_MUTATION);
  const [generateZonesAndPlaceBenches, { data: pipelineData, loading: pipelineLoading, error: pipelineError }] = useMutation<{
    generateZonesAndPlaceBenches: PipelineResult;
  }>(GENERATE_ZONES_AND_PLACE_BENCHES_MUTATION);

  // Only ever called while the "Use for bench placement" button is shown,
  // which is itself gated on solveStatus/validation.state — see this
  // component's own zoneResult.solveStatus === 'SATISFIED' &&
  // validation.state === 'VALID' check right where the button renders.
  // Maps the response down to exactly GeneratedZoneInput's fields (see
  // that type's own comment on the backend) rather than forwarding the
  // raw GraphQL result, which carries __typename and fields
  // PlaceBenchesInput doesn't accept.
  function useForBenchPlacement() {
    const result = data?.generateZones;
    if (!result) return;
    let parsedRequest: { grid: unknown; fixedFeatures?: unknown };
    try {
      parsedRequest = JSON.parse(inputText);
    } catch {
      return;
    }
    const handoff = {
      grid: parsedRequest.grid,
      fixedFeatures: parsedRequest.fixedFeatures ?? [],
      zones: result.zones.map((z) => ({
        id: z.id,
        family: z.family,
        cells: z.cells,
        minimumWidthCells: z.minimumWidthCells,
        circulationAccessCells: z.circulationAccessCells,
      })),
    };
    sessionStorage.setItem(ZONE_HANDOFF_SESSION_KEY, JSON.stringify(handoff));
    navigate('/bench-placement-test');
  }

  const legend = useMemo(() => {
    const result = data?.generateZones;
    if (!result) return [];
    return result.zones.map((z, i) => ({ id: z.id, color: ZONE_COLORS[i % ZONE_COLORS.length], areaCells: z.areaCells, family: z.family }));
  }, [data]);

  function handleSubmit() {
    setParseError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(inputText);
    } catch {
      setParseError('Not valid JSON.');
      return;
    }
    setLastRun('zones');
    generateZones({ variables: { input: parsed } }).catch(() => {
      // surfaced via `error` below
    });
  }

  // Runs generateZones and (only if it succeeds) placeBenches as one
  // request — the backend builds the zone-to-bench handoff itself (see
  // ZoneBenchPipelineService), so this never hand-assembles a
  // GeneratedZoneInput[] the way useForBenchPlacement's sessionStorage
  // relay does for the two-step flow above.
  function handleSubmitPipeline() {
    setParseError('');
    let zoneRequest: unknown;
    let benchRequirements: unknown;
    try {
      zoneRequest = JSON.parse(inputText);
    } catch {
      setParseError('Zone request is not valid JSON.');
      return;
    }
    try {
      benchRequirements = JSON.parse(benchRequirementsText);
    } catch {
      setParseError('Bench requirements is not valid JSON.');
      return;
    }
    setLastRun('pipeline');
    generateZonesAndPlaceBenches({ variables: { input: { zoneRequest, benchRequirements, placementCellSizeInches } } }).catch(() => {
      // surfaced via `pipelineError` below
    });
  }

  function resetToExample() {
    setInputText(JSON.stringify(buildExampleInput(), null, 2));
    setBenchRequirementsText(JSON.stringify(buildExampleBenchRequirements(), null, 2));
    setParseError('');
  }

  const result = data?.generateZones;
  const pipelineResult = pipelineData?.generateZonesAndPlaceBenches;

  // Same mapping useForBenchPlacement does by hand for the two-step flow
  // — here only for rendering PlacementGrid, never sent anywhere; the
  // actual zone-to-bench handoff for this combined call happens entirely
  // inside ZoneBenchPipelineService.
  const pipelineZoneHandoff = useMemo<ZoneHandoff | null>(() => {
    if (!pipelineResult) return null;
    let parsedRequest: { grid: ZoneHandoff['grid']; fixedFeatures?: ZoneHandoff['fixedFeatures'] };
    try {
      parsedRequest = JSON.parse(inputText);
    } catch {
      return null;
    }
    return {
      grid: parsedRequest.grid,
      fixedFeatures: parsedRequest.fixedFeatures ?? [],
      zones: pipelineResult.zoneResult.zones.map((z) => ({
        id: z.id,
        family: z.family,
        cells: z.cells,
        minimumWidthCells: z.minimumWidthCells,
        circulationAccessCells: z.circulationAccessCells,
      })),
    };
  }, [pipelineResult, inputText]);

  const requestGrid = useMemo<RequestGrid>(() => {
    try {
      const parsed = JSON.parse(inputText) as { grid?: Partial<RequestGrid> };
      return {
        rows: parsed.grid?.rows ?? 0,
        columns: parsed.grid?.columns ?? 0,
        usableCells: parsed.grid?.usableCells ?? [],
        blockedCells: parsed.grid?.blockedCells ?? [],
        reservedCirculationCells: parsed.grid?.reservedCirculationCells ?? [],
      };
    } catch {
      return EMPTY_REQUEST_GRID;
    }
  }, [inputText]);

  // Same source as requestGrid — parsed straight from the request textarea
  // so the shell renders identically whether or not a solve ran. Feeds
  // ZoneGrid the doorways so they render as openings, not wall.
  const requestFixedFeatures = useMemo<RequestFeature[]>(() => {
    try {
      const parsed = JSON.parse(inputText) as { fixedFeatures?: RequestFeature[] };
      return Array.isArray(parsed.fixedFeatures) ? parsed.fixedFeatures : [];
    } catch {
      return [];
    }
  }, [inputText]);

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            ZONE GENERATION TEST PAGE
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>
            Edit the request JSON, generate, inspect. Contiguity is enforced as a hard MiniZinc connected() constraint (cp-sat), not by retrying — a SATISFIED result is always contiguous by construction; anything else is UNSATISFIABLE, a timeout, or a rejected candidate, never a disconnected zone.
          </div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', minWidth: 360 }}>
            <div className="sec-head">Request <div className="sec-line" /></div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={26}
              style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 11.5, padding: 10, borderRadius: 8, border: '1px solid var(--br)', boxSizing: 'border-box' }}
              spellCheck={false}
            />
            {parseError && <div style={{ color: '#a33', fontSize: 12, marginTop: 6 }}>{parseError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn-teal" onClick={handleSubmit} disabled={loading || pipelineLoading}>
                {loading ? 'Generating…' : 'Generate zones'}
              </button>
              <button className="btn-out" onClick={resetToExample} disabled={loading || pipelineLoading}>Reset to example</button>
            </div>
            {error && (
              <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginTop: 12 }}>{errMsg(error)}</div>
            )}

            <div className="sec-head" style={{ marginTop: 20 }}>Bench requirements <div className="sec-line" /></div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 8 }}>
              Combined with the zone request above into one generateZonesAndPlaceBenches call — the backend builds the zone-to-bench handoff itself, so nothing here needs to reshape a generateZones response by hand.
            </div>
            <textarea
              value={benchRequirementsText}
              onChange={(e) => setBenchRequirementsText(e.target.value)}
              rows={10}
              style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 11.5, padding: 10, borderRadius: 8, border: '1px solid var(--br)', boxSizing: 'border-box' }}
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
              <button className="btn-teal" onClick={handleSubmitPipeline} disabled={loading || pipelineLoading}>
                {pipelineLoading ? 'Generating zones and placing benches…' : 'Generate zones and place benches'}
              </button>
            </div>
            {pipelineError && (
              <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginTop: 12 }}>{errMsg(pipelineError)}</div>
            )}
          </div>

          <div style={{ flex: '1 1 460px', minWidth: 360 }}>
            <div className="sec-head">Result <div className="sec-line" /></div>
            {!result && !pipelineResult && !loading && !pipelineLoading && <div style={{ fontSize: 12, color: 'var(--mid)' }}>Nothing generated yet.</div>}
            {loading && <div style={{ fontSize: 12, color: 'var(--mid)' }}>Solving — this can take a while (see the note above).</div>}
            {pipelineLoading && <div style={{ fontSize: 12, color: 'var(--mid)' }}>Running zone generation, then (if it succeeds) bench placement — this can take a while.</div>}

            {lastRun === 'zones' && result && (
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
                  {result.solveStatus === 'SATISFIED' && result.validation.state === 'VALID' && (
                    <button className="btn-out" style={{ marginLeft: 'auto' }} onClick={useForBenchPlacement}>
                      Use for bench placement →
                    </button>
                  )}
                </div>

                {result.validation.violations.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 12, marginBottom: 14 }}>
                    {result.validation.violations.map((v, i) => <div key={i}>{v}</div>)}
                  </div>
                )}

                {/* Contiguity is a hard solver constraint now (see the subtitle),
                    so INVALID never means "disconnected zone slipped through" —
                    it means the flood-fill assertion caught a model defect on a
                    real candidate the solver actually produced. NOT_RUN is a
                    different thing entirely (no candidate exists at all —
                    UNSATISFIABLE/UNKNOWN) and must never get this label; the
                    grid below still renders for NOT_RUN, but only the input
                    shell (zones is empty), never a candidate that doesn't
                    exist. */}
                {result.validation.state === 'INVALID' && (
                  <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '.04em', color: '#C41678', marginBottom: 6 }}>
                    LAST REJECTED CANDIDATE — do not use for bench placement
                  </div>
                )}
                {result.validation.state === 'NOT_RUN' && (
                  <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--mid)', marginBottom: 6 }}>
                    No candidate to show — MiniZinc returned no solution. Grid below shows the input shell only.
                  </div>
                )}
                <ZoneGrid grid={requestGrid} zones={result.zones} fixedFeatures={requestFixedFeatures} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  {legend.map((z) => (
                    <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: z.color, display: 'inline-block' }} />
                      <span>{z.id} ({z.family}) — {z.areaCells} cells</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#d8d8d8', display: 'inline-block' }} />
                    <span>circulation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fbfbfa', border: '1px solid var(--br)', display: 'inline-block' }} />
                    <span>unassigned (usable, unclaimed)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#2b2b2b', display: 'inline-block' }} />
                    <span>blocked / outside shell</span>
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

            {lastRun === 'pipeline' && pipelineResult && (
              <>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '.04em', color: 'var(--mid)', marginBottom: 4 }}>ZONING</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--tl)', color: 'var(--td)' }}>
                    {pipelineResult.zoneResult.solveStatus ?? 'UNKNOWN'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999,
                      background: pipelineResult.zoneResult.validation.state === 'VALID' ? 'var(--tl)' : pipelineResult.zoneResult.validation.state === 'INVALID' ? '#FFEAF5' : '#eee',
                      color: pipelineResult.zoneResult.validation.state === 'VALID' ? 'var(--td)' : pipelineResult.zoneResult.validation.state === 'INVALID' ? '#C41678' : '#666',
                    }}
                  >
                    {pipelineResult.zoneResult.validation.state}
                  </span>
                </div>
                {pipelineResult.zoneResult.validation.violations.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 12, marginBottom: 14 }}>
                    {pipelineResult.zoneResult.validation.violations.map((v, i) => <div key={i}>{v}</div>)}
                  </div>
                )}

                {!pipelineResult.benchResult ? (
                  <div style={{ padding: 12, borderRadius: 8, background: '#eee', color: '#666', fontSize: 12, marginBottom: 14 }}>
                    Bench placement did not run — zoning did not produce a SATISFIED+VALID layout.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '.04em', color: 'var(--mid)', marginBottom: 4, marginTop: 14 }}>BENCH PLACEMENT</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--tl)', color: 'var(--td)' }}>
                        {pipelineResult.benchResult.solveStatus ?? 'UNKNOWN'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999,
                          background: pipelineResult.benchResult.validation.state === 'VALID' ? 'var(--tl)' : pipelineResult.benchResult.validation.state === 'INVALID' ? '#FFEAF5' : '#eee',
                          color: pipelineResult.benchResult.validation.state === 'VALID' ? 'var(--td)' : pipelineResult.benchResult.validation.state === 'INVALID' ? '#C41678' : '#666',
                        }}
                      >
                        {pipelineResult.benchResult.validation.state}
                      </span>
                    </div>
                    {pipelineResult.benchResult.validation.violations.length > 0 && (
                      <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 12, marginBottom: 14 }}>
                        {pipelineResult.benchResult.validation.violations.map((v, i) => <div key={i}>{v}</div>)}
                      </div>
                    )}
                  </>
                )}

                {pipelineZoneHandoff && (
                  <PlacementGrid
                    zoneHandoff={pipelineZoneHandoff}
                    scale={pipelineResult.benchResult?.placementGrid.scaleFactor ?? 1}
                    result={pipelineResult.benchResult}
                  />
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  {pipelineResult.zoneResult.zones.map((z, i) => (
                    <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: ZONE_COLORS[i % ZONE_COLORS.length], display: 'inline-block' }} />
                      <span>{z.id} ({z.family}) — {z.areaCells} cells</span>
                    </div>
                  ))}
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
                    {JSON.stringify(pipelineResult, null, 2)}
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
