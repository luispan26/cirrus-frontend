import { useNavigate } from 'react-router-dom';
// The cirrus-optimizer app, vendored under src/optimizer (see its README).
import OptimizerApp from '../optimizer/components/OptimizerApp.jsx';
import '../optimizer/optimizer.css';

export function OptimizerPage() {
  const navigate = useNavigate();
  return (
    <div className="cirrus-optimizer">
      <div style={{ maxWidth: 1680, margin: '0 auto', padding: '16px 16px 0' }}>
        <button className="btn small link" onClick={() => navigate('/dashboard')}>← Back to dashboard</button>
      </div>
      <OptimizerApp />
    </div>
  );
}
