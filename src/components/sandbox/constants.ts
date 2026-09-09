import { BENCH_DEPTH_FT, BENCH_WIDTH_FT, type FixtureClearance, type FixtureKind, type SandboxLayer } from '../../lib/layout-sandbox';

// Every placeable infrastructure kind, grouped the way the sidebar palette
// shows them — one click-to-place button per kind, one group per layer, so
// toggling a layer off also hides that group's buttons.
// The four ventilation placement kinds all create a 'ventilation_point'
// base object — the category is fixed at placement time (which button was
// clicked), not editable afterward, so each gets its own palette entry
// rather than one button with a category dropdown.
export type VentilationPlacementKind = 'hvac_supply' | 'hvac_return' | 'general_exhaust' | 'local_exhaust_connection';
export type PlaceableBaseKind = 'door' | 'window' | 'column' | 'restricted_region' | 'electrical_point' | 'plumbing_point' | VentilationPlacementKind;
export const VENTILATION_PLACEMENT_LABELS: Record<VentilationPlacementKind, string> = { hvac_supply: 'HVAC supply', hvac_return: 'HVAC return', general_exhaust: 'General exhaust', local_exhaust_connection: 'Local exhaust connection' };
export const INFRA_PALETTE: Array<{ layer: SandboxLayer; title: string; items: Array<{ kind: PlaceableBaseKind; label: string }> }> = [
  { layer: 'base', title: 'Architecture', items: [{ kind: 'door', label: 'Door' }, { kind: 'window', label: 'Window' }, { kind: 'column', label: 'Column' }, { kind: 'restricted_region', label: 'No-placement zone' }] },
  { layer: 'electrical', title: 'Electrical', items: [{ kind: 'electrical_point', label: 'Electrical point' }] },
  { layer: 'plumbing', title: 'Plumbing', items: [{ kind: 'plumbing_point', label: 'Plumbing point' }] },
  { layer: 'ventilation', title: 'Ventilation', items: (Object.keys(VENTILATION_PLACEMENT_LABELS) as VentilationPlacementKind[]).map((kind) => ({ kind, label: VENTILATION_PLACEMENT_LABELS[kind] })) },
];
export const FIXTURE_DEFAULTS: Record<FixtureKind, { name: string; widthFt: number; depthFt: number }> = {
  bench: { name: 'Bench', widthFt: BENCH_WIDTH_FT, depthFt: BENCH_DEPTH_FT }, laminarHood: { name: 'Laminar hood', widthFt: 4, depthFt: 2.5 }, sink: { name: 'Sink', widthFt: 3, depthFt: 2 }, cabinet: { name: 'Cabinet', widthFt: 3, depthFt: 2 }, refrigerator: { name: 'Refrigerator', widthFt: 3, depthFt: 3 }, door: { name: 'Door', widthFt: 3, depthFt: 1 }, waste: { name: 'Waste disposal', widthFt: 2, depthFt: 2 },
};
export const DEFAULT_CLEARANCE: Record<'bench' | 'laminarHood', FixtureClearance> = {
  bench: { frontFt: 5, backFt: 0, sideFt: 0 },
  laminarHood: { frontFt: 5, backFt: 0, sideFt: 0, overheadFt: 1.5 },
};

export const PLUMBING_FIELD_LABELS: Record<'coldWater' | 'hotWater' | 'drain' | 'diWater' | 'processWaste', string> = { coldWater: 'Cold water', hotWater: 'Hot water', drain: 'Drain', diWater: 'DI / RO water', processWaste: 'Process waste' };

export const POINT_KINDS = ['utility_connection', 'electrical_point', 'plumbing_point', 'ventilation_point'];
