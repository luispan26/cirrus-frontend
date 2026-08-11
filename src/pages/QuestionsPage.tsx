import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { OptionCard } from '../components/OptionCard';
import { SyncBadge } from '../components/SyncBadge';
import { useIntakeSync } from '../hooks/useIntakeSync';
import { QS, OPERATION_OPTS, DAMPLAB_MATCH_KEYWORDS, shouldSkip, stepIndex, buildFinalIntakeJson, FEASIBILITY_GATE_IDS, type Answers, type QuestionOption } from '../lib/questions';
import { FEASIBILITY_CHECK_QUERY, EQUIPMENT_LIST_QUERY, PROTOCOLS_IO_SEARCH_QUERY } from '../graphql/operations';

type EquipmentRow = { equipmentId: string; name: string; costUsd: number; widthFt: number; depthFt: number; heightFt: number; stationId: string | null };
type ProtocolSummary = { id: string; title: string; sourceUrl: string };
type ProtocolSearchResult = { items: ProtocolSummary[] };

type FeasibilityIssue = { field: string; message: string };
type FeasibilityCheckResponse = { feasibilityCheck: { ok: boolean; issues: FeasibilityIssue[] } };

// Finds the first Damp Lab protocol whose title contains one of this
// catalog entry's match keywords (case-insensitive) — see
// DAMPLAB_MATCH_KEYWORDS in questions.ts for why keyword matching rather
// than a hardcoded protocol ID.
function matchDamplabProtocol(optionValue: string, items: ProtocolSummary[]): ProtocolSummary | undefined {
  const keywords = DAMPLAB_MATCH_KEYWORDS[optionValue];
  if (!keywords || keywords.length === 0) return undefined;
  return items.find((item) => {
    const title = item.title.toLowerCase();
    return keywords.some((kw) => title.includes(kw));
  });
}

function validateQuestion(id: string, answers: Answers) {
  if (id === 'equipment_status' && !answers.equipment_status) return 'Choose whether your space already has equipment.';
  if (id === 'operations' && ((answers.operations as string[]) || []).length === 0) return 'Select at least one protocol.';
  if (id === 'protocol_demand') {
    const ops = (answers.operations as string[]) || [];
    const runs = (answers.protocol_runs_per_week as Record<string, number>) || {};
    if (ops.some((opId) => runs[opId] === undefined)) return 'Enter expected weekly runs for every protocol (0 is fine).';
  }
  if (id === 'protocol_priorities') {
    if (!answers.wants_protocol_priorities) return 'Choose whether to prioritize these protocols.';
    if (answers.wants_protocol_priorities === 'yes') {
      const ops = (answers.operations as string[]) || [];
      const tiers = (answers.protocol_tiers as Record<string, string>) || {};
      if (ops.some((opId) => !tiers[opId])) return 'Sort every protocol into a tier, or choose not to prioritize them.';
    }
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
// has equipment (see the equipment_status question) — the hint under the
// question title reflects that instead of a single static string.
function questionHint(q: (typeof QS)[number], answers: Answers): string {
  const hasEquipment = answers.equipment_status === 'has_equipment';
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

  // Round trip from the layout sandbox's "Use this room in my intake"
  // button (LayoutSandboxPage.tsx) — it navigates back here with the room
  // it built in router state rather than a persistent channel like
  // localStorage, since this is a one-shot hand-off, not standing data.
  useEffect(() => {
    const state = location.state as { spaceFromSandbox?: { width_ft: number; height_ft: number } } | null;
    if (!state?.spaceFromSandbox) return;
    const { width_ft, height_ft } = state.spaceFromSandbox;
    setField('width_ft', String(width_ft));
    setField('height_ft', String(height_ft));
    setField('space_method', 'sandbox');
    const spaceIndex = QS.findIndex((sq) => sq.id === 'space');
    if (spaceIndex >= 0) setQi(spaceIndex);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = QS[qi];
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
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>CIRRUS</div>
        <div className="qm-prog-track"><div className="qm-prog-fill" style={{ width: `${pct}%` }} /></div>
        <SyncBadge status={status} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button className="qm-mode-toggle" onClick={() => navigate('/chat')}>Full-screen chat →</button>
      </div>
      <div className="qm-stage">
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="qm-counter">Question {posInApplicable} of {applicable.length}</div>
          <div className="q-body">
            <QuestionBody q={q} displayNumber={posInApplicable} answers={answers} setField={setField} toggleMultiField={toggleMultiField} onEnterNav={nextQ} />
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
}: {
  q: (typeof QS)[number];
  displayNumber: number;
  answers: Answers;
  setField: (k: string, v: unknown) => void;
  toggleMultiField: (k: string, v: string) => void;
  onEnterNav: () => void;
}) {
  return (
    <div className="q-card">
      <div className="q-num">Q{displayNumber}</div>
      <div className="q-title">{q.t}</div>
      <div className="q-hint">{questionHint(q, answers)}</div>

      {q.type === 'multi' && <ProtocolSelectBody answers={answers} toggleMultiField={toggleMultiField} />}

      {q.type === 'radio' && (
        <div className="opt-grid" style={{ gridTemplateColumns: '1fr' }}>
          {q.opts!.map((o) => (
            <OptionCard key={o.v} option={o} showRisk selected={answers[q.id] === o.v} onClick={() => setField(q.id, o.v)} />
          ))}
        </div>
      )}

      {q.type === 'inventory' && <InventoryBody answers={answers} setField={setField} />}
      {q.type === 'space' && <SpaceBody answers={answers} setField={setField} />}
      {q.type === 'budget' && <BudgetBody answers={answers} setField={setField} />}
      {q.type === 'protocol_demand' && <ProtocolDemandBody answers={answers} setField={setField} />}
      {q.type === 'priority_tiers' && <ProtocolPrioritiesBody answers={answers} setField={setField} />}
    </div>
  );
}

// Dropdown, scoped to only what the Damp Lab workspace has actually
// published — cross-referenced against the internal catalog so the stored
// value stays a real operationId the backend understands (a live Damp Lab
// protocol like "Optical Density Measurement" that has no catalog
// counterpart at all can't be selected, since there'd be nothing valid to
// send downstream). Catalog entries not yet supported by the layout
// generator but still published to Damp Lab are listed separately, for
// reference, rather than offered as selectable — picking one wouldn't
// actually work yet.
function ProtocolSelectBody({ answers, toggleMultiField }: { answers: Answers; toggleMultiField: (k: string, v: string) => void }) {
  const { data, loading, error } = useQuery<{ protocolsIoSearch: ProtocolSearchResult }>(
    PROTOCOLS_IO_SEARCH_QUERY,
    { variables: { pageSize: 50 } },
  );
  const damplabItems = data?.protocolsIoSearch.items ?? [];

  const matched = OPERATION_OPTS
    .map((opt) => ({ opt, match: matchDamplabProtocol(opt.v, damplabItems) }))
    .filter((x): x is { opt: QuestionOption; match: ProtocolSummary } => !!x.match);
  const selectable = matched.filter((x) => !x.opt.disabled);
  const comingSoon = matched.filter((x) => x.opt.disabled);

  const selected = (answers.operations as string[]) || [];
  const addable = selectable.filter((x) => !selected.includes(x.opt.v));
  const [draftValue, setDraftValue] = useState('');

  useEffect(() => {
    if (!addable.some((x) => x.opt.v === draftValue)) {
      setDraftValue(addable[0]?.opt.v ?? '');
    }
  }, [addable, draftValue]);

  function addSelected() {
    if (!draftValue) return;
    toggleMultiField('operations', draftValue);
  }

  if (loading) return <p className="q-inline-help">Loading the Damp Lab protocol catalog…</p>;
  if (error) return <p className="q-validation-error">Couldn’t load Damp Lab protocols: {error.message}</p>;

  return (
    <>
      <p className="q-inline-help">
        {matched.length === 0
          ? 'No protocols published to the Damp Lab workspace matched the supported catalog yet.'
          : 'Sourced live from the Damp Lab protocols.io workspace.'}
      </p>

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {selected.map((v) => {
            const entry = matched.find((x) => x.opt.v === v);
            const label = entry?.match.title ?? OPERATION_OPTS.find((o) => o.v === v)?.l ?? v;
            return (
              <div key={v} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>
                  {label}
                  {entry && (
                    <a href={entry.match.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, color: 'var(--teal)', marginLeft: 8 }}>
                      View on Damp Lab →
                    </a>
                  )}
                </span>
                <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => toggleMultiField('operations', v)}>Remove</button>
              </div>
            );
          })}
        </div>
      )}

      {addable.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="field-input" style={{ width: 320 }} value={draftValue} onChange={(e) => setDraftValue(e.target.value)}>
            {addable.map((x) => <option key={x.opt.v} value={x.opt.v}>{x.match.title}</option>)}
          </select>
          <button type="button" className="btn-teal" style={{ padding: '6px 14px' }} onClick={addSelected}>Add</button>
        </div>
      )}

      {comingSoon.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p className="q-inline-help" style={{ marginBottom: 6 }}>Also published to Damp Lab, not yet supported by the layout generator:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {comingSoon.map((x) => (
              <div key={x.opt.v} style={{ fontSize: 12, color: 'var(--mid)' }}>
                {x.match.title}{' '}
                <a href={x.match.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)' }}>View →</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SpaceBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const navigate = useNavigate();
  const method = answers.space_method as 'upload' | 'sandbox' | undefined;
  const w = parseFloat((answers.width_ft as string) || '0') || 0;
  const h = parseFloat((answers.height_ft as string) || '0') || 0;
  const hasSandboxRoom = method === 'sandbox' && w > 0 && h > 0;
  const filename = answers.space_floorplan_filename as string | undefined;

  function chooseMethod(next: 'upload' | 'sandbox') {
    setField('space_method', next);
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
        <div className="chips">
          <span className={`chip${method === 'upload' ? ' sel' : ''}`} onClick={() => chooseMethod('upload')}>Upload a floor plan</span>
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
              <button type="button" className="btn-out" onClick={() => navigate('/layout-sandbox')}>Rebuild in the sandbox →</button>
            </>
          ) : (
            <>
              <p className="q-inline-help" style={{ marginTop: 0 }}>
                Opens the layout sandbox in this tab. Once you've sized the room, use its "Use this room in my
                intake" button to come back here with the dimensions filled in.
              </p>
              <button type="button" className="btn-teal" onClick={() => navigate('/layout-sandbox')}>Open the sandbox →</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function BudgetBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const desired = answers.budget_desired as string | undefined;
  const max = answers.budget_max as string | undefined;
  return (
    <>
      <div className="grid-2">
        <div className="field-wrap">
          <label className="field-label">Desired spend (USD)</label>
          <input className="field-input" type="number" placeholder="e.g. 250000" defaultValue={desired || ''} onBlur={(e) => setField('budget_desired', e.target.value)} />
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
          <input className="field-input" type="number" placeholder="e.g. 300000" defaultValue={max || ''} onBlur={(e) => setField('budget_max', e.target.value)} />
          <p className="q-inline-help">The hard ceiling you could go to if it's genuinely needed — sizing targets your desired spend first and only reaches into this range for unmet high-priority needs.</p>
        </div>
      </div>
      <div className="field-wrap">
        <label className="field-label">What does this cover?</label>
        <div className="chips" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className={`chip${answers.budget_scope === 'equipment_only' ? ' sel' : ''}`} onClick={() => setField('budget_scope', 'equipment_only')}>Equipment &amp; consumables only</span>
          <span className={`chip${answers.budget_scope === 'equipment_and_construction' ? ' sel' : ''}`} onClick={() => setField('budget_scope', 'equipment_and_construction')}>Equipment + construction / renovation</span>
        </div>
      </div>
    </>
  );
}

// One number per selected protocol — expected runs/week. Run duration is
// deliberately not asked here; it's pulled from each operation's own
// estimatedTimeHours metadata on the backend (capacity-planner.ts), which
// combines with this to size bench count (see FinalIntakeJson.demand in
// questions.ts). 0 is a valid answer (no throughput-driven extra benches,
// not "skip this protocol") — validateQuestion only requires every selected
// protocol to have an explicit entry, not a positive one.
function ProtocolDemandBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const selected = (answers.operations as string[]) || [];
  if (selected.length === 0) return null;
  const runs = (answers.protocol_runs_per_week as Record<string, number>) || {};

  function labelFor(opId: string) {
    return OPERATION_OPTS.find((o) => o.v === opId)?.l ?? opId;
  }

  function setRuns(opId: string, value: number) {
    setField('protocol_runs_per_week', { ...runs, [opId]: Math.max(0, Math.round(value)) });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p className="q-inline-help" style={{ marginTop: 0 }}>
        Run duration comes from each protocol's own definition — you only need to say how often it runs.
      </p>
      {selected.map((opId) => (
        <div key={opId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{labelFor(opId)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="field-input"
              type="number"
              min={0}
              step={1}
              style={{ width: 90 }}
              placeholder="0"
              value={runs[opId] ?? ''}
              onChange={(e) => setRuns(opId, Number(e.target.value) || 0)}
            />
            <span style={{ fontSize: 12, color: 'var(--mid)' }}>runs/week</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// (id, label, description) — order here is the funding order: must-haves
// are covered first out of the desired budget, important protocols are the
// primary candidates for desired->max spillover when there's unmet need,
// and nice-to-haves are cut first if there still isn't enough even at max.
const PRIORITY_TIERS: [string, string, string][] = [
  ['must_have', 'Must-have', 'Non-negotiable — funded first, always covered within the desired budget if at all possible.'],
  ['important', 'Important', "Funded next — the primary candidates for the desired→max spillover budget when there's unmet need."],
  ['nice_to_have', 'Nice-to-have', 'Funded last — only if budget genuinely allows.'],
];

// Sorting N protocols into 3 tiers is a fast, coarse tag exercise regardless
// of list length; a full 1..N ranking is not. Ties within a tier (e.g. 8
// "important" protocols but budget for 5) are broken by a lightweight
// optional reorder scoped to just that tier's items, rather than asking for
// a global rank — reordering 3-4 items is cheap, reordering 20 isn't.
function ProtocolPrioritiesBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const selected = (answers.operations as string[]) || [];
  if (selected.length === 0) return null;
  const wants = answers.wants_protocol_priorities as string | undefined;
  const tiers = (answers.protocol_tiers as Record<string, string>) || {};
  const tierOrder = (answers.protocol_tier_order as Record<string, number>) || {};
  const unsorted = selected.filter((opId) => !tiers[opId]);

  function labelFor(opId: string) {
    return OPERATION_OPTS.find((o) => o.v === opId)?.l ?? opId;
  }

  function assignTier(opId: string, tierKey: string) {
    const siblingMax = selected
      .filter((id) => id !== opId && tiers[id] === tierKey)
      .reduce((max, id) => Math.max(max, tierOrder[id] ?? 0), -1);
    setField('protocol_tiers', { ...tiers, [opId]: tierKey });
    setField('protocol_tier_order', { ...tierOrder, [opId]: siblingMax + 1 });
  }

  function move(tierKey: string, opId: string, dir: -1 | 1) {
    const siblings = selected
      .filter((id) => tiers[id] === tierKey)
      .sort((a, b) => (tierOrder[a] ?? 0) - (tierOrder[b] ?? 0));
    const idx = siblings.indexOf(opId);
    const swapWith = siblings[idx + dir];
    if (!swapWith) return;
    setField('protocol_tier_order', {
      ...tierOrder,
      [opId]: tierOrder[swapWith] ?? idx + dir,
      [swapWith]: tierOrder[opId] ?? idx,
    });
  }

  return (
    <div className="field-wrap" style={{ marginTop: 12 }}>
      <label className="field-label">Do you want to prioritize these protocols?</label>
      <div className="chips">
        <span className={`chip${wants === 'yes' ? ' sel' : ''}`} onClick={() => setField('wants_protocol_priorities', 'yes')}>Yes, sort them</span>
        <span className={`chip${wants === 'no' ? ' sel' : ''}`} onClick={() => setField('wants_protocol_priorities', 'no')}>No, treat them equally</span>
      </div>

      {wants === 'yes' && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {unsorted.length > 0 && (
            <div>
              <p className="q-inline-help" style={{ marginTop: 0 }}>Sort each protocol into a tier:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unsorted.map((opId) => (
                  <div key={opId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{labelFor(opId)}</span>
                    <div className="chips">
                      {PRIORITY_TIERS.map(([tierKey, tierLabel]) => (
                        <span key={tierKey} className="chip" onClick={() => assignTier(opId, tierKey)}>{tierLabel}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {PRIORITY_TIERS.map(([tierKey, tierLabel, tierDesc]) => {
            const items = selected
              .filter((opId) => tiers[opId] === tierKey)
              .sort((a, b) => (tierOrder[a] ?? 0) - (tierOrder[b] ?? 0));
            if (items.length === 0) return null;
            return (
              <div key={tierKey}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>
                  {tierLabel} <span style={{ fontWeight: 500, color: 'var(--mid)' }}>({items.length})</span>
                </div>
                <p className="q-inline-help" style={{ marginTop: 2 }}>{tierDesc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((opId, i) => (
                    <div key={opId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13 }}>{labelFor(opId)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="stepper">
                          <button type="button" disabled={i === 0} onClick={() => move(tierKey, opId, -1)}>↑</button>
                          <button type="button" disabled={i === items.length - 1} onClick={() => move(tierKey, opId, 1)}>↓</button>
                        </div>
                        <div className="chips">
                          {PRIORITY_TIERS.filter(([k]) => k !== tierKey).map(([k, l]) => (
                            <span key={k} className="chip" onClick={() => assignTier(opId, k)}>{l}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Sources its options from the same equipment catalog the Inventory page
// manages (EQUIPMENT_LIST_QUERY) rather than a client-facing abstraction —
// "what do you already have" means real, named equipment (a Synergy H1
// plate reader, an Opentrons FLEX), not protocol proxies. Dropdown + Add
// rather than a big grid of cards — more appropriate once the catalog is
// dozens of items long.
function InventoryBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const { data, loading, error } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const catalog = data?.equipmentList ?? [];
  const meta = (answers.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
  const selectedIds = Object.keys(meta);
  const addable = catalog.filter((eq) => !meta[eq.equipmentId]);
  const [draftId, setDraftId] = useState('');

  // Keeps the dropdown pointed at a real, still-addable option — needed
  // because the catalog loads asynchronously and each Add/Remove changes
  // which items are still addable out from under a stale selection.
  useEffect(() => {
    if (!addable.some((eq) => eq.equipmentId === draftId)) {
      setDraftId(addable[0]?.equipmentId ?? '');
    }
  }, [addable, draftId]);

  function addSelected() {
    const eq = catalog.find((c) => c.equipmentId === draftId);
    if (!eq) return;
    setField('existing_equipment_meta', { ...meta, [eq.equipmentId]: { name: eq.name, count: 1 } });
  }

  function removeSelected(equipmentId: string) {
    const { [equipmentId]: _removed, ...rest } = meta;
    setField('existing_equipment_meta', rest);
  }

  function setCount(equipmentId: string, next: number) {
    const current = meta[equipmentId];
    if (!current) return;
    setField('existing_equipment_meta', { ...meta, [equipmentId]: { ...current, count: Math.max(1, next) } });
  }

  if (loading) return <p className="q-inline-help">Loading your equipment inventory…</p>;
  if (error) return <p className="q-validation-error">Couldn’t load the equipment inventory: {error.message}</p>;

  return (
    <>
      <p className="q-inline-help">
        {catalog.length === 0
          ? 'No equipment in your inventory yet — add it on the Equipment & Inventory page, or skip this and it\'ll all be sized as new.'
          : 'Only what you already have — sizing subtracts this from what your protocols still need.'}
      </p>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {selectedIds.map((equipmentId) => {
            const item = meta[equipmentId];
            return (
              <div key={equipmentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="stepper">
                    <button type="button" onClick={() => setCount(equipmentId, item.count - 1)}>−</button>
                    <span className="stepper-val" style={{ fontSize: 14, minWidth: 20 }}>{item.count}</span>
                    <button type="button" onClick={() => setCount(equipmentId, item.count + 1)}>+</button>
                  </div>
                  <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => removeSelected(equipmentId)}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addable.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="field-input" style={{ width: 260 }} value={draftId} onChange={(e) => setDraftId(e.target.value)}>
            {addable.map((eq) => <option key={eq.equipmentId} value={eq.equipmentId}>{eq.name}</option>)}
          </select>
          <button type="button" className="btn-teal" style={{ padding: '6px 14px' }} onClick={addSelected}>Add</button>
        </div>
      )}
    </>
  );
}
