// The generated lab plan the backend stores on a generated layout
// (layout.plan — see cirrus-backend src/layout-generation/lab-plan.ts):
// benches, the aisle object, unused floor, door clearance and workflow
// zones. Every cell list is [row, column] on a gridInches (6") subgrid,
// row 0 / column 0 at the room's north-west corner.

export type PlanWall = 'N' | 'S' | 'E' | 'W';
export type PlanCell = [number, number];
export interface PlanRect { row: number; column: number; height: number; width: number }

export interface PlanOptions {
  mode: 'max_fit' | 'main_wall';
  mainWall: PlanWall | null;
  sameDirection: boolean;
  wallBenches: boolean;
  workingSpacePct: number;
  // Contamination control: an aisle always runs between different zones.
  separateZonesWithAisles: boolean;
  // For the equipment optimizer only: 0 = favor meeting soft constraints,
  // 1 = favor minimizing walking distance. (Absent on early plans.)
  optimizerBalance?: number;
}

export interface PlanBench {
  id: string;
  fixtureId: string;
  kind: 'island' | 'wall';
  unitId: string;
  islandId: string | null;
  zoneId: string;
  rect: PlanRect;
  facing: PlanWall;
  accessRect: PlanRect;
}

export interface PlanEquipment {
  equipmentId: string;
  name: string;
  quantity: number;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  footprintSqFt: number;
  placement: 'bench' | 'floor';
  fixed: boolean;
  placeholderSize: boolean;
  sources: string[];
}

export interface PlanZone {
  id: string;
  name: string;
  workflows: string[];
  benchIds: string[];
  cells: PlanCell[];
  equipment: PlanEquipment[];
  equipmentAreaSqFt: number;
  benchNeedSqFt: number;
  benchAreaSqFt: number;
  shortfallSqFt: number;
}

export interface LabPlan {
  initialEquipment?: {
    // widthFt runs along the bench, depthFt front to back; spanXFt/spanYFt
    // are the footprint's extent on the floor plan (absent on reports made
    // before the one-row bench rules, when they equalled width/depth).
    placements: { instanceId: string; equipmentId: string; zoneId: string; benchId: string; name: string; fixed: boolean; placeholderSize: boolean; xFt: number; yFt: number; widthFt: number; depthFt: number; spanXFt?: number; spanYFt?: number; offsetFt?: number; rotationDegrees: number; workAreaId?: string }[];
    // Pipette work areas: 3 ft of bench, all working space, 1-2 pipettes.
    workAreas?: { id: string; benchId: string; zoneId: string; offsetFt: number; lengthFt: number; xFt: number; yFt: number; spanXFt: number; spanYFt: number; instanceIds: string[] }[];
    unplaced: { instanceId: string; equipmentId: string; zoneId: string; reason: string }[];
  };
  version: number;
  gridInches: number;
  rows: number;
  columns: number;
  options: PlanOptions;
  arrangement: { orientation: number | null; workingAisleFt: number; crossAisleFt: number; maxBenchesPerIslandSide: number };
  benches: PlanBench[];
  islands: { id: string; orientation: number; benchIds: string[] }[];
  aisle: { cells: PlanCell[]; areaSqFt: number };
  unusedFloor: { cells: PlanCell[]; areaSqFt: number };
  // cells: clearance no aisle crosses. aisleCells: clearance an aisle
  // crosses (also in `aisle`; missing on older plans).
  doorClearance: { cells: PlanCell[]; areaSqFt: number; aisleCells?: PlanCell[] };
  obstacles: { cells: PlanCell[] };
  zones: PlanZone[];
  floorItems: PlanEquipment[];
  totals: { benches: number; benchAreaSqFt: number; benchNeedSqFt: number; shortfallSqFt: number; roomTooSmall: boolean };
}

export function readLabPlan(layoutData: unknown): LabPlan | null {
  const plan = (layoutData as { plan?: unknown } | null)?.plan as LabPlan | undefined;
  return plan && typeof plan === 'object' && Array.isArray(plan.benches) && Array.isArray(plan.zones) ? plan : null;
}

// The three default zones keep fixed colors; zones a user adds cycle
// through the rest.
const ZONE_COLORS: Record<string, string> = { microbial: '#3D8B3D', general: '#3462C9', mammalian: '#B5442E' };
const EXTRA_ZONE_COLORS = ['#C9791C', '#7B4FD6', '#D64F9E', '#00A3A3', '#8A5A3B', '#6B7280'];

export function zoneColor(zoneId: string, zoneIds: string[]): string {
  if (ZONE_COLORS[zoneId]) return ZONE_COLORS[zoneId];
  const extras = zoneIds.filter((id) => !ZONE_COLORS[id]);
  return EXTRA_ZONE_COLORS[Math.max(0, extras.indexOf(zoneId)) % EXTRA_ZONE_COLORS.length];
}

export const WORKFLOW_OPTIONS: { key: string; label: string }[] = [
  { key: 'bacteria', label: 'Bacteria' },
  { key: 'yeast', label: 'Yeast' },
  { key: 'mammalian_adherent', label: 'Mammalian (adherent)' },
  { key: 'mammalian_suspension', label: 'Mammalian (suspension)' },
  { key: 'general', label: 'General (shared)' },
];

export const WALL_LABELS: Record<PlanWall, string> = { N: 'North (top)', S: 'South (bottom)', E: 'East (right)', W: 'West (left)' };

// SVG path tracing the outer edges of a set of cells (every cell side with
// no cell of the set beyond it), in feet.
export function cellOutlinePath(cells: PlanCell[], cellFt: number): string {
  const set = new Set(cells.map(([r, c]) => `${r},${c}`));
  const parts: string[] = [];
  for (const [r, c] of cells) {
    const x = c * cellFt, y = r * cellFt, x2 = x + cellFt, y2 = y + cellFt;
    if (!set.has(`${r - 1},${c}`)) parts.push(`M${x} ${y}H${x2}`);
    if (!set.has(`${r + 1},${c}`)) parts.push(`M${x} ${y2}H${x2}`);
    if (!set.has(`${r},${c - 1}`)) parts.push(`M${x} ${y}V${y2}`);
    if (!set.has(`${r},${c + 1}`)) parts.push(`M${x2} ${y}V${y2}`);
  }
  return parts.join('');
}

// Cells merged into horizontal runs, one rectangle per run — far fewer SVG
// elements than one per cell.
export function cellRuns(cells: PlanCell[]): PlanRect[] {
  const byRow = new Map<number, number[]>();
  for (const [r, c] of cells) (byRow.get(r) ?? byRow.set(r, []).get(r)!).push(c);
  const runs: PlanRect[] = [];
  for (const [row, columns] of byRow) {
    columns.sort((a, b) => a - b);
    let start = columns[0];
    let prev = columns[0];
    for (let i = 1; i <= columns.length; i++) {
      const c = columns[i];
      if (c === prev + 1) {
        prev = c;
        continue;
      }
      runs.push({ row, column: start, height: 1, width: prev - start + 1 });
      start = c;
      prev = c;
    }
  }
  return runs;
}
