import type { FixtureKind, SandboxLayer, SandboxLayout } from '../../lib/layout-sandbox';
import { INFRA_PALETTE } from './constants';
import { baseObjectLayer } from './helpers';

// The sandbox's top-level placement categories, walked in this order by the
// guided flow's "first unanswered" CTA. Zoning is last and uses a "Set" verb
// (see CATEGORY_CTA_VERB) since setting a zone requirement isn't placing a
// physical object the way the other three are.
export type PlacementCategory = 'infrastructure' | 'fixtures' | 'stations' | 'zoning';
export type PlacementMode = 'unanswered' | 'manual' | 'derived';
export type CategoryModeState = Record<PlacementCategory, PlacementMode>;
// Per-category subgroup keys: infrastructure uses INFRA_PALETTE's layer keys
// (base/electrical/plumbing/ventilation), fixtures uses FixtureKind, stations
// uses stationId, zoning uses the single synthetic key below. true = green
// (user will place manually), false/missing = red (derive from unassigned
// space) — every key starts absent, which reads as false.
export type SubSelectionState = Record<PlacementCategory, Record<string, boolean>>;

export const CATEGORY_ORDER: PlacementCategory[] = ['infrastructure', 'fixtures', 'stations', 'zoning'];

export const CATEGORY_LABELS: Record<PlacementCategory, string> = {
  infrastructure: 'Infrastructure',
  fixtures: 'Fixtures',
  stations: 'Stations & equipment',
  zoning: 'Zone requirements',
};

export const CATEGORY_QUESTIONS: Record<PlacementCategory, string> = {
  infrastructure: 'Do you already know where your doors, electrical, plumbing, and ventilation go?',
  fixtures: 'Do you already know where your benches and other fixtures go?',
  stations: 'Do you already know which stations and equipment go where?',
  zoning: 'Do you want to set zone requirements for this room?',
};

// Zoning gets "Set" instead of "Place" for both the question box's CTA and
// the topbar's guided CTA — see CATEGORY_LABELS.zoning.
export const CATEGORY_CTA_VERB: Record<PlacementCategory, string> = {
  infrastructure: 'Place', fixtures: 'Place', stations: 'Place', zoning: 'Set',
};

export const FIXTURE_SUBGROUP_KINDS: FixtureKind[] = ['bench', 'laminarHood', 'sink', 'cabinet', 'refrigerator', 'door', 'waste'];

export const ZONING_SUBGROUP_KEY = 'zoneRequirements';

export function emptyCategoryModeState(): CategoryModeState {
  return { infrastructure: 'unanswered', fixtures: 'unanswered', stations: 'unanswered', zoning: 'unanswered' };
}
export function emptySubSelectionState(): SubSelectionState {
  return { infrastructure: {}, fixtures: {}, stations: {}, zoning: {} };
}

export function firstUnanswered(modes: CategoryModeState): PlacementCategory | null {
  return CATEGORY_ORDER.find((category) => modes[category] === 'unanswered') ?? null;
}

// Only infrastructure and fixtures break down into a grid of sub-choices
// (architecture/electrical/plumbing/ventilation; bench/hood/sink/...) —
// stations and zoning are answered as a single yes/we-know-this-or-derive-it
// question with no item list in the box itself, so their "manual" palette
// always shows everything unfiltered rather than a per-item selection.
export function hasSubgroupGrid(category: PlacementCategory): boolean {
  return category === 'infrastructure' || category === 'fixtures';
}

// Whether a category's palette should render in the left sidebar at all —
// the coarse gate. Only ever one category's palette shows at a time (the one
// most recently answered manual), so the sidebar stays scoped to whatever
// question was just answered instead of accumulating every category ever
// touched. Never applied to the canvas render of layout.fixtures or the
// portaled CanvasLayers, which stay rendered/interactive regardless (see
// LayoutSandboxPage's WS-8b invariant: nothing already placed may vanish).
export function paletteVisible(category: PlacementCategory, activeCategory: PlacementCategory | null): boolean {
  return activeCategory === category;
}

// The fine gate within an already-visible infrastructure/fixtures palette:
// does this one subgroup (an infrastructure layer, a fixture kind) show its
// place-this-item controls. Only meaningful once the category is 'manual' —
// a 'derived' or 'unanswered' category shows no subgroup controls at all.
// Not used for stations/zoning — see hasSubgroupGrid.
export function subgroupVisible(category: PlacementCategory, key: string, mode: PlacementMode, subSelection: SubSelectionState): boolean {
  if (mode !== 'manual') return false;
  return subSelection[category][key] === true;
}

// Marks a category 'manual' (with every subgroup it actually uses pre-set
// green) when the loaded layout already has that category's content, and
// leaves categories with nothing present 'unanswered' — so opening a
// finished report doesn't ask about infrastructure it can already see, but
// still asks about anything genuinely blank (e.g. no stations assigned yet).
// Zoning is deliberately left 'unanswered' here — see the loadPlan-specific
// seeding in LayoutSandboxPage, which marks only zoning because a loaded
// zoning plan never touches fixtures/baseObjects.
export function seedCategoryModesFrom(layout: SandboxLayout): { modes: CategoryModeState; subSelection: SubSelectionState } {
  const modes = emptyCategoryModeState();
  const subSelection = emptySubSelectionState();

  const infraLayers = new Set<SandboxLayer>(layout.baseObjects.map((object) => baseObjectLayer(object.kind)));
  if (infraLayers.size > 0) {
    modes.infrastructure = 'manual';
    for (const group of INFRA_PALETTE) if (infraLayers.has(group.layer)) subSelection.infrastructure[group.layer] = true;
  }

  const fixtureKinds = new Set(layout.fixtures.map((fixture) => fixture.kind));
  if (fixtureKinds.size > 0) {
    modes.fixtures = 'manual';
    for (const kind of fixtureKinds) subSelection.fixtures[kind] = true;
  }

  const stationIds = new Set(layout.fixtures.flatMap((fixture) => fixture.stations.map((station) => station.stationId)));
  if (stationIds.size > 0) {
    modes.stations = 'manual';
    for (const id of stationIds) subSelection.stations[id] = true;
  }

  return { modes, subSelection };
}
