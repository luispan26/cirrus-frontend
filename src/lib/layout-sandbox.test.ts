// Permanent regression coverage for buildLayoutGeometryInput's point ->
// cell rasterization. Written after two real bugs surfaced only by
// exercising the live sandbox UI, not by reasoning about the formula:
//
// 1. A zero-area footprint (every wall-mounted point — plumbing/electrical/
//    ventilation) sitting exactly on the room's top/left edge (bounds at
//    0) produced ceil(0/grid)-1 = -1, one cell *before* the valid range,
//    so the point covered zero cells and silently vanished from
//    blockedCells/entranceCells/sinkCells.
// 2. The same kind of point pinned to the room's right/bottom edge (e.g.
//    pointOnWall's x: room.widthFt) produced floor(widthFt/grid), which is
//    exactly one column *past* the last valid index — an out-of-range cell
//    id the backend's own bounds check then rejected.
//
// Both were masked in every backend test this session, because those all
// passed sinkCells/blockedCells arrays directly rather than deriving them
// from placed objects — the rasterization itself was never actually
// exercised until a real plumbing_point was placed in the live UI.
import { describe, expect, test } from 'vitest';
import {
  AUTO_PLACED_BENCH_INSTANCE_ID_PREFIX,
  EMPTY_SANDBOX_LAYOUT,
  buildBenchPlacementGeometryInput,
  buildLayoutGeometryInput,
  centeredRectFootprint,
  fixtureFootprint,
  sandboxFixturesFromBenchPlacement,
  parseSandboxLayout,
  validateSandboxLayout,
  type SandboxFixture,
  type PlacedBenchGeometry,
  type SandboxBaseObject,
  type SandboxLayout,
  type SandboxPoint,
} from './layout-sandbox';

function layoutWithPoint(point: SandboxPoint, room: { widthFt: number; heightFt: number; gridFt: number } = { widthFt: 40, heightFt: 30, gridFt: 1 }): SandboxLayout {
  const object: SandboxBaseObject = {
    id: 'test-object',
    kind: 'column',
    name: 'Test column',
    footprint: { points: [point] },
  };
  return { ...structuredClone(EMPTY_SANDBOX_LAYOUT), room, baseObjects: [object] };
}

// Every case here is a point that legitimately falls within (or right on
// the edge of) the room — each must resolve to exactly one valid,
// in-bounds cell. Points that are genuinely outside the room are covered
// separately below and are expected to clamp to the nearest edge cell, not
// to raise or silently disappear.
function expectSingleInBoundsCell(layout: SandboxLayout, label: string) {
  const geometry = buildLayoutGeometryInput(layout);
  const numCells = geometry.roomWidth * geometry.roomHeight;
  expect(geometry.blockedCells.length, `${label}: expected exactly one covered cell`).toBe(1);
  const [cell] = geometry.blockedCells;
  expect(cell, `${label}: cell ${cell} is out of bounds (room has ${numCells} cells: 0-${numCells - 1})`).toBeGreaterThanOrEqual(0);
  expect(cell, `${label}: cell ${cell} is out of bounds (room has ${numCells} cells: 0-${numCells - 1})`).toBeLessThan(numCells);
}

describe('buildLayoutGeometryInput cell rasterization', () => {
  // Room is 40x30 at gridFt=1 -> columns 0-39, rows 0-29.
  const room = { widthFt: 40, heightFt: 30, gridFt: 1 };

  describe('exactly on each wall', () => {
    test('top wall (y=0)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 20, y: 0 }, room), 'top wall'));
    test('bottom wall (y=roomHeightFt)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 20, y: 30 }, room), 'bottom wall'));
    test('left wall (x=0)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 0, y: 15 }, room), 'left wall'));
    test('right wall (x=roomWidthFt)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 40, y: 15 }, room), 'right wall'));
  });

  describe('all four corners', () => {
    test('top-left (0,0)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 0, y: 0 }, room), 'top-left corner'));
    test('top-right (roomWidthFt,0)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 40, y: 0 }, room), 'top-right corner'));
    test('bottom-left (0,roomHeightFt)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 0, y: 30 }, room), 'bottom-left corner'));
    test('bottom-right (roomWidthFt,roomHeightFt)', () => expectSingleInBoundsCell(layoutWithPoint({ x: 40, y: 30 }, room), 'bottom-right corner'));
  });

  describe('internal grid boundaries', () => {
    test('point exactly on an internal grid line', () => expectSingleInBoundsCell(layoutWithPoint({ x: 10, y: 15 }, room), 'internal grid line (10,15)'));
    test('point exactly on a different internal grid line', () => expectSingleInBoundsCell(layoutWithPoint({ x: 25, y: 5 }, room), 'internal grid line (25,5)'));
  });

  describe('slightly inside and outside the room', () => {
    test('slightly inside the top-left corner', () => expectSingleInBoundsCell(layoutWithPoint({ x: 0.01, y: 0.01 }, room), 'slightly inside top-left'));
    test('slightly inside the bottom-right corner', () => expectSingleInBoundsCell(layoutWithPoint({ x: 39.99, y: 29.99 }, room), 'slightly inside bottom-right'));
    // Genuinely outside the room (a placement bug or a stale point after a
    // room resize, not a normal UI state) — must clamp to the nearest edge
    // cell, not produce a negative/overflowing index or an empty result.
    test('slightly outside the left wall clamps to column 0', () => expectSingleInBoundsCell(layoutWithPoint({ x: -0.5, y: 15 }, room), 'slightly outside left wall'));
    test('slightly outside the right wall clamps to the last column', () => {
      const layout = layoutWithPoint({ x: 40.5, y: 15 }, room);
      const geometry = buildLayoutGeometryInput(layout);
      expect(geometry.blockedCells).toHaveLength(1);
      const col = geometry.blockedCells[0] % geometry.roomWidth;
      expect(col).toBe(geometry.roomWidth - 1);
    });
    test('slightly outside the top wall clamps to row 0', () => {
      const layout = layoutWithPoint({ x: 20, y: -0.5 }, room);
      const geometry = buildLayoutGeometryInput(layout);
      expect(geometry.blockedCells).toHaveLength(1);
      const row = Math.floor(geometry.blockedCells[0] / geometry.roomWidth);
      expect(row).toBe(0);
    });
    test('slightly outside the bottom wall clamps to the last row', () => {
      const layout = layoutWithPoint({ x: 20, y: 30.5 }, room);
      const geometry = buildLayoutGeometryInput(layout);
      expect(geometry.blockedCells).toHaveLength(1);
      const row = Math.floor(geometry.blockedCells[0] / geometry.roomWidth);
      expect(row).toBe(geometry.roomHeight - 1);
    });
  });

  describe('maximum room coordinates', () => {
    test('point at exactly (roomWidthFt, roomHeightFt) lands in the last cell', () => {
      const layout = layoutWithPoint({ x: 40, y: 30 }, room);
      const geometry = buildLayoutGeometryInput(layout);
      expect(geometry.blockedCells).toEqual([geometry.roomWidth * geometry.roomHeight - 1]);
    });
    // Non-integer room dimensions (roomWidth/roomHeight are ceil()'d) are
    // exactly where the missing upper clamp on x0/y0 bit — floor(widthFt/grid)
    // landed one column past the ceil()'d column count.
    test('non-integer room width: a point at the far edge still lands in-bounds', () => {
      const oddRoom = { widthFt: 40.5, heightFt: 30.5, gridFt: 1 };
      const layout = layoutWithPoint({ x: 40.5, y: 30.5 }, oddRoom);
      const geometry = buildLayoutGeometryInput(layout);
      expect(geometry.roomWidth).toBe(41);
      expect(geometry.roomHeight).toBe(31);
      expect(geometry.blockedCells).toEqual([geometry.roomWidth * geometry.roomHeight - 1]);
    });
  });
});

// WS-7 (resizable no-placement zones): centeredRectFootprint is the shared
// helper behind both initial placement and the resize inspector for
// restricted_region/column (see placeBaseObjectAt/InfrastructureInspector in
// LayoutSandboxPage.tsx) — a rectangle centered on an arbitrary point, unlike
// wallRectFootprint's wall-flush rectangles.
describe('centeredRectFootprint', () => {
  test('produces a rectangle centered on the given point', () => {
    const footprint = centeredRectFootprint({ x: 10, y: 12 }, 6, 3);
    const xs = footprint.points.map((p) => p.x);
    const ys = footprint.points.map((p) => p.y);
    expect(Math.min(...xs)).toBe(7);
    expect(Math.max(...xs)).toBe(13);
    expect(Math.min(...ys)).toBe(10.5);
    expect(Math.max(...ys)).toBe(13.5);
  });

  // Enforcement (canPlaceBaseObject/blockedCells) works off exactly this
  // rectangle, so a 6x3 region at gridFt:1 covering whole grid cells must
  // block exactly 6*3=18 cells — not 17 or 19 from an off-by-one in the
  // cellsCoveredBy bounds-to-cell conversion tested above. Center is
  // (20, 15.5), not (20, 15): depth 3 needs a half-integer center to land
  // its bounds ([14,17]) on whole grid lines — centering on 15 instead
  // would give [13.5, 16.5], which straddles a grid line and covers 4 rows
  // instead of 3, an artifact of the center point, not a real bug.
  test('a 6x3 restricted_region at gridFt:1 blocks exactly 18 cells', () => {
    const room = { widthFt: 40, heightFt: 30, gridFt: 1 };
    const object: SandboxBaseObject = {
      id: 'test-restricted-region',
      kind: 'restricted_region',
      name: 'Restricted region',
      footprint: centeredRectFootprint({ x: 20, y: 15.5 }, 6, 3),
    };
    const layout: SandboxLayout = { ...structuredClone(EMPTY_SANDBOX_LAYOUT), room, baseObjects: [object] };
    const geometry = buildLayoutGeometryInput(layout);
    expect(geometry.blockedCells).toHaveLength(18);
  });
});

describe('sandboxFixturesFromBenchPlacement', () => {
  // The round trip this function exists for: a solved bench's footprint
  // (a rectangle of placement-subgrid cells) must come back out of
  // fixtureFootprint(resultingFixture, 1) as the exact same cell rectangle
  // it started as, for both rotations BENCH_PLACEMENT_MODEL ever returns.
  function rectCells(minRow: number, maxRow: number, minColumn: number, maxColumn: number): { row: number; column: number }[] {
    const cells: { row: number; column: number }[] = [];
    for (let row = minRow; row <= maxRow; row++) for (let column = minColumn; column <= maxColumn; column++) cells.push({ row, column });
    return cells;
  }

  test('rotationDegrees 0: a 12x5 subcell footprint (72"x30" bench at 6"/subcell) round-trips', () => {
    const bench: PlacedBenchGeometry = { id: 'b1', zoneId: 'zone-a', rotationDegrees: 0, footprintCells: rectCells(2, 6, 3, 14) };
    const [fixture] = sandboxFixturesFromBenchPlacement([bench], 6, new Map(), 5);
    expect(fixture.orientation).toBe(0);
    // 12 subcells wide * 6" = 72" = 6ft; 5 subcells deep * 6" = 30" = 2.5ft.
    expect(fixture.widthFt).toBeCloseTo(6);
    expect(fixture.depthFt).toBeCloseTo(2.5);
    const footprint = fixtureFootprint(fixture, 1); // gridFt 1 -> footprint in feet, same units as widthFt/depthFt
    expect(footprint).toEqual({ width: 6, height: 3 }); // ceil(2.5/1) = 3, not 2 -- Math.ceil rounding is fixtureFootprint's own behavior, not this function's
  });

  // Without this, every auto-placed bench came back with clearance
  // undefined -- indistinguishable from "no aisle required" even though the
  // solver enforced a real one (see this function's own header comment).
  test('carries the solved working aisle through as clearance.frontFt', () => {
    const bench: PlacedBenchGeometry = { id: 'b1a', zoneId: 'zone-a', rotationDegrees: 0, footprintCells: rectCells(0, 1, 0, 1) };
    const [fixture] = sandboxFixturesFromBenchPlacement([bench], 6, new Map(), 5);
    expect(fixture.clearance).toEqual({ frontFt: 5, backFt: 0, sideFt: 0 });
  });

  test('rotationDegrees 90: the same bench turned 90 degrees swaps its footprint span, and this function undoes that swap', () => {
    const bench: PlacedBenchGeometry = { id: 'b2', zoneId: 'zone-a', rotationDegrees: 90, footprintCells: rectCells(2, 13, 3, 7) };
    const [fixture] = sandboxFixturesFromBenchPlacement([bench], 6, new Map(), 5);
    expect(fixture.orientation).toBe(90);
    // Rotated: 5 subcells wide * 6" = 2.5ft, 12 subcells deep * 6" = 6ft --
    // stored as (widthFt: 6, depthFt: 2.5) so fixtureFootprint's own
    // vertical-swap logic reconstructs the real (2.5ft, 6ft) footprint.
    expect(fixture.widthFt).toBeCloseTo(6);
    expect(fixture.depthFt).toBeCloseTo(2.5);
    const footprint = fixtureFootprint(fixture, 1);
    expect(footprint).toEqual({ width: 3, height: 6 }); // ceil(2.5/1)=3 wide, 6 deep -- the 90-degree swap survived the round trip
  });

  test('position: the fixture lands at the footprint\'s minimum row/column corner, in room-cell units', () => {
    const bench: PlacedBenchGeometry = { id: 'b3', zoneId: 'zone-a', rotationDegrees: 0, footprintCells: rectCells(4, 8, 10, 21) };
    const [fixture] = sandboxFixturesFromBenchPlacement([bench], 6, new Map(), 5);
    // minColumn=10, minRow=4, placementCellSizeInches=6 -> 60"=5ft, 24"=2ft,
    // divided by the assumed 12"/room-cell (SANDBOX_ROOM_CELL_SIZE_INCHES).
    expect(fixture.x).toBeCloseTo(5);
    expect(fixture.y).toBeCloseTo(2);
  });

  test('names the fixture after its zone when a name is supplied, otherwise falls back to a generic label', () => {
    const bench: PlacedBenchGeometry = { id: 'b4', zoneId: 'zone-a', rotationDegrees: 0, footprintCells: rectCells(0, 1, 0, 1) };
    const [named] = sandboxFixturesFromBenchPlacement([bench], 6, new Map([['zone-a', 'Wet Bench Zone']]), 5);
    expect(named.name).toBe('Bench (Wet Bench Zone)');
    const [unnamed] = sandboxFixturesFromBenchPlacement([bench], 6, new Map(), 5);
    expect(unnamed.name).toBe('Bench');
  });

  // A manually-placed bench gets instanceId `bench-${Date.now()}`
  // (LayoutSandboxPage's placeFixtureAt) — a caller re-running bench
  // placement needs to replace only ITS OWN previous auto-placed benches
  // (by filtering on this prefix), never a person's hand-placed one, so
  // this prefix must never match that pattern.
  test('instanceId uses a prefix that never collides with a manually-placed bench\'s own instanceId', () => {
    const bench: PlacedBenchGeometry = { id: 'b5', zoneId: 'zone-a', rotationDegrees: 0, footprintCells: rectCells(0, 1, 0, 1) };
    const [fixture] = sandboxFixturesFromBenchPlacement([bench], 6, new Map(), 5);
    const manualBenchInstanceId = `bench-${Date.now()}`;
    expect(fixture.instanceId.startsWith(AUTO_PLACED_BENCH_INSTANCE_ID_PREFIX)).toBe(true);
    expect(manualBenchInstanceId.startsWith(AUTO_PLACED_BENCH_INSTANCE_ID_PREFIX)).toBe(false);
  });
});

// The Sandbox's two global rules (validateSandboxLayout): a bench's front
// working aisle must be clear, and nothing may sit in a door's swing +
// landing. Measured on exact footprints, so a solver-placed back-to-back
// pair (two 2.5ft benches on a 6" grid) is never a false "overlap".
describe('validateSandboxLayout — aisle and door clearance only', () => {
  const bench = (instanceId: string, x: number, y: number, orientation: SandboxFixture['orientation']): SandboxFixture => ({
    instanceId, kind: 'bench', name: instanceId, x, y, widthFt: 6, depthFt: 2.5, orientation, clearance: { frontFt: 5, backFt: 0, sideFt: 0 }, stations: [],
  });
  const layoutWith = (fixtures: SandboxFixture[], baseObjects: SandboxBaseObject[] = []): SandboxLayout => ({ ...structuredClone(EMPTY_SANDBOX_LAYOUT), fixtures, baseObjects });
  const northDoor: SandboxBaseObject = { id: 'door-1', kind: 'door', name: 'Door', footprint: { points: [{ x: 12, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 0.5 }, { x: 12, y: 0.5 }] } };

  test('a back-to-back pair facing opposite ways, each with a clear 5ft aisle, is valid', () => {
    // North bench faces up (180), south bench faces down (0), backs touching at y=15.
    const layout = layoutWith([bench('north', 10, 12.5, 180), bench('south', 10, 15, 0)]);
    expect(validateSandboxLayout(layout)).toEqual([]);
  });

  test('a bench sitting in another bench\'s front aisle is flagged', () => {
    const layout = layoutWith([bench('a', 10, 10, 0), bench('b', 10, 14, 0)]); // b is 1.5ft in front of a
    const ids = validateSandboxLayout(layout).map((v) => v.id);
    expect(ids).toContain('aisle-a');
    expect(ids).not.toContain('aisle-b');
  });

  test('a front aisle running out of the room is flagged', () => {
    const layout = layoutWith([bench('edge', 10, 26, 0)]); // front would reach y=33.5 in a 30ft room
    expect(validateSandboxLayout(layout).map((v) => v.id)).toEqual(['aisle-edge']);
  });

  test('two benches sharing one aisle (facing each other) are valid — aisles may overlap', () => {
    const layout = layoutWith([bench('top', 10, 10, 0), bench('bottom', 10, 17.5, 180)]);
    expect(validateSandboxLayout(layout)).toEqual([]);
  });

  test('a bench inside a door\'s swing + landing is flagged; one just outside it is not', () => {
    // Door 3ft wide at x 12..15 on the top wall -> clearance x 11..16, y 0..8.
    const inside = validateSandboxLayout(layoutWith([bench('near', 12, 6, 180)], [northDoor]));
    expect(inside.map((v) => v.id)).toContain('door-door-1');
    const outside = validateSandboxLayout(layoutWith([bench('far', 12, 8, 0)], [northDoor]));
    expect(outside).toEqual([]);
  });
});

describe('sandboxFixturesFromBenchPlacement — facing side', () => {
  test('maps the solved accessSide to the orientation whose front is that side', () => {
    const cells = [{ row: 0, column: 0 }, { row: 4, column: 11 }];
    const orientationFor = (accessSide: string, rotationDegrees: number) => sandboxFixturesFromBenchPlacement([{ id: 'b', zoneId: 'z', rotationDegrees, accessSide, footprintCells: cells }], 6, new Map(), 5)[0].orientation;
    expect(orientationFor('SOUTH', 0)).toBe(0);
    expect(orientationFor('north', 0)).toBe(180);
    expect(orientationFor('West', 90)).toBe(90);
    expect(orientationFor('east', 90)).toBe(270);
  });
});

describe('parseSandboxLayout — fixture positions', () => {
  test('keeps half-foot positions exactly, so a reloaded back-to-back pair stays touching', () => {
    const pair: SandboxFixture[] = [
      { instanceId: 'a', kind: 'bench', name: 'a', x: 5, y: 10, widthFt: 6, depthFt: 2.5, orientation: 90, clearance: { frontFt: 5, backFt: 0, sideFt: 0 }, stations: [] },
      { instanceId: 'b', kind: 'bench', name: 'b', x: 7.5, y: 10, widthFt: 6, depthFt: 2.5, orientation: 270, clearance: { frontFt: 5, backFt: 0, sideFt: 0 }, stations: [] },
    ];
    const parsed = parseSandboxLayout(JSON.parse(JSON.stringify({ ...EMPTY_SANDBOX_LAYOUT, fixtures: pair })));
    expect(parsed?.fixtures.map((f) => [f.x, f.y])).toEqual([[5, 10], [7.5, 10]]);
  });
});

describe('buildBenchPlacementGeometryInput — fixtures are no-placement areas', () => {
  const fixture = (instanceId: string, kind: SandboxFixture['kind'], x: number, y: number, widthFt: number, depthFt: number): SandboxFixture => ({ instanceId, kind, name: instanceId, x, y, widthFt, depthFt, orientation: 0, stations: [] });

  test('a placed fixture blocks exactly the cells its footprint touches, with no clearance added', () => {
    const layout: SandboxLayout = { ...structuredClone(EMPTY_SANDBOX_LAYOUT), fixtures: [fixture('hood', 'laminarHood', 10, 20, 4, 2.5)] };
    const geometry = buildBenchPlacementGeometryInput(layout);
    const expected: number[] = [];
    for (let y = 20; y <= 22; y++) for (let x = 10; x <= 13; x++) expected.push(y * 40 + x); // 4 x 2.5ft -> 4 x 3 cells
    expect([...geometry.blockedCells].sort((a, b) => a - b)).toEqual(expected);
  });

  test('benches a previous solve auto-placed are not obstacles — the solve replaces them', () => {
    const layout: SandboxLayout = { ...structuredClone(EMPTY_SANDBOX_LAYOUT), fixtures: [fixture(`${AUTO_PLACED_BENCH_INSTANCE_ID_PREFIX}bench-0a`, 'bench', 10, 20, 6, 2.5)] };
    expect(buildBenchPlacementGeometryInput(layout).blockedCells).toEqual([]);
  });
});

describe('architecture needs no clearance', () => {
  test('a window on the wall blocks no floor; a column blocks only its own footprint', () => {
    const window: SandboxBaseObject = { id: 'w', kind: 'window', name: 'Window', footprint: { points: [{ x: 5.8, y: 0 }, { x: 8.8, y: 0 }, { x: 8.8, y: 0.3 }, { x: 5.8, y: 0.3 }] } };
    const column: SandboxBaseObject = { id: 'c', kind: 'column', name: 'Column', footprint: { points: [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 11, y: 11 }, { x: 10, y: 11 }] } };
    const geometry = buildBenchPlacementGeometryInput({ ...structuredClone(EMPTY_SANDBOX_LAYOUT), baseObjects: [window, column] });
    expect(geometry.blockedCells).toEqual([10 * 40 + 10]);
  });
});
