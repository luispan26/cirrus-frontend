import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

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
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-0.01em' }}>Welcome back</h2>
              <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4 }}>Start a new lab design or pick up where you left off.</p>
            </div>
            <button className="btn-teal" onClick={() => navigate('/scenario')}>+ New lab design</button>
          </div>

          <div className="sc-grid" style={{ maxWidth: 'none', gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="sc-card active" onClick={() => navigate('/services')}>
              <div className="sc-tag">SERVICES</div>
              <div className="sc-title">Run a protocol</div>
              <div className="sc-desc">Pick a lab you've designed and watch a protocol move through it, station by station.</div>
              <div className="sc-cta">Open →</div>
            </div>
            <div className="sc-card active" onClick={() => navigate('/history')}>
              <div className="sc-tag">HISTORY</div>
              <div className="sc-title">Design history</div>
              <div className="sc-desc">Every lab design report you've generated, newest first.</div>
              <div className="sc-cta">Open →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
