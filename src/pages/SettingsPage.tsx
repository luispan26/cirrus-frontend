import { useNavigate } from 'react-router-dom';
import { IconFlask, IconLayers, IconBadgeCheck } from '../components/Icons';
import { Logo } from '../components/Logo';

const ADMIN_LINKS = [
  { label: 'Equipment Database', hint: 'Equipment Specification List — cost, dimensions, station assignment.', path: '/inventory', icon: IconFlask },
  { label: 'Equipment Lists', hint: 'Assign equipment into the eight configurable lists (BSL requirements, workflow catalogs, etc).', path: '/equipment-lists', icon: IconLayers },
  { label: 'Validated Protocols', hint: 'Every protocol currently selectable in the intake questionnaire — remove one to pull it from that list.', path: '/validated-protocols', icon: IconBadgeCheck },
];

export function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="screen" style={{ background: 'var(--light)' }}>
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}><Logo height={40} /></div>
        <div style={{ flex: 1 }} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', letterSpacing: '-0.01em', marginBottom: 24 }}>Settings</h2>

          <div className="sec-head">Admin<div className="sec-line" /></div>
          {ADMIN_LINKS.map(({ label, hint, path, icon: Icon }) => (
            <div
              key={path}
              className="q-card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, cursor: 'pointer' }}
              onClick={() => navigate(path)}
            >
              <div style={{ color: 'var(--td)' }}><Icon size={22} /></div>
              <div>
                <div className="q-title" style={{ fontSize: 15 }}>{label}</div>
                <div className="q-hint">{hint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
