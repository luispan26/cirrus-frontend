export type QuestionType = 'radio' | 'multi' | 'space' | 'budget' | 'inventory' | 'checklist' | 'analytical_equipment' | 'basic_equipment';

export interface QuestionOption {
  v: string;
  l: string;
  d?: string;
  risk?: string;
  disabled?: boolean;
  // Populated at render time (not part of the static catalog below) when a
  // live match is found in the Damp Lab protocols.io workspace — see
  // matchDamplabProtocol in QuestionsPage.tsx.
  link?: { label: string; href: string };
}

// Keywords used to match a static catalog entry to a live Damp Lab
// protocols.io protocol by title (case-insensitive substring). Kept here
// rather than hardcoded protocol IDs so a Damp Lab protocol getting
// retitled/re-versioned doesn't silently break the link — matching stays
// live against whatever the workspace currently has.
export const DAMPLAB_MATCH_KEYWORDS: Record<string, string[]> = {
  glycerol_stocking: ['glycerol'],
  making_overnight_cultures: ['overnight'],
  nanodrop: ['nanodrop'],
  gel_electrophoresis: ['electrophoresis'],
  bca_assay: ['bca'],
  miniprep: ['miniprep'],
  send_to_sequencing: ['sequencing', 'plasmidsaurus'],
};

export interface Question {
  id: string;
  n: number;
  t: string;
  h: string;
  type: QuestionType;
  opts?: QuestionOption[];
}

export type Answers = Record<string, unknown>;

// The full intake flow, in order: existing_equipment -> biosafety_level ->
// biomaterials -> analytical_equipment -> basic_lab_equipment (the computed,
// user-editable Basic Lab Equipment List — see computeBasicLabEquipment/
// applyBasicLabEquipmentOverrides below) -> space -> operations (protocol
// selection, plus expected weekly runs per protocol asked inline — see
// ProtocolSelectBody in QuestionsPage.tsx, same select-then-quantify pattern
// as analytical_equipment) -> budget. existing_equipment is asked first,
// unconditionally (there used to be a gating "does your space already have
// equipment?" question ahead of it; removed — whether any equipment was
// actually entered here is now itself the signal, see hasExistingEquipment
// in buildFinalIntakeJson and questionHint in QuestionsPage.tsx).
// biosafety_level/biomaterials/analytical_equipment feed directly into
// basic_lab_equipment, so they're grouped right after existing_equipment,
// before space/protocols/budget. Tiered protocol prioritization used to be
// its own step after this one; removed outright (the backend never actually
// consumed it — finalIntakeJson is passed through as an opaque JSON scalar,
// see intake.resolver.ts).
//
// This is intentionally just the sizing-stage questions from the
// generator's intake spec, plus the Prompt 1/2 equipment-planning questions
// — no facilities/staff/schedule/constraints/growth/layout-weights/
// business-model questions, and no "how long does each run take" question
// (the weekly-runs input only asks frequency — duration comes from each
// protocol's own Operation.estimatedTimeHours metadata, see
// capacity-planner.ts's estimatedTimeHoursFor). FinalIntakeJson.bsl (the
// field the layout generator itself reads) is still fixed to 'BSL-1'
// regardless of the biosafety_level answer — the generator only ever
// supported that one value (see intake-validator.ts's assertSupportedBsl)
// and wiring a real BSL-2 answer through to generation/BOM is Prompt 3's
// job, not this one. biosafety_level's real answer is fully used for the
// Basic Lab Equipment List computation below, just not for FinalIntakeJson.bsl
// yet. Everything else not asked here is simply not collected; the backend
// treats all of it as optional and defaults safely when absent (see
// feasibility.service.ts / report-generator.service.ts / capacity-planner.ts).
//
// See FEASIBILITY_GATE_IDS below for exactly which steps trigger a
// cross-field feasibility check against everything answered so far.
export const OPERATION_OPTS: QuestionOption[] = [
  { v: 'glycerol_stocking', l: 'Glycerol stocking' },
  { v: 'making_overnight_cultures', l: 'Making overnight cultures' },
  { v: 'nanodrop', l: 'Nanodrop (dsDNA quantification)' },
  { v: 'gel_electrophoresis', l: 'Gel electrophoresis' },
  { v: 'bca_assay', l: 'BCA assay' },
  { v: 'miniprep', l: 'Plasmid miniprep (Monarch NEB kit)' },
  { v: 'send_to_sequencing', l: 'Send to sequencing (Plasmidsaurus)' },
  // Free-text/undefined protocol — there's no real definition behind it for
  // the generator to plan a room against, unlike every option above (which
  // now all map to a real seeded Operation; see SUPPORTED_OPERATION_IDS in
  // the backend's intake-payload.type.ts).
  { v: 'other', l: 'Other', d: 'Not supported by the layout generator — no protocol definition to size a room against.', disabled: true },
];

// New Q2's options — same values/colors as the old BSL question (see git
// history: BSL-1/#4FB3AC, BSL-2/#C99A4A), before it was simplified down to a
// BSL-1-only stub. BSL-3/4/not_sure are dropped: the spec for this question
// is only BSL-1/BSL-2.
export const BIOSAFETY_LEVEL_OPTS: QuestionOption[] = [
  { v: 'BSL-1', l: 'BSL-1', d: 'Minimal risk — teaching labs, non-pathogenic organisms', risk: '#4FB3AC' },
  { v: 'BSL-2', l: 'BSL-2', d: 'Moderate risk — most research, human cell lines', risk: '#C99A4A' },
];

// New Q3's options.
export const BIOMATERIAL_OPTS: QuestionOption[] = [
  { v: 'bacteria', l: 'Bacteria' },
  { v: 'yeast', l: 'Yeast' },
  { v: 'mammalian_adherent', l: 'Mammalian - Adherent' },
  { v: 'mammalian_suspension', l: 'Mammalian - Suspension' },
  { v: 'mice', l: 'Mice' },
];

// Prompt 1's nine fixed equipment membership list keys (see the backend's
// src/equipment-lists/equipment-list.service.ts LIST_DEFINITIONS) that the
// Basic Lab Equipment List computation below draws from. Kept in sync by
// hand since the frontend and backend don't share types.
export const GENERAL_LAB_LIST_KEY = 'general_lab_equipment_list';
export const BSL_REQUIRED_LIST_KEYS: Record<string, string> = {
  'BSL-1': 'bsl1_required_equipment',
  'BSL-2': 'bsl2_required_equipment',
};
export const BIOMATERIAL_LIST_KEYS: Record<string, string> = {
  bacteria: 'bacterial_basic_equipment',
  yeast: 'yeast_basic_equipment',
  mammalian_adherent: 'mammalian_adherent_basic_equipment',
  mammalian_suspension: 'mammalian_suspension_basic_equipment',
  mice: 'mice_basic_equipment',
};
export const ANALYTICAL_EQUIPMENT_LIST_KEY = 'analytical_equipment_catalog';

// Kept in sync by hand with the backend's PROTOCOL_SPECIFIC_CATEGORY_KEY
// (src/bom/protocol-equipment-list.ts) — same convention as the list keys
// above. Never produced by anything in this file; see the category entry
// below for why it's still declared here.
export const PROTOCOL_SPECIFIC_CATEGORY_KEY = 'protocol_specific';

// Q5's color-coded category legend — one entry per source that can
// contribute equipment to the Basic Lab Equipment List (see
// computeBasicLabEquipment below), in the same order they're added there.
// Colors are chosen to stay visually distinct from each other and from the
// existing amber "still a Canvas placeholder" convention used elsewhere.
export const BASIC_EQUIPMENT_CATEGORIES: { key: string; label: string; color: string }[] = [
  // Equipment pulled in from Q1's existing-equipment inventory (see
  // computeBasicLabEquipment's ownedMeta loop) — listed first since it needs
  // no action from the user, just an FYI of what's already covered. Greyed
  // out on purpose (a muted color, unlike every other category's saturated
  // one) to visually read as "already handled, nothing to configure here".
  { key: 'owned', label: 'Already Owned', color: '#6B7280' },
  { key: 'general', label: 'General Lab Equipment', color: '#00A3A3' },
  { key: 'bsl', label: 'Biosafety-Required', color: '#a67c00' },
  { key: 'bacteria', label: 'Bacterial Basic', color: '#3D8B3D' },
  { key: 'yeast', label: 'Yeast Basic', color: '#C9791C' },
  { key: 'mammalian_adherent', label: 'Mammalian (Adherent) Basic', color: '#7B4FD6' },
  { key: 'mammalian_suspension', label: 'Mammalian (Suspension) Basic', color: '#D64F9E' },
  { key: 'mice', label: 'Mice Basic', color: '#8A5A3B' },
  { key: 'analytical', label: 'Analytical Additions', color: '#3462C9' },
  // Not part of Q5's Basic Lab Equipment List (nothing here is ever
  // computed by computeBasicLabEquipment) — this key is only ever produced
  // server-side by the backend's bom/protocol-equipment-list.ts when
  // merging the Protocols Equipment List into the report's BOM, for
  // equipment a selected Q7 protocol needs that isn't already on the Basic
  // Lab list. Included here anyway so the report's BomSection (ReportView.tsx)
  // renders it as its own category in the same format as every other one.
  { key: PROTOCOL_SPECIFIC_CATEGORY_KEY, label: 'Protocol Specific Equipment', color: '#B5442E' },
];

export const QS: Question[] = [
  { id: 'existing_equipment', n: 1, t: 'Do you already have equipment?', h: 'Pulled from your equipment inventory — only the gap between this and what your protocols need gets sized', type: 'inventory' },
  { id: 'biosafety_level', n: 2, t: 'What biosafety level is your labspace compliant with?', h: 'Adds that level\'s required equipment to your Basic Lab Equipment List', type: 'radio', opts: BIOSAFETY_LEVEL_OPTS },
  { id: 'biomaterials', n: 3, t: 'What type of biomaterials would you like to work with?', h: 'Each one adds its own basic equipment set to your Basic Lab Equipment List', type: 'checklist', opts: BIOMATERIAL_OPTS },
  { id: 'analytical_equipment', n: 4, t: 'Would you like any additional analytical equipment?', h: 'Optional — check anything you need beyond the basics, and set how many', type: 'analytical_equipment' },
  { id: 'basic_lab_equipment', n: 5, t: 'Finalize Basic Lab Equipment', h: 'Your computed Basic Lab Equipment List — adjust quantities or remove anything you don’t need', type: 'basic_equipment' },
  { id: 'space', n: 6, t: 'Define your space', h: 'Upload a floor plan, or build the room in the layout sandbox', type: 'space' },
  { id: 'operations', n: 7, t: 'Add additional protocols?', h: 'Check the ones this lab needs and set expected weekly runs for each — duration is pulled from the protocol itself.', type: 'multi', opts: OPERATION_OPTS },
  { id: 'budget', n: 8, t: 'What is your budget?', h: 'Drives all financial projections', type: 'budget' },
];

// Steps where advancing past them triggers a feasibilityCheck GraphQL call
// against everything answered so far (see QuestionsPage.tsx's nextQ) —
// 'budget' re-checks room-vs-required-benches and budget-vs-equipment-cost
// with desired/max now known. 'operations' (protocol selection and
// weekly-runs, both answered on that one step) deliberately does NOT gate
// here for now — throughput is temporarily unlimited, no room-vs-bench
// error blocks leaving that step. Revisit once real throughput limits are
// wanted again.
export const FEASIBILITY_GATE_IDS = ['budget'];

export const INTAKE_FIELD_KEYS = [
  'existing_equipment_meta',
  'biosafety_level', 'biomaterials', 'analytical_equipment_quantities',
  'basic_lab_equipment_quantity_overrides', 'basic_lab_equipment_removed', 'basic_lab_equipment_final',
  'space_method', 'width_ft', 'height_ft', 'space_floorplan_filename',
  'operations', 'protocol_runs_per_week', 'protocol_operation_by_id',
  'budget_desired', 'budget_max', 'budget_scope',
];

// No steps are skipped today — existing_equipment used to be conditional on
// a gating question that's since been removed (see the flow comment above
// QS). Kept as a function (not deleted outright) since stepIndex/QuestionsPage
// both call it, and a future question may need to be conditional again.
export function shouldSkip(_q: Question, _answers: Answers): boolean {
  return false;
}

export function stepIndex(from: number, dir: 1 | -1, answers: Answers): number {
  let i = from + dir;
  while (i >= 0 && i < QS.length && shouldSkip(QS[i], answers)) i += dir;
  return i;
}

// 'bca_assay' isn't itself a layout-generator-supported operation ID (only
// its manual/automated variants are) — it maps to the manual variant since
// there's no automation question anymore to choose otherwise. 'miniprep'
// is already a supported ID as-is and needs no mapping. Exported (not just
// used inline by resolveOperations) because it's also applied per-protocol
// when folding protocol_runs_per_week into FinalIntakeJson.demand (see
// buildFinalIntakeJson).
export function resolveOperationId(op: string): string {
  return op === 'bca_assay' ? 'bca_assay_manual' : op;
}

// answers.operations holds each selected protocol's own real protocols.io
// id (always unique — see ProtocolSelectBody's toggleProtocol in
// QuestionsPage.tsx), not an operation id: two different validated
// protocols that both happen to title-match the same catalog Operation
// (e.g. two distinct BCA assay kits) stay independently selectable rather
// than collapsing onto one shared checkbox. protocol_operation_by_id maps
// a matched protocol's id to the Operation id it sizes against; unmatched
// protocols have no entry and pass their own id through unchanged (same
// fallback as before this was protocol-scoped). Deduped since more than
// one selected protocol can resolve to the same operation.
export function resolveOperations(a: Answers): string[] {
  const rawProtocolIds = (a.operations as string[]) || [];
  const operationByProtocolId = (a.protocol_operation_by_id as Record<string, string>) || {};
  const resolved = rawProtocolIds.map((protocolId) => resolveOperationId(operationByProtocolId[protocolId] ?? protocolId));
  return [...new Set(resolved)];
}

export interface FinalIntakeJson {
  scenario: string;
  // Derived from whether existing_equipment_meta has any entries (see
  // hasExistingEquipment below), not asked as its own question anymore.
  equipment_status: string | null;
  // Always 'BSL-1' — the only biosafety level the layout generator
  // supports (see intake-validator.ts's assertSupportedBsl). The real
  // biosafety_level answer (below) is used for the Basic Lab Equipment List
  // computation but deliberately NOT threaded through here yet — wiring a
  // real BSL-2 value into generation/BOM is Prompt 3's job.
  bsl: string;
  biosafety_level: string | null;
  biomaterials: string[];
  // The finalized (post-Q5-edit) Basic Lab Equipment List — see
  // computeBasicLabEquipment/applyBasicLabEquipmentOverrides below. sources
  // mirrors BasicLabEquipmentRow.sources, threaded through so the Lab
  // Design Report's BOM can reuse Q5's color-coded-by-source grouping.
  basic_lab_equipment: { equipment_id: string; name: string; quantity: number; sources: string[] }[];
  operations: string[];
  existing_equipment: { equipment_id: string; name: string; count: number }[];
  space: {
    sqft: number; width_ft: number; height_ft: number; ceiling_ft: number; rooms: string; renovation: boolean;
    // How the client defined their space — 'sandbox' means width_ft/height_ft
    // came from a room actually built in the layout sandbox; 'upload' means
    // they submitted a floor plan file we don't parse yet (see
    // floorplan_filename) — width_ft/height_ft fall back to the generator's
    // own defaults until that's wired in; null means neither step was
    // completed.
    method: 'sandbox' | 'upload' | null;
    floorplan_filename: string | null;
  };
  budget: { desired: number; max: number; scope: string };
  allocation: { equipment: number; construction: number; staffing: number; consumables: number; contingency: number };
  // Expected weekly run volume per resolved operation id — feeds
  // capacity-planning/capacity-planner.ts's demand-driven bench count
  // sizing. Run duration is never asked here; it comes from each
  // operation's own estimatedTimeHours metadata on the backend. Summed
  // across every selected protocol that resolves to the same operation
  // (two different validated protocols can both match one catalog
  // Operation — see resolveOperations's comment), not just the last one
  // selected. protocol_ids_by_operation (same keying) is one representative
  // real protocols.io protocol id per operation — needed because a
  // catalog-matched operation's own id (e.g. 'nanodrop') isn't itself a
  // protocols.io id, but the backend's Protocols Equipment List
  // (bom/protocol-equipment-list.ts) can only look up equipment usage by
  // the real one. When more than one selected protocol shares an
  // operation, only the first is used for this lookup.
  demand: { runs_per_week_by_operation: Record<string, number>; protocol_ids_by_operation: Record<string, string> };
}

export function buildFinalIntakeJson(a: Answers): FinalIntakeJson {
  const hasCon = a.budget_scope === 'equipment_and_construction';
  const width_ft = parseFloat((a.width_ft as string) || '0') || 0;
  const height_ft = parseFloat((a.height_ft as string) || '0') || 0;

  const existingMeta = (a.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
  // Replaces the old equipment_status question (removed — see the flow
  // comment above QS): whether the client entered any existing equipment is
  // now itself the signal for "already has equipment", instead of asking
  // separately and risking the two answers disagreeing.
  const hasExistingEquipment = Object.keys(existingMeta).length > 0;
  const budgetDesired = parseInt((a.budget_desired as string) || '0', 10) || 0;
  const budgetMax = parseInt((a.budget_max as string) || '0', 10) || 0;

  // a.operations holds each selected protocol's own real id (see
  // resolveOperations's comment) — runs are summed onto whichever operation
  // it resolves to rather than overwritten, so two different validated
  // protocols matching the same catalog Operation both count.
  const rawSelectedProtocolIds = (a.operations as string[]) || [];
  const rawRunsPerWeek = (a.protocol_runs_per_week as Record<string, number>) || {};
  const operationByProtocolId = (a.protocol_operation_by_id as Record<string, string>) || {};
  const runsPerWeekByOperation: Record<string, number> = {};
  const protocolIdsByOperation: Record<string, string> = {};
  for (const protocolId of rawSelectedProtocolIds) {
    const resolvedOpId = resolveOperationId(operationByProtocolId[protocolId] ?? protocolId);
    runsPerWeekByOperation[resolvedOpId] = (runsPerWeekByOperation[resolvedOpId] ?? 0) + (rawRunsPerWeek[protocolId] ?? 0);
    if (!protocolIdsByOperation[resolvedOpId]) protocolIdsByOperation[resolvedOpId] = protocolId;
  }

  return {
    scenario: 'lab_design',
    equipment_status: hasExistingEquipment ? 'has_equipment' : 'no_equipment',
    bsl: 'BSL-1',
    biosafety_level: (a.biosafety_level as string) || null,
    biomaterials: (a.biomaterials as string[]) || [],
    basic_lab_equipment: (a.basic_lab_equipment_final as { equipment_id: string; name: string; quantity: number; sources: string[] }[]) || [],
    operations: resolveOperations(a),
    existing_equipment: Object.entries(existingMeta).map(([equipment_id, meta]) => ({ equipment_id, name: meta.name, count: Math.max(1, meta.count ?? 1) })),
    space: {
      sqft: Math.round(width_ft * height_ft) || 0,
      width_ft, height_ft,
      // Neither the sandbox (no ceiling concept) nor the floor-plan-upload
      // stub captures this — defaulted to a typical lab ceiling rather than
      // asked as a third manual field.
      ceiling_ft: 10,
      rooms: 'single_open',
      // "has existing equipment" implies building into existing space.
      renovation: hasExistingEquipment,
      method: (a.space_method as 'sandbox' | 'upload' | undefined) ?? null,
      floorplan_filename: (a.space_floorplan_filename as string) || null,
    },
    budget: { desired: budgetDesired, max: budgetMax || budgetDesired, scope: (a.budget_scope as string) || 'equipment_only' },
    allocation: { equipment: hasCon ? 0.5 : 0.7, construction: hasCon ? 0.25 : 0, staffing: 0.1, consumables: 0.1, contingency: 0.05 },
    demand: { runs_per_week_by_operation: runsPerWeekByOperation, protocol_ids_by_operation: protocolIdsByOperation },
  };
}

export interface EquipmentListSummary { listKey: string; equipmentIds: string[]; }
export interface EquipmentCatalogEntry { equipmentId: string; name: string; }
// sources holds every BASIC_EQUIPMENT_CATEGORIES key that contributed to
// this row, in the order each was first added — sources[0] is treated as
// the row's primary category for grouping in the Q5 UI, with any further
// entries surfaced there as "also required by" cross-references.
// owned = true means this row's quantity comes (at least partly) from Q1's
// existing-equipment inventory ('owned' is in sources) — the lab already has
// it, so unlike a `locked` (BSL-required) row, its quantity can't be
// adjusted at all in Q5, not even increased.
export interface BasicLabEquipmentRow { equipmentId: string; name: string; quantity: number; locked: boolean; owned: boolean; sources: string[]; }

// Basic Lab Equipment List computation (Prompt 2 spec): start with 1 of
// every item on the General Lab Equipment List; add 1 of every item on the
// BSL-required list matching the biosafety_level answer (locked — can't be
// removed in Q5, only quantity-increased, since it's below the count the
// biosafety level actually requires); add 1 of every item on each checked
// biomaterial's list (Q3); add each Q4 analytical item at its chosen
// quantity. The same equipmentId touched by more than one source sums into a
// single row rather than duplicating (e.g. a centrifuge on both General and
// Bacterial Basic -> quantity 2, not two rows of 1).
//
// Deliberately pure over plain data (no GraphQL/Apollo here) so it can be
// called from a component with already-fetched lists/catalog, or later
// reused server-side without dragging a frontend query client along.
export function computeBasicLabEquipment(
  answers: Answers,
  lists: EquipmentListSummary[],
  catalog: EquipmentCatalogEntry[],
): BasicLabEquipmentRow[] {
  const listByKey = new Map(lists.map((l) => [l.listKey, l]));
  const nameById = new Map(catalog.map((c) => [c.equipmentId, c.name]));
  const quantities = new Map<string, number>();
  const locked = new Set<string>();
  const owned = new Set<string>();
  const sources = new Map<string, string[]>();

  function addSource(equipmentId: string, categoryKey: string) {
    const existing = sources.get(equipmentId);
    if (existing) {
      if (!existing.includes(categoryKey)) existing.push(categoryKey);
    } else {
      sources.set(equipmentId, [categoryKey]);
    }
  }

  function addList(listKey: string | undefined, isLockedSource: boolean, categoryKey: string) {
    if (!listKey) return;
    const list = listByKey.get(listKey);
    if (!list) return;
    for (const equipmentId of list.equipmentIds) {
      quantities.set(equipmentId, (quantities.get(equipmentId) ?? 0) + 1);
      if (isLockedSource) locked.add(equipmentId);
      addSource(equipmentId, categoryKey);
    }
  }

  addList(GENERAL_LAB_LIST_KEY, false, 'general');
  const bslLevel = answers.biosafety_level as string | undefined;
  addList(bslLevel ? BSL_REQUIRED_LIST_KEYS[bslLevel] : undefined, true, 'bsl');
  for (const biomaterial of (answers.biomaterials as string[]) || []) {
    addList(BIOMATERIAL_LIST_KEYS[biomaterial], false, biomaterial);
  }

  const analyticalQuantities = (answers.analytical_equipment_quantities as Record<string, number>) || {};
  for (const [equipmentId, qty] of Object.entries(analyticalQuantities)) {
    quantities.set(equipmentId, (quantities.get(equipmentId) ?? 0) + Math.max(1, Math.round(qty) || 1));
    addSource(equipmentId, 'analytical');
  }

  // Q1's existing-equipment inventory — merged in LAST, after every
  // category above, so ownership never displaces where an item already
  // landed: something already required by General/BSL/etc. stays under
  // that category (with 'owned' added as an additional source, surfaced as
  // a small "+ Already Owned" cross-reference pill same as any other
  // secondary source) — only an item owned but not required by ANY selected
  // category gets its own primary "Already Owned" bucket. Either way the
  // displayed quantity is raised to at least what's owned (never summed —
  // owning 3 of something a list only asks for 1 of shows 3, not 4), and
  // the row is marked owned so the BOM shows no cost for it.
  const ownedMeta = (answers.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
  for (const [equipmentId, meta] of Object.entries(ownedMeta)) {
    const ownedQty = Math.max(1, Math.round(meta.count) || 1);
    const requiredQty = quantities.get(equipmentId);
    quantities.set(equipmentId, requiredQty === undefined ? ownedQty : Math.max(requiredQty, ownedQty));
    owned.add(equipmentId);
    addSource(equipmentId, 'owned');
  }

  return Array.from(quantities.entries())
    // Guards against a listed equipmentId whose Equipment Specification
    // List entry was since deleted — never render a row with no real name.
    .filter(([equipmentId]) => nameById.has(equipmentId))
    .map(([equipmentId, quantity]) => ({
      equipmentId,
      name: nameById.get(equipmentId)!,
      quantity,
      locked: locked.has(equipmentId),
      owned: owned.has(equipmentId),
      sources: sources.get(equipmentId) ?? [],
    }));
}

// Applies a user's Q5 edits on top of the computed list: quantity overrides
// (floored at 1, per the "cannot go below 1 without removing the item
// entirely" rule) and explicit removals. Locked (BSL-required) rows ignore
// removal entirely — they can only have their quantity increased, matching
// the Q5 editing rules exactly. Owned rows ignore both — the quantity is
// whatever's actually owned, not user-editable at all.
export function applyBasicLabEquipmentOverrides(computed: BasicLabEquipmentRow[], answers: Answers): BasicLabEquipmentRow[] {
  const removed = new Set((answers.basic_lab_equipment_removed as string[]) || []);
  const overrides = (answers.basic_lab_equipment_quantity_overrides as Record<string, number>) || {};
  return computed
    .filter((row) => row.locked || row.owned || !removed.has(row.equipmentId))
    .map((row) => ({
      ...row,
      quantity: row.owned ? row.quantity : Math.max(1, overrides[row.equipmentId] ?? row.quantity),
    }));
}
