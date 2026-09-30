import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

// Cirrus's general disclaimers, one section each. More will be added here.
const DISCLAIMERS = [
  {
    title: 'Utilities',
    text: 'Cirrus assumes you can get your utilities reconfigured to your planned layout when moving into your space.',
  },
];

export function DisclaimerPage() {
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
          <h2 style={{ fontFamily: 'var(--head)', fontSize: 26, fontWeight: 500, color: 'var(--dark)', letterSpacing: '-0.01em', marginBottom: 24 }}>Disclaimer</h2>
          {DISCLAIMERS.map(({ title, text }) => (
            <section key={title} className="q-card" style={{ marginBottom: 12 }}>
              <div className="q-title" style={{ fontSize: 15 }}>{title}</div>
              <p className="q-hint" style={{ marginTop: 6 }}>{text}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
