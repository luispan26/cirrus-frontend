import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReportView } from '../components/ReportView';

export function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialData = (location.state as { reportData?: Record<string, any> } | null)?.reportData ?? null;

  const [data, setData] = useState<Record<string, any> | null>(initialData);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState('');

  function handleParse() {
    const raw = pasteValue.trim();
    setPasteError('');
    if (!raw) {
      setPasteError('Please paste your report JSON.');
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch {
      setPasteError('Invalid JSON — check for missing brackets or quotes.');
    }
  }

  return (
    <div className="screen report-screen">
      <div className="rep-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'white', letterSpacing: '.08em' }}>CIRRUS</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Lab Design Report</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Powered by Cirrus + n8n</div>
          </div>
        </div>
        <button className="back-white" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>
      <div className="rep-body">
        {!data ? (
          <div className="rep-paste">
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>Paste a report JSON manually</div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 14 }}>
              Normally you land here automatically after Guided Mode or chat finishes. This is a manual fallback for testing.
            </div>
            <textarea
              className="paste-area"
              placeholder='{"total_budget": 250000, "essential_equipment": "[...]", "protocols_json": "[...]", ...}'
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
            />
            <div className="rep-err">{pasteError}</div>
            <button className="btn-teal" style={{ marginTop: 12, width: '100%', padding: 12, fontSize: 14, borderRadius: 8 }} onClick={handleParse}>
              Render report
            </button>
          </div>
        ) : (
          <>
            <ReportView data={data} />
            <div style={{ textAlign: 'center' }}>
              <button className="btn-out" onClick={() => { setData(null); setPasteValue(''); }}>Paste a different report</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
