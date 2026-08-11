import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconUser, IconLogout } from '../components/Icons';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="screen" style={{ background: 'var(--light)' }}>
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>CIRRUS</div>
        <div style={{ flex: 1 }} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', letterSpacing: '-0.01em', marginBottom: 24 }}>Profile</h2>

          <div className="q-card" style={{ textAlign: 'center' }}>
            <div className="dash-avatar" style={{ width: 56, height: 56, fontSize: 22, margin: '0 auto 16px' }}>
              {initial}
            </div>
            <div className="q-title" style={{ fontSize: 19, marginBottom: 4 }}>{user?.name || 'Unnamed user'}</div>
            <div className="q-hint" style={{ marginBottom: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconUser size={14} />{user?.email}
            </div>
            <button className="btn-out" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconLogout size={15} />Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
