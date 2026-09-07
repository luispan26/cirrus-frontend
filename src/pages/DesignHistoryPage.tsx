import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { DELETE_REPORT_MUTATION, MY_REPORTS_QUERY } from '../graphql/operations';
import { Logo } from '../components/Logo';

interface ReportSummary {
  id: string;
  sessionId: string;
  status: string;
  createdAt: string;
  data: Record<string, unknown> | null;
  error: string | null;
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtMoney(n: unknown): string {
  return typeof n === 'number' && n ? '$' + n.toLocaleString() : '—';
}
function statusBadge(status: string) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    ready: { bg: '#E6FBFB', color: '#049295', label: 'Ready' },
    pending: { bg: '#FFEAF5', color: '#FF3FA4', label: 'Generating…' },
    failed: { bg: '#FFEAF5', color: '#C41678', label: 'Failed' },
  };
  const s = styles[status] || styles.pending;
  return <span className="proto-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

export function DesignHistoryPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<{ myReports: ReportSummary[] }>(MY_REPORTS_QUERY, {
    fetchPolicy: 'network-only',
  });
  const [deleteReport] = useMutation(DELETE_REPORT_MUTATION);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this lab design report? This cannot be undone.')) return;
    await deleteReport({ variables: { id } });
    refetch();
  }

  // Only the last 7 days, not a full log — everything stays in the database
  // (the Dashboard's "Labs designed" stat and "Last lab design" preview both
  // still need the full history), this page just no longer lists older rows.
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const reports = (data?.myReports ?? []).filter((r) => new Date(r.createdAt).getTime() >= oneWeekAgo);

  return (
    <div className="screen" style={{ background: 'var(--light)' }}>
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}><Logo height={40} /></div>
        <div style={{ flex: 1 }} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', letterSpacing: '-0.01em' }}>Design history</h2>
              <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4 }}>Lab design reports from the last 7 days, newest first.</p>
            </div>
            <button className="btn-teal" onClick={() => navigate('/scenario')}>+ New lab design</button>
          </div>

          {loading && <p style={{ color: 'var(--mid)', fontSize: 13 }}>Loading your reports…</p>}
          {error && <div className="rep-err" style={{ marginBottom: 12 }}>Could not load your reports: {error.message}</div>}

          {!loading && !error && reports.length === 0 && (
            <div className="q-card" style={{ textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
              <div className="q-title" style={{ fontSize: 18 }}>{(data?.myReports?.length ?? 0) > 0 ? 'No lab designs in the last 7 days' : 'No lab designs yet'}</div>
              <div className="q-hint">Start your first one — it only takes a few minutes.</div>
              <button className="btn-teal" style={{ width: '100%' }} onClick={() => navigate('/scenario')}>Start a lab design</button>
            </div>
          )}

          {reports.map((r) => (
            <div className="proto-card" key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="proto-name" style={{ marginBottom: 4 }}>
                  {r.data?.business_model ? String(r.data.business_model).replace(/_/g, ' ') : 'Lab design'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                  {fmtDate(r.createdAt)} · {fmtMoney(r.data?.total_budget)} budget
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusBadge(r.status)}
                {r.status === 'ready' && (
                  <button className="btn-out" onClick={() => navigate('/report', { state: { reportData: r.data, sessionId: r.sessionId } })}>View report</button>
                )}
                {r.status === 'failed' && (
                  <span style={{ fontSize: 12, color: 'var(--mid)' }}>{r.error}</span>
                )}
                <button className="icon-btn-danger" title="Delete report" aria-label="Delete report" onClick={() => handleDelete(r.id)}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}

          {!loading && reports.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn-out" onClick={() => refetch()}>Refresh</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
