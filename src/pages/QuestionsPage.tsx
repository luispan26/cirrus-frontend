import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client/react';
import { OptionCard } from '../components/OptionCard';
import { SyncBadge } from '../components/SyncBadge';
import { SearchableSelect } from '../components/SearchableSelect';
import { useIntakeSync } from '../hooks/useIntakeSync';
import {
  QS, OPERATION_OPTS, DAMPLAB_MATCH_KEYWORDS, shouldSkip, stepIndex, buildFinalIntakeJson, FEASIBILITY_GATE_IDS,
  ANALYTICAL_EQUIPMENT_LIST_KEY, computeBasicLabEquipment, applyBasicLabEquipmentOverrides, BASIC_EQUIPMENT_CATEGORIES,
  type Answers, type QuestionOption,
} from '../lib/questions';
import {
  FEASIBILITY_CHECK_QUERY, EQUIPMENT_LIST_QUERY, EQUIPMENT_LISTS_QUERY, PROTOCOLS_IO_SEARCH_QUERY,
  PROTOCOL_IDS_WITH_EQUIPMENT_MAPPINGS_QUERY,
} from '../graphql/operations';

type EquipmentRow = { equipmentId: string; name: string; costUsd: number; widthFt: number; depthFt: number; heightFt: number; stationId: string | null };
type EquipmentListRow = { listKey: string; displayName: string; equipmentIds: string[] };
type ProtocolSummary = { id: string; title: string; sourceUrl: string };
type ProtocolSearchResult = { items: ProtocolSummary[] };

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
// has equipment — inferred from whether existing_equipment (Q1) actually has
// entries, since there's no separate gating question for it anymore — the
// hint under the question title reflects that instead of a single static string.
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

      {q.type === 'inventory' && <InventoryBody answers={answers} setField={setField} />}
      {q.type === 'space' && <SpaceBody answers={answers} setField={setField} />}
      {q.type === 'budget' && <BudgetBody answers={answers} setField={setField} />}
      {q.type === 'analytical_equipment' && <AnalyticalEquipmentBody answers={answers} setField={setField} />}
      {q.type === 'basic_equipment' && <BasicLabEquipmentBody answers={answers} setField={setField} />}
    </div>
  );
}

// Fetches every protocol published to the Damp Lab protocols.io workspace
// (not just the ~9 with a curated Operation mapping) — page 1 at the
// server's max page size, then any remaining pages in parallel, so this
// stays the full catalog even if the workspace grows past 100 entries.
function useAllDamplabProtocols(): { items: ProtocolSummary[]; loading: boolean; error: Error | undefined } {
  const client = useApolloClient();
  const { data, loading, error } = useQuery<{ protocolsIoSearch: ProtocolSearchResult & { totalPages: number } }>(
    PROTOCOLS_IO_SEARCH_QUERY,
    { variables: { pageSize: 100 } },
  );
  const totalPages = data?.protocolsIoSearch.totalPages ?? 1;
  const [restItems, setRestItems] = useState<ProtocolSummary[]>([]);
  const [fetchingRest, setFetchingRest] = useState(false);

  useEffect(() => {
    if (totalPages <= 1) return;
    setFetchingRest(true);
    Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map((page) =>
        client.query<{ protocolsIoSearch: ProtocolSearchResult }>({ query: PROTOCOLS_IO_SEARCH_QUERY, variables: { pageSize: 100, page } }),
      ),
    )
      .then((pages) => setRestItems(pages.flatMap((p) => p.data?.protocolsIoSearch.items ?? [])))
      .finally(() => setFetchingRest(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  return {
    items: [...(data?.protocolsIoSearch.items ?? []), ...restItems],
    loading: loading || fetchingRest,
    error,
  };
}

// The full Damp Lab catalog is selectable, not just the curated subset with
// a matching Operation definition — an unmatched protocol still gets
// recorded in the final intake payload (see resolveOperationId in
// questions.ts, which passes an unrecognized id through unchanged), it just
// doesn't contribute equipment/space sizing since the backend has no
// Operation to look it up against. Matched protocols use the catalog's own
// value (a real operationId) so sizing still works exactly as before;
// unmatched ones use the protocol's own protocols.io id.
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
// Scoped to protocols that already have equipment mapped to their steps
// (via the Canvas import on the /protocols admin page — see
// protocolIdsWithEquipmentMappings) rather than the full unmapped Damp Lab
// catalog: those are the only ones Cirrus can actually plan real equipment
// for. Full scrollable checkbox list, same pattern as the Equipment
// Membership Lists page's "Unassigned" panel — select-then-quantify per
// row, same as AnalyticalEquipmentBody/the old protocol_demand step (see
// FinalIntakeJson.demand in questions.ts).
function ProtocolSelectBody({ answers, toggleMultiField, setField }: { answers: Answers; toggleMultiField: (k: string, v: string) => void; setField: (k: string, v: unknown) => void }) {
  const { items: damplabItems, loading, error } = useAllDamplabProtocols();
  const { data: mappedData, loading: mappedLoading, error: mappedError } = useQuery<{ protocolIdsWithEquipmentMappings: string[] }>(PROTOCOL_IDS_WITH_EQUIPMENT_MAPPINGS_QUERY);
  const mappedIds = new Set(mappedData?.protocolIdsWithEquipmentMappings ?? []);

  const mappedProtocols = damplabItems
    .filter((item) => mappedIds.has(item.id))
    .map((item) => {
      const catalogMatch = findCatalogMatch(item.title);
      // item.id (the real protocols.io id) is kept even for a catalog-matched
      // protocol, whose `value` becomes the catalog's own operation id — see
      // toggleProtocol below, which persists this real id separately so the
      // backend's Protocols Equipment List (bom/protocol-equipment-list.ts)
      // can still look up equipment usage by it.
      return { value: catalogMatch ? catalogMatch.v : item.id, id: item.id, title: item.title, sourceUrl: item.sourceUrl, sized: !!catalogMatch };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const selected = (answers.operations as string[]) || [];
  const runs = (answers.protocol_runs_per_week as Record<string, number>) || {};
  const protocolIds = (answers.protocol_ids_by_operation as Record<string, string>) || {};
  const [search, setSearch] = useState('');
  const visible = search.trim()
    ? mappedProtocols.filter((p) => p.title.toLowerCase().includes(search.trim().toLowerCase()))
    : mappedProtocols;
  const allVisibleChecked = visible.length > 0 && visible.every((p) => selected.includes(p.value));

  function toggleProtocol(p: { value: string; id: string }) {
    const wasSelected = selected.includes(p.value);
    toggleMultiField('operations', p.value);
    if (wasSelected) {
      const { [p.value]: _removed, ...rest } = runs;
      setField('protocol_runs_per_week', rest);
      const { [p.value]: _removedId, ...restIds } = protocolIds;
      setField('protocol_ids_by_operation', restIds);
    } else {
      setField('protocol_ids_by_operation', { ...protocolIds, [p.value]: p.id });
    }
  }

  function toggleAllVisible() {
    for (const p of visible) {
      if (allVisibleChecked) { if (selected.includes(p.value)) toggleProtocol(p); }
      else if (!selected.includes(p.value)) toggleProtocol(p);
    }
  }

  function setRuns(opId: string, value: number) {
    setField('protocol_runs_per_week', { ...runs, [opId]: Math.max(0, Math.round(value)) });
  }

  if (loading || mappedLoading) return <p className="q-inline-help">Loading protocols with equipment mapped…</p>;
  if (error) return <p className="q-validation-error">Couldn’t load Damp Lab protocols: {error.message}</p>;
  if (mappedError) return <p className="q-validation-error">Couldn’t load equipment mappings: {mappedError.message}</p>;

  if (mappedProtocols.length === 0) {
    return <p className="q-inline-help">No Damp Lab protocols have equipment mapped yet — import from Canvas on the Protocols page first.</p>;
  }

  return (
    <>
      <p className="q-inline-help" style={{ marginTop: 0 }}>
        Only protocols with equipment already mapped to their steps are shown ({mappedProtocols.length} available). Check the ones this lab needs and set expected weekly runs for each.
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
                  View on Damp Lab →
                </a>
              </label>
              {isSelected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 26, marginTop: 6 }}>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step={1}
                    style={{ width: 80 }}
                    placeholder="0"
                    value={runs[p.value] ?? ''}
                    onChange={(e) => setRuns(p.value, Number(e.target.value) || 0)}
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
    </>
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

  // Clears the draft selection once it's no longer a real, still-addable
  // option — needed because the catalog loads asynchronously and each
  // Add/Remove changes which items are still addable out from under a
  // stale selection. Clears to blank rather than defaulting to the first
  // addable item, since the picker is search-first now.
  useEffect(() => {
    if (draftId && !addable.some((eq) => eq.equipmentId === draftId)) {
      setDraftId('');
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
          <SearchableSelect
            style={{ width: 260 }}
            value={draftId}
            onChange={setDraftId}
            placeholder="Search for equipment…"
            options={addable.map((eq) => ({ value: eq.equipmentId, label: eq.name }))}
          />
          <button type="button" className="btn-teal" style={{ padding: '6px 14px' }} onClick={addSelected}>Add</button>
        </div>
      )}
    </>
  );
}

// Sources its checkbox list from Prompt 1's "Analytical Equipment Catalog"
// membership list (EQUIPMENT_LISTS_QUERY), cross-referenced against the
// Equipment Specification List (EQUIPMENT_LIST_QUERY) for display names —
// same live-data pattern as InventoryBody above, so once that list is
// populated via the admin UI this reflects it on the next load with no code
// change. Empty-state per the Prompt 2 spec: an empty catalog renders a
// plain message, never a broken/placeholder grid.
function AnalyticalEquipmentBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const { data: listsData, loading: listsLoading, error: listsError } = useQuery<{ equipmentLists: EquipmentListRow[] }>(EQUIPMENT_LISTS_QUERY);
  const { data: equipmentData, loading: eqLoading, error: eqError } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);

  const analyticalList = listsData?.equipmentLists.find((l) => l.listKey === ANALYTICAL_EQUIPMENT_LIST_KEY);
  const catalogById = new Map((equipmentData?.equipmentList ?? []).map((eq) => [eq.equipmentId, eq]));
  const items = (analyticalList?.equipmentIds ?? [])
    .map((id) => catalogById.get(id))
    .filter((eq): eq is EquipmentRow => !!eq);

  const quantities = (answers.analytical_equipment_quantities as Record<string, number>) || {};

  function toggle(equipmentId: string) {
    if (quantities[equipmentId] !== undefined) {
      const { [equipmentId]: _removed, ...rest } = quantities;
      setField('analytical_equipment_quantities', rest);
    } else {
      setField('analytical_equipment_quantities', { ...quantities, [equipmentId]: 1 });
    }
  }
  function setQty(equipmentId: string, next: number) {
    if (quantities[equipmentId] === undefined) return;
    setField('analytical_equipment_quantities', { ...quantities, [equipmentId]: Math.max(1, Math.round(next)) });
  }

  if (listsLoading || eqLoading) return <p className="q-inline-help">Loading the analytical equipment catalog…</p>;
  if (listsError) return <p className="q-validation-error">Couldn’t load equipment lists: {listsError.message}</p>;
  if (eqError) return <p className="q-validation-error">Couldn’t load the equipment catalog: {eqError.message}</p>;

  if (items.length === 0) {
    return <p className="q-inline-help">No analytical equipment has been catalogued yet — skip this question, or check back once it's added via Settings → Equipment Membership Lists.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((eq) => {
        const checked = quantities[eq.equipmentId] !== undefined;
        return (
          <div key={eq.equipmentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer' }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(eq.equipmentId)} />
              {eq.name}
            </label>
            {checked && (
              <div className="stepper">
                <button type="button" onClick={() => setQty(eq.equipmentId, quantities[eq.equipmentId] - 1)}>−</button>
                <span className="stepper-val" style={{ fontSize: 14, minWidth: 20 }}>{quantities[eq.equipmentId]}</span>
                <button type="button" onClick={() => setQty(eq.equipmentId, quantities[eq.equipmentId] + 1)}>+</button>
              </div>
            )}
          </div>
        );
      })}
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
function BasicLabEquipmentBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const { data: listsData, loading: listsLoading, error: listsError } = useQuery<{ equipmentLists: EquipmentListRow[] }>(EQUIPMENT_LISTS_QUERY);
  const { data: equipmentData, loading: eqLoading, error: eqError } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const lists = listsData?.equipmentLists ?? [];
  const catalog = equipmentData?.equipmentList ?? [];
  const loading = listsLoading || eqLoading;

  const computed = computeBasicLabEquipment(answers, lists, catalog);
  const rows = applyBasicLabEquipmentOverrides(computed, answers);
  const serialized = JSON.stringify(rows.map((r) => [r.equipmentId, r.quantity, r.sources.join(',')]));

  useEffect(() => {
    if (loading) return;
    // sources travels through to the report's BOM (see reports.service.ts's
    // extractBasicLabEquipment) so the Lab Design Report can apply the same
    // color-coded-by-source grouping used here.
    setField('basic_lab_equipment_final', rows.map(({ equipmentId, name, quantity, sources }) => ({ equipment_id: equipmentId, name, quantity, sources })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, loading]);

  function setQty(equipmentId: string, next: number) {
    const overrides = (answers.basic_lab_equipment_quantity_overrides as Record<string, number>) || {};
    setField('basic_lab_equipment_quantity_overrides', { ...overrides, [equipmentId]: Math.max(1, Math.round(next)) });
  }
  function remove(equipmentId: string) {
    const removedIds = (answers.basic_lab_equipment_removed as string[]) || [];
    if (removedIds.includes(equipmentId)) return;
    setField('basic_lab_equipment_removed', [...removedIds, equipmentId]);
  }

  if (loading) return <p className="q-inline-help">Loading your equipment lists…</p>;
  if (listsError) return <p className="q-validation-error">Couldn’t load equipment lists: {listsError.message}</p>;
  if (eqError) return <p className="q-validation-error">Couldn’t load the equipment catalog: {eqError.message}</p>;

  if (rows.length === 0) {
    return <p className="q-inline-help">Nothing to finalize yet — you have no existing equipment on file, and the General Lab, biosafety, biomaterial, and analytical equipment lists you've drawn from are all empty or unselected.</p>;
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
        Equipment you already own is fixed at what you entered in Q1. Each color-coded section below shows which list brought that equipment into this combined list.
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {row.owned ? (
                        <span style={{ fontSize: 14, color: 'var(--mid)', minWidth: 20, textAlign: 'center' }}>{row.quantity}</span>
                      ) : (
                        <>
                          <div className="stepper">
                            <button type="button" onClick={() => setQty(row.equipmentId, row.quantity - 1)}>−</button>
                            <span className="stepper-val" style={{ fontSize: 14, minWidth: 20 }}>{row.quantity}</span>
                            <button type="button" onClick={() => setQty(row.equipmentId, row.quantity + 1)}>+</button>
                          </div>
                          {!row.locked && (
                            <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => remove(row.equipmentId)}>Remove</button>
                          )}
                        </>
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
