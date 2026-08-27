import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { MY_REPORTS_QUERY, PROTOCOLS_IO_SEARCH_QUERY } from '../graphql/operations';
import { KB, computeFloorPlan } from '../lib/kb';

interface ReportSummary {
  id: string;
  status: string;
  createdAt: string;
  data: Record<string, any> | null;
}

interface ProtocolSummary { id: string; title: string; sourceUrl: string; publishedOn?: string; authorNames: string[]; }
interface ProtocolSearchResult { totalResults: number; items: ProtocolSummary[]; }

function cap(s: string | undefined): string {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

// Read-only reference list — links out to protocols.io rather than
// reimplementing step/equipment editing (that's ProtocolsTestPage's job).
// Scoped to the Damp Lab workspace only (no public-catalog toggle here);
// leaving the search box blank browses everything currently published.
function DamplabLibraryPanel() {
  const [draft, setDraft] = useState('');
  const [key, setKey] = useState('');
  const { data, loading, error } = useQuery<{ protocolsIoSearch: ProtocolSearchResult }>(
    PROTOCOLS_IO_SEARCH_QUERY,
    { variables: { key, pageSize: 25 } },
  );
  const result = data?.protocolsIoSearch;

  return (
    <div className="q-card" style={{ marginBottom: 24 }}>
      <div className="sec-head" style={{ marginBottom: 10 }}>
        Damp Lab protocol library
        <div className="sec-line" />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input
          className="field-input"
          style={{ flex: 1 }}
          placeholder="Search the Damp Lab workspace"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setKey(draft.trim()); }}
        />
        <button className="btn-out" onClick={() => setKey(draft.trim())} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 12, marginBottom: 12 }}>
          {error.message}
        </div>
      )}

      {result && (
        <>
          <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 8 }}>
            {result.totalResults.toLocaleString()} protocol{result.totalResults === 1 ? '' : 's'} published to the Damp Lab workspace
            {key ? ` matching "${key}"` : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {result.items.map((item) => (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '8px 10px', borderRadius: 6, fontSize: 13, color: 'inherit', textDecoration: 'none' }}
              >
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                  {item.authorNames.length > 0 && <span>{item.authorNames.join(', ')} · </span>}
                  {item.publishedOn && <span>{new Date(item.publishedOn).toLocaleDateString()}</span>}
                </div>
              </a>
            ))}
            {result.items.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--mid)', padding: '8px 0' }}>No protocols matched.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const STEP_INTERVAL_MS = 1800;

export function ServicesPage() {
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ myReports: ReportSummary[] }>(MY_REPORTS_QUERY, {
    fetchPolicy: 'network-only',
  });

  const readyReports = useMemo(() => (data?.myReports ?? []).filter((r) => r.status === 'ready'), [data]);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!selectedReportId && readyReports.length > 0) {
      setSelectedReportId(readyReports[0].id);
    }
  }, [readyReports, selectedReportId]);

  const selectedReport = readyReports.find((r) => r.id === selectedReportId) || null;
  const reportData = selectedReport?.data || {};
  const protocols: { id?: string; name?: string; estimated_time_hours?: number }[] = Array.isArray(reportData.protocols_json)
    ? reportData.protocols_json
    : [];

  useEffect(() => {
    setSelectedProtocolId(protocols[0]?.id ?? null);
    setStepIndex(0);
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReportId]);

  const protocol = protocols.find((p) => p.id === selectedProtocolId) || null;
  const operation = protocol ? KB.operations.find((o) => o.id === protocol.id) : null;

  const steps: string[] = operation?.stations ?? [];

  const fp = useMemo(() => {
    if (!selectedReport) return null;
    const sp = reportData.space || {};
    const width = parseFloat(sp.width_ft) || (sp.sqft ? Math.round(Math.sqrt(sp.sqft * (4 / 3))) : null) || 40;
    const height = parseFloat(sp.height_ft) || (sp.sqft ? Math.round(sp.sqft / width) : null) || 30;
    return computeFloorPlan(reportData, width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport]);

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    if (stepIndex >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [playing, stepIndex, steps.length]);

  function selectProtocol(id: string) {
    setSelectedProtocolId(id);
    setStepIndex(0);
    setPlaying(false);
  }
  function togglePlay() {
    if (stepIndex >= steps.length - 1) setStepIndex(0);
    setPlaying((p) => !p);
  }
  function reset() {
    setStepIndex(0);
    setPlaying(false);
  }

  return (
    <div className="screen" style={{ background: 'var(--light)' }}>
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>CIRRUS</div>
        <div style={{ flex: 1 }} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', marginBottom: 4, letterSpacing: '-0.01em' }}>Services</h2>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 24 }}>
            Browse what Damp Lab has published, or pick a lab you've designed and simulate a protocol running through it.
          </p>

          <DamplabLibraryPanel />

          {loading && <p style={{ color: 'var(--mid)', fontSize: 13 }}>Loading your designs…</p>}

          {!loading && readyReports.length === 0 && (
            <div className="q-card" style={{ textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
              <div className="q-title" style={{ fontSize: 18 }}>No completed lab designs yet</div>
              <div className="q-hint">Finish designing a lab first, then come back here to simulate a protocol running through it.</div>
              <button className="btn-teal" style={{ width: '100%' }} onClick={() => navigate('/scenario')}>Start a lab design</button>
            </div>
          )}

          {!loading && readyReports.length > 0 && (
            <>
              <div className="field-wrap">
                <label className="field-label">Lab design</label>
                <div className="chips">
                  {readyReports.map((r) => (
                    <span
                      key={r.id}
                      className={`chip${r.id === selectedReportId ? ' sel' : ''}`}
                      onClick={() => setSelectedReportId(r.id)}
                    >
                      {cap(r.data?.business_model) || 'Lab design'} · {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>

              {protocols.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--mid)' }}>This design has no protocols to simulate.</p>
              ) : (
                <div className="field-wrap">
                  <label className="field-label">Protocol</label>
                  <div className="chips">
                    {protocols.map((p) => (
                      <span
                        key={p.id}
                        className={`chip${p.id === selectedProtocolId ? ' sel' : ''}`}
                        onClick={() => p.id && selectProtocol(p.id)}
                      >
                        {p.name || p.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {fp && operation && steps.length > 0 && (
                <div className="fp-panel" style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    <button className="btn-teal" style={{ padding: '8px 20px' }} onClick={togglePlay}>
                      {playing ? '⏸ Pause' : stepIndex >= steps.length - 1 ? '↻ Replay' : '▶ Play'}
                    </button>
                    <button className="btn-out" onClick={reset}>Reset</button>
                    <span style={{ fontSize: 12, color: 'var(--mid)' }}>
                      Step {stepIndex + 1} of {steps.length}
                      {protocol?.estimated_time_hours ? ` · ~${protocol.estimated_time_hours} hrs total (real time)` : ''}
                    </span>
                  </div>

                  <div className="fp-util-bar" style={{ marginBottom: 16 }}>
                    <div
                      className="fp-util-fill"
                      style={{ width: `${((stepIndex + 1) / steps.length) * 100}%`, background: 'var(--pk)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px' }}>
                      <div className="field-label" style={{ marginBottom: 10 }}>Steps</div>
                      {steps.map((stationId, i) => {
                        const meta = KB.stations[stationId];
                        const isCurrent = i === stepIndex;
                        const isPast = i < stepIndex;
                        return (
                          <div
                            key={stationId + i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 10px',
                              borderRadius: 8,
                              marginBottom: 6,
                              background: isCurrent ? 'var(--tl)' : 'transparent',
                              border: isCurrent ? '1px solid var(--tline)' : '1px solid transparent',
                              opacity: isPast ? 0.5 : 1,
                              cursor: 'pointer',
                            }}
                            onClick={() => { setStepIndex(i); setPlaying(false); }}
                          >
                            <div
                              style={{
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                background: isCurrent ? '#FF3FA4' : isPast ? '#00D5D5' : '#E7EAF0',
                                color: 'white', fontSize: 10, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {isPast ? '✓' : i + 1}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--dark)', fontWeight: isCurrent ? 700 : 400 }}>
                              {meta?.name || stationId}
                            </div>
                          </div>
                        );
                      })}

                      {operation.equipment.length > 0 && (
                        <>
                          <div className="field-label" style={{ marginTop: 16, marginBottom: 8 }}>Equipment used</div>
                          <div className="proto-tags">
                            {operation.equipment.map((e) => <span className="proto-tag" key={e}>{e}</span>)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}