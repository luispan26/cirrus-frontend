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
import { EMPTY_SANDBOX_LAYOUT, buildLayoutGeometryInput, centeredRectFootprint, type SandboxBaseObject, type SandboxLayout, type SandboxPoint } from './layout-sandbox';

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
