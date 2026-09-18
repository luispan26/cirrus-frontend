import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { PLACE_BENCHES_MUTATION } from '../graphql/operations';
import { ZONE_HANDOFF_SESSION_KEY } from './ZoneGenerationTestPage';
import { ACCESS_FILL, BENCH_FILL, PlacementGrid, ZONE_COLORS } from '../lib/placement-grid';
import type { BenchPlacementResult, Cell, ZoneHandoff } from '../lib/placement-grid';

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

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
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
