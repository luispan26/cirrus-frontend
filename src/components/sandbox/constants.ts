import { BENCH_DEPTH_FT, BENCH_WIDTH_FT, type FixtureClearance, type FixtureKind, type SandboxLayer } from '../../lib/layout-sandbox';

// Every placeable infrastructure kind, grouped the way the sidebar palette
// shows them — one click-to-place button per kind.
export type PlaceableBaseKind = 'door' | 'window' | 'column' | 'restricted_region';
// Architecture only: utilities (electrical, plumbing, HVAC) are not placed
// in Cirrus layouts — see the Disclaimer page.
export const INFRA_PALETTE: Array<{ layer: SandboxLayer; title: string; items: Array<{ kind: PlaceableBaseKind; label: string }> }> = [
  { layer: 'base', title: 'Architecture', items: [{ kind: 'door', label: 'Door' }, { kind: 'window', label: 'Window' }, { kind: 'column', label: 'Column' }, { kind: 'restricted_region', label: 'No-placement zone' }] },
];
export const FIXTURE_DEFAULTS: Record<FixtureKind, { name: string; widthFt: number; depthFt: number }> = {
  bench: { name: 'Bench', widthFt: BENCH_WIDTH_FT, depthFt: BENCH_DEPTH_FT }, laminarHood: { name: 'Laminar hood', widthFt: 4, depthFt: 2.5 }, sink: { name: 'Sink', widthFt: 3, depthFt: 2 }, cabinet: { name: 'Cabinet', widthFt: 3, depthFt: 2 }, refrigerator: { name: 'Refrigerator', widthFt: 3, depthFt: 3 }, door: { name: 'Door', widthFt: 3, depthFt: 1 }, waste: { name: 'Waste disposal', widthFt: 2, depthFt: 2 },
};
export const DEFAULT_CLEARANCE: Record<'bench' | 'laminarHood', FixtureClearance> = {
  bench: { frontFt: 5, backFt: 0, sideFt: 0 },
  laminarHood: { frontFt: 5, backFt: 0, sideFt: 0, overheadFt: 1.5 },
};

// Colours and names for the zone families the bench fitter returns.
export const ZONE_FAMILY_COLORS: Record<string, string> = {
  CleanMolecular: '#00D5D5',
  HumanSpecimenContainment: '#E0334F',
  HumanCellCulture: '#E0824F',
  MicrobialCulture: '#5BC24F',
  BiologicalContainment: '#B23FE0',
  PostPcrAmplicon: '#5B4FE0',
  SharedAnalytical: '#4F8FE0',
  WashDeconWaste: '#8A8F98',
};
export const ZONE_FAMILY_LABELS: Record<string, string> = {
  CleanMolecular: 'Clean molecular',
  HumanSpecimenContainment: 'Human specimen containment',
  HumanCellCulture: 'Human cell culture',
  MicrobialCulture: 'Microbial culture',
  BiologicalContainment: 'Biological containment',
  PostPcrAmplicon: 'Post-PCR / amplicon',
  SharedAnalytical: 'Shared analytical',
  WashDeconWaste: 'Wash / decon / waste',
};
