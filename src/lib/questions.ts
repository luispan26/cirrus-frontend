export type QuestionType = 'radio' | 'multi' | 'space' | 'budget' | 'inventory' | 'priority_tiers' | 'protocol_demand' | 'checklist' | 'analytical_equipment' | 'basic_equipment';

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
// selection) -> protocol_demand (expected weekly runs per protocol) ->
// protocol_priorities (tiered prioritization) -> budget. existing_equipment
// is asked first, unconditionally (there used to be a gating "does your
// space already have equipment?" question ahead of it; removed — whether any
// equipment was actually entered here is now itself the signal, see
// hasExistingEquipment in buildFinalIntakeJson and questionHint in
// QuestionsPage.tsx). biosafety_level/biomaterials/analytical_equipment feed
// directly into basic_lab_equipment, so they're grouped right after
// existing_equipment, before space/protocols/budget.
//
// This is intentionally just the sizing-stage questions from the
// generator's intake spec, plus the Prompt 1/2 equipment-planning questions
// — no facilities/staff/schedule/constraints/growth/layout-weights/
// business-model questions, and no "how long does each run take" question
// (protocol_demand only asks frequency — duration comes from each
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

export const QS: Question[] = [
  { id: 'existing_equipment', n: 1, t: 'What equipment do you already have?', h: 'Pulled from your equipment inventory — only the gap between this and what your protocols need gets sized', type: 'inventory' },
  { id: 'biosafety_level', n: 2, t: 'What biosafety level is your labspace compliant with?', h: 'Adds that level\'s required equipment to your Basic Lab Equipment List', type: 'radio', opts: BIOSAFETY_LEVEL_OPTS },
  { id: 'biomaterials', n: 3, t: 'What type of biomaterials would you like to work with?', h: 'Each one adds its own basic equipment set to your Basic Lab Equipment List', type: 'checklist', opts: BIOMATERIAL_OPTS },
  { id: 'analytical_equipment', n: 4, t: 'Would you like any additional analytical equipment?', h: 'Optional — check anything you need beyond the basics, and set how many', type: 'analytical_equipment' },
  { id: 'basic_lab_equipment', n: 5, t: 'Finalize equipment quantity', h: 'Your computed Basic Lab Equipment List — adjust quantities or remove anything you don’t need', type: 'basic_equipment' },
  { id: 'space', n: 6, t: 'Define your space', h: 'Upload a floor plan, or build the room in the layout sandbox', type: 'space' },
  { id: 'operations', n: 7, t: 'Which protocols does this lab need to run?', h: 'Select from the supported protocol library', type: 'multi', opts: OPERATION_OPTS },
  { id: 'protocol_demand', n: 8, t: 'How often will you run each protocol?', h: 'Weekly run volume — used to size bench count, not just equipment. Run duration is pulled from the protocol itself.', type: 'protocol_demand' },
  { id: 'protocol_priorities', n: 9, t: 'How should these protocols be prioritized?', h: 'Optional — sort them into funding tiers if some matter more than others', type: 'priority_tiers' },
  { id: 'budget', n: 10, t: 'What is your budget?', h: 'Drives all financial projections', type: 'budget' },
];

// Steps where advancing past them triggers a feasibilityCheck GraphQL call
// against everything answered so far (see QuestionsPage.tsx's nextQ) —
// 'protocol_demand' re-checks room-vs-required-benches now that demand-driven
// bench replication is known (see capacity-planner.ts); 'protocol_priorities'
// is the last of the protocol-related steps, so it fires once operations are
// final; 'budget' re-checks with desired/max now known.
export const FEASIBILITY_GATE_IDS = ['protocol_demand', 'protocol_priorities', 'budget'];

export const INTAKE_FIELD_KEYS = [
  'existing_equipment_meta',
  'biosafety_level', 'biomaterials', 'analytical_equipment_quantities',
  'basic_lab_equipment_quantity_overrides', 'basic_lab_equipment_removed', 'basic_lab_equipment_final',
  'space_method', 'width_ft', 'height_ft', 'space_floorplan_filename',
  'operations', 'protocol_runs_per_week', 'wants_protocol_priorities', 'protocol_tiers', 'protocol_tier_order',
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
// used inline by resolveOperations) because protocol_runs_per_week is also
// keyed by the raw catalog id and needs the same mapping when it's folded
// into FinalIntakeJson.demand.
export function resolveOperationId(op: string): string {
  return op === 'bca_assay' ? 'bca_assay_manual' : op;
}

export function resolveOperations(a: Answers): string[] {
  const rawOps = (a.operations as string[]) || [];
  return rawOps.map(resolveOperationId);
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
  // computeBasicLabEquipment/applyBasicLabEquipmentOverrides below.
  basic_lab_equipment: { equipment_id: string; name: string; quantity: number }[];
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
  // Expected weekly run volume per protocol (keyed by resolved operation
  // id) — feeds capacity-planning/capacity-planner.ts's demand-driven bench
  // count sizing. Run duration is never asked here; it comes from each
  // operation's own estimatedTimeHours metadata on the backend.
  demand: { runs_per_week_by_operation: Record<string, number> };
  protocols: {
    operation_ids: string[];
    prioritization: {
      enabled: boolean;
      // Tier membership per raw catalog id (must_have / important / nice_to_have).
      tiers: Record<string, string>;
      // Full funding-priority order: all must_haves (in chosen order), then
      // important (in chosen order), then nice_to_have (in chosen order).
      // Empty when prioritization isn't enabled — no ordering is implied.
      order: string[];
    };
  };
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

  // Must-have < important < nice-to-have — the funding order from the
  // sizing spec (must-haves covered first from the desired budget,
  // important protocols are the primary desired->max spillover candidates,
  // nice-to-haves are cut first if there's still unmet need at max budget).
  const TIER_RANK: Record<string, number> = { must_have: 0, important: 1, nice_to_have: 2 };
  const prioritizationEnabled = a.wants_protocol_priorities === 'yes';
  const protocolTiers = (a.protocol_tiers as Record<string, string>) || {};
  const protocolTierOrder = (a.protocol_tier_order as Record<string, number>) || {};
  const rawSelectedOps = (a.operations as string[]) || [];
  const rawRunsPerWeek = (a.protocol_runs_per_week as Record<string, number>) || {};
  const runsPerWeekByOperation: Record<string, number> = {};
  for (const rawOpId of rawSelectedOps) {
    runsPerWeekByOperation[resolveOperationId(rawOpId)] = rawRunsPerWeek[rawOpId] ?? 0;
  }
  const prioritizedOrder = prioritizationEnabled
    ? [...rawSelectedOps].sort((x, y) => {
        const rankX = TIER_RANK[protocolTiers[x] ?? 'important'] ?? 1;
        const rankY = TIER_RANK[protocolTiers[y] ?? 'important'] ?? 1;
        if (rankX !== rankY) return rankX - rankY;
        return (protocolTierOrder[x] ?? 0) - (protocolTierOrder[y] ?? 0);
      })
    : [];

  return {
    scenario: 'lab_design',
    equipment_status: hasExistingEquipment ? 'has_equipment' : 'no_equipment',
    bsl: 'BSL-1',
    biosafety_level: (a.biosafety_level as string) || null,
    biomaterials: (a.biomaterials as string[]) || [],
    basic_lab_equipment: (a.basic_lab_equipment_final as { equipment_id: string; name: string; quantity: number }[]) || [],
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
    demand: { runs_per_week_by_operation: runsPerWeekByOperation },
    protocols: {
      operation_ids: resolveOperations(a),
      prioritization: {
        enabled: prioritizationEnabled,
        tiers: prioritizationEnabled ? protocolTiers : {},
        order: prioritizedOrder,
      },
    },
  };
}

export interface EquipmentListSummary { listKey: string; equipmentIds: string[]; }
export interface EquipmentCatalogEntry { equipmentId: string; name: string; }
export interface BasicLabEquipmentRow { equipmentId: string; name: string; quantity: number; locked: boolean; }

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

  function addList(listKey: string | undefined, isLockedSource: boolean) {
    if (!listKey) return;
    const list = listByKey.get(listKey);
    if (!list) return;
    for (const equipmentId of list.equipmentIds) {
      quantities.set(equipmentId, (quantities.get(equipmentId) ?? 0) + 1);
      if (isLockedSource) locked.add(equipmentId);
    }
  }

  addList(GENERAL_LAB_LIST_KEY, false);
  const bslLevel = answers.biosafety_level as string | undefined;
  addList(bslLevel ? BSL_REQUIRED_LIST_KEYS[bslLevel] : undefined, true);
  for (const biomaterial of (answers.biomaterials as string[]) || []) {
    addList(BIOMATERIAL_LIST_KEYS[biomaterial], false);
  }

  const analyticalQuantities = (answers.analytical_equipment_quantities as Record<string, number>) || {};
  for (const [equipmentId, qty] of Object.entries(analyticalQuantities)) {
    quantities.set(equipmentId, (quantities.get(equipmentId) ?? 0) + Math.max(1, Math.round(qty) || 1));
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
    }));
}

// Applies a user's Q5 edits on top of the computed list: quantity overrides
// (floored at 1, per the "cannot go below 1 without removing the item
// entirely" rule) and explicit removals. Locked (BSL-required) rows ignore
// removal entirely — they can only have their quantity increased, matching
// the Q5 editing rules exactly.
export function applyBasicLabEquipmentOverrides(computed: BasicLabEquipmentRow[], answers: Answers): BasicLabEquipmentRow[] {
  const removed = new Set((answers.basic_lab_equipment_removed as string[]) || []);
  const overrides = (answers.basic_lab_equipment_quantity_overrides as Record<string, number>) || {};
  return computed
    .filter((row) => row.locked || !removed.has(row.equipmentId))
    .map((row) => ({
      ...row,
      quantity: Math.max(1, overrides[row.equipmentId] ?? row.quantity),
    }));
}
