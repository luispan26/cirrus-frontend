import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../context/AuthContext';
import { IconHistory, IconLayers, IconFlask, IconGear, IconLogout } from '../components/Icons';
import {
  MY_REPORTS_QUERY, EQUIPMENT_COUNT_QUERY, VALIDATED_PROTOCOLS_QUERY, REPORTS_COUNT_QUERY, USERS_COUNT_QUERY,
} from '../graphql/operations';
import { parseSandboxLayout } from '../lib/layout-sandbox';
import { resetSessionId } from '../lib/session';
import { LabAssetBench } from '../components/LabAssets';
import { LayoutFloorPlan } from '../components/LayoutFloorPlan';
import { Logo } from '../components/Logo';

const NAV_ITEMS = [
  { label: 'Design history', path: '/history', icon: IconHistory },
  { label: 'Saved layouts', path: '/layout-candidates', icon: IconLayers },
  { label: 'Protocols', path: '/protocols', icon: IconFlask },
  { label: 'Settings', path: '/settings', icon: IconGear },
];

interface ReportSummary {
  id: string;
  sessionId: string;
  status: string;
  createdAt: string;
  data: Record<string, any> | null;
  error: string | null;
}

function cap(s: string | undefined): string {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

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
  // Dashboard stat row — system-wide totals, not scoped to this design or
  // this user (see each stat's own tile below). cache-and-network, same as
  // myReports above, so "Labs designed" actually ticks up when you land
  // back here after generating a new report rather than serving a stale
  // cached count.
  const { data: equipmentCountData } = useQuery<{ equipmentList: { equipmentId: string }[] }>(EQUIPMENT_COUNT_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: protocolsData } = useQuery<{ validatedProtocols: { id: string }[] }>(VALIDATED_PROTOCOLS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: reportsCountData } = useQuery<{ reportsCount: number }>(REPORTS_COUNT_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: usersCountData } = useQuery<{ usersCount: number }>(USERS_COUNT_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Skips the "Choose your path" scenario screen — its only real option was
  // always New Lab Design (the other two cards are coming-soon placeholders)
  // — and goes straight into the questionnaire, same reset-then-navigate as
  // that screen's own card used to do.
  function startNewLabDesign() {
    resetSessionId();
    navigate('/questions');
  }

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  const reports = reportsData?.myReports ?? [];
  const readyReports = reports.filter((r) => r.status === 'ready' && r.data);
  const latestReport = readyReports[0] ?? null;
  const reportData = latestReport?.data ?? null;

  const registeredEquipmentCount = equipmentCountData?.equipmentList.length ?? 0;
  const protocolsCount = protocolsData?.validatedProtocols.length ?? 0;
  const labsDesignedCount = reportsCountData?.reportsCount ?? 0;
  const usersCount = usersCountData?.usersCount ?? 0;

  return (
    <div className="screen dash-screen">
      <div className="dash-shell">
        <aside className="dash-sidebar">
          <div className="dash-sidebar-logo"><Logo height={44} /></div>
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
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', letterSpacing: '-0.01em' }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4 }}>Start a new lab design or pick up where you left off.</p>
          </div>

          <div
            className="dash-widget"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 18,
              border: '1px solid var(--tline)',
              boxShadow: 'var(--glow-teal), var(--shadow-sm)',
            }}
          >
            <button className="btn-teal" onClick={startNewLabDesign}>+ Design a New Lab</button>
            <div className="stat" style={{ padding: '14px 22px', border: 'none', boxShadow: 'none', background: 'transparent' }}>
              <div
                className="stat-val"
                style={{
                  fontSize: 26,
                  backgroundImage: 'linear-gradient(135deg, var(--teal), var(--pk))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {labsDesignedCount}
              </div>
              <div className="stat-lbl">Labs designed</div>
            </div>
          </div>

          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat" style={{ padding: '20px 22px' }}><div className="stat-val" style={{ color: 'var(--td)', fontSize: 26 }}>{registeredEquipmentCount}</div><div className="stat-lbl">Registered equipment</div></div>
            <div className="stat" style={{ padding: '20px 22px' }}><div className="stat-val" style={{ color: 'var(--pkd)', fontSize: 26 }}>{protocolsCount}</div><div className="stat-lbl">Validated protocols</div></div>
            <div className="stat" style={{ padding: '20px 22px' }}><div className="stat-val" style={{ color: 'var(--violet)', fontSize: 26 }}>{usersCount}</div><div className="stat-lbl">Unique users</div></div>
          </div>

          <div className="dash-widget dash-widget-preview" style={{ marginTop: 24 }}>
            <div className="dash-widget-head">
              <span>Last lab design</span>
              {latestReport && (
                <button className="dash-widget-link" onClick={() => navigate('/report', { state: { reportData, sessionId: latestReport.sessionId } })}>
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
                <button className="dash-widget-link" onClick={startNewLabDesign} style={{ display: 'block', margin: '6px auto 0' }}>
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
        </div>
      </div>
    </div>
  );
}
