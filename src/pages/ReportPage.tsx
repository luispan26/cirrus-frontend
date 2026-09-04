import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReportView } from '../components/ReportView';
import { setSessionId } from '../lib/session';

export function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routedState = location.state as { reportData?: Record<string, any>; sessionId?: string } | null;
  const routedData = routedState?.reportData ?? null;
  // Absent for the manual paste-JSON fallback path (no real session behind
  // pasted data) — the "Edit questionnaire" button only renders when present.
  const routedSessionId = routedState?.sessionId ?? null;

  function handleEditQuestionnaire() {
    if (!routedSessionId) return;
    // The report being viewed may belong to a different session than
    // whatever's currently active (e.g. opened from Design History) — point
    // the single active-session pointer at it first so /questions loads the
    // right answers.
    setSessionId(routedSessionId);
    navigate('/questions');
  }

  const [pastedData, setPastedData] = useState<Record<string, any> | null>(null);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState('');

  // A fresh navigation here (a different report, from Dashboard or
  // GeneratingPage) should always win over anything previously pasted or
  // shown — without this, re-navigating to the same /report route with new
  // state wouldn't actually update anything, since useState only reads its
  // initial value once on mount.
  useEffect(() => {
    setPastedData(null);
  }, [location.key]);

  const data = pastedData ?? routedData;

  function handleParse() {
    const raw = pasteValue.trim();
    setPasteError('');
    if (!raw) {
      setPasteError('Please paste your report JSON.');
      return;
    }
    try {
      setPastedData(JSON.parse(raw));
    } catch {
      setPasteError('Invalid JSON — check for missing brackets or quotes.');
    }
  }

  return (
    <div className="screen report-screen">
      <div className="rep-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '.08em' }}>CIRRUS</div>
          <div>
            <div style={{ fontFamily: 'var(--head)', fontSize: 14, fontWeight: 500, color: '#fff' }}>Lab Design Report</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>Powered by Cirrus + n8n</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {routedSessionId && (
            <button className="qm-mode-toggle" onClick={handleEditQuestionnaire}>← Edit questionnaire</button>
          )}
          <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </div>
      <div className="rep-body">
        {!data ? (
          <div className="rep-paste">
            <div style={{ fontFamily: 'var(--head)', fontSize: 16, fontWeight: 500, color: 'var(--dark)', marginBottom: 4 }}>Paste a report JSON manually</div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 14 }}>
              Normally you land here automatically after Guided Mode or chat finishes. This is a manual fallback for testing.
            </div>
            <textarea
              className="paste-area"
              placeholder='{"total_budget": 250000, "bom": "[...]", "protocols_json": "[...]", ...}'
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
            />
            <div className="rep-err">{pasteError}</div>
            <button className="btn-teal" style={{ marginTop: 12, width: '100%', padding: 12, fontSize: 14, borderRadius: 8 }} onClick={handleParse}>
              Render report
            </button>
          </div>
        ) : (
          <ReportView data={data} />
        )}
      </div>
    </div>
  );
}
