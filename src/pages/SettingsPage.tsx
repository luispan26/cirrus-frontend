import { useNavigate } from 'react-router-dom';
import { IconGear } from '../components/Icons';

export function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="screen" style={{ background: 'var(--light)' }}>
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>CIRRUS</div>
        <div style={{ flex: 1 }} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', letterSpacing: '-0.01em', marginBottom: 4 }}>Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 24 }}>Workspace and account preferences.</p>

          <div className="q-card" style={{ textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--td)', marginBottom: 14 }}>
              <IconGear size={30} />
            </div>
            <div className="q-title" style={{ fontSize: 18 }}>Settings are coming soon</div>
            <div className="q-hint">Notification, billing, and team preferences will live here.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
