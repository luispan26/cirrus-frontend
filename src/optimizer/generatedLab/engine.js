import { normalizeInput, InputError } from "./input.js";
import { EPS } from "./geometry.js";
import { accessPoints, createInitialState, materialize, stateIssues } from "./placement.js";
import { evaluateRun, prepareRoutes } from "./routes.js";
import { evaluateRelations, objectiveCost, objectiveWeights } from "./relations.js";
import { suggestColdStorage } from "./repurpose.js";

export const ENGINE_VERSION = "cirrus-optimizer-0.4.0";
export const ROUTING_POLICY = "aisle4-per-bench-v3";

// Baseline and solver output are independently routed with the same model.
function evaluator(model, routes) {
  return { full(state) {
    const access = accessPoints(model, state);
    const perRun = routes.map(r => evaluateRun(model, r, access, { paths: true }));
    const relations = evaluateRelations(model, state, access);
    const walk = perRun.reduce((sum, p) => sum + p.weightedTravelFt, 0);
    if (!Number.isFinite(walk)) throw new InputError([{ path: "protocolRuns", message: "Aggregate weighted distance exceeds numeric limits." }]);
    return { state, perRun, relations, walk, softPenalty: relations.softPenalty, hard: relations.hardViolations.length, violations: relations.softViolations, checks: relations.softChecks };
  } };
}

// ---- Result ----------------------------------------------------------------
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function snapshot(model, evaluation) {
  const used = new Set([...evaluation.state.segments.values()].map(s => s.benchId));
  return {
    ...materialize(model, evaluation.state),
    // Benches holding nothing — candidates for storage or floor equipment.
    emptyBenchIds: model.plan.benches.map(b => b.id).filter(id => !used.has(id)),
    perProtocol: evaluation.perRun, totalWeightedFt: evaluation.walk,
    softPenalty: evaluation.softPenalty, softViolations: evaluation.violations, hardViolations: evaluation.relations.hardViolations, relations: evaluation.relations.rules,
  };
}

// Layout geometry and supplied placements only — for inspecting a plan
// before its equipment/protocol data is complete.
export function inspectGeometry(input) {
  return normalizeInput(input, {}, { geometryOnly: true });
}

export async function runOptimizer(input, companion = {}, { optimize = false, solve, signal, onProgress } = {}) {
  const model = normalizeInput(input, companion);
  const layoutHash = await sha256(model.layout);
  if (model.source.layoutHash && model.source.layoutHash !== layoutHash) throw new InputError([{ path: "source.layoutHash", message: "Layout hash mismatch; scenario refers to a different layout." }]);
  const scenario = { initialPlacements: model.initialPlacements, initialWorkAreas: model.initialWorkAreas, databaseNotes: model.databaseNotes, equipmentInstances: model.equipment.map(({ pipette, ...u }) => u), protocols: model.protocols, protocolRuns: model.protocolRuns, constraints: model.constraints, settings: model.settings };
  const routes = prepareRoutes(model);
  const ev = evaluator(model, routes);
  const initial = createInitialState(model);
  const initialIssues = stateIssues(model, initial);
  if (initialIssues.length) throw new InputError(initialIssues);
  const baseline = ev.full(initial);
  // Walking against soft rule violations, by the optimizer-focus slider.
  const weights = objectiveWeights(model, baseline.walk, baseline.checks);
  const cost = e => objectiveCost(weights, e.walk, e.violations);
  if (optimize && !solve) throw new InputError([{ path: "solver", message: "Optimization requires the local MiniZinc service. Use the Node CLI or npm run dev." }]);
  if (optimize && !model.protocolRuns.some(r => r.runsPerPeriod > 0) && !model.constraints.some(r => r.severity === "hard")) throw new InputError([{ path: "protocolRuns", message: "Supply an active protocol or a hard equipment rule." }]);
  const solved = optimize ? await solve(model, routes, baseline, { signal, onProgress, weights }) : null;
  let candidate = solved ? ev.full(solved.state) : baseline;
  const comparable = baseline.state.unplaced.length === candidate.state.unplaced.length && baseline.perRun.every((p, i) => p.excluded.length === candidate.perRun[i].excluded.length);
  // Keep the original arrangement unless the result costs less (walking, and
  // soft violations as the slider weighs them); ties keep it too, avoiding
  // needless within-bench moves.
  if (comparable && baseline.hard === 0 && candidate.hard === 0 && cost(baseline) <= cost(candidate) + 1e-12) candidate = baseline;
  const outcome = { best: candidate, search: solved?.search ?? null };
  // Independent final check and full re-walk (with drawn paths) of both.
  const issues = [...stateIssues(model, baseline.state), ...stateIssues(model, outcome.best.state, baseline.state)];
  if (issues.length) throw new InputError(issues.map(i => ({ ...i, message: `Final validation failed: ${i.message}` })));
  const base = ev.full(baseline.state, { paths: true }), best = ev.full(outcome.best.state, { paths: true });
  if (comparable && base.hard === 0 && cost(best) > cost(base) + 1e-9) throw new Error("Final validation failed: the result costs more than the original layout.");
  if (solved?.search.objectiveWeightedFt != null) {
    // MiniZinc's total counts the units/orders it had picked for each visit
    // when the time ran out; the re-walk picks the best ones for the same
    // bench assignment, so it may be lower but never higher.
    const walked = ev.full(solved.state).walk;
    if (walked > solved.search.objectiveWeightedFt + 1e-5) throw new Error("MiniZinc objective disagrees with independent route evaluation.");
    solved.search.solverObjectiveWeightedFt = solved.search.objectiveWeightedFt;
    solved.search.objectiveWeightedFt = walked;
  }
  const excluded = best.perRun.flatMap(p => p.excluded.map(x => ({ runId: p.id, protocolName: p.name, ...x })));
  const baseSnap = snapshot(model, base), bestSnap = snapshot(model, best);
  const improvementFt = comparable ? base.walk - best.walk : null;
  const moves = bestSnap.placements.filter(p => p.benchId !== null).flatMap(p => {
    const from = baseSnap.placements.find(b => b.instanceId === p.instanceId);
    return (!from || from.benchId !== p.benchId || Math.abs(from.offsetFt - p.offsetFt) > EPS) ? [{ instanceId: p.instanceId, name: p.name, from, to: p }] : [];
  });
  const status = best.hard > 0 || outcome.search?.solverStatus === "UNSATISFIABLE" ? "no-feasible-placement" : !optimize ? "evaluated" : outcome.search.terminationReason === "cancelled" ? "cancelled" : outcome.search.optimal ? "optimal" : "time-limited";
  return {
    optimizerSchemaVersion: 1, engineVersion: ENGINE_VERSION, routingPolicy: ROUTING_POLICY,
    source: { ...model.source, layoutHash, hashAlgorithm: "sha256-canonical-json-v1" }, scenarioHash: await sha256(scenario),
    status, partial: excluded.length > 0 || best.state.unplaced.length > 0 || model.databaseNotes.some(n => n.level === "error"), excludedVisits: excluded,
    validationMode: model.settings.validationMode, physicalFitVerified: model.settings.validationMode === "strict" && best.state.unplaced.length === 0,
    period: model.protocolRuns[0]?.period ?? null, layout: model.layout, equipmentInstances: scenario.equipmentInstances, scenario,
    objective: { optimizerBalance: model.settings.optimizerBalance, softRules: model.constraints.filter(c => c.severity === "soft").length, hardRules: model.constraints.filter(c => c.severity === "hard").length,
      sliderActive: weights.soft, mode: weights.perViolation > 0 ? "walking+soft-rules" : "walking-only", violationFt: weights.violationFt, softChecks: weights.softChecks,
      baselineCost: cost(base), bestCost: cost(best),
      formula: weights.perViolation > 0 ? "cost = b * W / W0 + (1 - b) * violations / N; W = sum_p frequency_p * sum_k distance(bench(p,k-1), bench(p,k))" : "W = sum_p frequency_p * sum_k distance(bench(p,k-1), bench(p,k)); distance(b,b) = 0" },
    warnings: model.warnings, notes: model.notes, databaseNotes: model.databaseNotes,
    baseline: baseSnap, best: bestSnap, search: outcome.search,
    benchRepurposing: suggestColdStorage(model, bestSnap),
    comparable, improvementFt, improvementPct: comparable && base.walk > 0 ? improvementFt / base.walk * 100 : null, moves,
  };
}
