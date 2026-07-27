export type FixtureKind = 'bench' | 'laminarHood' | 'sink' | 'cabinet' | 'refrigerator' | 'door' | 'waste';
export type FixtureOrientation = 0 | 90 | 180 | 270;
export interface FixtureClearance { frontFt: number; backFt: number; sideFt: number; overheadFt?: number; }
export type SandboxLayer = 'base' | 'stations' | 'equipment' | 'circulation' | 'electrical' | 'validation';
export type AccessFace = 'front' | 'back' | 'left' | 'right';
export const BENCH_WIDTH_FT = 6;
export const BENCH_DEPTH_FT = 2.5;
export const BENCH_SURFACE_AREA_SQFT = BENCH_WIDTH_FT * BENCH_DEPTH_FT;
export interface SandboxPoint { x: number; y: number; }
export interface SandboxPolygon { points: SandboxPoint[]; }
export interface ClearanceZone { id: string; purpose: 'operation' | 'maintenance' | 'certification' | 'ventilation'; polygon: SandboxPolygon; hard: boolean; }
export interface SandboxBaseObject { id: string; kind: 'wall' | 'column' | 'shaft' | 'casework' | 'door' | 'sink' | 'fume_hood' | 'bsc' | 'electrical_panel' | 'utility_connection' | 'restricted_region'; name: string; footprint: SandboxPolygon; locked: boolean; door?: { clearWidthIn: number; swingArc?: SandboxPolygon; isExit: boolean } }
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

type GridClearance = { top: number; right: number; bottom: number; left: number };

function fixtureClearance(fixture: SandboxFixture, gridFt: number): GridClearance {
  const front = Math.ceil(5 / gridFt);
  if (fixture.orientation === 90) return { top: 0, right: front, bottom: 0, left: 0 };
  if (fixture.orientation === 180) return { top: front, right: 0, bottom: 0, left: 0 };
  if (fixture.orientation === 270) return { top: 0, right: 0, bottom: 0, left: front };
  return { top: 0, right: 0, bottom: front, left: 0 };
}

export function canPlaceFixture(candidate: SandboxFixture, fixtures: SandboxFixture[], columns: number, rows: number, gridFt: number) {
  const size = fixtureFootprint(candidate, gridFt);
  const clearance = fixtureClearance(candidate, gridFt);
  if (candidate.x - clearance.left < 0 || candidate.y - clearance.top < 0 || candidate.x + size.width + clearance.right > columns || candidate.y + size.height + clearance.bottom > rows) return false;
  return fixtures.every((fixture) => {
    if (fixture.instanceId === candidate.instanceId) return true;
    const other = fixtureFootprint(fixture, gridFt);
    const otherClearance = fixtureClearance(fixture, gridFt);
    return candidate.x + size.width + Math.max(clearance.right, otherClearance.left) <= fixture.x
      || fixture.x + other.width + Math.max(otherClearance.right, clearance.left) <= candidate.x
      || candidate.y + size.height + Math.max(clearance.bottom, otherClearance.top) <= fixture.y
      || fixture.y + other.height + Math.max(otherClearance.bottom, clearance.top) <= candidate.y;
  });
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

export function validateSandboxLayout(layout: SandboxLayout, columns: number, rows: number): LayoutViolation[] {
  const violations: LayoutViolation[] = [];
  const bounds = (polygon: SandboxPolygon) => ({ left: Math.min(...polygon.points.map((p) => p.x)), right: Math.max(...polygon.points.map((p) => p.x)), top: Math.min(...polygon.points.map((p) => p.y)), bottom: Math.max(...polygon.points.map((p) => p.y)) });
  const intersects = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const exitFrontZone = (exit: SandboxBaseObject) => {
    const door = bounds(exit.footprint), center = { x: (door.left + door.right) / 2, y: (door.top + door.bottom) / 2 };
    const swing = exit.door?.swingArc?.points ?? [];
    const swingCenter = swing.length ? { x: swing.reduce((sum, point) => sum + point.x, 0) / swing.length, y: swing.reduce((sum, point) => sum + point.y, 0) / swing.length } : center;
    if (door.right - door.left >= door.bottom - door.top) {
      const towardBottom = swingCenter.y !== center.y ? swingCenter.y > center.y : center.y <= layout.room.heightFt / 2;
      return towardBottom ? { left: door.left, right: door.right, top: door.bottom, bottom: Math.min(layout.room.heightFt, door.bottom + 20) } : { left: door.left, right: door.right, top: Math.max(0, door.top - 20), bottom: door.top };
    }
    const towardRight = swingCenter.x !== center.x ? swingCenter.x > center.x : center.x <= layout.room.widthFt / 2;
    return towardRight ? { left: door.right, right: Math.min(layout.room.widthFt, door.right + 20), top: door.top, bottom: door.bottom } : { left: Math.max(0, door.left - 20), right: door.left, top: door.top, bottom: door.bottom };
  };
  const exits = layout.baseObjects.filter((object) => object.kind === 'door' && object.door?.isExit);
  for (const object of layout.baseObjects) if (object.kind === 'door' && (object.door?.clearWidthIn ?? 0) < 32) violations.push({ id: `door-${object.id}`, severity: 'error', layer: 'base', objectIds: [object.id], message: `${object.name} provides less than 32 in of clear opening.`, fix: { type: 'set-door-width', targetId: object.id, value: 32, label: 'Set clear opening to 32 in' } });
  const circulation = deriveCirculationSpace(layout);
  if (layout.fixtures.some((fixture) => fixture.stations.length > 0) && exits.length === 0) violations.push({ id: 'missing-exit', severity: 'error', layer: 'circulation', objectIds: [], message: 'The derived circulation space has no defined exit.', fix: { type: 'add-exit', label: 'Add a 36 in exit' } });
  for (const fixture of layout.fixtures) {
    if (!canPlaceFixture(fixture, layout.fixtures, columns, rows, layout.room.gridFt)) violations.push({ id: `placement-${fixture.instanceId}`, severity: 'error', layer: 'validation', objectIds: [fixture.instanceId], message: `${fixture.name} overlaps another object, violates clearance, or extends outside the room.`, fix: { type: 'move-fixture', targetId: fixture.instanceId, label: 'Move to nearest valid position' } });
    const size = fixtureFootprint(fixture, layout.room.gridFt);
    const fixtureBounds = { left: fixture.x * layout.room.gridFt, right: (fixture.x + size.width) * layout.room.gridFt, top: fixture.y * layout.room.gridFt, bottom: (fixture.y + size.height) * layout.room.gridFt };
    const clearance = fixtureClearance(fixture, layout.room.gridFt);
    const clearanceBounds = { left: fixtureBounds.left - clearance.left * layout.room.gridFt, right: fixtureBounds.right + clearance.right * layout.room.gridFt, top: fixtureBounds.top - clearance.top * layout.room.gridFt, bottom: fixtureBounds.bottom + clearance.bottom * layout.room.gridFt };
    const blockingExit = exits.find((exit) => exit.footprint.points.length && intersects(fixtureBounds, exitFrontZone(exit)));
    if (blockingExit) violations.push({ id: `exit-front-${fixture.instanceId}-${blockingExit.id}`, severity: 'error', layer: 'circulation', objectIds: [fixture.instanceId, blockingExit.id], message: `${fixture.name} is inside the required 20 ft front clearance for ${blockingExit.name}.`, fix: { type: 'move-fixture', targetId: fixture.instanceId, label: 'Move fixture out of exit clearance' } });
    const blockedSwing = exits.find((exit) => (exit.door?.swingArc?.points.length ?? 0) > 0 && intersects(fixtureBounds, bounds(exit.door!.swingArc!)));
    if (blockedSwing) violations.push({ id: `exit-swing-${fixture.instanceId}-${blockedSwing.id}`, severity: 'error', layer: 'circulation', objectIds: [fixture.instanceId, blockedSwing.id], message: `${fixture.name} blocks the side where ${blockedSwing.name} opens.`, fix: { type: 'move-fixture', targetId: fixture.instanceId, label: 'Clear the door swing side' } });
    for (const object of layout.baseObjects) if (object.footprint.points.length && intersects(clearanceBounds, bounds(object.footprint))) violations.push({ id: `base-overlap-${fixture.instanceId}-${object.id}`, severity: 'error', layer: 'base', objectIds: [fixture.instanceId, object.id], message: `${fixture.name} or its required 5 ft front clearance overlaps ${object.name}.`, fix: { type: 'move-fixture', targetId: fixture.instanceId, label: 'Move fixture clear of obstruction' } });
    if (exits.length > 0) {
      const clearanceCells = Math.ceil(5 / layout.room.gridFt);
      const targetX = fixture.orientation === 90 ? fixture.x + size.width + clearanceCells : fixture.orientation === 270 ? fixture.x - clearanceCells - 1 : fixture.x + Math.floor(size.width / 2);
      const targetY = fixture.orientation === 0 ? fixture.y + size.height + clearanceCells : fixture.orientation === 180 ? fixture.y - clearanceCells - 1 : fixture.y + Math.floor(size.height / 2);
      if (!circulation.reachableKeys.has(`${targetX},${targetY}`)) violations.push({ id: `route-${fixture.instanceId}`, severity: 'error', layer: 'circulation', objectIds: [fixture.instanceId], message: `${fixture.name} front is not accessible from an exit through derived clear space.`, fix: { type: 'move-fixture', targetId: fixture.instanceId, label: 'Move fixture next to reachable clear space' } });
    }
    if (fixture.kind === 'bench') {
      const capacity = BENCH_SURFACE_AREA_SQFT;
      const used = fixture.stations.flatMap((station) => station.equipment).reduce((sum, equipment) => sum + Math.max(0, equipment.widthFt ?? 0) * Math.max(0, equipment.depthFt ?? 0), 0);
      if (used > capacity + Number.EPSILON) violations.push({ id: `capacity-${fixture.instanceId}`, severity: 'error', layer: 'equipment', objectIds: [fixture.instanceId], message: `${fixture.name} equipment uses ${used.toFixed(2)} sq ft; only ${capacity.toFixed(2)} sq ft is available.`, fix: { type: 'remove-largest-equipment', targetId: fixture.instanceId, label: 'Remove largest assigned item' } });
      for (const station of fixture.stations) if ((station.accessFaces?.length ?? 0) === 0) violations.push({ id: `access-${station.instanceId}`, severity: 'warning', layer: 'stations', objectIds: [fixture.instanceId, station.instanceId], message: `${station.name} has no defined access face.`, fix: { type: 'set-access-face', targetId: station.instanceId, label: 'Set front as access face' } });
    }
  }
  for (const endpoint of layout.electricalEndpoints) if (!layout.electricalCircuits.some((circuit) => circuit.id === endpoint.circuitId)) violations.push({ id: `circuit-${endpoint.id}`, severity: 'error', layer: 'electrical', objectIds: [endpoint.id], message: `Electrical endpoint ${endpoint.id} references missing circuit ${endpoint.circuitId}.`, fix: { type: 'add-circuit', targetId: endpoint.id, label: `Create circuit ${endpoint.circuitId}` } });
  return violations;
}
