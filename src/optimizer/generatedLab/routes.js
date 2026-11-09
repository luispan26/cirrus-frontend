// Maps each protocol run onto placed equipment and scores its walking.
//
// A step needs one piece of equipment (equipmentId) or several used in any
// order (equipmentIds — what the Cirrus database stores: StepEquipmentMap has
// no order within a step). The route is resolved over the whole protocol at
// once with a layered dynamic program: for every visit, every eligible unit
// (the run's own zone, General — the shared area every workflow zone opens
// onto in Cirrus — and zoneless floor units, which Cirrus places by hand and
// every zone shares) is a candidate, and within a
// several-equipment step every visiting order is tried (up to 5 items; larger
// steps keep the listed order). The walk that is shortest overall wins, so a
// duplicate unit is never chosen greedily for one leg at the cost of a later
// one. Ties go to the earlier visiting order, then the smaller instance ID.
import { InputError } from "./input.js";
import { EPS } from "./geometry.js";

// The shared zone every run may also use.
export const GENERAL_ZONE_ID = "general";

const MAX_PERMUTED = 5;
function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [x, ...rest]));
}

// Layout-independent route plan for every run: its steps and, for every
// piece of equipment a step needs, the units that run may use.
export function prepareRoutes(model) {
  const protocols = new Map(model.protocols.map(p => [p.id, p]));
  return model.protocolRuns.map(run => {
    const protocol = protocols.get(run.protocolId);
    const steps = protocol.steps.map(step => {
      const equipmentIds = step.equipmentIds ?? [step.equipmentId];
      const candidates = new Map(equipmentIds.map(eq => [eq, model.equipment
        .filter(u => u.equipmentId === eq && (!step.instanceId || step.instanceId === u.instanceId) && (u.zoneId === run.zoneId || u.zoneId === GENERAL_ZONE_ID || u.zoneId === null))
        .sort((a, b) => a.instanceId.localeCompare(b.instanceId))]));
      return { step, equipmentIds, candidates, orders: equipmentIds.length <= MAX_PERMUTED ? permutations(equipmentIds) : [equipmentIds] };
    });
    const units = new Set(steps.flatMap(s => [...s.candidates.values()].flat().map(u => u.instanceId)));
    return { run, protocol, steps, units };
  });
}

// Walk one run. `access` maps instanceId -> aisle node index for every placed
// unit (unplaced units are absent). With unresolvedVisits "exclude", a visit
// no placed eligible unit can serve is left out and reported; otherwise it
// blocks the run.
export function evaluateRun(model, route, access, { paths = false } = {}) {
  const { run, protocol, steps } = route;
  const graph = model.graph, freq = run.runsPerPeriod;
  const base = { ...run, name: protocol.name ?? protocol.id };
  if (freq === 0) return { ...base, inactive: true, travelFt: 0, weightedTravelFt: 0, visits: [], legs: [], excluded: [] };
  const excluded = [];
  let layer = [{ start: true, cost: 0 }];
  for (const { step, equipmentIds, candidates, orders } of steps) {
    const usable = new Map();
    for (const eq of equipmentIds) {
      const units = candidates.get(eq).filter(u => access.has(u.instanceId) && access.get(u.instanceId) >= 0);
      if (units.length) { usable.set(eq, units); continue; }
      const elsewhere = [...new Set(model.equipment.filter(u => u.equipmentId === eq).map(u => u.zoneId))];
      const reason = !elsewhere.length ? "not in this lab's equipment" : candidates.get(eq).length ? "no location (unplaced or floor-standing without a manual placement)" : `not in the ${run.zoneId} zone or General (only in ${elsewhere.join(", ")}) — add it to ${run.zoneId} or General in Cirrus, or run the protocol in another zone`;
      // Floor equipment is outside the optimizer: a visit to one not yet
      // placed by hand is left out, never blocking.
      const floorOnly = candidates.get(eq).length > 0 && candidates.get(eq).every(u => u.placement === "floor");
      if (floorOnly || model.settings.unresolvedVisits === "exclude") excluded.push({ stepId: step.id, stepNumber: step.stepNumber, equipmentId: eq, reason });
      else throw new InputError([{ path: `${run.id}/${step.id}`, message: `${eq}: ${reason}.` }]);
    }
    if (!usable.size) continue;
    const best = new Map();
    for (const order of orders) {
      let current = layer;
      for (const eq of order.filter(e => usable.has(e))) {
        current = usable.get(eq).map(unit => {
          const a = access.get(unit.instanceId);
          let cost = Infinity, previous = null;
          for (const prev of current) {
            const c = prev.start ? 0 : prev.cost + graph.distanceIdx(prev.access, a);
            if (c < cost - EPS) { cost = c; previous = prev; }
          }
          return { unit, access: a, cost, previous, step, equipmentId: eq };
        });
      }
      for (const node of current) {
        const held = best.get(node.unit.instanceId);
        if (!held || node.cost < held.cost - EPS) best.set(node.unit.instanceId, node);
      }
    }
    layer = [...best.values()].sort((a, b) => a.unit.instanceId.localeCompare(b.unit.instanceId));
    if (layer.every(n => !Number.isFinite(n.cost))) throw new InputError([{ path: `${run.id}/${step.id}`, message: "No walkable route to this step." }]);
  }
  if (layer[0]?.start) return { ...base, travelFt: 0, weightedTravelFt: 0, visits: [], legs: [], excluded };
  const last = layer.reduce((a, b) => (b.cost < a.cost - EPS ? b : a));
  const chosen = [];
  for (let n = last; n && !n.start; n = n.previous) chosen.push(n);
  chosen.reverse();
  const visits = [], legs = [];
  let cumulative = 0;
  chosen.forEach((node, i) => {
    const prev = chosen[i - 1];
    const distanceFt = prev ? graph.distanceIdx(prev.access, node.access) : 0;
    cumulative += distanceFt;
    visits.push({ index: i + 1, stepId: node.step.id, stepNumber: node.step.stepNumber, stepLabel: String(node.step.substepLabel ?? node.step.stepNumber ?? i + 1), equipmentId: node.equipmentId,
      instanceId: node.unit.instanceId, accessCell: graph.cellAt(node.access), incomingFt: distanceFt, weightedIncomingFt: distanceFt * freq, cumulativeFt: cumulative, weightedCumulativeFt: cumulative * freq });
    if (prev) legs.push({ fromInstanceId: prev.unit.instanceId, toInstanceId: node.unit.instanceId, distanceFt, ...(paths ? { cells: graph.path(graph.cellAt(prev.access), graph.cellAt(node.access)) } : {}) });
  });
  const weighted = cumulative * freq;
  if (!Number.isFinite(weighted)) throw new InputError([{ path: run.id, message: "Weighted distance exceeds numeric limits; use a smaller frequency period." }]);
  return { ...base, travelFt: cumulative, weightedTravelFt: weighted, visits, legs, excluded };
}
