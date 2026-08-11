import { useNavigate } from 'react-router-dom';
import { resetSessionId } from '../lib/session';

export function ScenarioPage() {
  const navigate = useNavigate();
  return (
    <div className="screen scenario">
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>CIRRUS</div>
        <div style={{ flex: 1 }} />
         <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>
      <div style={{ textAlign: 'center', padding: '56px 24px 32px' }}>
        <div className="sc-eyebrow">Choose your path</div>
        <h2 style={{ fontFamily: 'var(--head)', fontSize: 30, fontWeight: 500, color: 'var(--dark)', marginBottom: 8, letterSpacing: '-0.01em' }}>
          What best describes your situation?
        </h2>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px 40px', flex: 1, alignItems: 'flex-start' }}>
        <div className="sc-grid">
          <div className="sc-card dim">
            <div className="sc-tag">01 — COMING SOON</div>
            <div className="sc-title">Existing Lab</div>
            <div className="sc-desc">Monetize idle equipment through the Cirrus cloud marketplace.</div>
            <span className="cs-badge">Coming soon</span>
          </div>
          <div className="sc-card active" onClick={() => { resetSessionId(); navigate('/questions'); }}>
            <div className="sc-tag">02</div>
            <div className="sc-title">New Lab Design</div>
            <div className="sc-desc">Design and optimize a lab from scratch with AI-driven equipment and protocol recommendations.</div>
            <div className="sc-cta">Start now →</div>
          </div>
          <div className="sc-card dim">
            <div className="sc-tag">03 — COMING SOON</div>
            <div className="sc-title">Rapid Deployment</div>
            <div className="sc-desc">Get a lab operational fast — for emergency or outbreak response.</div>
            <span className="cs-badge">Coming soon</span>
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '0 24px 40px', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="qm-mode-toggle" onClick={() => { resetSessionId(); navigate('/chat'); }}>
          Prefer to just talk it through? Full-screen chat →
        </button>
      </div>
    </div>
  );
}
