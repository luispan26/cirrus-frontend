import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { OptionCard } from '../components/OptionCard';
import { SyncBadge } from '../components/SyncBadge';
import { SearchableSelect } from '../components/SearchableSelect';
import { Logo } from '../components/Logo';
import { useIntakeSync } from '../hooks/useIntakeSync';
import {
  QS, OPERATION_OPTS, DAMPLAB_MATCH_KEYWORDS, shouldSkip, stepIndex, buildFinalIntakeJson, FEASIBILITY_GATE_IDS,
  computeBasicLabEquipment, applyBasicLabEquipmentOverrides, BASIC_EQUIPMENT_CATEGORIES,
  type Answers, type QuestionOption,
} from '../lib/questions';
import {
  FEASIBILITY_CHECK_QUERY, EQUIPMENT_LIST_QUERY, EQUIPMENT_LISTS_QUERY, VALIDATED_PROTOCOLS_QUERY, MY_REPORTS_QUERY,
} from '../graphql/operations';
import { getSessionId } from '../lib/session';

type EquipmentRow = { equipmentId: string; name: string; costUsd: number; widthFt: number; depthFt: number; heightFt: number; stationId: string | null; allTags: string[] };
type EquipmentListRow = { listKey: string; displayName: string; equipmentIds: string[] };

type FeasibilityIssue = { field: string; message: string };
type FeasibilityCheckResponse = { feasibilityCheck: { ok: boolean; issues: FeasibilityIssue[] } };

function validateQuestion(id: string, answers: Answers) {
  if (id === 'biosafety_level' && !answers.biosafety_level) return 'Choose a biosafety level.';
  if (id === 'operations') {
    // Protocol selection is optional — a lab design can be generated with
    // zero protocols selected. Any protocol that IS selected still needs
    // its weekly runs entered, though.
    const ops = (answers.operations as string[]) || [];
    const runs = (answers.protocol_runs_per_week as Record<string, number>) || {};
    if (ops.some((opId) => runs[opId] === undefined)) return 'Enter expected weekly runs for every protocol (0 is fine).';
  }
  if (id === 'space') {
    if (!answers.space_method) return 'Choose how you want to define your space.';
    if (answers.space_method === 'upload' && !answers.space_floorplan_filename) return 'Select a floor plan file to upload.';
    if (answers.space_method === 'sandbox' && !(Number(answers.width_ft) > 0 && Number(answers.height_ft) > 0)) {
      return 'Build a room in the sandbox, then use "Use this room in my intake" to bring its dimensions back here.';
    }
  }
  if (id === 'budget') {
    if (!(Number(answers.budget_desired) > 0)) return 'Enter a positive desired budget amount.';
    if (!(Number(answers.budget_max) > 0)) return 'Enter a positive absolute max budget amount.';
    if (Number(answers.budget_max) < Number(answers.budget_desired)) return 'Your max budget can’t be less than your desired budget.';
  }
  return '';
}

// space/budget mean different things depending on whether the client already
// has equipment — inferred from whether existing_equipment_meta (set on the
// equipment-plan step) actually has entries, since there's no separate
// gating question for it — the hint under the question title reflects that
// instead of a single static string.
function questionHint(q: (typeof QS)[number], answers: Answers): string {
  const hasEquipment = Object.keys((answers.existing_equipment_meta as Record<string, unknown>) || {}).length > 0;
  if (q.id === 'space') {
    return hasEquipment
      ? 'Used to generate your floor plan — the available/underutilized footprint you’re building into, not your whole facility.'
      : 'Used to generate your floor plan — your total footprint for this build-out.';
  }
  if (q.id === 'budget') {
    return hasEquipment
      ? 'Incremental spend on top of what you already have.'
      : 'Your full build budget — equipment, and construction if selected below.';
  }
  return q.h;
}

export function QuestionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [qi, setQi] = useState(0);
  const [validationError, setValidationError] = useState('');
  const { answers, status, setField, toggleMultiField, completeIntake } = useIntakeSync(() => {
    navigate('/generating');
  });
  const [runFeasibilityCheck, { loading: checkingFeasibility }] = useLazyQuery<FeasibilityCheckResponse>(FEASIBILITY_CHECK_QUERY, { fetchPolicy: 'network-only' });
  // Cirrus's own generated floor plan, threaded through so the space step's
  // sandbox buttons can open on it instead of a blank room. Populated three
  // ways: the round trip below (router state, from the report's "Open in
  // sandbox" or "Edit questionnaire"), or the refresh-safe MY_REPORTS_QUERY
  // fallback further down if router state was lost (e.g. a hard refresh on
  // this page). Not an intake answer — the sandbox hands back only room
  // width/height (see useInIntake in LayoutSandboxPage.tsx), so this never
  // needs to round-trip through `answers`.
  const [generatedLayout, setGeneratedLayout] = useState<unknown>(null);
  const [fetchMyReports] = useLazyQuery<{ myReports: { sessionId: string; status: string; createdAt: string; data: { generated_layout?: { data?: unknown } } | null }[] }>(MY_REPORTS_QUERY);

  // Router-state round trips into this page, handled together (not as
  // separate early-returning effects) since a future navigation could carry
  // more than one at once: spaceFromSandbox (from the sandbox's "Use this
  // room in my intake"), startAtQuestionId + generatedLayout (from the
  // report's "Edit questionnaire", see ReportPage.tsx).
  useEffect(() => {
    const state = location.state as {
      spaceFromSandbox?: { width_ft: number; height_ft: number };
      startAtQuestionId?: string;
      generatedLayout?: unknown;
    } | null;
    if (!state) return;
    if (state.spaceFromSandbox) {
      const { width_ft, height_ft } = state.spaceFromSandbox;
      setField('width_ft', String(width_ft));
      setField('height_ft', String(height_ft));
      setField('space_method', 'sandbox');
      const spaceIndex = QS.findIndex((sq) => sq.id === 'space');
      if (spaceIndex >= 0) setQi(spaceIndex);
    }
    if (state.startAtQuestionId) {
      const targetIndex = QS.findIndex((sq) => sq.id === state.startAtQuestionId);
      if (targetIndex >= 0) setQi(targetIndex);
    }
    if (state.generatedLayout) {
      setGeneratedLayout(state.generatedLayout);
    }
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = QS[qi];

  // Refresh-safe fallback for the above: a hard refresh on this page loses
  // router state entirely, so if the user reaches the space step with no
  // layout already in memory, look up the newest ready report for this
  // session and use its generated layout instead. Fired lazily — only once
  // the user actually reaches the space step, not on every page load — and
  // MY_REPORTS_QUERY is the same query DashboardPage already runs, so the
  // result is often warm in the Apollo cache.
  useEffect(() => {
    if (q.id !== 'space' || generatedLayout) return;
    const currentSessionId = getSessionId();
    fetchMyReports().then(({ data }) => {
      const reports = data?.myReports ?? [];
      const layoutData = reports
        .filter((r) => r.sessionId === currentSessionId && r.status === 'ready' && r.data?.generated_layout?.data)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.data?.generated_layout?.data;
      if (layoutData) setGeneratedLayout(layoutData);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);
  const applicable = QS.filter((sq) => !shouldSkip(sq, answers));
  const posInApplicable = applicable.indexOf(q) + 1;
  const pct = Math.round(((posInApplicable - 1) / applicable.length) * 100);
  const isLast = stepIndex(qi, 1, answers) >= QS.length;

  function prevQ() {
    const pi = stepIndex(qi, -1, answers);
    if (pi >= 0) setQi(pi);
    else navigate('/scenario');
  }

  async function nextQ() {
  if (checkingFeasibility) return;
  const error = validateQuestion(q.id, answers);
  if (error) { setValidationError(error); return; }
  // Cross-field feasibility, not just this field's own shape — checked
  // against everything answered so far so an incompatibility (budget too
  // low for the chosen protocols, room too small, etc.) is caught here
  // rather than surfacing only after the generator runs.
  if (FEASIBILITY_GATE_IDS.includes(q.id)) {
    const { data } = await runFeasibilityCheck({ variables: { input: buildFinalIntakeJson(answers) } });
    const result = data?.feasibilityCheck;
    if (result && !result.ok) {
      setValidationError(result.issues[0]?.message || 'This combination of answers is not feasible yet.');
      return;
    }
  }
  setValidationError('');
  const ni = stepIndex(qi, 1, answers);
  if (ni < QS.length) {
    setQi(ni);
  } else {
    const finalJson = buildFinalIntakeJson(answers);
    await completeIntake(finalJson as unknown as Record<string, unknown>);
    navigate('/generating');
  }
}

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        nextQ();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        prevQ();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, answers]);

  return (
    <div className="screen questions-screen">
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}><Logo height={40} /></div>
        <div className="qm-prog-track"><div className="qm-prog-fill" style={{ width: `${pct}%` }} /></div>
        <SyncBadge status={status} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>Dashboard</button>
      </div>
      <div className="qm-stage">
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="qm-counter">Question {posInApplicable} of {applicable.length}</div>
          <div className="q-body">
            <QuestionBody q={q} displayNumber={posInApplicable} answers={answers} setField={setField} toggleMultiField={toggleMultiField} onEnterNav={nextQ} generatedLayout={generatedLayout} />
            {validationError && <p className="q-validation-error">{validationError}</p>}
          </div>
        </div>
      </div>
      <div className="qm-footer">
        <button className="btn-out" style={{ visibility: qi === 0 ? 'hidden' : 'visible' }} onClick={prevQ}>← Back</button>
        <div className="qm-kbd-hint">Press <kbd>Enter</kbd> to continue</div>
        <button className="btn-teal" onClick={nextQ} disabled={checkingFeasibility}>
          {checkingFeasibility ? 'Checking…' : isLast ? 'Generate report →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

function QuestionBody({
  q,
  displayNumber,
  answers,
  setField,
  toggleMultiField,
  generatedLayout,
}: {
  q: (typeof QS)[number];
  displayNumber: number;
  answers: Answers;
  setField: (k: string, v: unknown) => void;
  toggleMultiField: (k: string, v: string) => void;
  onEnterNav: () => void;
  generatedLayout: unknown;
}) {
  return (
    <div className="q-card">
      <div className="q-num">Q{displayNumber}</div>
      <div className="q-title">{q.t}</div>
      <div className="q-hint">{questionHint(q, answers)}</div>

      {q.type === 'multi' && <ProtocolSelectBody answers={answers} toggleMultiField={toggleMultiField} setField={setField} />}

      {q.type === 'radio' && (
        <div className="opt-grid" style={{ gridTemplateColumns: '1fr' }}>
          {q.opts!.map((o) => (
            <OptionCard key={o.v} option={o} showRisk selected={answers[q.id] === o.v} onClick={() => setField(q.id, o.v)} />
          ))}
        </div>
      )}

      {q.type === 'checklist' && (
        <div className="opt-grid">
          {q.opts!.map((o) => (
            <OptionCard key={o.v} option={o} selected={((answers[q.id] as string[]) || []).includes(o.v)} onClick={() => toggleMultiField(q.id, o.v)} />
          ))}
        </div>
      )}

      {q.type === 'space' && <SpaceBody answers={answers} setField={setField} generatedLayout={generatedLayout} />}
      {q.type === 'budget' && <BudgetBody answers={answers} setField={setField} />}
      {q.type === 'equipment_plan' && <EquipmentPlanBody answers={answers} setField={setField} />}
    </div>
  );
}

// The full Validated Protocols list is selectable, not just the curated subset with
// a matching Operation definition — an unmatched protocol still gets
// recorded in the final intake payload (see resolveOperationId in
// questions.ts, which passes an unrecognized id through unchanged), it just
// doesn't contribute equipment/space sizing since the backend has no
// Operation to look it up against. Matched protocols additionally record
// which catalog Operation they matched (see ProtocolSelectBody's
// protocol_operation_by_id) so sizing still works, but each protocol keeps
// its own checkbox/id regardless of match — two different validated
// protocols that both title-match the same Operation (e.g. two distinct
// BCA assay kits) must stay independently selectable, not collapse onto one
// shared checkbox.
function findCatalogMatch(title: string): QuestionOption | undefined {
  const lower = title.toLowerCase();
  return OPERATION_OPTS.find((opt) => {
    const keywords = DAMPLAB_MATCH_KEYWORDS[opt.v];
    return keywords && !opt.disabled && keywords.some((kw) => lower.includes(kw));
  });
}

// Select-then-quantify, same pattern as AnalyticalEquipmentBody: adding a
// protocol here immediately surfaces a weekly-runs input for it (folded in
// from the old, separate protocol_demand step) instead of asking again on a
// second screen. Run duration is deliberately not asked here; it's pulled
// from each operation's own estimatedTimeHours metadata on the backend
// (capacity-planner.ts), which combines with this to size bench count (see
// FinalIntakeJson.demand in questions.ts). 0 is a valid answer (no
// throughput-driven extra benches, not "skip this protocol") — validateQuestion
// only requires every selected protocol to have an explicit entry, not a
// positive one.
// Scoped to protocols a technician has explicitly validated on the
// /protocols admin page (see validatedProtocols — validation itself
// requires the protocol to already have equipment mapped to at least one
// step) rather than the full protocols.io catalog: those are the only ones
// Cirrus can actually plan real equipment for, and the only ones a
// technician has signed off as ready. Full scrollable checkbox list, same
// pattern as the Equipment Membership Lists page's "Unassigned" panel —
// select-then-quantify per row, same as AnalyticalEquipmentBody/the old
// protocol_demand step (see FinalIntakeJson.demand in questions.ts).
function ProtocolSelectBody({ answers, toggleMultiField, setField }: { answers: Answers; toggleMultiField: (k: string, v: string) => void; setField: (k: string, v: unknown) => void }) {
  const { data: validatedData, loading, error } = useQuery<{ validatedProtocols: { protocolId: string; title: string; sourceUrl: string }[] }>(VALIDATED_PROTOCOLS_QUERY);
  const validatedItems = validatedData?.validatedProtocols ?? [];

  const mappedProtocols = validatedItems
    .map((item) => {
      const catalogMatch = findCatalogMatch(item.title);
      // value is always the protocol's own real protocols.io id — never
      // the shared catalog operation id — so two different validated
      // protocols matching the same Operation (e.g. two distinct BCA assay
      // kits) get independent checkboxes instead of one toggling both.
      // operationId (set only when matched) is recorded separately via
      // protocol_operation_by_id in toggleProtocol below, purely for
      // equipment/space sizing.
      return { value: item.protocolId, title: item.title, sourceUrl: item.sourceUrl, sized: !!catalogMatch, operationId: catalogMatch?.v };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const selected = (answers.operations as string[]) || [];
  const runs = (answers.protocol_runs_per_week as Record<string, number>) || {};
  const operationByProtocolId = (answers.protocol_operation_by_id as Record<string, string>) || {};
  const [search, setSearch] = useState('');
  const visible = search.trim()
    ? mappedProtocols.filter((p) => p.title.toLowerCase().includes(search.trim().toLowerCase()))
    : mappedProtocols;
  const allVisibleChecked = visible.length > 0 && visible.every((p) => selected.includes(p.value));

  function toggleProtocol(p: { value: string; operationId?: string }) {
    const wasSelected = selected.includes(p.value);
    toggleMultiField('operations', p.value);
    if (wasSelected) {
      const { [p.value]: _removed, ...rest } = runs;
      setField('protocol_runs_per_week', rest);
      if (p.operationId) {
        const { [p.value]: _removedOp, ...restOps } = operationByProtocolId;
        setField('protocol_operation_by_id', restOps);
      }
    } else {
      // Selecting a protocol defaults it to 1 run/week — the user can raise
      // that or uncheck the protocol entirely, but a freshly-checked box
      // never sits at an empty/zero run count.
      setField('protocol_runs_per_week', { ...runs, [p.value]: 1 });
      if (p.operationId) {
        setField('protocol_operation_by_id', { ...operationByProtocolId, [p.value]: p.operationId });
      }
    }
  }

  function toggleAllVisible() {
    for (const p of visible) {
      if (allVisibleChecked) { if (selected.includes(p.value)) toggleProtocol(p); }
      else if (!selected.includes(p.value)) toggleProtocol(p);
    }
  }

  function setRuns(opId: string, value: number) {
    // Floored at 1 while the protocol stays checked — deselecting it
    // entirely is how a user drops it back out, not dialing runs to 0.
    setField('protocol_runs_per_week', { ...runs, [opId]: Math.max(1, Math.round(value)) });
  }

  if (loading) return <p className="q-inline-help">Loading validated protocols…</p>;
  if (error) return <p className="q-validation-error">Couldn’t load validated protocols: {error.message}</p>;

  if (mappedProtocols.length === 0) {
    return <p className="q-inline-help">No protocols have been validated yet — assign equipment to at least one step and validate a protocol on the Protocols page first.</p>;
  }

  return (
    <>
      <p className="q-inline-help" style={{ marginTop: 0 }}>
        Only Validated Protocols are shown ({mappedProtocols.length} available). Check the ones this lab needs and set expected weekly runs for each.
      </p>

      {mappedProtocols.length > 6 && (
        <input
          className="field-input"
          style={{ width: '100%', fontSize: 12, marginBottom: 10 }}
          placeholder="Search protocols…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mid)', marginBottom: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={allVisibleChecked} onChange={toggleAllVisible} />
        Select all {search.trim() ? 'matching' : ''} ({visible.length})
      </label>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 360,
          overflowY: 'scroll',
          border: '1px solid var(--br)',
          borderRadius: 8,
          padding: '10px 10px 2px',
          background: '#fafafa',
          boxShadow: 'inset 0 6px 6px -6px rgba(0,0,0,.12), inset 0 -6px 6px -6px rgba(0,0,0,.12)',
        }}
      >
        {visible.map((p) => {
          const isSelected = selected.includes(p.value);
          return (
            <div key={p.value} style={{ paddingBottom: 8, borderBottom: '1px solid var(--br)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleProtocol(p)} />
                <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{p.title}</span>
                {!p.sized && (
                  <span title="No Operation definition to size a room against yet — still recorded, just not sized." style={{ fontSize: 11, color: 'var(--mid)', border: '1px solid var(--br)', borderRadius: 4, padding: '1px 5px' }}>
                    not sized yet
                  </span>
                )}
                <a href={p.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, color: 'var(--teal)' }}>
                  View on protocols.io →
                </a>
              </label>
              {isSelected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 26, marginTop: 6 }}>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    step={1}
                    style={{ width: 80 }}
                    placeholder="1"
                    value={runs[p.value] ?? 1}
                    onChange={(e) => setRuns(p.value, Number(e.target.value) || 1)}
                  />
                  <span style={{ fontSize: 12, color: 'var(--mid)' }}>runs/week</span>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--mid)', padding: '6px 0' }}>No protocols match "{search}".</div>
        )}
      </div>
    </>
  );
}

function SpaceBody({ answers, setField, generatedLayout }: { answers: Answers; setField: (k: string, v: unknown) => void; generatedLayout: unknown }) {
  const navigate = useNavigate();
  const method = answers.space_method as 'upload' | 'sandbox' | undefined;
  const w = parseFloat((answers.width_ft as string) || '0') || 0;
  const h = parseFloat((answers.height_ft as string) || '0') || 0;
  const hasSandboxRoom = method === 'sandbox' && w > 0 && h > 0;
  const filename = answers.space_floorplan_filename as string | undefined;

  function chooseMethod(next: 'upload' | 'sandbox') {
    setField('space_method', next);
  }

  // Opens on Cirrus's own generated layout, not a blank room, whenever one
  // is available (see the generatedLayout plumbing in QuestionsPage) — the
  // sandbox already handles state.loadLayout on mount.
  function openSandbox() {
    navigate('/layout-sandbox', generatedLayout ? { state: { loadLayout: generatedLayout } } : undefined);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    // Stub — no upload/parsing yet, only the filename is recorded so intent
    // is captured. Actually reading a floor plan into real dimensions is a
    // separate, later piece of work.
    setField('space_floorplan_filename', file.name);
  }

  return (
    <>
      <div className="field-wrap">
        <label className="field-label">How do you want to define your space?</label>
        <div className="chips" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span
              className={`chip${method === 'upload' ? ' sel' : ''}`}
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Coming soon — not selectable yet"
            >
              Upload a floor plan
            </span>
            <span className="cs-badge" style={{ marginTop: 0 }}>Coming soon!</span>
          </div>
          <span className={`chip${method === 'sandbox' ? ' sel' : ''}`} onClick={() => chooseMethod('sandbox')}>Build it in the sandbox</span>
        </div>
      </div>

      {method === 'upload' && (
        <div className="field-wrap">
          <label className="field-label">Floor plan file</label>
          <input className="field-input" type="file" onChange={(e) => handleFile(e.target.files?.[0])} />
          {filename && <p className="q-inline-help">Selected: {filename}</p>}
          <p className="q-inline-help">
            We don't read dimensions out of the file yet — that's coming later. For now this just records that
            you have a floor plan ready; the generator will use a placeholder room size until it's wired in.
          </p>
        </div>
      )}

      {method === 'sandbox' && (
        <div className="field-wrap">
          {hasSandboxRoom ? (
            <>
              <p className="q-inline-help" style={{ marginTop: 0 }}>
                Current room from the sandbox: {w} × {h} ft ({(w * h).toLocaleString()} sq ft)
              </p>
              <button type="button" className="btn-out" onClick={openSandbox}>
                {generatedLayout ? 'Edit the generated layout →' : 'Rebuild in the sandbox →'}
              </button>
            </>
          ) : (
            <>
              <p className="q-inline-help" style={{ marginTop: 0 }}>
                Opens the layout sandbox in this tab. Once you've sized the room, use its "Use this room in my
                intake" button to come back here with the dimensions filled in.
              </p>
              <button type="button" className="btn-teal" onClick={openSandbox}>
                {generatedLayout ? 'Edit the generated layout →' : 'Open the sandbox →'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function BudgetBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const desired = (answers.budget_desired as string | undefined) || '';
  const max = (answers.budget_max as string | undefined) || '';
  // Controlled, not defaultValue — an uncontrolled input only reads its
  // initial value once, so it never reflects a preset-chip click (which
  // sets `answers` directly, not the input) or intake hydration finishing
  // after this component already mounted (landing straight on budget via
  // "Edit questionnaire" hits this every time, since hydration loses the
  // race that walking here from question 1 always won by accident).
  const [desiredInput, setDesiredInput] = useState(desired);
  const [maxInput, setMaxInput] = useState(max);
  useEffect(() => setDesiredInput(desired), [desired]);
  useEffect(() => setMaxInput(max), [max]);
  // Absolute max can never be less than desired spend — it's the ceiling
  // sizing reaches into only when desired isn't enough, so a lower value
  // would be nonsensical. Whenever desired moves past the current max
  // (including the very first time desired gets a value and max is still
  // blank), pull max up to match rather than leaving an invalid combination
  // for the user to notice on their own.
  useEffect(() => {
    if (!desired) return;
    if (max && Number(max) >= Number(desired)) return;
    setField('budget_max', desired);
  }, [desired, max, setField]);
  return (
    <>
      <div className="grid-2">
        <div className="field-wrap">
          <label className="field-label">Desired spend (USD)</label>
          <input
            className="field-input"
            type="number"
            placeholder="e.g. 250000"
            value={desiredInput}
            onChange={(e) => setDesiredInput(e.target.value)}
            onBlur={() => setField('budget_desired', desiredInput)}
          />
          <div className="preset-row">
            {[50000, 100000, 250000, 500000, 1000000].map((v) => (
              <span key={v} className={`chip${Number(desired) === v ? ' sel' : ''}`} onClick={() => setField('budget_desired', String(v))}>
                {v >= 1000000 ? '$1M+' : '$' + v / 1000 + 'k'}
              </span>
            ))}
          </div>
        </div>
        <div className="field-wrap">
          <label className="field-label">Absolute max spend (USD)</label>
          <input
            className="field-input"
            type="number"
            placeholder="e.g. 300000"
            min={desired || undefined}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={() => {
              const clamped = desired && maxInput && Number(maxInput) < Number(desired) ? desired : maxInput;
              setMaxInput(clamped);
              setField('budget_max', clamped);
            }}
          />
          <p className="q-inline-help">The hard ceiling you could go to if it's genuinely needed — sizing targets your desired spend first and only reaches into this range for unmet high-priority needs.</p>
        </div>
      </div>
    </>
  );
}

// The merged equipment-planning step: add anything already owned or still
// needed, then review the resulting Basic Lab Equipment List, in one place.
// Used to be two separate questions — a plain "do you have equipment?"
// inventory step asked first (before biosafety_level/biomaterials were even
// answered, so the app had nothing to size against yet) and a "finalize"
// step computed from those answers — plus a third, standalone "additional
// analytical equipment" question, since folded in here too: the tag filter
// below already lets a user find analytical equipment in the same picker,
// and the Owned/Needed toggle covers what a dedicated question couldn't (a
// costed 'needed' row, not just an uncosted 'owned' one). Hoists both
// GraphQL queries (EQUIPMENT_LISTS_QUERY, EQUIPMENT_LIST_QUERY) here rather
// than letting each child run its own, so there's a single loading/error
// state instead of two skeletons flashing in sequence as the two queries
// resolve independently.
function EquipmentPlanBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const { data: listsData, loading: listsLoading, error: listsError } = useQuery<{ equipmentLists: EquipmentListRow[] }>(EQUIPMENT_LISTS_QUERY);
  const { data: equipmentData, loading: eqLoading, error: eqError } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const lists = listsData?.equipmentLists ?? [];
  const catalog = equipmentData?.equipmentList ?? [];
  const loading = listsLoading || eqLoading;

  if (loading) return <p className="q-inline-help">Loading your equipment lists…</p>;
  if (listsError) return <p className="q-validation-error">Couldn’t load equipment lists: {listsError.message}</p>;
  if (eqError) return <p className="q-validation-error">Couldn’t load the equipment catalog: {eqError.message}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EquipmentPicker answers={answers} setField={setField} catalog={catalog} />
      <ComputedEquipmentList answers={answers} setField={setField} lists={lists} catalog={catalog} />
    </div>
  );
}

// Search-and-add control for marking equipment as already owned OR still
// needed — an Owned/Needed toggle picks which bucket the next Add writes to.
// Sources its options from the same equipment catalog the Inventory page
// manages (EQUIPMENT_LIST_QUERY) rather than a client-facing abstraction —
// "what does this lab have or want" means real, named equipment (a Synergy
// H1 plate reader, an Opentrons FLEX), not protocol proxies. Deliberately
// doesn't render the equipment already added: once added, an item becomes a
// row in ComputedEquipmentList below (in the "Already Owned"/"Needed"
// category, or as a cross-referenced pill under whatever other category
// also requires it), with its own editable stepper and Remove/un-own
// control there — so there's exactly one place per added item to view or
// edit it, not two. An item CAN be in both buckets at once now (e.g. own 2,
// still need 3 more) — addable only excludes an item from the bucket
// currently selected by the Owned/Needed toggle, not from the other one, so
// switching the toggle surfaces an already-owned item again to also mark it
// needed (or vice versa). When it's in both, computeBasicLabEquipment
// (questions.ts) emits two separate rows — one under Owned, one under
// Needed — rather than merging them, so each shows up in its own
// color-coded section instead of one bucket swallowing the other.
function EquipmentPicker({ answers, setField, catalog }: { answers: Answers; setField: (k: string, v: unknown) => void; catalog: EquipmentRow[] }) {
  const ownedMeta = (answers.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
  const neededMeta = (answers.needed_equipment_meta as Record<string, { name: string; count: number }>) || {};
  const [draftId, setDraftId] = useState('');
  const [bucket, setBucket] = useState<'owned' | 'needed'>('owned');
  const activeMeta = bucket === 'owned' ? ownedMeta : neededMeta;
  const addable = catalog.filter((eq) => !activeMeta[eq.equipmentId]);
  // View filter only — narrows which addable equipment the search below can
  // find. Deliberately component-local, not routed through setField/answers:
  // it's not an intake answer, just how this picker's own list is browsed.
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const tagFilteredAddable = selectedTags.size === 0 ? addable : addable.filter((eq) => matchesTagFilter(eq, selectedTags));

  // Clears the draft selection once it's no longer a real, still-addable
  // option — needed because the catalog loads asynchronously and each
  // Add changes which items are still addable out from under a stale
  // selection. Clears to blank rather than defaulting to the first addable
  // item, since the picker is search-first now.
  useEffect(() => {
    if (draftId && !tagFilteredAddable.some((eq) => eq.equipmentId === draftId)) {
      setDraftId('');
    }
  }, [tagFilteredAddable, draftId]);

  function addSelected() {
    const eq = catalog.find((c) => c.equipmentId === draftId);
    if (!eq) return;
    if (bucket === 'owned') {
      setField('existing_equipment_meta', { ...ownedMeta, [eq.equipmentId]: { name: eq.name, count: 1 } });
    } else {
      setField('needed_equipment_meta', { ...neededMeta, [eq.equipmentId]: { name: eq.name, count: 1 } });
    }
    setDraftId('');
  }

  return (
    <div className="field-wrap" style={{ marginBottom: 0 }}>
      <label className="field-label">Already have equipment, or still need some?</label>
      <p className="q-inline-help" style={{ marginTop: 0 }}>
        {catalog.length === 0
          ? 'No equipment in your inventory yet — add it on the Equipment Database page, or skip this and it\'ll all be sized as new.'
          : 'Add anything you already have (no cost in the estimate) or still want to buy (kept as a costed line item). Adjust the amount or remove it in the list below.'}
      </p>
      {addable.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <TagFilterPopover catalog={catalog} selected={selectedTags} onChange={setSelectedTags} />
          <SearchableSelect
            style={{ width: 260 }}
            value={draftId}
            onChange={setDraftId}
            placeholder="Search for equipment…"
            // A leading blank option is required, not stylistic — once the
            // tag filter narrows the list to 10 or fewer items,
            // SearchableSelect falls back to a native <select> (see its own
            // comment), and a native select with no option matching the
            // current value (draftId starts as '') just visually highlights
            // the first real option instead of showing nothing selected.
            // Without this, that looked exactly like an item was chosen —
            // "Add" would then silently no-op against the still-empty
            // draftId.
            options={[{ value: '', label: 'Select equipment…', disabled: true }, ...tagFilteredAddable.map((eq) => ({ value: eq.equipmentId, label: eq.name }))]}
          />
          <div className="chips" style={{ gap: 4 }}>
            <span className={`chip${bucket === 'owned' ? ' sel' : ''}`} onClick={() => setBucket('owned')}>Owned</span>
            <span className={`chip${bucket === 'needed' ? ' sel' : ''}`} onClick={() => setBucket('needed')}>Needed</span>
          </div>
          <button type="button" className="btn-teal" style={{ padding: '6px 14px' }} onClick={addSelected}>Add</button>
        </div>
      )}
    </div>
  );
}

const UNTAGGED = 'Untagged';

function matchesTagFilter(eq: EquipmentRow, selected: Set<string>): boolean {
  if (eq.allTags.length === 0) return selected.has(UNTAGGED);
  return eq.allTags.some((tag) => selected.has(tag));
}

// Filter popover for the equipment picker above. Vocabulary is derived from
// the live Canvas-sourced/human tags on the catalog (EquipmentType.allTags,
// see cirrus-backend's inventory module) rather than hardcoded, so it never
// drifts out of sync with whatever tags actually exist. OR semantics within
// the selected set — most equipment carries at most one tag, so AND would
// return empty the moment two tags are checked. Matches SearchableSelect's
// outside-click-to-close pattern above.
function TagFilterPopover({ catalog, selected, onChange }: { catalog: EquipmentRow[]; selected: Set<string>; onChange: (next: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let untagged = 0;
    for (const eq of catalog) {
      if (eq.allTags.length === 0) { untagged += 1; continue; }
      for (const tag of eq.allTags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (untagged > 0) entries.push([UNTAGGED, untagged]);
    return entries;
  }, [catalog]);

  function toggleTag(tag: string) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    onChange(next);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button type="button" className="btn-out" style={{ padding: '6px 12px' }} onClick={() => setOpen((o) => !o)}>
        {selected.size > 0 ? `Filter (${selected.size})` : 'Filter'}
      </button>
      {open && (
        <div
          // The intake flow's document-level keydown listener advances/
          // rewinds the question on Enter/Escape (see QuestionsPage's
          // onKeyDown effect) — without stopping propagation here, checking
          // a tag or dismissing the popover with Escape would also fire
          // that navigation, same reasoning as SearchableSelect's onKeyDown.
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.stopPropagation(); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
          }}
          style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 4, minWidth: 200, maxHeight: 260, overflowY: 'auto', background: 'var(--white)', border: '1px solid var(--br)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', padding: 8 }}
        >
          {tagCounts.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--mid)', padding: '4px 6px' }}>No tags yet.</div>
          ) : (
            <>
              {tagCounts.map(([tag, count]) => (
                <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.has(tag)} onChange={() => toggleTag(tag)} />
                  <span style={{ flex: 1 }}>{tag}</span>
                  <span style={{ color: 'var(--mid)' }}>{count}</span>
                </label>
              ))}
              {selected.size > 0 && (
                <button type="button" className="btn-out" style={{ marginTop: 6, width: '100%', padding: '4px 0', fontSize: 11 }} onClick={() => onChange(new Set())}>Clear all</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Renders computeBasicLabEquipment + applyBasicLabEquipmentOverrides (see
// questions.ts) against live Prompt 1 data, then persists the finalized,
// post-edit list into answers.basic_lab_equipment_final so
// buildFinalIntakeJson can read it directly without recomputing. The sync
// effect is keyed off a serialized snapshot of the visible rows, not the
// array reference, so it only writes when the actual content changes —
// otherwise every render (each of which produces new row objects) would
// re-fire the debounced session write.
function ComputedEquipmentList({
  answers, setField, lists, catalog,
}: {
  answers: Answers; setField: (k: string, v: unknown) => void; lists: EquipmentListRow[]; catalog: EquipmentRow[];
}) {
  const computed = computeBasicLabEquipment(answers, lists, catalog);
  const rows = applyBasicLabEquipmentOverrides(computed, answers);
  const serialized = JSON.stringify(rows.map((r) => [r.equipmentId, r.quantity, r.sources.join(',')]));

  useEffect(() => {
    // sources travels through to the report's BOM (see reports.service.ts's
    // extractBasicLabEquipment) so the Lab Design Report can apply the same
    // color-coded-by-source grouping used here.
    setField('basic_lab_equipment_final', rows.map(({ equipmentId, name, quantity, sources }) => ({ equipment_id: equipmentId, name, quantity, sources })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  function setQty(equipmentId: string, next: number) {
    const overrides = (answers.basic_lab_equipment_quantity_overrides as Record<string, number>) || {};
    setField('basic_lab_equipment_quantity_overrides', { ...overrides, [equipmentId]: Math.max(1, Math.round(next)) });
  }
  function remove(equipmentId: string) {
    const removedIds = (answers.basic_lab_equipment_removed as string[]) || [];
    if (removedIds.includes(equipmentId)) return;
    setField('basic_lab_equipment_removed', [...removedIds, equipmentId]);
  }
  // Owned rows are edited through existing_equipment_meta directly, not the
  // override/removed answer fields — see applyBasicLabEquipmentOverrides's
  // comment in questions.ts for why.
  function setOwnedQty(equipmentId: string, next: number) {
    const meta = (answers.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
    const current = meta[equipmentId];
    if (!current) return;
    setField('existing_equipment_meta', { ...meta, [equipmentId]: { ...current, count: Math.max(1, Math.round(next)) } });
  }
  function unown(equipmentId: string) {
    const meta = (answers.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
    const { [equipmentId]: _removed, ...rest } = meta;
    setField('existing_equipment_meta', rest);
  }
  // Needed rows mirror the owned functions above — edited through
  // needed_equipment_meta directly, not the override/removed answer fields.
  function setNeededQty(equipmentId: string, next: number) {
    const meta = (answers.needed_equipment_meta as Record<string, { name: string; count: number }>) || {};
    const current = meta[equipmentId];
    if (!current) return;
    setField('needed_equipment_meta', { ...meta, [equipmentId]: { ...current, count: Math.max(1, Math.round(next)) } });
  }
  function removeNeeded(equipmentId: string) {
    const meta = (answers.needed_equipment_meta as Record<string, { name: string; count: number }>) || {};
    const { [equipmentId]: _removed, ...rest } = meta;
    setField('needed_equipment_meta', rest);
  }

  if (rows.length === 0) {
    return <p className="q-inline-help">Nothing here yet — add equipment you already own or still need above, or pick a biosafety level or biomaterial to draw from those lists.</p>;
  }

  const categoryByKey = new Map(BASIC_EQUIPMENT_CATEGORIES.map((c) => [c.key, c]));
  // Grouped by each row's PRIMARY source (sources[0], in the order
  // computeBasicLabEquipment first added it) so every row appears in
  // exactly one section — an item drawn from more than one list (its
  // quantity already sums across all of them) gets small colored pills
  // for the rest, rather than being rendered a second time with its own
  // editable controls.
  const rowsByCategory = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.sources[0] ?? 'general';
    const bucket = rowsByCategory.get(key);
    if (bucket) bucket.push(row);
    else rowsByCategory.set(key, [row]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p className="q-inline-help" style={{ marginTop: 0, marginBottom: 0 }}>
        Adjust quantities as needed. Items required for your biosafety level can’t be removed, only increased.
        Equipment you already own or still need can be adjusted or removed here too — removing an owned row means you no longer have it, and removing a needed row means you no longer want it; neither means the room doesn’t need it. Each color-coded section below shows which list brought that equipment into this combined list.
      </p>
      {/* Long lists (many categories, or a category with many rows) can
          exceed the card's own height — this panel scrolls on its own within
          a bounded max-height instead of relying on the outer question card
          area, whose centered-flex scroll silently clips content that's
          taller than the viewport (see .qm-stage in index.css). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxHeight: '46vh', overflowY: 'auto', paddingRight: 6 }}>
      {BASIC_EQUIPMENT_CATEGORIES.map((category) => {
        const categoryRows = rowsByCategory.get(category.key);
        if (!categoryRows || categoryRows.length === 0) return null;
        return (
          <div key={category.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: category.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.03em', color: category.color, textTransform: 'uppercase' }}>
                {category.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--mid)' }}>({categoryRows.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `3px solid ${category.color}`, paddingLeft: 12 }}>
              {categoryRows.map((row) => {
                const otherSources = row.sources.filter((s) => s !== category.key);
                return (
                  <div key={row.equipmentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                      {row.name}
                      {row.owned ? (
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: 'var(--mid)' }}>(owned)</span>
                      ) : row.needed ? (
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: 'var(--mid)' }}>(needed)</span>
                      ) : row.locked && (
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: 'var(--mid)' }}>(required)</span>
                      )}
                      {otherSources.map((sourceKey) => {
                        const meta = categoryByKey.get(sourceKey);
                        if (!meta) return null;
                        return (
                          <span
                            key={sourceKey}
                            title={`Also required by ${meta.label}`}
                            style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: meta.color, border: `1px solid ${meta.color}`, borderRadius: 10, padding: '1px 7px' }}
                          >
                            + {meta.label}
                          </span>
                        );
                      })}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {/* A row is never both owned and needed at once —
                          computeBasicLabEquipment splits that case into two
                          separate rows (one here, one in the other
                          category's section) — so exactly one of these
                          three branches ever renders per row. */}
                      {row.owned ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stepper">
                            <button type="button" onClick={() => setOwnedQty(row.equipmentId, row.ownedQuantity - 1)}>−</button>
                            <span className="stepper-val" style={{ fontSize: 14, minWidth: 20 }}>{row.ownedQuantity}</span>
                            <button type="button" onClick={() => setOwnedQty(row.equipmentId, row.ownedQuantity + 1)}>+</button>
                          </div>
                          <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => unown(row.equipmentId)}>Remove</button>
                        </div>
                      ) : row.needed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stepper">
                            <button type="button" onClick={() => setNeededQty(row.equipmentId, row.neededQuantity - 1)}>−</button>
                            <span className="stepper-val" style={{ fontSize: 14, minWidth: 20 }}>{row.neededQuantity}</span>
                            <button type="button" onClick={() => setNeededQty(row.equipmentId, row.neededQuantity + 1)}>+</button>
                          </div>
                          <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => removeNeeded(row.equipmentId)}>Remove</button>
                        </div>
                      ) : (row.locked ? (
                        <div className="stepper">
                          <button type="button" onClick={() => setQty(row.equipmentId, row.quantity - 1)}>−</button>
                          <span className="stepper-val" style={{ fontSize: 14, minWidth: 20 }}>{row.quantity}</span>
                          <button type="button" onClick={() => setQty(row.equipmentId, row.quantity + 1)}>+</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stepper">
                            <button type="button" onClick={() => setQty(row.equipmentId, row.quantity - 1)}>−</button>
                            <span className="stepper-val" style={{ fontSize: 14, minWidth: 20 }}>{row.quantity}</span>
                            <button type="button" onClick={() => setQty(row.equipmentId, row.quantity + 1)}>+</button>
                          </div>
                          <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => remove(row.equipmentId)}>Remove</button>
                        </div>
                      ))}
                      {(row.owned || row.needed) && row.requiredQuantity > row.ownedQuantity + row.neededQuantity && (
                        <span style={{ fontSize: 10, color: 'var(--mid)' }}>Sized at {row.quantity} — this list needs at least {row.requiredQuantity}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
