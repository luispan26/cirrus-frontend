import { useNavigate } from 'react-router-dom';

export function SplashPage() {
  const navigate = useNavigate();
  return (
    <div className="screen splash">
      <div className="cloud-wrap">
        <div className="cloud cl" style={{ top: '9%', animationDuration: '26s' }}>
          <svg viewBox="0 0 220 110" width="230"><ellipse cx="90" cy="65" rx="80" ry="48" fill="#4FB3AC" /><ellipse cx="56" cy="54" rx="50" ry="40" fill="#4FB3AC" /><ellipse cx="148" cy="60" rx="60" ry="44" fill="#4FB3AC" /></svg>
        </div>
        <div className="cloud cr" style={{ top: '44%', animationDuration: '32s', animationDelay: '-12s' }}>
          <svg viewBox="0 0 200 100" width="200"><ellipse cx="80" cy="60" rx="70" ry="42" fill="#D1316B" /><ellipse cx="50" cy="50" rx="44" ry="36" fill="#D1316B" /><ellipse cx="132" cy="56" rx="56" ry="40" fill="#D1316B" /></svg>
        </div>
        <div className="cloud cl" style={{ top: '74%', animationDuration: '29s', animationDelay: '-18s' }}>
          <svg viewBox="0 0 180 90" width="180"><ellipse cx="72" cy="54" rx="62" ry="36" fill="#4FB3AC" /><ellipse cx="44" cy="46" rx="38" ry="31" fill="#4FB3AC" /><ellipse cx="118" cy="50" rx="46" ry="32" fill="#4FB3AC" /></svg>
        </div>
      </div>
      <div className="splash-center">
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 40, letterSpacing: '-0.02em', color: 'var(--dark)' }}>CIRRUS</div>
        <p className="tagline">Sky is the limit</p>
        <button className="btn-pill" style={{ marginTop: 40 }} onClick={() => navigate('/scenario')}>
          Get started →
        </button>
      </div>
    </div>
  );
}
