import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { GENERATE_REPORT_MUTATION, REPORT_QUERY } from '../graphql/operations';
import { getSessionId } from '../lib/session';
import { Logo } from '../components/Logo';

export function GeneratingPage() {
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runGenerateReport] = useMutation<{ generateReport: { id: string; status: string } }>(GENERATE_REPORT_MUTATION);

  async function start() {
    setError(null);
    setReportId(null);
    try {
      const { data } = await runGenerateReport({ variables: { sessionId } });
      setReportId(data!.generateReport.id);
    } catch (e) {
      setError(String((e as Error).message || e));
    }
  }

  // Guards against the mount effect firing twice (React 18 StrictMode
  // double-invokes effects in dev, and a fast remount could too) — without
  // this, two near-simultaneous generateReport calls can both race past the
  // backend's "unchanged since last report" dedup check before either
  // finishes, creating two report documents for the same session and
  // showing as a duplicate entry in Design History. The "Try again" button
  // below calls start() directly and is unaffected by this guard.
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: reportPollData, error: reportPollError, stopPolling } = useQuery(REPORT_QUERY, {
    variables: { id: reportId },
    skip: !reportId,
    pollInterval: 2000,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (reportPollError) return; // transient errors during polling are fine — pollInterval will retry
    const r = (reportPollData as { report: { status: string; data: Record<string, unknown>; error: string | null } } | undefined)?.report;
    if (!r) return;
    if (r.status === 'ready') {
      stopPolling();
      navigate('/report', { state: { reportData: r.data, sessionId } });
    } else if (r.status === 'failed') {
      stopPolling();
      setError(r.error || 'Report generation failed for an unknown reason.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportPollData, reportPollError]);

  return (
    <div className="screen">
      <div className="qm-topbar">
        <div className="logo-mark"><Logo height={40} /></div>
        <div style={{ flex: 1 }} />
        <button className="qm-mode-toggle" onClick={() => navigate('/scenario')}>← Back</button>
      </div>
      <div className="gen-wrap" style={{ flex: 1, justifyContent: 'center' }}>
        {error ? (
          <>
            <div className="gen-err">Could not generate your report: {error}</div>
            <button className="btn-teal" onClick={start}>Try again</button>
            <button className="btn-out" onClick={() => navigate('/report')}>Paste a report JSON manually instead</button>
          </>
        ) : (
          <>
            <div className="gen-spinner" />
            <div className="gen-title">Generating your lab report…</div>
            <div className="gen-sub">The Cirrus backend has handed your intake off to the automation pipeline. This usually takes a few seconds.</div>
          </>
        )}
      </div>
    </div>
  );
}
