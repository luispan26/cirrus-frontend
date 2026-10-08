// The equipment optimizer's run on this report's layout (report.data.optimization,
// written by the backend's OptimizerService after generation and after every
// floor-plan edit). When it ran, the floor plan above already shows the
// optimized equipment placement; this section says how much walking it saves
// and what it could not account for.

interface OptimizationProtocol {
  protocolId: string;
  title: string;
  zoneId: string;
  zoneSource: string | null;
  runsPerPeriod: number;
  baselineWeightedFt: number | null;
  optimizedWeightedFt: number | null;
  skippedVisits: number;
}

export interface LayoutOptimizationSummary {
  status: 'optimized' | 'unchanged' | 'skipped' | 'failed';
  ranAt: string;
  message?: string;
  solverStatus?: string;
  optimal?: boolean;
  durationMs?: number | null;
  partial?: boolean;
  comparable?: boolean;
  period?: string | null;
  baselineWeightedFt?: number | null;
  optimizedWeightedFt?: number | null;
  improvementFt?: number | null;
  improvementPct?: number | null;
  protocols?: OptimizationProtocol[];
  moves?: { instanceId: string; name: string; fromBenchId: string | null; toBenchId: string | null }[];
  excludedVisits?: { protocolName: string; stepNumber: string | null; equipmentId: string | null; reason: string }[];
  notes?: { level: string; message: string }[];
}

const ZONE_LABELS: Record<string, string> = { microbial: 'Microbial', mammalian: 'Mammalian', general: 'General' };
const zoneLabel = (id: string) => ZONE_LABELS[id] ?? id;
const ft = (n: number | null | undefined) => (typeof n === 'number' ? `${n.toLocaleString()} ft` : '—');
const benchLabel = (id: string | null) => (id ? id.replace(/^bench-/, 'Bench ') : 'unplaced');

function asSummary(value: unknown): LayoutOptimizationSummary | null {
  return value && typeof value === 'object' && typeof (value as { status?: unknown }).status === 'string' ? (value as LayoutOptimizationSummary) : null;
}

const card = { background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--br)', boxShadow: 'var(--shadow-sm)', marginBottom: 12 };
const muted = { color: '#69707F' };
const summaryStyle = { cursor: 'pointer', fontWeight: 600, padding: '6px 0' };

export function LayoutOptimization({ value }: { value: unknown }) {
  const summary = asSummary(value);
  if (!summary) return null;
  const period = summary.period ?? 'week';
  const protocols = summary.protocols ?? [];
  const moves = summary.moves ?? [];
  const skipped = summary.excludedVisits ?? [];
  const notes = summary.notes ?? [];
  const ran = summary.status === 'optimized' || summary.status === 'unchanged';
  const guessedZones = protocols.filter((p) => p.zoneSource === 'auto-coverage');

  return (
    <>
      <div className="sec-head">Layout optimization<div className="sec-line" /></div>

      {!ran && (
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{summary.status === 'skipped' ? 'Not optimized' : 'Optimization did not run'}</div>
          <div style={muted}>{summary.message ?? 'The generated equipment placement is shown above.'}</div>
        </div>
      )}

      {ran && (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat"><div className="stat-val" style={muted}>{ft(summary.baselineWeightedFt)}</div><div className="stat-lbl">Walking per {period}, generated placement</div></div>
            <div className="stat"><div className="stat-val" style={{ color: '#049295' }}>{ft(summary.optimizedWeightedFt)}</div><div className="stat-lbl">Walking per {period}, optimized</div></div>
            <div className="stat">
              <div className="stat-val" style={{ color: '#FF3FA4' }}>{typeof summary.improvementPct === 'number' ? `${summary.improvementPct}%` : '—'}</div>
              <div className="stat-lbl">Less walking{typeof summary.improvementFt === 'number' ? ` (${ft(summary.improvementFt)} per ${period})` : ''}</div>
            </div>
          </div>

          <div style={card}>
            <div style={{ marginBottom: 6 }}>
              {summary.status === 'optimized'
                ? <>The floor plan above shows the optimized equipment placement — <strong>{moves.length} item{moves.length === 1 ? '' : 's'} moved</strong> from where Cirrus first put {moves.length === 1 ? 'it' : 'them'}.</>
                : <>Cirrus's equipment placement was already the best the optimizer found, so nothing moved.</>}
            </div>
            <div style={{ ...muted, fontSize: 13 }}>
              Walking is each protocol's trips between benches, times its runs per {period}.{' '}
              {summary.optimal ? 'This placement is proven optimal for that model.' : `Best placement found in ${Math.round((summary.durationMs ?? 0) / 1000)} s; a longer search might do better.`}
            </div>
            {summary.partial && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#FFF6E5', color: '#8A5A00', fontSize: 13 }}>
                <strong>Partial result.</strong> {skipped.length > 0 ? `${skipped.length} protocol step visit${skipped.length === 1 ? ' was' : 's were'} left out` : 'Some equipment could not be placed'}, so the totals above don't cover everything. See the details below for what to fix.
              </div>
            )}
          </div>

          {protocols.length > 0 && (
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
              <table className="rep-table">
                <thead><tr><th>Protocol</th><th>Zone</th><th>Runs / {period}</th><th>Walking before</th><th>Walking after</th><th>Skipped visits</th></tr></thead>
                <tbody>
                  {protocols.map((p, i) => (
                    <tr className={i % 2 === 1 ? 'odd' : ''} key={p.protocolId}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td>
                        {zoneLabel(p.zoneId)}
                        {p.zoneSource === 'auto-coverage' && <span title="This protocol has no cell type on the Validated Protocols page, so the optimizer picked the zone with most of its equipment." style={{ ...muted, fontSize: 12 }}> (guessed)</span>}
                      </td>
                      <td>{p.runsPerPeriod}</td>
                      <td style={muted}>{ft(p.baselineWeightedFt)}</td>
                      <td style={{ fontWeight: 600, color: '#049295' }}>{ft(p.optimizedWeightedFt)}</td>
                      <td style={p.skippedVisits ? { color: '#C41678', fontWeight: 600 } : muted}>{p.skippedVisits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {guessedZones.length > 0 && (
            <div style={{ ...muted, fontSize: 13, marginBottom: 12 }}>
              Zones marked “guessed” come from protocols with no cell type. Set cell types on the Validated Protocols page so each protocol runs in its own zone.
            </div>
          )}

          {skipped.length > 0 && (
            <details style={card}>
              <summary style={summaryStyle}>Skipped visits ({skipped.length})</summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {skipped.map((x, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong>{x.protocolName}</strong>{x.stepNumber ? `, step ${x.stepNumber}` : ''}{x.equipmentId ? ` (${x.equipmentId})` : ''}: <span style={muted}>{x.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {moves.length > 0 && (
            <details style={card}>
              <summary style={summaryStyle}>Equipment moved ({moves.length})</summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {moves.map((m) => (
                  <li key={m.instanceId} style={{ marginBottom: 4 }}>
                    {m.name}: <span style={muted}>{benchLabel(m.fromBenchId)} → {benchLabel(m.toBenchId)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {notes.length > 0 && (
        <details style={card}>
          <summary style={summaryStyle}>Optimizer notes ({notes.length})</summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {notes.map((n, i) => (
              <li key={i} style={{ marginBottom: 4, ...(n.level === 'error' ? { color: '#C41678' } : n.level === 'warning' ? {} : muted) }}>{n.message}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
