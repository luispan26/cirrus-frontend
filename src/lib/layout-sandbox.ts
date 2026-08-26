export type FixtureKind = 'bench' | 'laminarHood' | 'sink' | 'cabinet' | 'refrigerator' | 'door' | 'waste';
export type FixtureOrientation = 0 | 90 | 180 | 270;
export interface FixtureClearance { frontFt: number; backFt: number; sideFt: number; overheadFt?: number; }
export type SandboxLayer = 'base' | 'stations' | 'equipment' | 'circulation' | 'electrical' | 'plumbing' | 'ventilation' | 'validation' | 'zoning';
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
export type UtilityStatus = 'existing' | 'proposed';
export type MountingSurface = 'wall' | 'ceiling' | 'floor' | 'bench';
// Shared by all three point kinds — the physical facts a future connection
// check needs (is this real or hypothetical, how close must equipment be,
// how many things can share it) on top of the type-specific capacity below.
export interface UtilityMeta {
  mountingSurface: MountingSurface;
  // Which of the room's four walls this point is pinned to, and how far
  // along that wall (from the wall's start corner) — only set when
  // mountingSurface is 'wall' (there's no separate wall entity in this room
  // model, so the WallSide enum already used for doors/windows is the
  // natural wallId). Together these are the point's position of record on
  // the wall: dragging or a room resize re-derives (x,y) from wallId +
  // offsetFt rather than the other way around, so the point can slide along
  // its wall and survives room resizes, but never drifts off it.
  wallId?: WallSide;
  offsetFt?: number;
  connectionRadiusFt: number;
  maxConnections: number;
  systemId?: string;
  status: UtilityStatus;
}
// Room HVAC (supply/return/general exhaust) affects environmental coverage;
// a local exhaust connection is the only category a bench/equipment can
// actually tie into — a laminar-flow hood usually doesn't need room exhaust,
// and a BSC may recirculate rather than exhaust at all.
export type VentilationCategory = 'hvac_supply' | 'hvac_return' | 'general_exhaust' | 'local_exhaust_connection';
export interface SandboxBaseObject {
  id: string;
  kind: 'wall' | 'column' | 'shaft' | 'casework' | 'door' | 'window' | 'sink' | 'fume_hood' | 'bsc' | 'electrical_panel' | 'utility_connection' | 'electrical_point' | 'plumbing_point' | 'ventilation_point' | 'restricted_region';
  name: string;
  footprint: SandboxPolygon;
  locked: boolean;
  utility?: UtilityMeta;
  door?: { clearWidthIn: number; isExit: boolean };
  electrical?: { voltage: 120 | 208 | 240 | 'other'; voltageOther?: string; amperage: number; phase: 'single' | 'three'; receptacleCount: number; dedicated: boolean; emergencyPower: boolean };
  plumbing?: { coldWater: boolean; hotWater: boolean; drain: boolean; diWater: boolean; processWaste: boolean; flowGpm?: number };
  ventilation?: { category: VentilationCategory; cfm?: number; ducted: boolean };
}
// The three typed point kinds are wall/ceiling-mounted service points, not
// physical obstructions — like a window, they're attached to a surface but
// don't occupy floor area, so they must not collide with fixtures or block
// derived circulation the way a column, casework, or door footprint does.
const NON_BLOCKING_BASE_KINDS = new Set<SandboxBaseObject['kind']>(['electrical_point', 'plumbing_point', 'ventilation_point']);
export function blocksFloorSpace(kind: SandboxBaseObject['kind']): boolean {
  return !NON_BLOCKING_BASE_KINDS.has(kind);
}
export interface CirculationRequirements { personnelWidthIn: number; accessibleWidthIn: number; egressWidthIn: number; }
export interface ElectricalEndpoint { id: string; position: SandboxPoint; voltage: number; amperage: number; phase: number; frequencyHz: number; plugType: string; circuitId: string; powerClass: 'normal' | 'emergency' | 'ups'; }
export interface ElectricalCircuit { id: string; allowableLoadVa: number; existingLoadVa: number; dedicatedEquipmentId?: string; }
export type LayoutFix = { type: 'set-door-width' | 'add-exit' | 'set-access-face' | 'add-circuit' | 'move-fixture' | 'remove-largest-equipment'; targetId?: string; value?: number; label: string };
export interface LayoutViolation { id: string; severity: 'error' | 'warning'; layer: SandboxLayer; objectIds: string[]; message: string; fix?: LayoutFix; }

// What a piece of equipment needs from the room's utilities — compared
// against SandboxBaseObject.utility/electrical/plumbing/ventilation by the
// (future) bench calculator to decide whether a proposed bench can actually
// connect. Equipment with no entries is utility-free.
export type UtilityRequirementType = 'electrical' | 'plumbing' | 'ventilation';
export interface UtilityRequirement {
  type: UtilityRequirementType;
  subtype?: string;
  demand?: number;
  unit?: string;
  dedicated?: boolean;
  required: boolean;
  continuous?: boolean;
  quantity?: number;
  maxConnectionDistanceFt?: number;
}
export type EquipmentMounting = 'floor' | 'wall' | 'bench';

export interface SandboxEquipmentAssignment {
  equipmentId: string;
  name: string;
  widthFt?: number;
  depthFt?: number;
  heightFt?: number;
  utilityRequirements?: UtilityRequirement[];
  mounting?: EquipmentMounting | null;
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
  version: 5;
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
  version: 5,
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

// A wall-mounted point's position of record is (wallId, offsetFt) rather
// than raw (x,y) — offsetAlongWall reads the offset back out of a point
// already known to be on that wall, pointOnWall is the inverse, clamped to
// the wall's current length so a room resize can never leave the point
// hanging off the end of a now-shorter wall.
export function offsetAlongWall(side: WallSide, point: SandboxPoint): number {
  return side === 'top' || side === 'bottom' ? point.x : point.y;
}
export function pointOnWall(side: WallSide, offsetFt: number, room: RoomSize): SandboxPoint {
  if (side === 'top') return { x: clamp(offsetFt, 0, room.widthFt), y: 0 };
  if (side === 'bottom') return { x: clamp(offsetFt, 0, room.widthFt), y: room.heightFt };
  if (side === 'left') return { x: 0, y: clamp(offsetFt, 0, room.heightFt) };
  return { x: room.widthFt, y: clamp(offsetFt, 0, room.heightFt) };
}

// Re-derives every wall-mounted utility point's (x,y) from its stored
// wallId + offsetFt against a new room size — called whenever room width or
// depth changes so these points stay attached to their wall (and clamped
// onto it) instead of floating at their old, now-stale coordinates.
export function reanchorWallMountedObjects(baseObjects: SandboxBaseObject[], room: RoomSize): SandboxBaseObject[] {
  return baseObjects.map((object) => {
    if (object.utility?.mountingSurface !== 'wall' || !object.utility.wallId) return object;
    const wallId = object.utility.wallId;
    const offsetFt = object.utility.offsetFt ?? (object.footprint.points[0] ? offsetAlongWall(wallId, object.footprint.points[0]) : 0);
    return { ...object, footprint: { points: [pointOnWall(wallId, offsetFt, room)] }, utility: { ...object.utility, offsetFt } };
  });
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
// space as another fixture or a floor-blocking base object (door, casework,
// column, etc). Electrical/plumbing/ventilation points are wall/ceiling
// service points, not floor obstructions, so they're exempt (blocksFloorSpace).
// No clearance zones, no room-bounds check — those were intentionally removed.
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
  return baseObjects.every((object) => !blocksFloorSpace(object.kind) || !object.footprint.points.length || !rectsIntersect(candidateBounds, polygonBounds(object.footprint)));
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

// Backfills a pre-v5 base object's electrical/plumbing/ventilation/utility
// fields with sane defaults, and maps the old ventilation `type` enum onto
// the new `category` split (room HVAC vs the one category — local exhaust
// connection — a bench can actually tie into). Objects that never had a
// utility sub-object (doors, columns, ...) pass through untouched.
const LEGACY_VENTILATION_CATEGORY: Record<string, VentilationCategory> = {
  ducted_exhaust: 'local_exhaust_connection',
  general_exhaust: 'general_exhaust',
  supply_air: 'hvac_supply',
  return_air: 'hvac_return',
};
function migrateBaseObject(object: SandboxBaseObject, room: RoomSize): SandboxBaseObject {
  const migrated = { ...object };
  if (migrated.electrical) {
    const legacy = migrated.electrical as Partial<NonNullable<SandboxBaseObject['electrical']>>;
    migrated.electrical = { ...migrated.electrical, amperage: legacy.amperage ?? 20, receptacleCount: legacy.receptacleCount ?? 1 };
  }
  if (migrated.plumbing) {
    const legacy = migrated.plumbing as Partial<NonNullable<SandboxBaseObject['plumbing']>>;
    migrated.plumbing = { ...migrated.plumbing, processWaste: legacy.processWaste ?? false };
  }
  if (migrated.ventilation) {
    const legacy = migrated.ventilation as Partial<NonNullable<SandboxBaseObject['ventilation']>> & { type?: string };
    const category = legacy.category ?? LEGACY_VENTILATION_CATEGORY[legacy.type ?? ''] ?? 'general_exhaust';
    migrated.ventilation = { category, cfm: legacy.cfm, ducted: legacy.ducted ?? true };
  }
  if (migrated.kind === 'electrical_point' || migrated.kind === 'plumbing_point' || migrated.kind === 'ventilation_point') {
    const legacy = migrated.utility as (Partial<UtilityMeta> & { wallSide?: WallSide }) | undefined;
    const mountingSurface = legacy?.mountingSurface ?? 'wall';
    const anchor = migrated.footprint.points[0];
    const wallId = mountingSurface === 'wall' ? legacy?.wallId ?? legacy?.wallSide ?? (anchor && nearestWallSide(anchor, room)) : undefined;
    const offsetFt = mountingSurface === 'wall' && wallId ? legacy?.offsetFt ?? (anchor && offsetAlongWall(wallId, anchor)) ?? 0 : undefined;
    migrated.utility = { mountingSurface, wallId, offsetFt, connectionRadiusFt: legacy?.connectionRadiusFt ?? 3, maxConnections: legacy?.maxConnections ?? 1, systemId: legacy?.systemId, status: legacy?.status ?? 'existing' };
  }
  return migrated;
}

export function parseSandboxLayout(value: unknown): SandboxLayout | null {
  if (!value || typeof value !== 'object') return null;
  const layout = value as Omit<Partial<SandboxLayout>, 'version'> & { version?: number };
  if (![2, 3, 4, 5].includes(layout.version ?? 0) || !layout.room || !Array.isArray(layout.fixtures)) return null;
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
    ...layout, version: 5, fixtures,
    baseObjects: Array.isArray((layout as SandboxLayout).baseObjects) ? (layout as SandboxLayout).baseObjects.map((object) => migrateBaseObject(object, layout.room!)) : [],
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
  for (const object of layout.baseObjects.filter((item) => item.kind !== 'door' && blocksFloorSpace(item.kind) && item.footprint.points.length)) {
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

export interface LayoutGeometryInput {
  roomWidth: number;
  roomHeight: number;
  blockedCells: number[];
  entranceCells: number[];
  sinkCells: number[];
}

// Rasterizes the room's empty shell into the integer cell grid solveToyZoning
// expects — baseObjects only, deliberately no fixtures: zoning happens
// *before* benches are placed (see cirrus-backend's src/zoning), so the
// geometry it should see is the architecture (walls, doors, columns, sinks),
// not what's already sitting in the room. Same gridFt-based column/row math
// as deriveCirculationSpace, so the two never disagree about cell layout.
// Cells are 0-indexed row-major (cell = row * roomWidth + col), matching
// solveToyZoning's convention.
export function buildLayoutGeometryInput(layout: SandboxLayout): LayoutGeometryInput {
  const grid = layout.room.gridFt;
  const roomWidth = Math.max(1, Math.ceil(layout.room.widthFt / grid));
  const roomHeight = Math.max(1, Math.ceil(layout.room.heightFt / grid));

  function cellsCoveredBy(object: SandboxBaseObject): number[] {
    if (!object.footprint.points.length) return [];
    const bounds = polygonBounds(object.footprint);
    // Every bound is clamped on BOTH ends, not just floored at 0 — a point
    // pinned exactly to the right/bottom wall (pointOnWall's x: room.widthFt
    // / y: room.heightFt, e.g. any plumbing/electrical/ventilation point
    // placed on those walls) has bounds.left == roomWidthFt, and
    // floor(roomWidthFt/grid) is one column PAST the last valid index
    // (room width 40 at grid 1 has valid columns 0-39, but floor(40/1)=40).
    // Without an upper clamp on x0/y0 too, that produced an out-of-range
    // cell id that the backend's own bounds check would then reject.
    const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
    const x0 = clamp(Math.floor(bounds.left / grid), roomWidth - 1);
    const y0 = clamp(Math.floor(bounds.top / grid), roomHeight - 1);
    // max(x0, ...) guards a zero-area footprint sitting exactly on a grid
    // line — a wall-mounted point's y is always exactly 0 or roomHeightFt,
    // so ceil(bounds.bottom/grid)-1 can come out to -1 (one below x0/y0)
    // even though the point clearly falls inside the first row/column.
    // Without the clamp, every wall-mounted point (every plumbing_point,
    // electrical_point, ventilation_point, and any door/window whose
    // footprint pins flush to y=0 or x=0) covered zero cells — silently
    // dropped from blockedCells/entranceCells/sinkCells.
    const x1 = clamp(Math.max(x0, Math.ceil(bounds.right / grid) - 1), roomWidth - 1);
    const y1 = clamp(Math.max(y0, Math.ceil(bounds.bottom / grid) - 1), roomHeight - 1);
    const cells: number[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push(y * roomWidth + x);
    return cells;
  }

  const blockedCells = new Set<number>();
  const entranceCells = new Set<number>();
  const sinkCells = new Set<number>();

  for (const object of layout.baseObjects) {
    if (object.kind === 'door' && object.door?.isExit) {
      // An exit door is the way through the wall it's set into — it must
      // stay clear, not become another obstacle.
      cellsCoveredBy(object).forEach((c) => entranceCells.add(c));
      continue;
    }
    if (blocksFloorSpace(object.kind)) {
      cellsCoveredBy(object).forEach((c) => blockedCells.add(c));
    }
    // 'sink' is a real footprint (plumbing_point is just a wall-mounted
    // connector) — either marks a cell as "near plumbing" for the wet zone.
    if (object.kind === 'sink' || object.kind === 'plumbing_point') {
      cellsCoveredBy(object).forEach((c) => sinkCells.add(c));
    }
  }

  return {
    roomWidth,
    roomHeight,
    blockedCells: [...blockedCells],
    entranceCells: [...entranceCells],
    sinkCells: [...sinkCells],
  };
}

// Only rule enforced: no two floor-blocking placed objects (fixtures or
// base objects) may occupy the same physical space — electrical/plumbing/
// ventilation points are exempt (see blocksFloorSpace). Everything else
// this used to check (clearance zones, exit/door-swing clearance,
// circulation routing, bench capacity, station access faces, electrical
// circuit wiring) has been intentionally removed.
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
      if (blocksFloorSpace(a.kind) && blocksFloorSpace(b.kind) && a.footprint.points.length && b.footprint.points.length && rectsIntersect(polygonBounds(a.footprint), polygonBounds(b.footprint))) {
        violations.push({ id: `base-overlap-${a.id}-${b.id}`, severity: 'error', layer: 'base', objectIds: [a.id, b.id], message: `${a.name} overlaps ${b.name}.` });
      }
    }
  }
  return violations;
}

// Shortest distance from a point to a fixture's own footprint (0 if the
// point falls inside it) — used to decide whether a utility point is within
// its own connectionRadiusFt of a bench, not whether it collides with one.
function distanceToFixture(fixture: SandboxFixture, point: SandboxPoint, gridFt: number): number {
  const size = fixtureFootprint(fixture, gridFt);
  const left = fixture.x * gridFt, top = fixture.y * gridFt;
  const right = left + size.width * gridFt, bottom = top + size.height * gridFt;
  const nearestX = Math.min(Math.max(point.x, left), right);
  const nearestY = Math.min(Math.max(point.y, top), bottom);
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

const UTILITY_OBJECT_KIND: Record<UtilityRequirementType, SandboxBaseObject['kind']> = { electrical: 'electrical_point', plumbing: 'plumbing_point', ventilation: 'ventilation_point' };

// Whether a utility point's own type/capacity satisfies a requirement's
// subtype — distance and quantity are checked separately by the caller,
// this only judges "is this the right kind of connection at all."
function requirementMatchesObject(requirement: UtilityRequirement, object: SandboxBaseObject): boolean {
  if (object.kind !== UTILITY_OBJECT_KIND[requirement.type]) return false;
  if (requirement.type === 'electrical' && object.electrical) {
    if (requirement.dedicated && !object.electrical.dedicated) return false;
    const requestedVoltage = requirement.subtype ? Number(requirement.subtype.replace(/[^0-9]/g, '')) : null;
    if (requestedVoltage && Number(object.electrical.voltage) !== requestedVoltage) return false;
    return true;
  }
  if (requirement.type === 'plumbing' && object.plumbing) {
    if (requirement.subtype && !(object.plumbing as unknown as Record<string, boolean>)[requirement.subtype]) return false;
    return true;
  }
  if (requirement.type === 'ventilation' && object.ventilation) {
    if (requirement.subtype && object.ventilation.category !== requirement.subtype) return false;
    return true;
  }
  return false;
}

export interface UtilityReachabilityResult {
  reachable: Array<{ object: SandboxBaseObject; distanceFt: number }>;
  requirementResults: Array<{ stationName: string; equipmentId: string; equipmentName: string; requirement: UtilityRequirement; satisfied: boolean; reason: string }>;
}

// The one validator this step adds: for a selected bench (optionally
// narrowed to one of its stations), which utility points are within reach,
// and for each piece of assigned equipment's utilityRequirements, is there
// a reachable point that actually matches (type/subtype/dedicated) within
// both the point's own connectionRadiusFt and the requirement's own
// maxConnectionDistanceFt. Deliberately stops at "reachable and matching" —
// no shared-capacity bookkeeping across multiple pieces of equipment, no
// bench sizing. That's the bench calculator's job, not this validator's.
export function evaluateUtilityReachability(fixture: SandboxFixture, baseObjects: SandboxBaseObject[], gridFt: number, station?: SandboxStationAssignment): UtilityReachabilityResult {
  const reachable = baseObjects
    .filter((object) => object.utility && object.footprint.points.length)
    .map((object) => ({ object, distanceFt: distanceToFixture(fixture, object.footprint.points[0], gridFt) }))
    .filter(({ object, distanceFt }) => distanceFt <= object.utility!.connectionRadiusFt)
    .sort((a, b) => a.distanceFt - b.distanceFt);

  const stations = station ? [station] : fixture.stations;
  const requirementResults: UtilityReachabilityResult['requirementResults'] = [];
  for (const st of stations) {
    for (const equipment of st.equipment) {
      for (const requirement of equipment.utilityRequirements ?? []) {
        const maxDistance = requirement.maxConnectionDistanceFt ?? Infinity;
        const matches = reachable.filter(({ object, distanceFt }) => distanceFt <= maxDistance && requirementMatchesObject(requirement, object));
        const needed = requirement.quantity ?? 1;
        const satisfied = matches.length >= needed;
        const label = `${requirement.type}${requirement.subtype ? ` (${requirement.subtype})` : ''}`;
        const reason = satisfied
          ? `${matches.length} reachable match${matches.length === 1 ? '' : 'es'} within range.`
          : requirement.required
            ? `No reachable ${label} within range — needs ${needed}, found ${matches.length}.`
            : `Preferred ${label} not available within range (optional).`;
        requirementResults.push({ stationName: st.name, equipmentId: equipment.equipmentId, equipmentName: equipment.name, requirement, satisfied, reason });
      }
    }
  }
  return { reachable, requirementResults };
}
