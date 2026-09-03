import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../context/AuthContext';
import { IconHistory, IconLayers, IconFlask, IconGear, IconLogout } from '../components/Icons';
import { MY_REPORTS_QUERY } from '../graphql/operations';
import { parseSandboxLayout } from '../lib/layout-sandbox';
import { LAB_ASSETS, LabAssetBench } from '../components/LabAssets';
import { LayoutFloorPlan } from '../components/LayoutFloorPlan';

const NAV_ITEMS = [
  { label: 'Design history', path: '/history', icon: IconHistory },
  { label: 'Saved layouts', path: '/layout-candidates', icon: IconLayers },
  { label: 'Protocols', path: '/protocols', icon: IconFlask },
  { label: 'Settings', path: '/settings', icon: IconGear },
];

interface ReportSummary {
  id: string;
  status: string;
  createdAt: string;
  data: Record<string, any> | null;
  error: string | null;
}

function cap(s: string | undefined): string {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

// DAMPLab Canvas — separate app (see cumulab/canvas-deploy), not a route in this SPA.
const CANVAS_URL = (import.meta.env.VITE_CANVAS_URL as string) || 'http://localhost:8088';

function LayoutThumbnail({ reportData, label }: { reportData: Record<string, any> | null; label: string }) {
  const layout = reportData?.generated_layout?.data ? parseSandboxLayout(reportData.generated_layout.data) : null;
  if (!layout) return null;
  return <LayoutFloorPlan layout={layout} ariaLabel={label} />;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: reportsData, loading: reportsLoading } = useQuery<{ myReports: ReportSummary[] }>(MY_REPORTS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  const reports = reportsData?.myReports ?? [];
  const readyReports = reports.filter((r) => r.status === 'ready' && r.data);
  const latestReport = readyReports[0] ?? null;
  const reportData = latestReport?.data ?? null;
  const recentReports = readyReports.slice(1, 5);

  const protocols: any[] = Array.isArray(reportData?.protocols_json) ? reportData.protocols_json : [];
  // bom (Prompt 3) replaced essential_equipment as the report's equipment
  // source — its rows use equipmentSpecification, not name, hence the map.
  const equipment: string[] = Array.from(
    new Set(
      ([] as any[])
        .concat((reportData?.bom || []).map((r: any) => r?.equipmentSpecification), reportData?.recommended_equipment?.map((e: any) => e?.name) || [])
        .filter(Boolean),
    ),
  );

  return (
    <div className="screen dash-screen">
      <div className="dash-shell">
        <aside className="dash-sidebar">
          <div className="dash-sidebar-logo">CIRRUS</div>
          <nav className="dash-nav">
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
              <button key={path} className="dash-nav-item" onClick={() => navigate(path)}>
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="dash-sidebar-foot">
            <button className="dash-profile-mini" onClick={() => navigate('/profile')}>
              <span className="dash-avatar">{initial}</span>
              <span className="dash-profile-info">
                <b>{user?.name || 'Profile'}</b>
                <small>{user?.email}</small>
              </span>
            </button>
            <button className="dash-nav-item dash-logout" onClick={handleLogout}>
              <IconLogout />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        <div className="dash-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', letterSpacing: '-0.01em' }}>Welcome back</h2>
              <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4 }}>Start a new lab design or pick up where you left off.</p>
            </div>
            <button className="btn-teal" onClick={() => navigate('/scenario')}>+ New lab design</button>
          </div>

          <div className="sc-grid" style={{ maxWidth: 'none', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="sc-card active" onClick={() => navigate('/layout-candidates')}>
              <div className="sc-tag">SEED LAB</div>
              <div className="sc-title">Review candidates</div>
              <div className="sc-desc">Generate a batch from a saved layout, compare scores, and choose promising seeds.</div>
              <div className="sc-cta">Open →</div>
            </div>
            <div className="sc-card active" onClick={() => navigate('/layout-sandbox')}>
              <div className="sc-tag">SANDBOX</div>
              <div className="sc-title">Build a layout</div>
              <div className="sc-desc">Place bench stations manually, then assign equipment to each station.</div>
              <div className="sc-cta">Open →</div>
            </div>
            <div className="sc-card active" onClick={() => window.open(CANVAS_URL, '_blank', 'noopener,noreferrer')}>
              <div className="sc-tag">CANVAS</div>
              <div className="sc-title">Open Canvas</div>
              <div className="sc-desc">Build workflows from your lab's services on the DAMPLab Canvas workspace.</div>
              <div className="sc-cta">Open →</div>
            </div>
            <div className="sc-card dim">
              <div className="sc-tag">AEOLUS</div>
              <div className="sc-title">Aeolus</div>
              <div className="sc-desc">Connect to Aeolus.</div>
              <span className="cs-badge">Coming soon</span>
            </div>
          </div>

          <div className="dash-widgets-row">
            <div className="dash-widget dash-widget-preview">
              <div className="dash-widget-head">
                <span>Last lab design</span>
                {latestReport && (
                  <button className="dash-widget-link" onClick={() => navigate('/report', { state: { reportData } })}>
                    View report →
                  </button>
                )}
              </div>
              {reportsLoading && reports.length === 0 ? (
                <div className="dash-widget-empty">Loading…</div>
              ) : !latestReport ? (
                <div className="dash-widget-empty">
                  <div className="dash-asset-icon"><LabAssetBench /></div>
                  No completed lab designs yet.
                  <button className="dash-widget-link" onClick={() => navigate('/scenario')} style={{ display: 'block', margin: '6px auto 0' }}>
                    Start one →
                  </button>
                </div>
              ) : (
                <>
                  <div className="dash-widget-sub">
                    {cap(reportData?.business_model) || 'Lab design'} · {new Date(latestReport.createdAt).toLocaleDateString()}
                  </div>
                  <LayoutThumbnail reportData={reportData} label="Last lab design floor plan" />
                  {!reportData?.generated_layout?.data && (
                    <div className="dash-widget-empty">
                      <div className="dash-asset-icon"><LabAssetBench /></div>
                      No floor plan was generated for this design.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="dash-widget-stack">
              <div className="dash-widget">
                <div className="dash-widget-head"><span>Protocols selected</span></div>
                {protocols.length === 0 ? (
                  <div className="dash-widget-empty">No protocols in this design.</div>
                ) : (
                  <div className="dash-widget-tags">
                    {protocols.map((p, i) => (
                      <span className="proto-tag" key={p.id || p.name || i}>{p.name || p.id}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="dash-widget">
                <div className="dash-widget-head"><span>Equipment selected</span></div>
                {equipment.length === 0 ? (
                  <div className="dash-widget-empty">No equipment in this design.</div>
                ) : (
                  <div className="dash-widget-tags">
                    {equipment.map((name) => (
                      <span className="proto-tag" key={name}>{name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dash-widget-head" style={{ marginTop: 26 }}>
            <span>Recent lab layouts</span>
            <button className="dash-widget-link" onClick={() => navigate('/history')}>View all →</button>
          </div>
          {recentReports.length === 0 ? (
            <div className="dash-widget dash-recent-empty">
              {readyReports.length <= 1 ? 'No earlier lab layouts yet — this is your first one.' : 'No earlier lab layouts to show.'}
            </div>
          ) : (
            <div className="dash-recent-row">
              {recentReports.map((r, i) => {
                const Asset = LAB_ASSETS[i % LAB_ASSETS.length];
                return (
                  <div key={r.id} className="dash-recent-card" onClick={() => navigate('/report', { state: { reportData: r.data } })}>
                    <LayoutThumbnail reportData={r.data} label="Lab layout floor plan" />
                    {!r.data?.generated_layout?.data && (
                      <div className="dash-recent-thumb-empty">
                        <div className="dash-asset-icon dash-asset-icon-sm"><Asset /></div>
                        No floor plan
                      </div>
                    )}
                    <div className="dash-recent-card-label">
                      <b>{cap(r.data?.business_model) || 'Lab design'}</b>
                      <small>{new Date(r.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
