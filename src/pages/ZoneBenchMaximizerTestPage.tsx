import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { MAXIMIZE_ZONES_AND_BENCHES_MUTATION } from '../graphql/operations';
import { ACCESS_FILL, BENCH_FILL, PlacementGrid, ZONE_COLORS } from '../lib/placement-grid';
import type { BenchPlacementResult, Cell, ZoneHandoff } from '../lib/placement-grid';

// Minimal, standalone diagnostic page for ZoneBenchMaximizerService: given
// just a room shell (no target bench count), it repeatedly carves as many
// zones as fit and packs as many benches as fit inside each — see that
// service's own header comment for the algorithm. Deliberately separate
// from ZoneGenerationTestPage/BenchPlacementTestPage rather than reusing
// their JSON-textarea inputs: this tool has exactly one real input (room
// shape + door), so a few number fields are a better fit than a raw JSON
// editor for something no caller hand-assembles zones/benches for.
type WallSide = 'N' | 'S' | 'E' | 'W';

type MaximizeZonesAndBenchesResult = {
  totalZones: number;
  totalBenches: number;
  zoneHandoff: ZoneHandoff;
  // The maximizer also splits the floor into aisle (every walkable cell
  // no bench covers) and equipment-placeable bench tops.
  benchResult: BenchPlacementResult & {
    aisleCells: Cell[];
    equipmentPlaceableCells: Cell[];
    aisleAreaSqFt: number;
    equipmentPlaceableAreaSqFt: number;
  };
};

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function ZoneBenchMaximizerTestPage() {
  const navigate = useNavigate();
  const [widthFt, setWidthFt] = useState(30);
  const [heightFt, setHeightFt] = useState(24);
  const [doorWall, setDoorWall] = useState<WallSide>('S');
  const [doorOffsetFt, setDoorOffsetFt] = useState(13.5);
  const [doorWidthFt, setDoorWidthFt] = useState(3);
  const [mode, setMode] = useState<'max_fit' | 'main_wall'>('max_fit');
  const [mainWall, setMainWall] = useState<WallSide>('S');
  const [sameDirection, setSameDirection] = useState(true);
  const [wallBenches, setWallBenches] = useState(false);
  const [maximize, { data, loading, error }] = useMutation<{ maximizeZonesAndBenches: MaximizeZonesAndBenchesResult }>(
    MAXIMIZE_ZONES_AND_BENCHES_MUTATION,
  );

  function handleSubmit() {
    maximize({
      variables: {
        input: {
          widthFt,
          heightFt,
          door: { wall: doorWall, offsetFt: doorOffsetFt, widthFt: doorWidthFt },
          options: { mode, mainWall: mode === 'main_wall' ? mainWall : undefined, sameDirection, wallBenches },
        },
      },
    }).catch(() => {
      // surfaced via `error` below
    });
  }

  const result = data?.maximizeZonesAndBenches;
  const scale = result ? result.benchResult.placementGrid.scaleFactor : 1;

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            ZONE + BENCH MAXIMIZER TEST PAGE
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>
            No target bench count — fills the room with as many benches as fit, as islands on one room-wide grid with straight aisles.
          </div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 280 }}>
            <div className="sec-head">Room shell <div className="sec-line" /></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                Width (ft)
                <input
                  type="number" min={1} value={widthFt}
                  onChange={(e) => setWidthFt(Number(e.target.value) || 1)}
                  style={{ width: 90, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}
                />
              </label>
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                Height (ft)
                <input
                  type="number" min={1} value={heightFt}
                  onChange={(e) => setHeightFt(Number(e.target.value) || 1)}
                  style={{ width: 90, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}
                />
              </label>
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                Arrangement
                <select value={mode} onChange={(e) => setMode(e.target.value as 'max_fit' | 'main_wall')} style={{ width: 120, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}>
                  <option value="max_fit">Max fit</option>
                  <option value="main_wall">Main wall</option>
                </select>
              </label>
              {mode === 'main_wall' ? (
                <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  Main wall
                  <select value={mainWall} onChange={(e) => setMainWall(e.target.value as WallSide)} style={{ width: 90, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}>
                    <option value="N">N</option><option value="S">S</option><option value="E">E</option><option value="W">W</option>
                  </select>
                </label>
              ) : (
                <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={sameDirection} onChange={(e) => setSameDirection(e.target.checked)} /> All islands the same direction
                </label>
              )}
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={wallBenches} onChange={(e) => setWallBenches(e.target.checked)} /> Also wall benches
              </label>

              <div className="sec-head" style={{ marginTop: 6 }}>Door <div className="sec-line" /></div>
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                Wall
                <select
                  value={doorWall}
                  onChange={(e) => setDoorWall(e.target.value as WallSide)}
                  style={{ width: 90, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}
                >
                  <option value="N">N</option>
                  <option value="S">S</option>
                  <option value="E">E</option>
                  <option value="W">W</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                Offset (ft)
                <input
                  type="number" min={0} step={0.5} value={doorOffsetFt}
                  onChange={(e) => setDoorOffsetFt(Number(e.target.value) || 0)}
                  style={{ width: 90, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}
                />
              </label>
              <label style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                Width (ft)
                <input
                  type="number" min={1} step={0.5} value={doorWidthFt}
                  onChange={(e) => setDoorWidthFt(Number(e.target.value) || 3)}
                  style={{ width: 90, fontFamily: 'var(--mono)', fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--br)' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-teal" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Solving…' : 'Generate'}
              </button>
            </div>
            {error && (
              <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginTop: 12 }}>{errMsg(error)}</div>
            )}
          </div>

          <div style={{ flex: '1 1 460px', minWidth: 360 }}>
            <div className="sec-head">Result <div className="sec-line" /></div>
            {!result && !loading && <div style={{ fontSize: 12, color: 'var(--mid)' }}>Nothing generated yet.</div>}
            {loading && <div style={{ fontSize: 12, color: 'var(--mid)' }}>Solving — larger rooms can take several minutes.</div>}
            {result && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--tl)', color: 'var(--td)' }}>
                    {result.totalZones} zone{result.totalZones === 1 ? '' : 's'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--tl)', color: 'var(--td)' }}>
                    {result.totalBenches} bench{result.totalBenches === 1 ? '' : 'es'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--tl)', color: 'var(--td)' }}>
                    {Math.round(result.benchResult.equipmentPlaceableAreaSqFt)} sq ft equipment-placeable
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--tl)', color: 'var(--td)' }}>
                    {Math.round(result.benchResult.aisleAreaSqFt)} sq ft aisle
                  </span>
                </div>

                <PlacementGrid zoneHandoff={result.zoneHandoff} scale={scale} result={result.benchResult} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  {result.zoneHandoff.zones.map((z, i) => (
                    <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: ZONE_COLORS[i % ZONE_COLORS.length], display: 'inline-block' }} />
                      <span>{z.id} ({z.family})</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: BENCH_FILL, display: 'inline-block' }} />
                    <span>bench top (equipment placeable)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: ACCESS_FILL, display: 'inline-block' }} />
                    <span>working aisle (all other open floor is aisle too)</span>
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
