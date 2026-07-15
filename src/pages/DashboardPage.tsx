import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { MY_REPORTS_QUERY } from '../graphql/operations';
import { useAuth } from '../context/AuthContext';

interface ReportSummary {
  id: string;
  status: string;
  createdAt: string;
  data: Record<string, unknown> | null;
  error: string | null;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtMoney(n: unknown): string {
  return typeof n === 'number' && n ? '$' + n.toLocaleString() : '—';
}
function statusBadge(status: string) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    ready: { bg: '#E9F6F5', color: '#358C86', label: 'Ready' },
    pending: { bg: '#FBEBF1', color: '#D1316B', label: 'Generating…' },
    failed: { bg: '#FBEBF1', color: '#A8215A', label: 'Failed' },
  };
  const s = styles[status] || styles.pending;
  return <span className="proto-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data, loading, error, refetch } = useQuery<{ myReports: ReportSummary[] }>(MY_REPORTS_QUERY, {
    fetchPolicy: 'network-only',
  });

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const reports = data?.myReports ?? [];

  return (
    <div className="screen" style={{ background: 'var(--light)' }}>
      <div className="qm-topbar">
        <div className="logo-mark">CIRRUS</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: 'var(--mid)' }}>{user?.name}</div>
        <button className="qm-mode-toggle" onClick={handleLogout}>Log out</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-0.01em' }}>Your lab designs</h2>
              <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4 }}>Every report you've generated, newest first.</p>
            </div>
            <button className="btn-teal" onClick={() => navigate('/scenario')}>+ New lab design</button>
          </div>

                  <div className="sc-grid" style={{ maxWidth: 'none', marginBottom: 24 }}>
          <div className="sc-card active" onClick={() => navigate('/services')}>
            <div className="sc-tag">SERVICES</div>
            <div className="sc-title">Run a protocol</div>
            <div className="sc-desc">Pick a lab you've designed and watch a protocol move through it, station by station.</div>
            <div className="sc-cta">Open →</div>
          </div>
          <div className="sc-card dim">
            <div className="sc-tag">HISTORY — COMING SOON</div>
            <div className="sc-title">Design history</div>
            <div className="sc-desc">A detailed, technical view of every field across all your lab designs.</div>
            <span className="cs-badge">Coming soon</span>
          </div>
          <div className="sc-card dim">
            <div className="sc-tag">PRICING — COMING SOON</div>
            <div className="sc-title">Pricing</div>
            <div className="sc-desc">Plans and pricing for the Cirrus platform.</div>
            <span className="cs-badge">Coming soon</span>
          </div>
        </div>

          {loading && <p style={{ color: 'var(--mid)', fontSize: 13 }}>Loading your reports…</p>}
          {error && <div className="rep-err" style={{ marginBottom: 12 }}>Could not load your reports: {error.message}</div>}

          {!loading && !error && reports.length === 0 && (
            <div className="q-card" style={{ textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
              <div className="q-title" style={{ fontSize: 18 }}>No lab designs yet</div>
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
                  <button className="btn-out" onClick={() => navigate('/report', { state: { reportData: r.data } })}>View report</button>
                )}
                {r.status === 'failed' && (
                  <span style={{ fontSize: 12, color: 'var(--mid)' }}>{r.error}</span>
                )}
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