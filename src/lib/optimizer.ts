import { KB, computeFloorPlan, type FloorPlanResult } from './kb';

export interface LayoutWeights {
  throughput: number;
  walkingDistance: number;
  flexibility: number;
  contamination: number;
  equipmentUtilization: number;
}

export interface DemandParams {
  runsPerWeek: number;
  batchSize: number;
  seasonalVariability: number; // 0-1, 0 = none/not specified
}

export interface OptimizationResult {
  order: string[];
  floorPlan: FloorPlanResult;
  fitness: number;
  subScores: LayoutWeights;
}

/**
 * Every tunable number the search depends on, in one place, each labeled
 * with how confident we actually are in it. Two categories:
 *
 * - "Reasonable defaults" — defensible on general principle (e.g. search
 *   effort should scale with problem size), safe to trust as-is.
 * - "Genuinely arbitrary" — guesses with no real data behind them yet.
 *   Not fixable by picking a different number; fixable only by getting
 *   real data (actual lab usage patterns, real contamination/BSL adjacency
 *   rules) to calibrate against. Flagged here instead of hidden inline so
 *   nobody mistakes them for validated values.
 */
const CONFIG = {
  // --- Reasonable defaults: search effort scales with problem size ---
  // 9 stations (the current KB's max) lands close to the original fixed
  // 30x40 = 1200 evaluations; fewer stations need less search, and if the
  // KB ever grows well past 9, this scales up rather than silently
  // under-searching a bigger permutation space.
  baseIterations: 15,
  iterationsPerStation: 1.5,
  baseDropsPerIteration: 20,
  dropsPerStationPerIteration: 2,

  // --- Reasonable defaults: soil explore/exploit dynamics ---
  // Standard-shape IWD-style parameters (reinforce the winner, evaporate
  // everything slightly each round) — the specific rates are a starting
  // point, not tuned against real convergence data, but the qualitative
  // behavior (early exploration, gradual convergence) is sound regardless
  // of the exact numbers.
  initialSoil: 1000,
  soilReinforceFactor: 0.9,
  soilEvaporateFactor: 1.01,
  minSoil: 1,
  maxSoil: 2000,

  // --- Reasonable default: local search refinement pass ---
  // After the water-drop search converges on a good order, a bounded
  // hill-climbing pass (swaps, subsequence reversals, relocations) polishes
  // it further — cheap at this station count (a handful of stations means
  // each pass is a small number of evaluations), and this is standard
  // practice for permutation metaheuristics (global search + local
  // exploitation) rather than a novel addition.
  maxLocalSearchPasses: 20,

  // --- Genuinely arbitrary: no real operational data exists to calibrate
  // these against. "200" is a guess at what a moderately busy lab's
  // runs-per-week x batch-size looks like — there's no dataset of real
  // lab throughput to check it against. Revisit once real usage data
  // exists, rather than adjusting this number in the dark.
  demandReferenceScale: 200,
  demandIntensityMin: 0.5,
  demandIntensityMax: 2,
};

// Genuinely arbitrary, not a reasonable default: which zone pairings are
// treated as contamination-risk if placed close together. No real
// containment/BSL adjacency model exists yet — every station in the
// current KB has the same bsl_min, so there's no real per-station
// containment data to derive this from. This single pair is a starting
// assumption to replace once that data exists, not a validated rule.
const RISK_CONFLICTING_ZONES: [string, string][] = [['wet_lab', 'automation']];

function stationPositions(fp: FloorPlanResult): Record<string, { row: number; col: number }> {
  const positions: Record<string, { row: number; col: number }> = {};
  fp.grid.forEach((row, rowIndex) => {
    const byStation: Record<string, number[]> = {};
    row.cells.forEach((c) => {
      if (!c.stationId) return;
      (byStation[c.stationId] ||= []).push(c.col);
    });
    Object.entries(byStation).forEach(([stationId, cols]) => {
      positions[stationId] = { row: rowIndex, col: cols.reduce((s, c) => s + c, 0) / cols.length };
    });
  });
  return positions;
}

function dist(a: { row: number; col: number }, b: { row: number; col: number }): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

// Sum of distances between consecutive stations in each protocol's step
// order — same step model the Services simulator already uses.
function scoreWalkingDistance(fp: FloorPlanResult, positions: Record<string, { row: number; col: number }>): number {
  const protocols = fp.opIds.map((id) => KB.operations.find((o) => o.id === id)).filter(Boolean) as (typeof KB.operations)[number][];
  let total = 0;
  protocols.forEach((op) => {
    for (let i = 0; i < op.stations.length - 1; i++) {
      const a = positions[op.stations[i]];
      const b = positions[op.stations[i + 1]];
      if (a && b) total += dist(a, b);
    }
  });
  return 1 / (1 + total);
}

// Stations used by more protocols are "high traffic" — reward keeping them
// centrally located (low average distance to everything else) over
// dumping them in a corner.
function scoreThroughput(fp: FloorPlanResult, positions: Record<string, { row: number; col: number }>): number {
  const freq: Record<string, number> = {};
  fp.opIds.forEach((id) => {
    const op = KB.operations.find((o) => o.id === id);
    op?.stations.forEach((s) => { freq[s] = (freq[s] || 0) + 1; });
  });
  const ids = Object.keys(positions);
  if (!ids.length) return 1;
  let weightedSum = 0, weightTotal = 0;
  ids.forEach((s) => {
    const others = ids.filter((o) => o !== s);
    const avgDist = others.length ? others.reduce((sum, o) => sum + dist(positions[s], positions[o]), 0) / others.length : 0;
    const w = freq[s] || 0.5;
    weightedSum += w * avgDist;
    weightTotal += w;
  });
  return 1 / (1 + (weightTotal ? weightedSum / weightTotal : 0));
}

// Longest contiguous run of unassigned cells in any single row — a proxy
// for "room to add a new station later" rather than fragmented leftover gaps.
function scoreFlexibility(fp: FloorPlanResult): number {
  let bestRun = 0;
  fp.grid.forEach((row) => {
    let run = 0;
    row.cells.forEach((c) => {
      if (!c.stationId) { run++; bestRun = Math.max(bestRun, run); }
      else run = 0;
    });
  });
  return fp.positionsPerRow ? Math.min(1, bestRun / fp.positionsPerRow) : 0;
}

// Penalizes risk-conflicting-zone station pairs for being close together.
function scoreContamination(positions: Record<string, { row: number; col: number }>): number {
  const ids = Object.keys(positions);
  let riskProximity = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const zoneA = KB.stations[ids[i]]?.zone;
      const zoneB = KB.stations[ids[j]]?.zone;
      const conflicting = RISK_CONFLICTING_ZONES.some(([z1, z2]) => (zoneA === z1 && zoneB === z2) || (zoneA === z2 && zoneB === z1));
      if (conflicting) riskProximity += 1 / (1 + dist(positions[ids[i]], positions[ids[j]]));
    }
  }
  return 1 / (1 + riskProximity);
}

// Rewards equipment-dense stations being close to OTHER equipment-dense
// stations — a proxy for keeping capital-intensive/shared infrastructure
// (power, plumbing, network) clustered rather than spread thin across the
// room. Replaces an earlier version of this metric that rewarded
// horizontal-row-center proximity, which had no real justification at all;
// this version at least has a defensible story, though it's still a
// heuristic rather than a real utilization model — no real cost-of-spread
// data exists to validate it against.
function scoreEquipmentUtilization(positions: Record<string, { row: number; col: number }>): number {
  const ids = Object.keys(positions);
  if (!ids.length) return 1;
  const equipCount: Record<string, number> = {};
  ids.forEach((s) => {
    const op = KB.operations.find((o) => o.stations.includes(s));
    equipCount[s] = op?.equipment.length || 1;
  });

  let weightedSum = 0, weightTotal = 0;
  ids.forEach((s) => {
    const others = ids.filter((o) => o !== s);
    if (!others.length) return;
    const weightedAvgDist =
      others.reduce((sum, o) => sum + dist(positions[s], positions[o]) * equipCount[o], 0) /
      others.reduce((sum, o) => sum + equipCount[o], 0);
    weightedSum += equipCount[s] * (1 / (1 + weightedAvgDist));
    weightTotal += equipCount[s];
  });
  return weightTotal ? weightedSum / weightTotal : 1;
}

function evaluate(fp: FloorPlanResult, weights: LayoutWeights, demand: DemandParams) {
  const positions = stationPositions(fp);
  const sub: LayoutWeights = {
    throughput: scoreThroughput(fp, positions),
    walkingDistance: scoreWalkingDistance(fp, positions),
    flexibility: scoreFlexibility(fp),
    contamination: scoreContamination(positions),
    equipmentUtilization: scoreEquipmentUtilization(positions),
  };

  // Demand modulation: busier labs (more runs x bigger batches) care more
  // about throughput/walking efficiency; more seasonal variability cares
  // more about spare flexibility. See CONFIG comments above — the reference
  // scale here is a genuine guess, not derived from real operational data.
  const demandIntensity = Math.min(
    CONFIG.demandIntensityMax,
    Math.max(CONFIG.demandIntensityMin, (demand.runsPerWeek * demand.batchSize) / CONFIG.demandReferenceScale),
  );
  const w = {
    throughput: weights.throughput * demandIntensity,
    walkingDistance: weights.walkingDistance * demandIntensity,
    flexibility: weights.flexibility * (1 + demand.seasonalVariability),
    contamination: weights.contamination,
    equipmentUtilization: weights.equipmentUtilization,
  };
  const totalWeight = Object.values(w).reduce((s, v) => s + v, 0) || 1;
  const fitness = (Object.keys(w) as (keyof LayoutWeights)[]).reduce(
    (s, k) => s + (w[k] / totalWeight) * sub[k],
    0,
  );
  return { fitness, sub };
}

/**
 * Bounded hill-climbing refinement over an already-good order — tries every
 * pairwise swap, every subsequence reversal (2-opt), and every single-station
 * relocation, keeping any move that improves fitness, repeating until a full
 * pass finds no improvement (or the pass cap is hit). This is the standard
 * "global search finds a good region, local search polishes within it"
 * pattern for permutation problems — genuinely cheap at this station count
 * (a handful of stations means each pass is a small number of evaluations),
 * not a novel technique, just one worth having given how little it costs.
 */
function localSearchRefine(
  reportData: { protocols_json?: unknown },
  width: number,
  height: number,
  weights: LayoutWeights,
  demand: DemandParams,
  order: string[],
  fitness: number,
  sub: LayoutWeights,
): { order: string[]; fitness: number; sub: LayoutWeights } {
  let bestOrder = order.slice();
  let bestFitness = fitness;
  let bestSub = sub;
  let improved = true;
  let passes = 0;

  const tryCandidate = (candidate: string[]) => {
    const fp = computeFloorPlan(reportData, width, height, undefined, candidate);
    const { fitness: f, sub: s } = evaluate(fp, weights, demand);
    if (f > bestFitness) {
      bestFitness = f;
      bestOrder = candidate;
      bestSub = s;
      improved = true;
    }
  };

  while (improved && passes < CONFIG.maxLocalSearchPasses) {
    improved = false;
    passes++;

    // Pairwise swaps
    for (let i = 0; i < bestOrder.length; i++) {
      for (let j = i + 1; j < bestOrder.length; j++) {
        const candidate = bestOrder.slice();
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        tryCandidate(candidate);
      }
    }

    // Subsequence reversal (2-opt)
    for (let i = 0; i < bestOrder.length - 1; i++) {
      for (let j = i + 1; j < bestOrder.length; j++) {
        const candidate = bestOrder.slice();
        const reversed = candidate.slice(i, j + 1).reverse();
        candidate.splice(i, reversed.length, ...reversed);
        tryCandidate(candidate);
      }
    }

    // Relocation (remove one station, reinsert elsewhere)
    for (let i = 0; i < bestOrder.length; i++) {
      for (let j = 0; j < bestOrder.length; j++) {
        if (i === j) continue;
        const candidate = bestOrder.slice();
        const [moved] = candidate.splice(i, 1);
        candidate.splice(j, 0, moved);
        tryCandidate(candidate);
      }
    }
  }

  return { order: bestOrder, fitness: bestFitness, sub: bestSub };
}

/**
 * Water-drop-inspired stochastic search (loosely adapted from Intelligent
 * Water Drops) over station PLACEMENT ORDER — not raw coordinates. Each
 * candidate order gets fed through the existing greedy packer
 * (computeFloorPlan), so this never reinvents placement logic, only which
 * order stations are offered to it in.
 *
 * "Soil" between two stations (lower = more attractive) gets reinforced
 * whenever an order containing that adjacency scores well, and evaporates
 * slightly every iteration — the same explore/reinforce dynamic as the
 * original algorithm, simplified rather than replicating its exact
 * published update equations. Search effort scales with station count
 * (see CONFIG) rather than a single fixed iteration count, so this stays
 * fast for small labs and doesn't silently under-search if the knowledge
 * base grows to many more station types.
 */
export function optimizeFloorPlan(
  reportData: { protocols_json?: unknown },
  width: number,
  height: number,
  weights: LayoutWeights,
  demand: DemandParams,
  iterations?: number,
  dropsPerIteration?: number,
): OptimizationResult {
  const baseline = computeFloorPlan(reportData, width, height);
  const stationIds = baseline.stationBlocks.map((b) => b.id);

  if (stationIds.length <= 2) {
    const { fitness, sub } = evaluate(baseline, weights, demand);
    return { order: stationIds, floorPlan: baseline, fitness, subScores: sub };
  }

  const resolvedIterations = iterations ?? Math.round(CONFIG.baseIterations + stationIds.length * CONFIG.iterationsPerStation);
  const resolvedDrops = dropsPerIteration ?? Math.round(CONFIG.baseDropsPerIteration + stationIds.length * CONFIG.dropsPerStationPerIteration);

  const soil: Record<string, Record<string, number>> = {};
  stationIds.forEach((a) => {
    soil[a] = {};
    stationIds.forEach((b) => { if (a !== b) soil[a][b] = CONFIG.initialSoil; });
  });

  let bestOrder = stationIds;
  let bestFitness = -Infinity;
  let bestSub: LayoutWeights = weights;

  for (let iter = 0; iter < resolvedIterations; iter++) {
    let iterBestOrder: string[] | null = null;
    let iterBestFitness = -Infinity;

    for (let d = 0; d < resolvedDrops; d++) {
      const remaining = new Set(stationIds);
      const start = stationIds[Math.floor(Math.random() * stationIds.length)];
      const path = [start];
      remaining.delete(start);
      while (remaining.size) {
        const current = path[path.length - 1];
        const candidates = [...remaining];
        const weightsArr = candidates.map((c) => 1 / ((soil[current]?.[c] ?? CONFIG.initialSoil) + 1));
        const totalW = weightsArr.reduce((s, w) => s + w, 0);
        let r = Math.random() * totalW;
        let chosen = candidates[candidates.length - 1];
        for (let i = 0; i < candidates.length; i++) {
          r -= weightsArr[i];
          if (r <= 0) { chosen = candidates[i]; break; }
        }
        path.push(chosen);
        remaining.delete(chosen);
      }

      const fp = computeFloorPlan(reportData, width, height, undefined, path);
      const { fitness, sub } = evaluate(fp, weights, demand);
      if (fitness > iterBestFitness) { iterBestFitness = fitness; iterBestOrder = path; }
      if (fitness > bestFitness) { bestFitness = fitness; bestOrder = path; bestSub = sub; }
    }

    if (iterBestOrder) {
      for (let i = 0; i < iterBestOrder.length - 1; i++) {
        const a = iterBestOrder[i], b = iterBestOrder[i + 1];
        soil[a][b] = Math.max(CONFIG.minSoil, soil[a][b] * CONFIG.soilReinforceFactor);
      }
    }
    stationIds.forEach((a) => stationIds.forEach((b) => {
      if (a !== b) soil[a][b] = Math.min(CONFIG.maxSoil, soil[a][b] * CONFIG.soilEvaporateFactor);
    }));
  }

  const refined = localSearchRefine(reportData, width, height, weights, demand, bestOrder, bestFitness, bestSub);
  const bestFp = computeFloorPlan(reportData, width, height, undefined, refined.order);
  return { order: refined.order, floorPlan: bestFp, fitness: refined.fitness, subScores: refined.sub };
}