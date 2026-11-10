import { useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
// The cirrus-optimizer app, vendored under src/optimizer (see its README).
import OptimizerApp from '../optimizer/components/OptimizerApp.jsx';
import '../optimizer/optimizer.css';

export function OptimizerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Set only when arriving via a report's "Optimize further" button — lets
  // the back button return to that report instead of always the dashboard.
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState ?? null;
  const goBack = () => (returnState ? navigate('/report', { state: returnState }) : navigate('/dashboard'));
  return (
    <div className="screen">
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}><Logo height={40} /></div>
        <div style={{ flex: 1 }} />
        <button className="qm-mode-toggle" onClick={goBack}>{returnState ? '← Back to report' : '← Dashboard'}</button>
      </div>
      {/* cirrus-optimizer scopes the vendored app's own CSS reset (see its
          README) — kept off the page shell above so it can't restyle our
          own header, same boundary the README describes. It's nested one
          level further in (rather than put directly on this scroll
          container) because its own min-height:100vh would otherwise fight
          the screen's overflow:hidden for space as a flex sibling of the
          topbar, instead of just growing taller than the viewport the way
          content inside a scroll container should. */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="cirrus-optimizer">
          <OptimizerApp />
        </div>
      </div>
    </div>
  );
}
