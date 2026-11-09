// Equipment relations: rules between two catalog equipment types, each
// either hard (never violated — a placement breaking one is infeasible, no
// matter how much walking it saves) or soft (a preference weighed against
// walking by the optimizer-focus slider).
//
//   notSameBench [A, B]      no bench holds both an A and a B
//   sameBench    [A, B]      every A shares a bench with some B
//   maxWalkFt    [A, B], D   every A is within D ft walking of some B
//   minWalkFt    [A, B], D   every A is at least D ft walking from every B
//
// B may be a list of equipment types, any of which counts (e.g. "within
// 12 ft of some microscope", whichever model).
//
// "Every A" is every placed unit of A; a unit never relates to itself. Soft
// penalties are in [0, 1] per rule: the share of A units failing (bench
// rules), or how far past the limit they are, relative to D and capped at 1
// (walking rules), averaged over A. The soft total is the weight-averaged
// rule penalty, so it is in [0, 1] as well.
import { EPS } from "./geometry.js";

export function evaluateRelations(model, state, access) {
  const benchOf = id => { const key = state.owner.get(id); return key ? state.segments.get(key).benchId : null; };
  const placed = eq => model.equipment.filter(u => u.equipmentId === eq && access.has(u.instanceId) && access.get(u.instanceId) >= 0).map(u => u.instanceId);
  const rules = [], hardViolations = [];
  let weightSum = 0, penaltySum = 0, softViolations = 0, softChecks = 0;
  for (const rule of model.constraints) {
    const [a, b] = rule.equipmentIds;
    const as = placed(a), bs = [b].flat().flatMap(placed);
    const failures = [];
    let penalty = 0;
    for (const x of as) {
      const others = bs.filter(y => y !== x);
      let p = 0;
      if (rule.type === "notSameBench") p = benchOf(x) !== null && others.some(y => benchOf(y) === benchOf(x)) ? 1 : 0;
      else if (rule.type === "sameBench") p = benchOf(x) !== null && others.some(y => benchOf(y) === benchOf(x)) ? 0 : 1;
      else {
        const d = Math.min(Infinity, ...others.map(y => model.graph.distanceIdx(access.get(x), access.get(y))));
        if (rule.type === "maxWalkFt") p = d <= rule.distanceFt + EPS ? 0 : Number.isFinite(d) ? Math.min(1, (d - rule.distanceFt) / rule.distanceFt) : 1;
        else p = !Number.isFinite(d) || d >= rule.distanceFt - EPS ? 0 : (rule.distanceFt - d) / rule.distanceFt;
      }
      if (p > EPS) failures.push(x);
      penalty += p;
    }
    penalty = as.length ? penalty / as.length : 0;
    const satisfied = failures.length === 0;
    rules.push({ id: rule.id, type: rule.type, severity: rule.severity, equipmentIds: rule.equipmentIds, distanceFt: rule.distanceFt, weight: rule.severity === "soft" ? rule.weight ?? 1 : undefined, satisfied, penalty, failing: failures, checked: as.length });
    if (rule.severity === "soft") { softViolations += failures.length; softChecks += as.length; }
    if (rule.severity === "hard" && !satisfied) hardViolations.push({ ruleId: rule.id, message: `${rule.type} ${a} / ${[b].flat().join(" or ")} broken by ${failures.join(", ")}.` });
    if (rule.severity === "soft") { const w = rule.weight ?? 1; weightSum += w; penaltySum += w * penalty; }
  }
  return { rules, hardViolations, softPenalty: weightSum ? penaltySum / weightSum : 0, softRuleCount: rules.filter(r => r.severity === "soft").length, softViolations, softChecks };
}

// The optimizer-focus slider (balance b, 0..1) weighs walking against soft
// rule violations, each relative to the starting layout:
//   cost = b × walking / W0 + (1 − b) × violations / N
// W0 is the original layout's weighted walking and N the number of soft
// checks (soft rule × unit it applies to). So every foot saved and every
// violation fixed count, and at the middle (b = 0.5) fixing one violation is
// worth W0 / N ft of walking (violationFt). With no soft rules, or b = 1, it
// is walking only.
export function objectiveWeights(model, baselineWalk, softChecks) {
  const soft = model.constraints.some(c => c.severity === "soft");
  const b = soft ? model.settings.optimizerBalance : 1;
  const W0 = baselineWalk > 0 ? baselineWalk : 1, N = Math.max(1, softChecks);
  return { balance: b, soft, perFt: b / W0, perViolation: soft ? (1 - b) / N : 0, violationFt: !soft ? null : b > 0 ? (1 - b) * W0 / (b * N) : Infinity, baselineWalkFt: W0, softChecks: N };
}
export const objectiveCost = (w, walk, violations) => w.perFt * walk + w.perViolation * violations;
