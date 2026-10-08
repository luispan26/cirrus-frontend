import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { OptionCard } from '../components/OptionCard';
import { SyncBadge } from '../components/SyncBadge';
import { SearchableSelect } from '../components/SearchableSelect';
import { Logo } from '../components/Logo';
import { useIntakeSync } from '../hooks/useIntakeSync';
import type { SandboxLayout } from '../lib/layout-sandbox';
import {
  QS, OPERATION_OPTS, DAMPLAB_MATCH_KEYWORDS, shouldSkip, stepIndex, buildFinalIntakeJson,
  computeBasicLabEquipment, applyBasicLabEquipmentOverrides, BASIC_EQUIPMENT_CATEGORIES, LAYOUT_SETTING_DEFAULTS,
  computeEssentialProtocolIds, PROTOCOL_PLAN_CATEGORIES,
  type Answers, type QuestionOption, type WallSide,
} from '../lib/questions';
import {
  EQUIPMENT_LIST_QUERY, EQUIPMENT_LISTS_QUERY, VALIDATED_PROTOCOLS_QUERY, MY_REPORTS_QUERY, LAYOUT_CAPACITY_CHECK_QUERY, FLOOR_EQUIPMENT_FOR_INTAKE_QUERY,
} from '../graphql/operations';
import { getSessionId } from '../lib/session';

type EquipmentRow = { equipmentId: string; name: string; costUsd: number; widthFt: number; depthFt: number; heightFt: number; utilityType: string | null; allTags: string[] };
type EquipmentListRow = { listKey: string; displayName: string; equipmentIds: string[] };
type ValidatedProtocolRow = { protocolId: string; title: string; sourceUrl: string; cellTypes?: string[] | null; essential: boolean };

type CapacityCheck = { benches: number; benchAreaSqFt: number; benchNeedSqFt: number; shortfallSqFt: number; roomTooSmall: boolean; zones: { id: string; name: string; benchNeedSqFt: number; benchAreaSqFt: number }[] };

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
      : 'Your budget for new equipment.';
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
  const [runCapacityCheck, { loading: checkingCapacity }] = useLazyQuery<{ layoutCapacityCheck: CapacityCheck }>(LAYOUT_CAPACITY_CHECK_QUERY, { fetchPolicy: 'network-only' });
  const [capacityWarning, setCapacityWarning] = useState<CapacityCheck | null>(null);
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
      spaceFromSandbox?: { width_ft: number; height_ft: number; door?: { wall: WallSide; offsetFt: number }; layout?: unknown; geometry?: unknown; arrangement?: Record<string, unknown> };
      startAtQuestionId?: string;
      generatedLayout?: unknown;
    } | null;
    if (!state) return;
    if (state.spaceFromSandbox) {
      const { width_ft, height_ft, door, layout, geometry, arrangement } = state.spaceFromSandbox;
      setField('width_ft', String(width_ft));
      setField('height_ft', String(height_ft));
      setField('space_method', 'sandbox');
      for (const [key, value] of Object.entries(arrangement ?? {})) setField(key, value);
      // The whole room — every door, column, no-placement area and fixture
      // — so the generator plans the real room, not just its size.
      setField('space_sandbox_layout', layout ?? null);
      setField('space_geometry', geometry ?? null);
      // Pre-fills the layout_prefs door question with the exit door the user
      // actually placed in the sandbox, same shape LayoutDoorPicker's manual
      // entry writes (door_wall/door_offset_ft) — so a sandbox-defined room
      // doesn't ask the user to re-place a door it already knows about.
      if (door) {
        setField('door_wall', door.wall);
        setField('door_offset_ft', door.offsetFt);
      }
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
  if (checkingCapacity) return;
  const error = validateQuestion(q.id, answers);
  if (error) { setValidationError(error); return; }
  setValidationError('');
  const ni = stepIndex(qi, 1, answers);
  if (ni < QS.length) {
    setQi(ni);
    return;
  }
  // Before generating: warn, and ask first, if the room can't hold the
  // benches the equipment needs (generation then shrinks every zone by the
  // same share).
  const finalJson = buildFinalIntakeJson(answers);
  try {
    const { data } = await runCapacityCheck({ variables: { intake: finalJson } });
    const capacity = data?.layoutCapacityCheck;
    if (capacity?.roomTooSmall) {
      setCapacityWarning(capacity);
      return;
    }
  } catch {
    // The check is advisory — if it fails, generate anyway; the report
    // itself warns when the room is too small.
  }
  await generate();
}

  async function generate() {
    setCapacityWarning(null);
    await completeIntake(buildFinalIntakeJson(answers) as unknown as Record<string, unknown>);
    navigate('/generating');
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
        <button className="btn-teal" onClick={nextQ} disabled={checkingCapacity}>
          {checkingCapacity ? 'Checking…' : isLast ? 'Generate report →' : 'Next →'}
        </button>
      </div>
      {capacityWarning && (
        <div className="q-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="capacity-title">
          <div className="q-modal">
            <h3 id="capacity-title">This room is too small for all your equipment</h3>
            <p>
              The benches that fit give <b>{Math.round(capacityWarning.benchAreaSqFt)} sq ft</b> of bench top, but your equipment needs <b>{Math.round(capacityWarning.benchNeedSqFt)} sq ft</b> (short {Math.round(capacityWarning.shortfallSqFt)} sq ft).
            </p>
            <ul>
              {capacityWarning.zones.map((z) => <li key={z.id}>{z.name}: needs {Math.round(z.benchNeedSqFt)} sq ft</li>)}
            </ul>
            <p>If you go ahead, every zone is shrunk by the same share. You can also go back and enlarge the room, remove equipment, or lower the working space.</p>
            <div className="q-modal-actions">
              <button className="btn-out" onClick={() => setCapacityWarning(null)}>Go back</button>
              <button className="btn-teal" onClick={generate}>Generate anyway</button>
            </div>
          </div>
        </div>
      )}
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

      {q.type === 'protocol_plan' && <ProtocolPlanBody answers={answers} setField={setField} />}

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
      {q.type === 'budget' && <><p className="q-inline-help budget-disclaimer">This budget covers equipment only. It does not include running costs (consumables, staffing, maintenance) or other fixed costs such as rent, construction or utilities.</p><BudgetBody answers={answers} setField={setField} /></>}
      {q.type === 'equipment_plan' && <EquipmentPlanBody answers={answers} setField={setField} />}
      {q.type === 'layout_prefs' && <LayoutPrefsBody answers={answers} setField={setField} />}
    </div>
  );
}

// The full Validated Protocols list can be matched, not just protocols with
// an obvious title — an unmatched protocol still gets recorded in the final
// intake payload (see resolveOperationId in questions.ts, which passes an
// unrecognized id through unchanged), it just doesn't contribute
// equipment/space sizing since the backend has no Operation to look it up
// against. Matched protocols additionally record which catalog Operation
// they matched (see ComputedProtocolList's protocol_operation_by_id sync) so
// sizing still works, but each protocol keeps its own id regardless of match
// — two different validated protocols that both title-match the same
// Operation (e.g. two distinct BCA assay kits) stay independently
// selectable, not collapsed onto one shared entry.
function findCatalogMatch(title: string): QuestionOption | undefined {
  const lower = title.toLowerCase();
  return OPERATION_OPTS.find((opt) => {
    const keywords = DAMPLAB_MATCH_KEYWORDS[opt.v];
    return keywords && !opt.disabled && keywords.some((kw) => lower.includes(kw));
  });
}

// The protocol-plan step's final selection: every essential protocol
// matching the user's current biomaterials (computeEssentialProtocolIds in
// questions.ts) that hasn't been explicitly removed, unioned with whatever
// the user has manually added — same "list-derived-minus-removed union
// user-added" shape as the equipment step's computeBasicLabEquipment/
// applyBasicLabEquipmentOverrides split, just without a quantity dimension.
// An id present in both sets (e.g. removed as essential, then re-added
// manually) resolves to 'manual', since the essential loop below only ever
// populates ids that are NOT in removedSet — the manual loop runs second and
// only fills in ids the essential loop didn't already claim.
function computeFinalProtocolSelection(answers: Answers, protocols: { protocolId: string; essential: boolean; cellTypes?: string[] | null }[]): { protocolId: string; categoryKey: string }[] {
  const essential = computeEssentialProtocolIds(answers, protocols);
  const removedSet = new Set((answers.protocol_essential_removed as string[]) || []);
  const manualIds = (answers.protocol_manual_ids as string[]) || [];
  const byId = new Map<string, string>();
  for (const e of essential) {
    if (!removedSet.has(e.protocolId)) byId.set(e.protocolId, e.categoryKey);
  }
  for (const id of manualIds) {
    if (!byId.has(id)) byId.set(id, 'manual');
  }
  return [...byId.entries()].map(([protocolId, categoryKey]) => ({ protocolId, categoryKey }));
}

// The merged protocol-planning step: essential protocols for the user's
// selected biomaterials are computed and pre-selected automatically (mirrors
// EquipmentPlanBody/computeBasicLabEquipment for Q3), and the user can add
// any other validated protocol or remove anything computed. Hoists
// VALIDATED_PROTOCOLS_QUERY here rather than in each child so there's one
// loading/error state instead of two.
function ProtocolPlanBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const { data, loading, error } = useQuery<{ validatedProtocols: ValidatedProtocolRow[] }>(VALIDATED_PROTOCOLS_QUERY);
  const protocols = data?.validatedProtocols ?? [];

  if (loading) return <p className="q-inline-help">Loading validated protocols…</p>;
  if (error) return <p className="q-validation-error">Couldn’t load validated protocols: {error.message}</p>;

  if (protocols.length === 0) {
    return <p className="q-inline-help">No protocols have been validated yet — assign equipment to at least one step and validate a protocol on the Protocols page first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '64vh', overflowY: 'auto', paddingRight: 6 }}>
      <ProtocolPicker answers={answers} setField={setField} protocols={protocols} />
      <ComputedProtocolList answers={answers} setField={setField} protocols={protocols} />
    </div>
  );
}

// Search-and-add control for protocols beyond whatever's essential-computed
// — single-bucket, unlike EquipmentPicker's Owned/Needed split, since a
// protocol has no owned/needed distinction. Deliberately doesn't render
// what's already selected (essential or manual) — once added, a protocol
// becomes a row in ComputedProtocolList below with its own Remove control,
// so there's exactly one place per protocol to view or edit it.
function ProtocolPicker({ answers, setField, protocols }: { answers: Answers; setField: (k: string, v: unknown) => void; protocols: ValidatedProtocolRow[] }) {
  const finalIds = new Set(computeFinalProtocolSelection(answers, protocols).map((s) => s.protocolId));
  const addable = protocols.filter((p) => !finalIds.has(p.protocolId));
  const [draftId, setDraftId] = useState('');

  useEffect(() => {
    if (draftId && !addable.some((p) => p.protocolId === draftId)) {
      setDraftId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addable.length, draftId]);

  function addProtocol() {
    const p = protocols.find((x) => x.protocolId === draftId);
    if (!p) return;
    const manualIds = (answers.protocol_manual_ids as string[]) || [];
    if (!manualIds.includes(p.protocolId)) {
      setField('protocol_manual_ids', [...manualIds, p.protocolId]);
    }
    setDraftId('');
  }

  return (
    <div className="field-wrap" style={{ marginBottom: 0 }}>
      <label className="field-label">Add another protocol</label>
      <p className="q-inline-help" style={{ marginTop: 0 }}>
        {protocols.length === addable.length
          ? 'Search for any Validated Protocol and add it — it\'ll appear under Added Manually below.'
          : 'Recommended protocols for your biomaterials are already listed below. Search for anything else this lab needs and add it.'}
      </p>
      {addable.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchableSelect
            style={{ width: 320 }}
            value={draftId}
            onChange={setDraftId}
            placeholder="Search for a protocol…"
            options={[{ value: '', label: 'Select a protocol…', disabled: true }, ...addable.map((p) => ({ value: p.protocolId, label: p.title }))]}
          />
          <button type="button" className="btn-out" disabled={!draftId} onClick={addProtocol}>Add</button>
        </div>
      ) : (
        <p className="q-inline-help" style={{ marginBottom: 0 }}>Every validated protocol is already in your list below.</p>
      )}
    </div>
  );
}

// Computes+renders the final protocol selection, grouped by
// PROTOCOL_PLAN_CATEGORIES, and syncs it into the raw answer fields
// buildFinalIntakeJson actually reads (operations/protocol_runs_per_week/
// protocol_operation_by_id) — same "compute, render, sync via effect"
// pattern as ComputedEquipmentList's basic_lab_equipment_final sync below,
// just writing three fields instead of one since protocols never got their
// own combined "_final" field.
function ComputedProtocolList({ answers, setField, protocols }: { answers: Answers; setField: (k: string, v: unknown) => void; protocols: ValidatedProtocolRow[] }) {
  const protocolById = new Map(protocols.map((p) => [p.protocolId, p]));
  const finalSelection = computeFinalProtocolSelection(answers, protocols);
  const finalIds = finalSelection.map((s) => s.protocolId);
  const serialized = JSON.stringify(finalSelection);

  useEffect(() => {
    const runs = (answers.protocol_runs_per_week as Record<string, number>) || {};
    const operationByProtocolId = (answers.protocol_operation_by_id as Record<string, string>) || {};

    const nextRuns: Record<string, number> = {};
    const nextOps: Record<string, string> = {};
    for (const id of finalIds) {
      // Preserves an existing runs/week value for anything staying selected
      // — only a newly-entering id defaults to 1 (mirrors the old
      // ProtocolSelectBody's toggle-on default).
      nextRuns[id] = runs[id] ?? 1;
      const existingOp = operationByProtocolId[id];
      if (existingOp) {
        nextOps[id] = existingOp;
      } else {
        const p = protocolById.get(id);
        const match = p ? findCatalogMatch(p.title) : undefined;
        if (match) nextOps[id] = match.v;
      }
    }

    setField('operations', finalIds);
    setField('protocol_runs_per_week', nextRuns);
    setField('protocol_operation_by_id', nextOps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  const runs = (answers.protocol_runs_per_week as Record<string, number>) || {};

  function setRuns(protocolId: string, value: number) {
    // Floored at 1 while the protocol stays selected — removing it entirely
    // is how a user drops it back out, not dialing runs to 0.
    setField('protocol_runs_per_week', { ...runs, [protocolId]: Math.max(1, Math.round(value)) });
  }

  // Always clears any manual-addition record for this id (harmless no-op if
  // it was never there), and additionally records an essential-sourced
  // removal when the row wasn't showing as 'manual' — covers the case where
  // a protocol is both an essential match AND already in protocol_manual_ids
  // (e.g. added manually before its biomaterial was selected): without also
  // clearing protocol_manual_ids here, the manual loop in
  // computeFinalProtocolSelection would silently resurrect it next render
  // under the Added Manually section instead of actually removing it.
  function remove(protocolId: string, categoryKey: string) {
    const manualIds = (answers.protocol_manual_ids as string[]) || [];
    if (manualIds.includes(protocolId)) {
      setField('protocol_manual_ids', manualIds.filter((id) => id !== protocolId));
    }
    if (categoryKey !== 'manual') {
      const removedIds = (answers.protocol_essential_removed as string[]) || [];
      if (!removedIds.includes(protocolId)) {
        setField('protocol_essential_removed', [...removedIds, protocolId]);
      }
    }
  }

  if (finalSelection.length === 0) {
    return <p className="q-inline-help">Nothing here yet — add a protocol above, or pick a biomaterial with recommended protocols on the biomaterials question.</p>;
  }

  const rowsByCategory = new Map<string, typeof finalSelection>();
  for (const row of finalSelection) {
    const bucket = rowsByCategory.get(row.categoryKey);
    if (bucket) bucket.push(row);
    else rowsByCategory.set(row.categoryKey, [row]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p className="q-inline-help" style={{ marginTop: 0, marginBottom: 0 }}>
        Recommended protocols for your selected biomaterials are listed automatically. Set expected weekly runs for each, or remove anything you don’t need — removing one just takes it out of this lab’s plan, it doesn’t change what’s recommended for that biomaterial. Each color-coded section below shows why that protocol is in this list.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {PROTOCOL_PLAN_CATEGORIES.map((category) => {
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
                  const p = protocolById.get(row.protocolId);
                  if (!p) return null;
                  const sized = !!findCatalogMatch(p.title);
                  return (
                    <div key={row.protocolId} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--br)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 13 }}>{p.title}</span>
                          {!sized && (
                            <span title="No Operation definition to size a room against yet — still recorded, just not sized." style={{ fontSize: 11, color: 'var(--mid)', border: '1px solid var(--br)', borderRadius: 4, padding: '1px 5px' }}>
                              not sized yet
                            </span>
                          )}
                          <a href={p.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--teal)' }}>
                            View on protocols.io →
                          </a>
                        </div>
                        <button type="button" className="btn-out" style={{ padding: '2px 10px', fontSize: 11 }} onClick={() => remove(row.protocolId, row.categoryKey)}>
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          className="field-input"
                          type="number"
                          min={1}
                          step={1}
                          style={{ width: 80 }}
                          value={runs[row.protocolId] ?? 1}
                          onChange={(e) => setRuns(row.protocolId, Number(e.target.value) || 1)}
                        />
                        <span style={{ fontSize: 12, color: 'var(--mid)' }}>runs/week</span>
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
  // The floor-standing equipment the equipment step brought in goes along,
  // so it can be placed by hand before generating (benches then plan around
  // it). If it can't be fetched, the sandbox opens without it.
  const [fetchFloorEquipment, { loading: loadingFloorEquipment }] = useLazyQuery<{ floorEquipmentForIntake: NonNullable<SandboxLayout['floorEquipment']> }>(FLOOR_EQUIPMENT_FOR_INTAKE_QUERY, { fetchPolicy: 'network-only' });
  async function openSandbox() {
    let floorEquipment: SandboxLayout['floorEquipment'];
    try {
      const { data } = await fetchFloorEquipment({ variables: { intake: buildFinalIntakeJson(answers) } });
      floorEquipment = data?.floorEquipmentForIntake;
    } catch { /* open without it */ }
    navigate('/layout-sandbox', { state: { loadLayout: answers.space_sandbox_layout ?? generatedLayout, floorEquipment, arrangement: Object.fromEntries(['layout_mode', 'layout_main_wall', 'layout_same_direction', 'layout_wall_benches'].filter((key) => answers[key] !== undefined && answers[key] !== null).map((key) => [key, answers[key]])) } });
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
              <button type="button" className="btn-out" onClick={openSandbox} disabled={loadingFloorEquipment}>
                {generatedLayout ? 'Edit the generated layout →' : 'Rebuild in the sandbox →'}
              </button>
            </>
          ) : (
            <>
              <p className="q-inline-help" style={{ marginTop: 0 }}>
                Opens the layout sandbox in this tab. Once you've sized the room, use its "Use this room in my
                intake" button to come back here with the dimensions filled in.
              </p>
              <button type="button" className="btn-teal" onClick={openSandbox} disabled={loadingFloorEquipment}>
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
            onChange={(e) => { setDesiredInput(e.target.value); setField('budget_desired', e.target.value); }}
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
            onChange={(e) => { setMaxInput(e.target.value); setField('budget_max', e.target.value); }}
            onBlur={() => {
              const clamped = desired && maxInput && Number(maxInput) < Number(desired) ? desired : maxInput;
              setMaxInput(clamped);
              setField('budget_max', clamped);
            }}
          />
          <p className="q-inline-help">Equipment above this amount triggers a stronger warning. Your choices are kept; Cirrus does not automatically change the equipment list.</p>
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
    // No height cap of its own: the card grows to show the picker and the
    // whole computed list, and the question stage scrolls (.qm-stage /
    // .q-card in index.css handle cards taller than the window). A capped
    // inner box here was too cramped to work in.
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
  // Owned/Add are direct actions now, not a toggle behind a separate Add
  // button — an item stays selectable here as long as at least one of the
  // two buckets still doesn't have it (own 2, still need 3 more stays
  // possible; only fully excluded once it's in both).
  const addable = catalog.filter((eq) => !(ownedMeta[eq.equipmentId] && neededMeta[eq.equipmentId]));
  // View filter only — narrows which addable equipment the search below can
  // find. Deliberately component-local, not routed through setField/answers:
  // it's not an intake answer, just how this picker's own list is browsed.
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const tagFilteredAddable = selectedTags.size === 0 ? addable : addable.filter((eq) => matchesTagFilter(eq, selectedTags));
  // Zone the next Owned/Add goes into. Sticky: only the user changing it
  // changes it — adding equipment or filtering leaves it alone, and it's
  // remembered for this browser tab if the step is left and reopened.
  const [addZone, setAddZone] = useState<string>(() => {
    try { return sessionStorage.getItem(PICKER_ZONE_KEY) ?? 'general'; } catch { return 'general'; }
  });
  function chooseAddZone(zone: string) {
    setAddZone(zone);
    try { sessionStorage.setItem(PICKER_ZONE_KEY, zone); } catch { /* storage unavailable: keep it for this visit */ }
  }

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

  function addTo(bucket: 'owned' | 'needed') {
    const eq = catalog.find((c) => c.equipmentId === draftId);
    if (!eq) return;
    if (bucket === 'owned') {
      setField('existing_equipment_meta', { ...ownedMeta, [eq.equipmentId]: { name: eq.name, count: 1 } });
    } else {
      setField('needed_equipment_meta', { ...neededMeta, [eq.equipmentId]: { name: eq.name, count: 1 } });
    }
    // The picker's zone becomes this item's zone (still editable per row in
    // the list below).
    setField('equipment_zones', { ...((answers.equipment_zones as Record<string, string>) ?? {}), [eq.equipmentId]: addZone });
    setDraftId('');
  }

  // Everything the picker currently offers (so it follows the tag filter)
  // that isn't already needed, added as needed in the picker's zone. Items
  // already marked owned keep their zone.
  const addAllCandidates = tagFilteredAddable.filter((eq) => !neededMeta[eq.equipmentId]);
  function addAll() {
    if (addAllCandidates.length === 0) return;
    const nextNeeded = { ...neededMeta };
    const nextZones = { ...((answers.equipment_zones as Record<string, string>) ?? {}) };
    for (const eq of addAllCandidates) {
      nextNeeded[eq.equipmentId] = { name: eq.name, count: 1 };
      if (!ownedMeta[eq.equipmentId]) nextZones[eq.equipmentId] = addZone;
    }
    setField('needed_equipment_meta', nextNeeded);
    setField('equipment_zones', nextZones);
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
          <select className="field-input" style={{ width: 'auto' }} aria-label="Zone for the equipment you add" title="Zone (biomaterial) the equipment you add goes into" value={addZone} onChange={(e) => chooseAddZone(e.target.value)}>
            <option value="general">General</option><option value="microbial">Microbial</option><option value="mammalian">Mammalian</option>
          </select>
          {/* Owned/Add each commit the selected equipment straight into that
              bucket — no separate Add button, no toggle-then-confirm step.
              "Add" is this bucket's label for needed_equipment_meta (still
              needed_equipment_meta under the hood, same as ComputedEquipmentList's
              Needed rows below); disabled per-button once the selected item
              is already in that particular bucket. */}
          <button
            type="button"
            className="btn-out"
            style={{ padding: '6px 14px' }}
            disabled={!draftId || !!ownedMeta[draftId]}
            onClick={() => addTo('owned')}
          >
            Owned
          </button>
          <button
            type="button"
            className="btn-teal"
            style={{ padding: '6px 14px' }}
            disabled={!draftId || !!neededMeta[draftId]}
            onClick={() => addTo('needed')}
          >
            Add
          </button>
          <button
            type="button"
            className="btn-out"
            style={{ padding: '6px 14px' }}
            disabled={addAllCandidates.length === 0}
            title={selectedTags.size ? 'Add every equipment item matching the tag filter' : 'Add every equipment item in the catalog'}
            onClick={addAll}
          >
            Add all ({addAllCandidates.length})
          </button>
        </div>
      )}
    </div>
  );
}

const UNTAGGED = 'Untagged';
const PICKER_ZONE_KEY = 'cirrus.equipmentPicker.zone';

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
// The menu is portaled to <body> with fixed positioning (as SearchableSelect
// does) so the scrolling question stage can't clip it.
function TagFilterPopover({ catalog, selected, onChange }: { catalog: EquipmentRow[]; selected: Set<string>; onChange: (next: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upwards = below < 200 && above > below;
      setMenuStyle({ position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)), minWidth: 240, maxHeight: Math.max(80, Math.min(360, upwards ? above : below)), ...(upwards ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);

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
      {open && createPortal(
        <div
          ref={menuRef}
          // The intake flow's document-level keydown listener advances/
          // rewinds the question on Enter/Escape (see QuestionsPage's
          // onKeyDown effect) — without stopping propagation here, checking
          // a tag or dismissing the popover with Escape would also fire
          // that navigation, same reasoning as SearchableSelect's onKeyDown.
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.stopPropagation(); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
          }}
          style={{ ...menuStyle, zIndex: 10000, overflowY: 'auto', background: 'var(--white)', border: '1px solid var(--br)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', padding: 8 }}
        >
          {tagCounts.length === 0 ? (
            <div style={{ fontSize: 16, color: 'var(--mid)', padding: '4px 6px' }}>No tags yet.</div>
          ) : (
            <>
              {tagCounts.map(([tag, count]) => (
                <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, padding: '4px 6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.has(tag)} onChange={() => toggleTag(tag)} />
                  <span style={{ flex: 1 }}>{tag}</span>
                  <span style={{ color: 'var(--mid)' }}>{count}</span>
                </label>
              ))}
              {selected.size > 0 && (
                <button type="button" className="btn-out" style={{ marginTop: 6, width: '100%', padding: '4px 0', fontSize: 16 }} onClick={() => onChange(new Set())}>Clear all</button>
              )}
            </>
          )}
        </div>, document.body,
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
  const equipmentById = new Map(catalog.map((item) => [item.equipmentId, item]));
  const estimatedCost = rows.reduce((sum, row) => sum + (row.owned ? 0 : row.quantity * (equipmentById.get(row.equipmentId)?.costUsd ?? 0)), 0);
  const overMax = Number(answers.budget_max) > 0 && estimatedCost > Number(answers.budget_max);
  const overDesired = Number(answers.budget_desired) > 0 && estimatedCost > Number(answers.budget_desired);
  const zoneOverrides = (answers.equipment_zones as Record<string, string>) ?? {};
  const fixedIds = (answers.equipment_fixed as string[]) ?? [];
  const serialized = JSON.stringify(rows.map((r) => [r.equipmentId, r.quantity, r.sources.join(',')]));

  useEffect(() => {
    // sources travels through to the report's BOM (see reports.service.ts's
    // extractBasicLabEquipment) so the Lab Design Report can apply the same
    // color-coded-by-source grouping used here.
    const currentZones = (answers.equipment_zones as Record<string, string>) ?? {};
    const defaults = Object.fromEntries(rows.filter((r) => !currentZones[r.equipmentId]).map((r) => [r.equipmentId, 'general']));
    if (Object.keys(defaults).length) setField('equipment_zones', { ...currentZones, ...defaults });
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
      <div className={`equipment-budget ${overMax ? 'over-max' : overDesired ? 'over-desired' : ''}`} role="status">
        <strong>New equipment estimate: {estimatedCost.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</strong>
        <p>{overMax ? 'Above your absolute maximum budget. Adjust equipment or revisit your budget.' : overDesired ? 'Above your desired spend, but within your absolute maximum.' : 'Owned equipment is excluded. Estimates use current catalog prices.'}</p>
        <small>Warnings only; you can continue. Protocol-specific equipment added later may increase the total.</small>
      </div>
      <p className="q-inline-help" style={{ marginTop: 0, marginBottom: 0 }}>
        Adjust quantities as needed. Items required for your biosafety level can’t be removed, only increased.
        Equipment you already own or still need can be adjusted or removed here too — removing an owned row means you no longer have it, and removing a needed row means you no longer want it; neither means the room doesn’t need it. Each color-coded section below shows which list brought that equipment into this combined list.
      </p>
      {/* No max-height/scroll of its own — the question stage scrolls the
          whole step (picker + this list) together, so this only needs to
          lay the rows out. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {BASIC_EQUIPMENT_CATEGORIES.map((category) => {
        const categoryRows = rowsByCategory.get(category.key);
        if (!categoryRows || categoryRows.length === 0) return null;
        return (
          <div key={category.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: category.color, flexShrink: 0 }} />
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.03em', color: category.color, textTransform: 'uppercase' }}>
                {category.label}
              </span>
              <span style={{ fontSize: 16, color: 'var(--mid)' }}>({categoryRows.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `3px solid ${category.color}`, paddingLeft: 12 }}>
              {categoryRows.map((row) => {
                const otherSources = row.sources.filter((s) => s !== category.key);
                return (
                  <div key={row.equipmentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--dark)' }}>
                      {row.name}
                      {row.owned ? (
                        <span style={{ marginLeft: 6, fontSize: 16, fontWeight: 500, color: 'var(--mid)' }}>(owned)</span>
                      ) : row.needed ? (
                        <span style={{ marginLeft: 6, fontSize: 16, fontWeight: 500, color: 'var(--mid)' }}>(needed)</span>
                      ) : row.locked && (
                        <span style={{ marginLeft: 6, fontSize: 16, fontWeight: 500, color: 'var(--mid)' }}>(required)</span>
                      )}
                      {otherSources.map((sourceKey) => {
                        const meta = categoryByKey.get(sourceKey);
                        if (!meta) return null;
                        return (
                          <span
                            key={sourceKey}
                            title={`Also required by ${meta.label}`}
                            style={{ marginLeft: 6, fontSize: 16, fontWeight: 600, color: meta.color, border: `1px solid ${meta.color}`, borderRadius: 10, padding: '1px 7px' }}
                          >
                            + {meta.label}
                          </span>
                        );
                      })}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {equipmentById.get(row.equipmentId)?.allTags.some((tag) => ['Cold Storage', 'Hood'].includes(tag)) ? <span>Floor item — placed manually, no zone</span> : (
                        <label className="q-check-row">Zone
                          <select className="field-input" aria-label={`Zone for ${row.name}`} value={zoneOverrides[row.equipmentId] ?? 'general'} onChange={(e) => setField('equipment_zones', { ...zoneOverrides, [row.equipmentId]: e.target.value })}>
                            <option value="general">General</option><option value="microbial">Microbial</option><option value="mammalian">Mammalian</option>
                          </select>
                        </label>
                      )}
                      <label className="q-check-row"><input type="checkbox" checked={fixedIds.includes(row.equipmentId)} onChange={(e) => setField('equipment_fixed', e.target.checked ? [...fixedIds, row.equipmentId] : fixedIds.filter((id) => id !== row.equipmentId))} />Fixed for optimizer</label>
                      {/* A row is never both owned and needed at once —
                          computeBasicLabEquipment splits that case into two
                          separate rows (one here, one in the other
                          category's section) — so exactly one of these
                          three branches ever renders per row. */}
                      {row.owned ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stepper">
                            <button type="button" onClick={() => setOwnedQty(row.equipmentId, row.ownedQuantity - 1)}>−</button>
                            <span className="stepper-val" style={{ fontSize: 16, minWidth: 20 }}>{row.ownedQuantity}</span>
                            <button type="button" onClick={() => setOwnedQty(row.equipmentId, row.ownedQuantity + 1)}>+</button>
                          </div>
                          <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => unown(row.equipmentId)}>Remove</button>
                        </div>
                      ) : row.needed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stepper">
                            <button type="button" onClick={() => setNeededQty(row.equipmentId, row.neededQuantity - 1)}>−</button>
                            <span className="stepper-val" style={{ fontSize: 16, minWidth: 20 }}>{row.neededQuantity}</span>
                            <button type="button" onClick={() => setNeededQty(row.equipmentId, row.neededQuantity + 1)}>+</button>
                          </div>
                          <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => removeNeeded(row.equipmentId)}>Remove</button>
                        </div>
                      ) : (row.locked ? (
                        <div className="stepper">
                          <button type="button" onClick={() => setQty(row.equipmentId, row.quantity - 1)}>−</button>
                          <span className="stepper-val" style={{ fontSize: 16, minWidth: 20 }}>{row.quantity}</span>
                          <button type="button" onClick={() => setQty(row.equipmentId, row.quantity + 1)}>+</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stepper">
                            <button type="button" onClick={() => setQty(row.equipmentId, row.quantity - 1)}>−</button>
                            <span className="stepper-val" style={{ fontSize: 16, minWidth: 20 }}>{row.quantity}</span>
                            <button type="button" onClick={() => setQty(row.equipmentId, row.quantity + 1)}>+</button>
                          </div>
                          <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => remove(row.equipmentId)}>Remove</button>
                        </div>
                      ))}
                      {(row.owned || row.needed) && row.requiredQuantity > row.ownedQuantity + row.neededQuantity && (
                        <span style={{ fontSize: 16, color: 'var(--mid)' }}>Sized at {row.quantity} — this list needs at least {row.requiredQuantity}</span>
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

const WALL_OPTIONS: { value: WallSide; label: string }[] = [
  { value: 'N', label: 'North wall' },
  { value: 'S', label: 'South wall' },
  { value: 'E', label: 'East wall' },
  { value: 'W', label: 'West wall' },
];

// The layout_prefs step: how benches are arranged, keeping zones apart, the
// equipment optimizer's focus, plus optional manual door placement (see
// layout_options and buildLayoutPrefsJson in questions.ts). Utilities are
// not placed — see the Disclaimer page. Every
// control only calls setField from its own onChange; untouched, the
// generator uses its defaults.
function LayoutPrefsBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const width = parseFloat((answers.width_ft as string) || '0') || 0;
  const height = parseFloat((answers.height_ft as string) || '0') || 0;
  const hasRoomSize = width > 0 && height > 0;
  const roomFromSandbox = answers.space_method === 'sandbox' && !!answers.space_geometry;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <LayoutGenerationSettings answers={answers} setField={setField} />
      <LayoutPriorities answers={answers} setField={setField} />
      {roomFromSandbox
        ? <p className="q-inline-help" style={{ margin: 0 }}>Doors, columns and no-placement areas come from the room you built in the sandbox.</p>
        : <LayoutDoorPicker answers={answers} setField={setField} hasRoomSize={hasRoomSize} width={width} height={height} />}
      <p className="q-inline-help" style={{ margin: 0 }}>Utilities (electrical, plumbing, HVAC) are not placed: Cirrus assumes they can be reconfigured to your planned layout. See the <a href="/disclaimer" target="_blank" rel="noreferrer">Disclaimer</a>.</p>
    </div>
  );
}

// How the generator arranges benches — the same settings the generated
// layout's own settings panel re-runs with (GeneratedLayoutPlan.tsx).
function LayoutGenerationSettings({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const workingSpacePct = Number(answers.layout_working_space_pct) || LAYOUT_SETTING_DEFAULTS.workingSpacePct;
  return (
    <div className="field-wrap">
      <p className="q-inline-help">Choose Maximum fit, Main wall, and wall benches in the room sandbox on the Space step.</p>
      <label className="field-label" style={{ marginTop: 14 }}>Working space on every bench: {workingSpacePct}%</label>
      <p className="q-inline-help" style={{ marginTop: 0, marginBottom: 6 }}>The share of each bench top kept free for working. Zones are sized so their equipment fills the rest.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, color: 'var(--mid)' }}>20%</span>
        <input type="range" min={20} max={50} step={1} value={workingSpacePct} onChange={(e) => setField('layout_working_space_pct', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 16, color: 'var(--mid)' }}>50%</span>
      </div>
    </div>
  );
}

// Contamination control (an aisle between different zones' benches) and
// the balance the equipment optimizer will aim for. The balance doesn't
// change Cirrus's own layout — it's stored in the plan JSON for the
// optimizer.
function LayoutPriorities({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const separateZones = (answers.layout_separate_zones as boolean | undefined) ?? LAYOUT_SETTING_DEFAULTS.separateZones;
  const balance = (answers.layout_optimizer_balance as number | undefined) ?? LAYOUT_SETTING_DEFAULTS.optimizerBalance;
  return (
    <div className="field-wrap">
      <label className="field-label">Layout priorities</label>
      <label className="q-check-row" style={{ marginTop: 0 }}>
        <input type="checkbox" checked={separateZones} onChange={(e) => setField('layout_separate_zones', e.target.checked)} />
        Contamination control — keep an aisle between different zones
      </label>
      <p className="q-inline-help" style={{ marginTop: 4 }}>Benches of different zones never touch; where they would, one is left out to open a walkway.</p>
      <label className="field-label" style={{ marginTop: 14 }}>Equipment optimizer focus</label>
      <p className="q-inline-help" style={{ marginTop: 0, marginBottom: 6 }}>Used later when equipment is placed on the benches. Soft constraints will be added later.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, color: 'var(--mid)', maxWidth: 120 }}>Meet soft constraints</span>
        <input type="range" min={0} max={1} step={0.05} value={balance} onChange={(e) => setField('layout_optimizer_balance', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 16, color: 'var(--mid)', maxWidth: 120, textAlign: 'right' }}>Minimize walking distance</span>
      </div>
    </div>
  );
}


function LayoutDoorPicker({
  answers, setField, hasRoomSize, width, height,
}: {
  answers: Answers; setField: (k: string, v: unknown) => void; hasRoomSize: boolean; width: number; height: number;
}) {
  const wall = answers.door_wall as WallSide | undefined;
  const manual = !!wall;
  const runLength = wall === 'N' || wall === 'S' ? width : height;

  function useAuto() {
    setField('door_wall', undefined);
    setField('door_offset_ft', undefined);
  }

  return (
    <div className="field-wrap">
      <label className="field-label">Door placement</label>
      {!hasRoomSize ? (
        <p className="q-inline-help" style={{ marginTop: 0 }}>Set your room size on the Space step first to choose a door location.</p>
      ) : (
        <>
          <p className="q-inline-help" style={{ marginTop: 0 }}>Defaults to a centered door on the south wall if left on auto.</p>
          <div className="chips" style={{ marginBottom: manual ? 10 : 0 }}>
            <span className={`chip${!manual ? ' sel' : ''}`} onClick={useAuto}>Let the generator choose</span>
            <span className={`chip${manual ? ' sel' : ''}`} onClick={() => setField('door_wall', 'S')}>Choose manually</span>
          </div>
          {manual && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="field-input" style={{ width: 160 }} value={wall} onChange={(e) => setField('door_wall', e.target.value)}>
                {WALL_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
              <input
                className="field-input" type="number" style={{ width: 120 }} min={0} max={runLength}
                placeholder="Offset (ft)"
                value={(answers.door_offset_ft as string | number | undefined) ?? ''}
                onChange={(e) => setField('door_offset_ft', e.target.value)}
              />
              <span style={{ fontSize: 16, color: 'var(--mid)' }}>ft along a {runLength} ft wall</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

