import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APPROVED_LAYOUT_SEEDS_QUERY, DELETE_LAYOUT_SEED_MUTATION, REVIEW_LAYOUT_CANDIDATE_MUTATION, START_LAYOUT_OPTIMIZATION_MUTATION } from '../graphql/operations';
import { fixtureFootprint, parseSandboxLayout, type SandboxLayout } from '../lib/layout-sandbox';
import { Logo } from '../components/Logo';

type Metrics = { hardViolations: number; stationDistanceProxyFt: number; zoneCohesionFt?: number; valid?: boolean; score: number };
type Candidate = { index: number; strategy: string; layout: SandboxLayout; metrics: Metrics };
type OptimizationResult = { selectedCandidate: number; candidates: Candidate[] };
type OptimizationResponse = { startLayoutOptimization: { runId: string; result: OptimizationResult } };
type ApprovedSeed = { seedId: string; strategy: string; layout: unknown; createdAt: string; metrics: Metrics };

function CandidatePreview({ layout }: { layout: SandboxLayout }) {
  return <svg className="lc-preview" viewBox={`0 0 ${layout.room.widthFt} ${layout.room.heightFt}`} preserveAspectRatio="xMidYMid meet" aria-label={`Preview of ${layout.name}`}>
    <rect className="lc-room" x="0" y="0" width={layout.room.widthFt} height={layout.room.heightFt} />
    {layout.fixtures.map((fixture) => {
      const size = fixtureFootprint(fixture, 1);
      return <g key={fixture.instanceId}><rect className={`lc-fixture ${fixture.kind}`} x={fixture.x} y={fixture.y} width={size.width} height={size.height} rx=".2"><title>{fixture.name}</title></rect><text x={fixture.x + .25} y={fixture.y + .7}>{fixture.stations[0]?.name ?? fixture.name}</text></g>;
    })}
    {layout.baseObjects.filter((object) => object.kind === 'door').map((object) => <polygon key={object.id} className="lc-door" points={object.footprint.points.map((point) => `${point.x},${point.y}`).join(' ')} />)}
  </svg>;
}

export function LayoutCandidatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Handed in from the sandbox via router state (see sendToSeedGenerator in
  // LayoutSandboxPage.tsx) — a one-shot hand-off, not a persisted document,
  // so a direct/refreshed visit to this page has no source layout.
  const [sourceLayout] = useState<SandboxLayout | null>(() => {
    const state = location.state as { sourceLayout?: unknown } | null;
    return state?.sourceLayout ? parseSandboxLayout(state.sourceLayout) : null;
  });
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [runId, setRunId] = useState('');
  const [reviews, setReviews] = useState<Record<number, 'approved' | 'rejected'>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [message, setMessage] = useState(sourceLayout ? 'Ready to generate candidates from the current sandbox layout.' : 'Open the sandbox and send a layout to the seed generator first.');
  const [runOptimization, { loading }] = useMutation<OptimizationResponse>(START_LAYOUT_OPTIMIZATION_MUTATION);
  const [reviewCandidate, { loading: reviewLoading }] = useMutation(REVIEW_LAYOUT_CANDIDATE_MUTATION);
  const [deleteLayoutSeed, { loading: deleteLoading }] = useMutation(DELETE_LAYOUT_SEED_MUTATION);
  const { data: seedData, refetch: refetchSeeds } = useQuery<{ layoutSeeds: ApprovedSeed[] }>(APPROVED_LAYOUT_SEEDS_QUERY, { fetchPolicy: 'network-only' });
  const approvedSeeds = seedData?.layoutSeeds ?? [];

  async function generate(batchSeed = seed) {
    if (!sourceLayout) return setMessage('Open the sandbox and send a layout to the seed generator first.');
    try {
      setMessage('Generating and optimizing candidate layouts…');
      const response = await runOptimization({ variables: { input: { layout: sourceLayout, seed: batchSeed } } });
      const next = response.data?.startLayoutOptimization.result;
      if (!next?.candidates?.length) throw new Error('The optimizer returned no candidates. Restart the backend if it is running older code.');
      const candidates = next.candidates.flatMap((candidate) => {
        const parsed = parseSandboxLayout(candidate.layout);
        return parsed ? [{ ...candidate, layout: parsed }] : [];
      });
      setResult({ ...next, candidates });
      setRunId(response.data?.startLayoutOptimization.runId ?? '');
      setReviews({});
      setMessage(`Generated ${candidates.length} candidates. Candidate ${next.selectedCandidate + 1} has the best optimizer score.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function review(candidate: Candidate, status: 'approved' | 'rejected') {
    if (!runId) return setMessage('Generate a candidate batch before reviewing it.');
    try {
      await reviewCandidate({ variables: { input: { runId, candidateIndex: candidate.index, status, reason: status === 'rejected' ? reasons[candidate.index] || 'bad_workflow' : 'good_topology' } } });
      setReviews((current) => ({ ...current, [candidate.index]: status }));
      if (status === 'approved') await refetchSeeds();
      setMessage(`Candidate ${candidate.index + 1} ${status}. Your decision has been saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function removeSeed(seedId: string) {
    if (!window.confirm('Delete this approved seed? The source design and other seeds will not be changed.')) return;
    try {
      await deleteLayoutSeed({ variables: { seedId } });
      await refetchSeeds();
      setMessage('Seed deleted. Its source design and all other seeds were preserved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function generateAnotherBatch() {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    await generate(nextSeed);
  }

  function openCandidate(candidate: Candidate) {
    navigate('/layout-sandbox', { state: { loadLayout: { ...candidate.layout, name: `${candidate.layout.name} — ${candidate.strategy}` } } });
  }

  return <div className="screen lc-screen">
    <header className="qm-topbar"><button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button><div><div className="logo-mark"><Logo height={40} /></div><div className="ls-subtitle">Layout candidate review</div></div></header>
    <main className="lc-body">
      <section className="lc-controls">
        <div><h1>Seed lab</h1><p>Generate diverse solutions from the current sandbox layout and inspect every optimizer starting point.</p></div>
        <div><span className="field-label">Sandbox layout</span><b>{sourceLayout?.name ?? 'No layout provided'}</b></div>
        <label><span className="field-label">Random seed</span><input className="field-input" type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value) || 1)} /></label>
        <button className="btn-teal" disabled={loading || !sourceLayout} onClick={() => void generate()}>{loading ? 'Generating…' : 'Generate candidates'}</button>
      </section>
      <div className="lc-message">{message}</div>
      {sourceLayout && <section className="lc-saved-section"><div className="lc-section-heading"><h2>Generator input</h2><p>This sandbox layout is passed directly to the optimizer.</p></div><CandidatePreview layout={sourceLayout} /></section>}
      <section className="lc-saved-section"><div className="lc-section-heading"><h2>Approved seed library</h2><p>Each approval creates a separate seed. Submitting a new design never replaces seeds already here.</p></div>{approvedSeeds.length === 0 ? <div className="lc-empty-library">No approved seeds yet.</div> : <div className="lc-saved-grid">{approvedSeeds.map((seedItem) => { const preview = parseSandboxLayout(seedItem.layout); return <article className="lc-saved-card lc-seed-card" key={seedItem.seedId}>{preview ? <CandidatePreview layout={preview} /> : <div className="lc-invalid-preview">Preview unavailable</div>}<span><b>{seedItem.strategy}</b><small>Approved {new Date(seedItem.createdAt).toLocaleString()}</small></span><button className="lc-delete-seed" disabled={deleteLoading} onClick={() => void removeSeed(seedItem.seedId)}>Delete seed</button></article>; })}</div>}</section>
      {result && <div className="lc-section-heading lc-results-heading"><div><h2>Generated candidates</h2><p>Candidate {result.selectedCandidate + 1} has the best optimizer score.</p></div><button className="btn-out" disabled={loading} onClick={() => void generateAnotherBatch()}>{loading ? 'Generating…' : 'Generate another batch'}</button></div>}
      <section className="lc-grid">
        {result?.candidates.map((candidate) => <article className={`lc-card ${candidate.index === result.selectedCandidate ? 'winner' : ''}`} key={candidate.index}>
          <div className="lc-card-head"><div><span>Candidate {candidate.index + 1}</span><h2>{candidate.strategy}</h2></div>{candidate.index === result.selectedCandidate && <b>Best score</b>}</div>
          <CandidatePreview layout={candidate.layout} />
          <div className="lc-validity"><b className={candidate.metrics.valid === false || candidate.metrics.hardViolations ? 'invalid' : 'valid'}>{candidate.metrics.valid === false || candidate.metrics.hardViolations ? 'Invalid layout' : 'Passes current rules'}</b></div>
          <div className="lc-metrics"><span>Violations <b>{candidate.metrics.hardViolations}</b></span><span>Workflow distance <b>{candidate.metrics.stationDistanceProxyFt} ft</b></span><span>Zone cohesion <b>{candidate.metrics.zoneCohesionFt ?? '—'}</b></span><span>Score <b>{candidate.metrics.score}</b></span></div>
          <select className="field-input lc-reason" value={reasons[candidate.index] || 'bad_workflow'} onChange={(event) => setReasons((current) => ({ ...current, [candidate.index]: event.target.value }))}><option value="bad_workflow">Bad workflow</option><option value="unsafe_aisle">Unsafe aisle or egress</option><option value="poor_zoning">Poor zoning</option><option value="equipment_placement">Unrealistic equipment placement</option><option value="utilities">Difficult utilities</option><option value="insufficient_storage">Insufficient storage</option><option value="too_similar">Too similar to another layout</option></select>
          <div className="lc-review-actions"><button className="btn-out" onClick={() => openCandidate(candidate)}>Edit</button><button disabled={reviewLoading} className={reviews[candidate.index] === 'rejected' ? 'active reject' : 'reject'} onClick={() => review(candidate, 'rejected')}>Reject</button><button disabled={reviewLoading} className={reviews[candidate.index] === 'approved' ? 'active approve' : 'approve'} onClick={() => review(candidate, 'approved')}>Approve seed</button></div>
        </article>)}
      </section>
    </main>
  </div>;
}
