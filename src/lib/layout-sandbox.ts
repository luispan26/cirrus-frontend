export type FixtureKind = 'bench' | 'laminarHood' | 'sink' | 'cabinet' | 'refrigerator' | 'door' | 'waste';
export type FixtureOrientation = 0 | 90 | 180 | 270;
export interface FixtureClearance { frontFt: number; backFt: number; sideFt: number; overheadFt?: number; }
export type SandboxLayer = 'base' | 'stations' | 'equipment' | 'circulation' | 'electrical' | 'plumbing' | 'ventilation' | 'validation';
export type AccessFace = 'front' | 'back' | 'left' | 'right';
export const BENCH_WIDTH_FT = 6;
export const BENCH_DEPTH_FT = 2.5;
export const BENCH_SURFACE_AREA_SQFT = BENCH_WIDTH_FT * BENCH_DEPTH_FT;
export interface SandboxPoint { x: number; y: number; }
export interface SandboxPolygon { points: SandboxPoint[]; }
export interface ClearanceZone { id: string; purpose: 'operation' | 'maintenance' | 'certification' | 'ventilation'; polygon: SandboxPolygon; hard: boolean; }
// Infrastructure kinds (window/electrical_point/plumbing_point/ventilation_point)
// intentionally carry the minimum a placement generator needs to answer "can
// equipment reasonably connect here" — not real MEP design detail (no pipe
// sizing, no duct CFM, no circuit routing). The older sink/fume_hood/bsc/
// electrical_panel/utility_connection kinds stay for backward compatibility
// with previously-saved layouts and backend-generated utility points; new
// placements from this editor use the typed point kinds instead.
export interface SandboxBaseObject {
  id: string;
  kind: 'wall' | 'column' | 'shaft' | 'casework' | 'door' | 'window' | 'sink' | 'fume_hood' | 'bsc' | 'electrical_panel' | 'utility_connection' | 'electrical_point' | 'plumbing_point' | 'ventilation_point' | 'restricted_region';
  name: string;
  footprint: SandboxPolygon;
  locked: boolean;
  door?: { clearWidthIn: number; isExit: boolean };
  electrical?: { voltage: 120 | 208 | 240 | 'other'; voltageOther?: string; phase: 'single' | 'three'; dedicated: boolean; emergencyPower: boolean };
  plumbing?: { coldWater: boolean; hotWater: boolean; drain: boolean; diWater: boolean };
  ventilation?: { type: 'ducted_exhaust' | 'general_exhaust' | 'supply_air' | 'return_air' };
}
export interface CirculationRequirements { personnelWidthIn: number; accessibleWidthIn: number; egressWidthIn: number; }
export interface ElectricalEndpoint { id: string; position: SandboxPoint; voltage: number; amperage: number; phase: number; frequencyHz: number; plugType: string; circuitId: string; powerClass: 'normal' | 'emergency' | 'ups'; }
export interface ElectricalCircuit { id: string; allowableLoadVa: number; existingLoadVa: number; dedicatedEquipmentId?: string; }
export type LayoutFix = { type: 'set-door-width' | 'add-exit' | 'set-access-face' | 'add-circuit' | 'move-fixture' | 'remove-largest-equipment'; targetId?: string; value?: number; label: string };
export interface LayoutViolation { id: string; severity: 'error' | 'warning'; layer: SandboxLayer; objectIds: string[]; message: string; fix?: LayoutFix; }

export interface SandboxEquipmentAssignment {
  equipmentId: string;
  name: string;
  widthFt?: number;
  depthFt?: number;
  heightFt?: number;
}

export interface SandboxStationAssignment {
  instanceId: string;
  stationId: string;
  name: string;
  zone: string;
  equipment: SandboxEquipmentAssignment[];
  accessFaces?: AccessFace[];
  operatingClearances?: ClearanceZone[];
  serviceClearances?: ClearanceZone[];
}

export interface SandboxFixture {
  instanceId: string;
  kind: FixtureKind;
  name: string;
  x: number;
  y: number;
  widthFt: number;
  depthFt: number;
  orientation: FixtureOrientation;
  clearance?: FixtureClearance;
  stations: SandboxStationAssignment[];
}

export interface SandboxLayout {
  version: 4;
  name: string;
  room: { widthFt: number; heightFt: number; gridFt: number };
  fixtures: SandboxFixture[];
  baseObjects: SandboxBaseObject[];
  circulationRequirements: CirculationRequirements;
  electricalEndpoints: ElectricalEndpoint[];
  electricalCircuits: ElectricalCircuit[];
  updatedAt: string;
}

export const EMPTY_SANDBOX_LAYOUT: SandboxLayout = {
  version: 4,
  name: 'Untitled layout',
  room: { widthFt: 40, heightFt: 30, gridFt: 1 },
  fixtures: [],
  baseObjects: [], circulationRequirements: { personnelWidthIn: 60, accessibleWidthIn: 36, egressWidthIn: 36 }, electricalEndpoints: [], electricalCircuits: [],
  updatedAt: new Date(0).toISOString(),
};

export function fixtureFootprint(fixture: SandboxFixture, gridFt: number) {
  const vertical = fixture.orientation === 90 || fixture.orientation === 270;
  const width = vertical ? fixture.depthFt : fixture.widthFt;
  const depth = vertical ? fixture.widthFt : fixture.depthFt;
  return { width: Math.max(1, Math.ceil(width / gridFt)), height: Math.max(1, Math.ceil(depth / gridFt)) };
}

export function polygonBounds(polygon: SandboxPolygon) {
  return {
    left: Math.min(...polygon.points.map((p) => p.x)),
    right: Math.max(...polygon.points.map((p) => p.x)),
    top: Math.min(...polygon.points.map((p) => p.y)),
    bottom: Math.max(...polygon.points.map((p) => p.y)),
  };
}

function rectsIntersect(a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

export type WallSide = 'top' | 'bottom' | 'left' | 'right';
type RoomSize = { widthFt: number; heightFt: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Which of the room's four edges a point or footprint sits closest to —
// shared by door/window/utility-point placement (wall-mounted kinds always
// snap to whichever wall they're nearest) and by door swing rendering
// (the swing direction depends on which wall the door is on).
export function nearestWallSide(point: SandboxPoint, room: RoomSize): WallSide {
  const distances: Array<[WallSide, number]> = [
    ['top', point.y],
    ['bottom', room.heightFt - point.y],
    ['left', point.x],
    ['right', room.widthFt - point.x],
  ];
  return distances.reduce((closest, entry) => (entry[1] < closest[1] ? entry : closest))[0];
}

export function wallSideOfBounds(bounds: { left: number; right: number; top: number; bottom: number }, room: RoomSize): WallSide {
  const distances: Array<[WallSide, number]> = [
    ['top', bounds.top],
    ['bottom', room.heightFt - bounds.bottom],
    ['left', bounds.left],
    ['right', room.widthFt - bounds.right],
  ];
  return distances.reduce((closest, entry) => (entry[1] < closest[1] ? entry : closest))[0];
}

// Clamps an arbitrary clicked point onto the room's nearest wall line —
// used to place single-point infrastructure markers (electrical/plumbing/
// ventilation) flush against a wall regardless of where exactly the user
// clicked near it.
export function snapToNearestWall(point: SandboxPoint, room: RoomSize): { point: SandboxPoint; side: WallSide } {
  const side = nearestWallSide(point, room);
  if (side === 'top') return { point: { x: clamp(point.x, 0, room.widthFt), y: 0 }, side };
  if (side === 'bottom') return { point: { x: clamp(point.x, 0, room.widthFt), y: room.heightFt }, side };
  if (side === 'left') return { point: { x: 0, y: clamp(point.y, 0, room.heightFt) }, side };
  return { point: { x: room.widthFt, y: clamp(point.y, 0, room.heightFt) }, side };
}

// A rectangular footprint (door/window) flush against the nearest wall,
// centered on the clicked point and clamped so it never runs past the
// wall's corners.
export function wallRectFootprint(point: SandboxPoint, room: RoomSize, widthFt: number, depthFt: number): { footprint: SandboxPolygon; side: WallSide } {
  const { point: snapped, side } = snapToNearestWall(point, room);
  const alongWall = side === 'top' || side === 'bottom';
  const runLength = alongWall ? room.widthFt : room.heightFt;
  const half = widthFt / 2;
  const centerAlong = clamp(alongWall ? snapped.x : snapped.y, half, Math.max(half, runLength - half));
  let rect: { left: number; right: number; top: number; bottom: number };
  if (side === 'top') rect = { left: centerAlong - half, right: centerAlong + half, top: 0, bottom: depthFt };
  else if (side === 'bottom') rect = { left: centerAlong - half, right: centerAlong + half, top: room.heightFt - depthFt, bottom: room.heightFt };
  else if (side === 'left') rect = { left: 0, right: depthFt, top: centerAlong - half, bottom: centerAlong + half };
  else rect = { left: room.widthFt - depthFt, right: room.widthFt, top: centerAlong - half, bottom: centerAlong + half };
  return {
    footprint: { points: [{ x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }] },
    side,
  };
}

function arcBetween(hinge: SandboxPoint, from: SandboxPoint, to: SandboxPoint, radius: number, steps = 14): SandboxPoint[] {
  const a0 = Math.atan2(from.y - hinge.y, from.x - hinge.x);
  const rawA1 = Math.atan2(to.y - hinge.y, to.x - hinge.x);
  let delta = rawA1 - a0;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const points: SandboxPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (delta * i) / steps;
    points.push({ x: hinge.x + Math.cos(a) * radius, y: hinge.y + Math.sin(a) * radius });
  }
  return points;
}

export interface DoorSwing { hinge: SandboxPoint; leafTip: SandboxPoint; jamb: SandboxPoint; arcPoints: SandboxPoint[]; }

// Derives the door's swing geometry from its footprint and which wall it's
// on, rather than storing a swing polygon that would need to be kept in
// sync by hand every time the door moves or rotates — the door is always
// shown open 90 degrees, hinged at one jamb, arcing back to the other.
export function computeDoorSwing(object: SandboxBaseObject, room: RoomSize): DoorSwing | null {
  if (!object.footprint.points.length) return null;
  const bounds = polygonBounds(object.footprint);
  const side = wallSideOfBounds(bounds, room);
  const alongWall = side === 'top' || side === 'bottom';
  const doorWidthFt = alongWall ? bounds.right - bounds.left : bounds.bottom - bounds.top;
  const centerAlong = alongWall ? (bounds.left + bounds.right) / 2 : (bounds.top + bounds.bottom) / 2;
  const dir = alongWall ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const normal = side === 'top' ? { x: 0, y: 1 } : side === 'bottom' ? { x: 0, y: -1 } : side === 'left' ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const wallCoord = side === 'top' ? 0 : side === 'bottom' ? room.heightFt : side === 'left' ? 0 : room.widthFt;
  const center = alongWall ? { x: centerAlong, y: wallCoord } : { x: wallCoord, y: centerAlong };
  const hinge = { x: center.x - (dir.x * doorWidthFt) / 2, y: center.y - (dir.y * doorWidthFt) / 2 };
  const jamb = { x: center.x + (dir.x * doorWidthFt) / 2, y: center.y + (dir.y * doorWidthFt) / 2 };
  const leafTip = { x: hinge.x + normal.x * doorWidthFt, y: hinge.y + normal.y * doorWidthFt };
  return { hinge, leafTip, jamb, arcPoints: arcBetween(hinge, leafTip, jamb, doorWidthFt) };
}

// The only placement rule enforced: a fixture may not occupy the same
// space as another fixture or a base object (door, casework, utility
// connection, etc). No clearance zones, no room-bounds check — those were
// intentionally removed.
export function canPlaceFixture(candidate: SandboxFixture, fixtures: SandboxFixture[], baseObjects: SandboxBaseObject[], gridFt: number): boolean {
  const size = fixtureFootprint(candidate, gridFt);
  const overlapsFixture = fixtures.some((fixture) => {
    if (fixture.instanceId === candidate.instanceId) return false;
    const other = fixtureFootprint(fixture, gridFt);
    return candidate.x < fixture.x + other.width && fixture.x < candidate.x + size.width
      && candidate.y < fixture.y + other.height && fixture.y < candidate.y + size.height;
  });
  if (overlapsFixture) return false;
  const candidateBounds = { left: candidate.x * gridFt, right: (candidate.x + size.width) * gridFt, top: candidate.y * gridFt, bottom: (candidate.y + size.height) * gridFt };
  return baseObjects.every((object) => !object.footprint.points.length || !rectsIntersect(candidateBounds, polygonBounds(object.footprint)));
}

// One entry per grid cell (row-major, [y][x]) saying whether a fixture of
// this size/orientation could have its top-left corner there — the basis
// for the sandbox's live green/red placement highlight. `excludeInstanceId`
// drops the fixture currently being moved out of the collision check
// (mirrors canPlaceFixture's own self-exclusion), so moving a fixture over
// its own current footprint doesn't falsely read as blocked.
export function computePlacementAvailability(
  size: { widthFt: number; depthFt: number; orientation: FixtureOrientation },
  fixtures: SandboxFixture[],
  baseObjects: SandboxBaseObject[],
  gridFt: number,
  columns: number,
  rows: number,
  excludeInstanceId?: string,
): boolean[][] {
  const others = excludeInstanceId ? fixtures.filter((f) => f.instanceId !== excludeInstanceId) : fixtures;
  const grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < columns; x++) {
      const candidate: SandboxFixture = { instanceId: '__placement-preview__', kind: 'bench', name: '', x, y, widthFt: size.widthFt, depthFt: size.depthFt, orientation: size.orientation, stations: [] };
      row.push(canPlaceFixture(candidate, others, baseObjects, gridFt));
    }
    grid.push(row);
  }
  return grid;
}

export function parseSandboxLayout(value: unknown): SandboxLayout | null {
  if (!value || typeof value !== 'object') return null;
  const layout = value as Omit<Partial<SandboxLayout>, 'version'> & { version?: number };
  if (![2, 3, 4].includes(layout.version ?? 0) || !layout.room || !Array.isArray(layout.fixtures)) return null;
  if (![layout.room.widthFt, layout.room.heightFt, layout.room.gridFt].every((n) => typeof n === 'number' && n > 0)) return null;
  const fixtures = layout.fixtures.map((fixture) => {
    if (!fixture || typeof fixture !== 'object') return null;
    const legacy = fixture as Omit<SandboxFixture, 'orientation'> & { orientation?: FixtureOrientation | 'horizontal' | 'vertical' };
    const orientation = legacy.orientation === 'vertical' ? 90 : legacy.orientation === 'horizontal' ? 0 : legacy.orientation;
    if (![0, 90, 180, 270].includes(orientation as number)) return null;
    const parsed = { ...legacy, orientation } as SandboxFixture;
    if (parsed.kind === 'bench') {
      parsed.widthFt = BENCH_WIDTH_FT;
      parsed.depthFt = BENCH_DEPTH_FT;
    }
    if (parsed.kind !== 'bench' && parsed.kind !== 'laminarHood') return parsed;
    const clearance = parsed.clearance ?? { frontFt: 0, backFt: 0, sideFt: 0 };
    if (![clearance.frontFt, clearance.backFt, clearance.sideFt].every((n) => typeof n === 'number' && n >= 0)) return null;
    if (clearance.overheadFt !== undefined && (typeof clearance.overheadFt !== 'number' || clearance.overheadFt < 0)) return null;
    return { ...parsed, clearance };
  });
  if (fixtures.some((fixture) => fixture === null)) return null;
  return {
    ...layout, version: 4, fixtures,
    baseObjects: Array.isArray((layout as SandboxLayout).baseObjects) ? (layout as SandboxLayout).baseObjects : [],
    circulationRequirements: (layout as SandboxLayout).circulationRequirements ?? { personnelWidthIn: 60, accessibleWidthIn: 36, egressWidthIn: 36 },
    electricalEndpoints: Array.isArray((layout as SandboxLayout).electricalEndpoints) ? (layout as SandboxLayout).electricalEndpoints : [],
    electricalCircuits: Array.isArray((layout as SandboxLayout).electricalCircuits) ? (layout as SandboxLayout).electricalCircuits : [],
  } as SandboxLayout;
}

export function deriveCirculationSpace(layout: SandboxLayout) {
  const grid = layout.room.gridFt;
  const columns = Math.max(1, Math.ceil(layout.room.widthFt / grid));
  const rows = Math.max(1, Math.ceil(layout.room.heightFt / grid));
  const requiredWidthFt = Math.max(layout.circulationRequirements.accessibleWidthIn, layout.circulationRequirements.egressWidthIn) / 12;
  const margin = requiredWidthFt / 2;
  const blocked = new Set<string>();
  const markBounds = (left: number, top: number, right: number, bottom: number) => {
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const cx = (x + .5) * grid, cy = (y + .5) * grid;
      if (cx >= left - margin && cx <= right + margin && cy >= top - margin && cy <= bottom + margin) blocked.add(`${x},${y}`);
    }
  };
  for (const fixture of layout.fixtures) {
    const size = fixtureFootprint(fixture, grid);
    markBounds(fixture.x * grid, fixture.y * grid, (fixture.x + size.width) * grid, (fixture.y + size.height) * grid);
  }
  for (const object of layout.baseObjects.filter((item) => item.kind !== 'door' && item.footprint.points.length)) {
    markBounds(Math.min(...object.footprint.points.map((p) => p.x)), Math.min(...object.footprint.points.map((p) => p.y)), Math.max(...object.footprint.points.map((p) => p.x)), Math.max(...object.footprint.points.map((p) => p.y)));
  }
  const exits = layout.baseObjects.filter((object) => object.kind === 'door' && object.door?.isExit && object.footprint.points.length);
  const queue: Array<[number, number]> = [];
  const reachable = new Set<string>();
  for (const exit of exits) {
    const center = { x: exit.footprint.points.reduce((sum, p) => sum + p.x, 0) / exit.footprint.points.length, y: exit.footprint.points.reduce((sum, p) => sum + p.y, 0) / exit.footprint.points.length };
    const x = Math.max(0, Math.min(columns - 1, Math.floor(center.x / grid))), y = Math.max(0, Math.min(rows - 1, Math.floor(center.y / grid)));
    blocked.delete(`${x},${y}`); queue.push([x, y]); reachable.add(`${x},${y}`);
  }
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= columns || ny >= rows || blocked.has(key) || reachable.has(key)) continue;
      reachable.add(key); queue.push([nx, ny]);
    }
  }
  return { gridFt: grid, reachable: [...reachable].map((key) => { const [x, y] = key.split(',').map(Number); return { x, y }; }), reachableKeys: reachable };
}

// Only rule enforced: no two placed objects (fixtures or base objects) may
// occupy the same physical space. Everything else this used to check
// (clearance zones, exit/door-swing clearance, circulation routing, bench
// capacity, station access faces, electrical circuit wiring) has been
// intentionally removed.
export function validateSandboxLayout(layout: SandboxLayout): LayoutViolation[] {
  const violations: LayoutViolation[] = [];
  for (const fixture of layout.fixtures) {
    if (!canPlaceFixture(fixture, layout.fixtures, layout.baseObjects, layout.room.gridFt)) {
      violations.push({ id: `placement-${fixture.instanceId}`, severity: 'error', layer: 'validation', objectIds: [fixture.instanceId], message: `${fixture.name} overlaps another object.`, fix: { type: 'move-fixture', targetId: fixture.instanceId, label: 'Move to nearest open position' } });
    }
  }
  for (let i = 0; i < layout.baseObjects.length; i++) {
    for (let j = i + 1; j < layout.baseObjects.length; j++) {
      const a = layout.baseObjects[i], b = layout.baseObjects[j];
      if (a.footprint.points.length && b.footprint.points.length && rectsIntersect(polygonBounds(a.footprint), polygonBounds(b.footprint))) {
        violations.push({ id: `base-overlap-${a.id}-${b.id}`, severity: 'error', layer: 'base', objectIds: [a.id, b.id], message: `${a.name} overlaps ${b.name}.` });
      }
    }
  }
  return violations;
}
