import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReportView } from '../components/ReportView';

export function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routedData = (location.state as { reportData?: Record<string, any> } | null)?.reportData ?? null;

  const [pastedData, setPastedData] = useState<Record<string, any> | null>(null);
  const [wantsPasteBox, setWantsPasteBox] = useState(false);
  const [pasteKey, setPasteKey] = useState(0);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState('');

  // A fresh navigation here (a different report, from Dashboard or
  // GeneratingPage) should always win over anything previously pasted or
  // shown — without this, re-navigating to the same /report route with new
  // state wouldn't actually update anything, since useState only reads its
  // initial value once on mount.
  useEffect(() => {
    setPastedData(null);
    setWantsPasteBox(false);
  }, [location.key]);

  const data = wantsPasteBox ? pastedData : (pastedData ?? routedData);

  // Forces ReportView — and everything inside it, including FloorPlan's
  // internal optimizer state — to fully remount whenever the underlying
  // report actually changes (a fresh navigation, or pasting new JSON),
  // instead of silently re-rendering with stale computed layout state.
  const viewKey = pastedData ? `pasted-${pasteKey}` : location.key;

  function handleParse() {
    const raw = pasteValue.trim();
    setPasteError('');
    if (!raw) {
      setPasteError('Please paste your report JSON.');
      return;
    }
    try {
      setPastedData(JSON.parse(raw));
      setPasteKey((k) => k + 1);
      setWantsPasteBox(false);
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
            <ReportView key={viewKey} data={data} />
            <div style={{ textAlign: 'center' }}>
              <button className="btn-out" onClick={() => { setWantsPasteBox(true); setPastedData(null); setPasteValue(''); }}>Paste a different report</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}