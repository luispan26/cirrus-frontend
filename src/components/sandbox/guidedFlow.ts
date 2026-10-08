import type { FixtureKind, SandboxLayer, SandboxLayout } from '../../lib/layout-sandbox';
import { INFRA_PALETTE } from './constants';
import { baseObjectLayer } from './helpers';

// The sandbox's top-level placement categories, walked in this order by the
// guided flow's "first unanswered" CTA.
export type PlacementCategory = 'infrastructure' | 'fixtures';
export type PlacementMode = 'unanswered' | 'manual' | 'derived';
export type CategoryModeState = Record<PlacementCategory, PlacementMode>;
// Per-category subgroup keys: infrastructure uses INFRA_PALETTE's layer keys
// (base/electrical/plumbing/ventilation), fixtures uses FixtureKind. true = green
// (user will place manually), false/missing = red (derive from unassigned
// space) — every key starts absent, which reads as false.
export type SubSelectionState = Record<PlacementCategory, Record<string, boolean>>;

export const CATEGORY_ORDER: PlacementCategory[] = ['infrastructure', 'fixtures'];

export const CATEGORY_LABELS: Record<PlacementCategory, string> = {
  infrastructure: 'Infrastructure',
  fixtures: 'Fixtures',
};

export const CATEGORY_QUESTIONS: Record<PlacementCategory, string> = {
  infrastructure: 'Do you already know where your doors, windows and columns go?',
  fixtures: 'Do you already know where your benches and other fixtures go?',
};

export const CATEGORY_CTA_VERB: Record<PlacementCategory, string> = {
  infrastructure: 'Place', fixtures: 'Place',
};

export const FIXTURE_SUBGROUP_KINDS: FixtureKind[] = ['bench', 'laminarHood', 'sink', 'cabinet', 'refrigerator', 'door', 'waste'];

export function emptyCategoryModeState(): CategoryModeState {
  return { infrastructure: 'unanswered', fixtures: 'unanswered' };
}
export function emptySubSelectionState(): SubSelectionState {
  return { infrastructure: {}, fixtures: {} };
}

export function firstUnanswered(modes: CategoryModeState): PlacementCategory | null {
  return CATEGORY_ORDER.find((category) => modes[category] === 'unanswered') ?? null;
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
export function subgroupVisible(category: PlacementCategory, key: string, mode: PlacementMode, subSelection: SubSelectionState): boolean {
  if (mode !== 'manual') return false;
  return subSelection[category][key] === true;
}

// Marks a category 'manual' (with every subgroup it actually uses pre-set
// green) when the loaded layout already has that category's content, and
// leaves categories with nothing present 'unanswered' — so opening a
// finished report doesn't ask about infrastructure it can already see, but
// still asks about anything genuinely blank.
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

  return { modes, subSelection };
}
