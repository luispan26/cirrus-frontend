// Generator geometry is authoritative. Technicians walk on the plan's aisle
// cells, its open (unused) floor and the door landings — never on benches,
// obstacles or floor-standing equipment — as far as that floor joins the
// aisles.
export const cellKey = ([r, c]) => `${r},${c}`;
export const EPS = 1e-8;
// Drawn-route lanes: walk at least this far from benches and walls where the
// aisle allows it (half of Cirrus's 36" minimum aisle), and treat one turn as
// costing this many feet of off-lane walking. Only the choice among equally
// short paths depends on these; no distance does.
export const LANE_CLEARANCE_FT = 1.5, TURN_COST_FT = 8;
export function* rectCells({ row, column, height, width }) {
  for (let r = row; r < row + height; r++) for (let c = column; c < column + width; c++) yield [r, c];
}

// Cells floor-standing equipment stands on: Cirrus lists them
// (plan.floorEquipmentCells); any floor placement in the plan's
// initialEquipment adds its footprint.
function floorEquipmentCells(plan) {
  const s = plan.gridInches / 12, out = new Set((plan.floorEquipmentCells ?? []).map(cellKey));
  for (const p of plan.initialEquipment?.placements ?? []) {
    if (p?.benchId !== null || ![p.xFt, p.yFt, p.spanXFt, p.spanYFt].every(Number.isFinite)) continue;
    for (let r = Math.floor(p.yFt / s + 1e-6); r < Math.ceil((p.yFt + p.spanYFt) / s - 1e-6); r++) for (let c = Math.floor(p.xFt / s + 1e-6); c < Math.ceil((p.xFt + p.spanXFt) / s - 1e-6); c++) out.add(cellKey([r, c]));
  }
  return out;
}

// Four-neighbour walking graph over the walkable floor (see the top of this
// file) joined to the aisles. Distances are exact multiples of the cell
// size; BFS results are cached per source cell (there are only as many
// sources as distinct equipment access cells).
export function buildWalkingGraph(plan) {
  const cellFt = plan.gridInches / 12;
  const blocked = floorEquipmentCells(plan);
  const walkable = new Map();
  for (const cell of [...plan.aisle.cells, ...(plan.unusedFloor?.cells ?? []), ...(plan.doorClearance?.cells ?? []), ...(plan.doorClearance?.aisleCells ?? [])]) {
    const key = cellKey(cell);
    if (!blocked.has(key) && !walkable.has(key)) walkable.set(key, cell);
  }
  // Only floor reached from the aisles (a pocket sealed off by benches or
  // equipment is not walked to).
  const index = new Map(), cells = [];
  const seeds = plan.aisle.cells.filter(cell => walkable.has(cellKey(cell)));
  for (const cell of seeds) { const key = cellKey(cell); if (!index.has(key)) { index.set(key, cells.length); cells.push(cell); } }
  for (let q = 0; q < cells.length; q++) {
    const [r, c] = cells[q];
    for (const nb of [[r - 1, c], [r, c - 1], [r, c + 1], [r + 1, c]]) {
      const key = cellKey(nb);
      if (walkable.has(key) && !index.has(key)) { index.set(key, cells.length); cells.push(walkable.get(key)); }
    }
  }
  const n = cells.length;
  // Neighbour order N, W, E, S keeps reconstructed paths deterministic.
  const adjacency = new Int32Array(n * 4).fill(-1);
  cells.forEach(([r, c], i) => {
    [[r - 1, c], [r, c - 1], [r, c + 1], [r + 1, c]].forEach((nb, k) => { adjacency[i * 4 + k] = index.get(cellKey(nb)) ?? -1; });
  });
  const cache = new Map();
  function bfs(source) {
    let steps = cache.get(source);
    if (steps) return steps;
    steps = new Int32Array(n).fill(-1);
    const queue = new Int32Array(n);
    let head = 0, tail = 0;
    steps[source] = 0; queue[tail++] = source;
    while (head < tail) {
      const v = queue[head++];
      for (let k = 0; k < 4; k++) {
        const w = adjacency[v * 4 + k];
        if (w >= 0 && steps[w] < 0) { steps[w] = steps[v] + 1; queue[tail++] = w; }
      }
    }
    cache.set(source, steps);
    return steps;
  }
  const idx = cell => index.get(cellKey(cell)) ?? -1;

  // Lanes. Clearance = steps to the nearest non-aisle cell (bench, wall,
  // obstacle); a cell at least LANE_CLEARANCE_FT from every edge lies in a
  // walking lane down the middle of its row or column of aisle.
  const clearance = new Int32Array(n).fill(-1), queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let v = 0; v < n; v++) {
    for (let k = 0; k < 4; k++) if (adjacency[v * 4 + k] < 0) { clearance[v] = 1; queue[tail++] = v; break; }
  }
  while (head < tail) {
    const v = queue[head++];
    for (let k = 0; k < 4; k++) { const w = adjacency[v * 4 + k]; if (w >= 0 && clearance[w] < 0) { clearance[w] = clearance[v] + 1; queue[tail++] = w; } }
  }
  const laneSteps = Math.max(1, Math.round(LANE_CLEARANCE_FT / cellFt));
  const offLane = v => Math.max(0, laneSteps - clearance[v]);
  const turnCost = TURN_COST_FT / cellFt;
  const pathCache = new Map();
  // Among the equally shortest paths from i to j (the only ones allowed:
  // the drawn route always measures exactly the scored distance), the one
  // that stays in the lanes and turns least: cost = sum of off-lane steps
  // per cell + turnCost per turn, found by dynamic programming over the
  // shortest-path DAG in (cell, heading) states.
  function lanePath(i, j) {
    const from = bfs(i), to = bfs(j), total = from[j];
    if (total < 0) return null;
    const best = new Map(), order = [i];
    best.set(i * 5 + 4, { cost: 0, prev: -1 });
    const seen = new Set([i]);
    for (let q = 0; q < order.length; q++) {
      const v = order[q];
      for (let h = 0; h < 5; h++) {
        const at = best.get(v * 5 + h);
        if (!at) continue;
        for (let k = 0; k < 4; k++) {
          const w = adjacency[v * 4 + k];
          if (w < 0 || from[w] !== from[v] + 1 || from[w] + to[w] !== total) continue;
          const cost = at.cost + offLane(w) + (h !== 4 && h !== k ? turnCost : 0);
          const key = w * 5 + k, held = best.get(key);
          if (!held || cost < held.cost - EPS) best.set(key, { cost, prev: v * 5 + h });
          if (!seen.has(w)) { seen.add(w); order.push(w); }
        }
      }
    }
    let end = null;
    for (let h = 0; h < 5; h++) { const s = best.get(j * 5 + h); if (s && (!end || s.cost < end.s.cost - EPS)) end = { key: j * 5 + h, s }; }
    const out = [];
    for (let key = end.key; key >= 0; key = best.get(key).prev) out.push(cells[Math.floor(key / 5)]);
    return out.reverse();
  }
  return {
    cellFt, size: n, has: cell => index.has(cellKey(cell)), indexOf: idx, cellAt: i => cells[i],
    connected: n > 0 && bfs(0).every(s => s >= 0),
    // Distance between two node indices, in feet (Infinity if unreachable).
    distanceIdx(a, b) { if (a === b) return 0; const s = bfs(a)[b]; return s < 0 ? Infinity : s * cellFt; },
    distance(a, b) { const i = idx(a), j = idx(b); return i < 0 || j < 0 ? Infinity : this.distanceIdx(i, j); },
    // The path a technician walks, as [row, column] cells from a to b: always
    // a shortest one (its length is exactly distance(a, b)), chosen to follow
    // the aisle lanes with few turns, and the same cells in both directions.
    path(a, b) {
      const i = idx(a), j = idx(b);
      if (i < 0 || j < 0) return null;
      const [lo, hi] = i <= j ? [i, j] : [j, i], key = lo * n + hi;
      if (!pathCache.has(key)) pathCache.set(key, lanePath(lo, hi));
      const p = pathCache.get(key);
      return p && (i <= j ? [...p] : [...p].reverse());
    },
    clearanceFt: cell => { const v = idx(cell); return v < 0 ? 0 : clearance[v] * cellFt; },
  };
}

// Where a technician stands to use something on a bench: the point on the
// bench's working edge level with the footprint's middle, snapped to the
// nearest aisle cell inside that bench's accessRect (row, then column, breaks
// ties). Floor units use their supplied access cell.
export function accessCell(plan, bench, box) {
  const s = plan.gridInches / 12;
  let x = box.xFt + box.spanXFt / 2, y = box.yFt + box.spanYFt / 2;
  const top = bench.rect.row * s, left = bench.rect.column * s;
  if (bench.facing === "N") y = top;
  if (bench.facing === "S") y = top + bench.rect.height * s;
  if (bench.facing === "W") x = left;
  if (bench.facing === "E") x = left + bench.rect.width * s;
  let best = null, bestD = Infinity;
  for (const cell of rectCells(bench.accessRect)) {
    const d = ((cell[1] + 0.5) * s - x) ** 2 + ((cell[0] + 0.5) * s - y) ** 2;
    if (d < bestD - EPS) { best = cell; bestD = d; }
  }
  return best;
}

// One technician location per bench, independent of equipment offsets.
export function benchAccessCell(plan, bench) {
  const s = plan.gridInches / 12;
  return accessCell(plan, bench, { xFt: bench.rect.column * s, yFt: bench.rect.row * s,
    spanXFt: bench.rect.width * s, spanYFt: bench.rect.height * s });
}
