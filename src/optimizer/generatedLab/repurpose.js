// Review-only suggestions. Never delete a bench, place floor equipment, or
// change route totals. Clearances and utilities need generator-side review.
//
// Two kinds of equipment may be offered an entirely empty bench:
//   - bench replacements: a Hamilton STAR liquid handler is deeper than a
//     bench top, so it can never stand on one; it can take the place of a
//     whole empty bench of its own zone, front facing the same way;
//   - cold storage: unplaced floor fridges/freezers, on any empty bench.
// Bench replacements pick first (they are limited to their own zone). Both
// prefer benches against a wall, then near a corner, like storage.
import { FACING_ROTATION } from "./benchRules.js";

export const BENCH_REPLACING = /hamilton/i;
const COLD_STORAGE = /fridge|refrigerator|freezer/i;
const label = u => `${u.equipmentId} ${u.name ?? ""}`;
const measured = u => !u.placeholderSize && [u.widthFt, u.depthFt].every(n => Number.isFinite(n) && n > 0);

export function suggestColdStorage(model, snapshot) {
  const occupied = new Set(snapshot.placements.map(p => p.benchId).filter(Boolean));
  const floorPlaced = new Set(snapshot.placements.filter(p => p.benchId === null).map(p => p.instanceId));
  const unplacedBench = new Set(snapshot.unplaced.map(u => u.instanceId));
  const cell = model.plan.gridInches / 12;
  const roomW = model.plan.columns * cell, roomH = model.plan.rows * cell;
  const available = model.plan.benches.filter(b => !occupied.has(b.id));
  const suggested = [], unavailable = [];

  // Empty benches that can take this footprint, walls first, then corners.
  const ranked = fit => available.flatMap(bench => {
    const f = model.frames.get(bench.id), fits = fit(bench, f);
    if (!fits) return [];
    const dx = Math.max(0, Math.min(f.xFt, roomW - f.xFt - f.wFt));
    const dy = Math.max(0, Math.min(f.yFt, roomH - f.yFt - f.hFt));
    return [{ bench, frame: f, fits, wallDistanceFt: Math.min(dx, dy), cornerDistanceFt: dx + dy }];
  }).sort((a, b) => a.wallDistanceFt - b.wallDistanceFt || a.cornerDistanceFt - b.cornerDistanceFt || a.bench.id.localeCompare(b.bench.id));
  const take = (unit, picked, fields) => {
    available.splice(available.findIndex(b => b.id === picked.bench.id), 1);
    suggested.push({ instanceId: unit.instanceId, equipmentId: unit.equipmentId, name: unit.name ?? unit.equipmentId,
      benchId: picked.bench.id, zoneId: picked.bench.zoneId, wallDistanceFt: picked.wallDistanceFt, cornerDistanceFt: picked.cornerDistanceFt,
      reclaimedAreaSqFt: picked.frame.wFt * picked.frame.hFt, workingSpacePctRetained: model.plan.options.workingSpacePct, requiresReview: true, ...fields });
  };

  const instruments = model.equipment.filter(u => u.placement === "bench" && unplacedBench.has(u.instanceId) && BENCH_REPLACING.test(label(u)));
  for (const unit of instruments) {
    if (!measured(unit)) { unavailable.push({ instanceId: unit.instanceId, reason: "Measured dimensions are needed before suggesting a bench to replace." }); continue; }
    // Never rotated: its width runs along the bench and its front faces the
    // bench's technician side. A little extra depth may reach into the
    // bench's own access strip, never past it.
    const options = ranked((bench, f) => {
      if (bench.zoneId !== unit.zoneId || unit.widthFt > f.lengthFt + 1e-8) return null;
      const overhangFt = Math.max(0, unit.depthFt - f.depthFt);
      const a = bench.accessRect, accessDepthFt = a ? (f.facing === "N" || f.facing === "S" ? a.height : a.width) * cell : 0;
      return overhangFt <= accessDepthFt + 1e-8 ? { overhangFt } : null;
    });
    if (!options.length) { unavailable.push({ instanceId: unit.instanceId, reason: `No entirely empty ${unit.zoneId} bench is long enough to be replaced by it.` }); continue; }
    const picked = options[0], overhangIn = Math.round(picked.fits.overhangFt * 12 * 10) / 10;
    take(unit, picked, { kind: "bench-replacement", footprintWidthFt: unit.widthFt, footprintDepthFt: unit.depthFt, rotationDegrees: FACING_ROTATION[picked.bench.facing], frontOverhangIn: overhangIn,
      reason: `Replaces empty bench ${picked.bench.id} of its own zone; it is too deep to stand on a bench top.${overhangIn > 0 ? ` Its front stands ${overhangIn}" past the bench's front edge, inside that bench's access strip.` : ""}`,
      review: "Confirm bench removal, the robot's service clearances, power/network, floor loading and safe access in Cirrus before applying. Not included in any route total." });
  }

  const cold = model.equipment.filter(u => u.placement === "floor" && !floorPlaced.has(u.instanceId) && COLD_STORAGE.test(label(u)));
  for (const unit of cold) {
    if (!measured(unit)) { unavailable.push({ instanceId: unit.instanceId, reason: "Measured fridge/freezer dimensions are needed before suggesting a bench." }); continue; }
    const options = ranked((bench, f) => [[unit.widthFt, unit.depthFt, 0], [unit.depthFt, unit.widthFt, 90]].find(([w, h]) => w <= f.wFt + 1e-8 && h <= f.hFt + 1e-8));
    if (!options.length) { unavailable.push({ instanceId: unit.instanceId, reason: "No unused bench footprint fits this fridge/freezer." }); continue; }
    const picked = options[0];
    // Working space is reserved on each retained bench, not a licence to use
    // its free working surface for storage. Only an entirely empty top qualifies.
    take(unit, picked, { kind: "cold-storage", footprintWidthFt: picked.fits[0], footprintDepthFt: picked.fits[1], rotationDegrees: picked.fits[2],
      reason: "Bench is entirely unused. All occupied benches retain their required working-space share; existing aisle cells are preserved.",
      review: "Confirm removal, door swing, ventilation/service clearances, utilities and safe access in Cirrus before applying. No placement or route change is applied here." });
  }
  return { mode: "suggestions-only", suggestions: suggested, unavailable,
    eligibleEquipment: "Unplaced Hamilton STAR liquid handlers (an empty bench of their own zone) and unplaced floor fridges/freezers, all with measured dimensions" };
}
