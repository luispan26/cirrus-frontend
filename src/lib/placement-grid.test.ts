// Visual regression for the combined zone+bench renderer painting
// doorways shut.
//
// The bug: PlacementGrid (the generateZonesAndPlaceBenches view) folded
// EVERY fixed-feature cell into one black "blocked" layer — sinks,
// plumbing, and the Entrance/Exit doorways alike. Because each doorway is
// an Entrance feature, the deliberate gap the wall was built around got
// filled solid, so a plan that pure zoning renders with six visible door
// openings came back from the combined view looking fully walled in.
//
// Both views now classify the shell through buildShellSets /
// shellCellKind (this module), so they cannot diverge again: an
// Entrance/Exit cell is a 'portal', never 'wall'.
import { describe, expect, it } from 'vitest';
import { buildShellSets, shellCellKind, PORTAL_FEATURE_TYPES, type ShellCellKind } from './placement-grid';

interface Cell {
  row: number;
  column: number;
}
const key = (c: Cell) => `${c.row},${c.column}`;

// A rectangular room whose perimeter is wall (absent from usableCells),
// with `doors` cells punched through it — each both a usable cell (a real
// gap) and an Entrance fixed feature (what the renderer must not paint
// over).
function walledRoom(rows: number, columns: number, doors: Cell[]) {
  const usableCells: Cell[] = [];
  for (let row = 1; row < rows - 1; row++) {
    for (let column = 1; column < columns - 1; column++) usableCells.push({ row, column });
  }
  usableCells.push(...doors); // the openings themselves are usable
  return {
    grid: { rows, columns, usableCells, blockedCells: [] as Cell[], reservedCirculationCells: [] as Cell[] },
    fixedFeatures: doors.map((cell) => ({ type: 'Entrance', cells: [cell] })),
  };
}

// The six openings from the reported plan: two on the top wall, one on
// the bottom, two on the left, one on the right.
const SIX_DOORS: Cell[] = [
  { row: 0, column: 3 },
  { row: 0, column: 8 },
  { row: 9, column: 5 },
  { row: 4, column: 0 },
  { row: 7, column: 0 },
  { row: 5, column: 13 },
];
const ROOM = walledRoom(10, 14, SIX_DOORS);

describe('shell classification — doorways are openings, never wall', () => {
  it('keeps all six gaps visible in the pure-zoning shell (no zones yet)', () => {
    const sets = buildShellSets(ROOM.grid, ROOM.fixedFeatures);
    for (const door of SIX_DOORS) {
      expect(shellCellKind(key(door), sets, false), `door ${key(door)}`).toBe<ShellCellKind>('portal');
    }
  });

  it('keeps all six gaps visible after generateZonesAndPlaceBenches (zones now cover the interior, some reaching a door)', () => {
    const sets = buildShellSets(ROOM.grid, ROOM.fixedFeatures);
    // The combined flow assigns zones; a zone can legitimately extend to
    // the wall and include a doorway cell. Model the two left-wall doors
    // as zone-covered, the rest not.
    const zoneCovers = new Set([key({ row: 4, column: 0 }), key({ row: 7, column: 0 })]);
    for (const door of SIX_DOORS) {
      const kind = shellCellKind(key(door), sets, zoneCovers.has(key(door)));
      // Whether it renders as floor-through-the-gap ('portal') or in a
      // zone colour ('zone'), the one thing it must never be is 'wall' —
      // that is the bug: the gap painted shut.
      expect(kind, `door ${key(door)}`).not.toBe<ShellCellKind>('wall');
    }
  });

  it('does not put doorway cells in the black blocked-feature layer', () => {
    const sets = buildShellSets(ROOM.grid, ROOM.fixedFeatures);
    for (const door of SIX_DOORS) {
      expect(sets.portalSet.has(key(door)), `door ${key(door)} in portalSet`).toBe(true);
      expect(sets.blockedFeatureSet.has(key(door)), `door ${key(door)} NOT in blockedFeatureSet`).toBe(false);
    }
  });

  it('treats Exit the same as Entrance', () => {
    expect(PORTAL_FEATURE_TYPES.has('Entrance')).toBe(true);
    expect(PORTAL_FEATURE_TYPES.has('Exit')).toBe(true);
    const grid = { rows: 6, columns: 6, usableCells: [{ row: 0, column: 2 }], blockedCells: [], reservedCirculationCells: [] };
    const sets = buildShellSets(grid, [{ type: 'Exit', cells: [{ row: 0, column: 2 }] }]);
    expect(shellCellKind('0,2', sets, false)).toBe<ShellCellKind>('portal');
  });
});

describe('shell classification — non-portal features stay solid', () => {
  const grid = {
    rows: 5,
    columns: 5,
    usableCells: Array.from({ length: 25 }, (_, i) => ({ row: Math.floor(i / 5), column: i % 5 })),
    blockedCells: [] as Cell[],
    reservedCirculationCells: [] as Cell[],
  };

  it('renders a Sink feature cell (and its clearance) as wall, even inside a zone', () => {
    const sets = buildShellSets(grid, [
      { type: 'Sink', cells: [{ row: 2, column: 2 }], clearanceCells: [{ row: 2, column: 3 }] },
    ]);
    expect(sets.blockedFeatureSet.has('2,2')).toBe(true);
    expect(sets.blockedFeatureSet.has('2,3')).toBe(true);
    expect(shellCellKind('2,2', sets, true)).toBe<ShellCellKind>('wall');
    expect(shellCellKind('2,3', sets, false)).toBe<ShellCellKind>('wall');
  });

  it('treats a door feature\'s clearance as solid but its opening as a portal', () => {
    const sets = buildShellSets(grid, [
      { type: 'Entrance', cells: [{ row: 0, column: 2 }], clearanceCells: [{ row: 1, column: 2 }] },
    ]);
    expect(shellCellKind('0,2', sets, false)).toBe<ShellCellKind>('portal');
    expect(shellCellKind('1,2', sets, false)).toBe<ShellCellKind>('wall');
  });
});
