export type QuestionType = 'radio' | 'multi' | 'space' | 'budget' | 'inventory' | 'priority_tiers' | 'protocol_demand';

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

// The full intake flow, in order: equipment_status -> existing_equipment ->
// space -> operations (protocol selection) -> protocol_demand (expected
// weekly runs per protocol) -> protocol_priorities (tiered prioritization)
// -> budget. Each answer reframes how the next is interpreted
// (equipment_status changes what "space" and "budget" mean; existing_equipment
// is asked immediately after it, while "what do you already have" is still
// the frame, rather than later once the conversation has moved on to
// protocols; space is a hard physical ceiling checked against protocols
// before budget is ever discussed; protocol selection, its demand, and its
// prioritization are three separate steps — pick the list, size its
// throughput, then decide how much each one matters — but all still precede
// budget, since funding order depends on them). existing_equipment only
// applies to the "already has equipment" branch (see shouldSkip).
//
// This is intentionally just the sizing-stage questions from the
// generator's intake spec — no BSL/facilities/staff/schedule/constraints/
// growth/layout-weights/business-model questions, and no "how long does
// each run take" question (protocol_demand only asks frequency — duration
// comes from each protocol's own Operation.estimatedTimeHours metadata, see
// capacity-planner.ts's estimatedTimeHoursFor). BSL is fixed to 'BSL-1' in
// buildFinalIntakeJson (the only value the layout generator has ever
// supported — every other option was already disabled in the old BSL
// question), and everything else is simply not collected; the backend
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

export const QS: Question[] = [
  {
    id: 'equipment_status', n: 1, t: 'Does your space already have equipment?', h: 'Changes what "space" and "budget" mean in the questions that follow', type: 'radio',
    opts: [
      { v: 'has_equipment', l: 'I have a space with existing equipment', d: 'Adding protocols or scaling up what you already run. Space means available/underutilized footprint; budget means incremental spend on top of what you already have.' },
      { v: 'no_equipment', l: 'I have a space, no equipment yet', d: 'Full build-out from scratch. Space means total footprint; budget means the full build budget.' },
    ],
  },
  { id: 'existing_equipment', n: 2, t: 'What equipment do you already have?', h: 'Pulled from your equipment inventory — only the gap between this and what your protocols need gets sized', type: 'inventory' },
  { id: 'space', n: 3, t: 'Define your space', h: 'Upload a floor plan, or build the room in the layout sandbox', type: 'space' },
  { id: 'operations', n: 4, t: 'Which protocols does this lab need to run?', h: 'Select from the supported protocol library', type: 'multi', opts: OPERATION_OPTS },
  { id: 'protocol_demand', n: 5, t: 'How often will you run each protocol?', h: 'Weekly run volume — used to size bench count, not just equipment. Run duration is pulled from the protocol itself.', type: 'protocol_demand' },
  { id: 'protocol_priorities', n: 6, t: 'How should these protocols be prioritized?', h: 'Optional — sort them into funding tiers if some matter more than others', type: 'priority_tiers' },
  { id: 'budget', n: 7, t: 'What is your budget?', h: 'Drives all financial projections', type: 'budget' },
];

// Steps where advancing past them triggers a feasibilityCheck GraphQL call
// against everything answered so far (see QuestionsPage.tsx's nextQ) —
// 'protocol_demand' re-checks room-vs-required-benches now that demand-driven
// bench replication is known (see capacity-planner.ts); 'protocol_priorities'
// is the last of the protocol-related steps, so it fires once operations are
// final; 'budget' re-checks with desired/max now known.
export const FEASIBILITY_GATE_IDS = ['protocol_demand', 'protocol_priorities', 'budget'];

export const INTAKE_FIELD_KEYS = [
  'equipment_status', 'existing_equipment_meta',
  'space_method', 'width_ft', 'height_ft', 'space_floorplan_filename',
  'operations', 'protocol_runs_per_week', 'wants_protocol_priorities', 'protocol_tiers', 'protocol_tier_order',
  'budget_desired', 'budget_max', 'budget_scope',
];

// existing_equipment only makes sense once the client has told us they
// already have equipment (Case 1) — otherwise there's nothing to inventory.
export function shouldSkip(q: Question, answers: Answers): boolean {
  if (q.id === 'existing_equipment') return answers.equipment_status !== 'has_equipment';
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
  equipment_status: string | null;
  // Always 'BSL-1' — the only biosafety level the layout generator
  // supports (see intake-validator.ts's assertSupportedBsl), and the only
  // value the old BSL question ever let a client actually pick.
  bsl: string;
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

  const equipmentStatus = (a.equipment_status as string) || null;
  const existingMeta = (a.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
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
    equipment_status: equipmentStatus,
    bsl: 'BSL-1',
    operations: resolveOperations(a),
    existing_equipment: equipmentStatus === 'has_equipment'
      ? Object.entries(existingMeta).map(([equipment_id, meta]) => ({ equipment_id, name: meta.name, count: Math.max(1, meta.count ?? 1) }))
      : [],
    space: {
      sqft: Math.round(width_ft * height_ft) || 0,
      width_ft, height_ft,
      // Neither the sandbox (no ceiling concept) nor the floor-plan-upload
      // stub captures this — defaulted to a typical lab ceiling rather than
      // asked as a third manual field.
      ceiling_ft: 10,
      rooms: 'single_open',
      // Derived from equipment_status rather than asked a second time —
      // "has existing equipment" implies building into existing space.
      renovation: equipmentStatus === 'has_equipment',
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
