// Equipment placement under the Cirrus bench rules (benchRules.js). A bench
// holds one row of "stretches" along its length: a single item, or a pipette
// work area (3 ft of full-depth working space holding one or two pipettes)
// that always moves as one piece. A placement is therefore just
// (benchId, offsetFt); room coordinates follow from the bench.
import { InputError } from "./input.js";
import { EPS, benchAccessCell, cellKey } from "./geometry.js";
import { FACING_ROTATION, benchRuleIssues, footprint, misfit, usedSqFt } from "./benchRules.js";

const sortedKeys = keys => [...keys].sort((a, b) => a.localeCompare(b));

// ---- State -----------------------------------------------------------------
// { segments: Map<key, Segment>, owner: Map<instanceId, key>, floor: Map<instanceId, FloorPlacement>, unplaced: [{instanceId, reason}] }
// Segment: { key, benchId, zoneId, offsetFt, lengthFt, usedSqFt, instanceIds, workArea, fixed }

export function itemSegment(model, unit, benchId, offsetFt) {
  // Equipment replacing a bench takes the whole bench (benchRules.js).
  if (unit.replacesBench) return { key: unit.instanceId, benchId, zoneId: unit.zoneId, offsetFt: 0, lengthFt: model.rules.benchLengthFt, usedSqFt: 0, instanceIds: [unit.instanceId], workArea: false, fixed: unit.fixed, replacement: true };
  return { key: unit.instanceId, benchId, zoneId: unit.zoneId, offsetFt, lengthFt: unit.widthFt, usedSqFt: usedSqFt(model.rules, unit.widthFt, unit.depthFt), instanceIds: [unit.instanceId], workArea: false, fixed: unit.fixed };
}
export function areaSegment(model, key, units, benchId, offsetFt, lengthFt = model.rules.pipetteArea.lengthFt) {
  return { key, benchId, zoneId: units[0].zoneId, offsetFt, lengthFt, usedSqFt: 0, instanceIds: units.map(u => u.instanceId), workArea: true, fixed: units.some(u => u.fixed) };
}
function withOwners(segments, floor, unplaced) {
  const owner = new Map();
  for (const s of segments.values()) for (const id of s.instanceIds) owner.set(id, s.key);
  return { segments, owner, floor, unplaced };
}
export function replaceSegments(state, changed) {
  const segments = new Map(state.segments);
  for (const s of changed) segments.set(s.key, s);
  return withOwners(segments, state.floor, state.unplaced);
}
export const segmentsOn = (state, benchId, except = null) => [...state.segments.values()].filter(s => s.benchId === benchId && s.key !== except);

// Does a stretch fit on its bench next to the others there?
export function fitsOn(model, others, candidate) {
  const frame = model.frames.get(candidate.benchId);
  return benchRuleIssues(model.rules, frame, model.plan.options.workingSpacePct, [...others, candidate]).length === 0;
}

// ---- Initial placement -------------------------------------------------------
// Keep every valid supplied placement (Cirrus's initialEquipment); pack
// whatever is missing first-fit like Cirrus does (fixed first, longer
// stretches first, each pipette in its own work area and pairs only when
// that places more). Anything that still does not fit stays explicitly
// unplaced, never silently dropped.
export function createInitialState(model) {
  const errors = [], segments = new Map(), floor = new Map(), unplaced = [];
  const units = model.unitById;
  const byArea = new Map();
  for (const p of model.initialPlacements) {
    const u = units.get(p.instanceId);
    if (p.benchId === null) { floor.set(u.instanceId, { ...p }); continue; }
    if (p.workAreaId) { (byArea.get(p.workAreaId) ?? byArea.set(p.workAreaId, []).get(p.workAreaId)).push(u); continue; }
    segments.set(u.instanceId, itemSegment(model, u, p.benchId, p.offsetFt));
  }
  for (const area of model.initialWorkAreas) {
    const members = (byArea.get(area.id) ?? []).sort((a, b) => area.instanceIds.indexOf(a.instanceId) - area.instanceIds.indexOf(b.instanceId));
    if (!members.length) continue;
    if (members.some(u => !u.pipette) || members.length > model.rules.pipetteArea.maxPerArea) errors.push({ path: area.id, message: `A pipette work area holds at most ${model.rules.pipetteArea.maxPerArea} pipettes and nothing else.` });
    segments.set(area.id, areaSegment(model, area.id, members, area.benchId, area.offsetFt, area.lengthFt));
  }
  for (const s of segments.values()) {
    const bench = model.benchById.get(s.benchId);
    if (bench.zoneId !== s.zoneId) errors.push({ path: s.key, message: `Placed on ${s.benchId} (${bench.zoneId}) but belongs to zone ${s.zoneId}.` });
    for (const id of s.instanceIds) { const reason = misfit(model.rules, units.get(id), model.frames.get(s.benchId)); if (reason) errors.push({ path: id, message: reason }); }
  }
  for (const benchId of new Set([...segments.values()].map(s => s.benchId))) {
    for (const message of benchRuleIssues(model.rules, model.frames.get(benchId), model.plan.options.workingSpacePct, segmentsOn({ segments }, benchId))) errors.push({ path: benchId, message: `Supplied placement breaks the bench rules: ${message}` });
  }
  const placed = new Set([...[...segments.values()].flatMap(s => s.instanceIds), ...floor.keys()]);
  const missing = model.equipment.filter(u => !placed.has(u.instanceId));
  for (const u of missing.filter(u => u.fixed && u.placement === "bench")) errors.push({ path: u.instanceId, message: "Fixed equipment needs its exact placement from Cirrus before optimizing; the optimizer never chooses one." });
  if (errors.length) throw new InputError(errors);

  for (const u of missing.filter(u => u.placement === "floor")) unplaced.push({ instanceId: u.instanceId, reason: "Floor-standing equipment is placed by hand in Cirrus; no location supplied." });
  for (const zone of model.plan.zones) {
    const benches = model.plan.benches.filter(b => b.zoneId === zone.id).sort((a, b) => a.id.localeCompare(b.id));
    const todo = [];
    for (const u of missing.filter(u => u.placement === "bench" && u.zoneId === zone.id && !u.fixed)) {
      const reason = misfit(model.rules, u);
      if (reason) unplaced.push({ instanceId: u.instanceId, reason }); else todo.push(u);
    }
    if (!todo.length) continue;
    const pipettes = todo.filter(u => u.pipette).sort((a, b) => a.widthFt - b.widthFt || a.instanceId.localeCompare(b.instanceId));
    const pairs = [];
    for (let i = 0; i + 1 < pipettes.length; i += 2) if (pipettes[i].widthFt + model.rules.gapFt + pipettes[i + 1].widthFt <= model.rules.pipetteArea.lengthFt + EPS) pairs.push([pipettes[i], pipettes[i + 1]]);
    let best = null;
    for (let n = 0; n <= pairs.length; n++) {
      const attempt = packZone(model, todo, pairs.slice(0, n), benches, segments);
      if (!best || attempt.missing.length < best.missing.length) best = attempt;
      if (!attempt.missing.length) break;
    }
    for (const s of best.added) segments.set(s.key, s);
    for (const u of best.missing) unplaced.push({ instanceId: u.instanceId, reason: 'No room left on this zone\'s benches with 3" gaps and the working-space share kept free.' });
  }
  unplaced.sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  return withOwners(segments, floor, unplaced);
}

function packZone(model, units, pairs, benches, existing) {
  const paired = new Set(pairs.flat());
  const pieces = [
    ...units.filter(u => !u.pipette).map(u => itemSegment(model, u, null, 0)),
    ...pairs.map(pair => areaSegment(model, `${pair[0].instanceId}:area`, pair, null, 0)),
    ...units.filter(u => u.pipette && !paired.has(u)).map(u => areaSegment(model, `${u.instanceId}:area`, [u], null, 0)),
  ].sort((a, b) => b.lengthFt - a.lengthFt || a.key.localeCompare(b.key));
  const onBench = new Map(benches.map(b => [b.id, [...existing.values()].filter(s => s.benchId === b.id)]));
  const added = [], missing = [];
  for (const piece of pieces) {
    let done = false;
    for (const b of benches) {
      const others = onBench.get(b.id);
      const offsets = [0, ...others.map(s => s.offsetFt + s.lengthFt + model.rules.gapFt)].sort((x, y) => x - y);
      const offsetFt = offsets.find(o => fitsOn(model, others, { ...piece, benchId: b.id, offsetFt: o }));
      if (offsetFt === undefined) continue;
      const s = { ...piece, benchId: b.id, offsetFt };
      others.push(s); added.push(s); done = true; break;
    }
    if (!done) missing.push(...piece.instanceIds.map(id => model.unitById.get(id)));
  }
  return { added, missing };
}

// ---- Coordinates and access ----------------------------------------------
export function segmentBox(model, seg) {
  return footprint(model.frames.get(seg.benchId), seg.offsetFt, seg.lengthFt, seg.workArea ? model.frames.get(seg.benchId).depthFt : model.unitById.get(seg.key).depthFt);
}
// Pipettes stand in the back corners of their work area: the first at its
// start, a second ending at its end.
function unitOffset(model, seg, instanceId) {
  if (!seg.workArea) return seg.offsetFt;
  const i = seg.instanceIds.indexOf(instanceId), u = model.unitById.get(instanceId);
  return i === 0 ? seg.offsetFt : seg.offsetFt + seg.lengthFt - u.widthFt;
}

// Aisle node each unit is used from. A pipette is used from its whole work
// area, so both pipettes in one area share its access point.
export function accessPoints(model, state) {
  const out = new Map();
  for (const seg of state.segments.values()) {
    const cell = benchAccessCell(model.plan, model.benchById.get(seg.benchId));
    const idx = model.graph.indexOf(cell);
    for (const id of seg.instanceIds) out.set(id, idx);
  }
  for (const [id, p] of state.floor) out.set(id, model.graph.indexOf(p.accessCell));
  return out;
}
export function segmentAccess(model, seg) {
  return model.graph.indexOf(benchAccessCell(model.plan, model.benchById.get(seg.benchId)));
}

// Cirrus-shaped placements (the plan.initialEquipment format) for export
// and drawing.
export function materialize(model, state) {
  const placements = [], workAreas = [];
  for (const seg of [...state.segments.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    const bench = model.benchById.get(seg.benchId), frame = model.frames.get(seg.benchId);
    if (seg.workArea) workAreas.push({ id: seg.key, benchId: seg.benchId, zoneId: seg.zoneId, offsetFt: seg.offsetFt, lengthFt: seg.lengthFt, ...segmentBox(model, seg), instanceIds: [...seg.instanceIds] });
    for (const id of seg.instanceIds) {
      const u = model.unitById.get(id), offsetFt = unitOffset(model, seg, id);
      placements.push({ instanceId: id, equipmentId: u.equipmentId, zoneId: u.zoneId, benchId: seg.benchId, name: u.name ?? u.equipmentId, fixed: u.fixed, placeholderSize: u.placeholderSize,
        widthFt: u.widthFt, depthFt: u.depthFt, ...footprint(frame, offsetFt, u.widthFt, u.depthFt), offsetFt, rotationDegrees: FACING_ROTATION[bench.facing], ...(seg.workArea ? { workAreaId: seg.key } : {}), ...(u.replacesBench ? { replacesBench: true } : {}) });
    }
  }
  for (const [id, p] of state.floor) {
    const u = model.unitById.get(id);
    placements.push({ instanceId: id, equipmentId: u.equipmentId, zoneId: u.zoneId, benchId: null, name: u.name ?? u.equipmentId, fixed: true, placeholderSize: u.placeholderSize, xFt: p.xFt, yFt: p.yFt, spanXFt: p.spanXFt, spanYFt: p.spanYFt, accessCell: p.accessCell });
  }
  placements.sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  return { placements, workAreas, unplaced: state.unplaced.map(u => ({ ...u, equipmentId: model.unitById.get(u.instanceId).equipmentId, zoneId: model.unitById.get(u.instanceId).zoneId })) };
}

// ---- Independent validation --------------------------------------------------
// Everything a returned placement must satisfy, checked from scratch.
export function stateIssues(model, state, anchorState) {
  const errors = [];
  const fail = (path, message) => errors.push({ path, message });
  const seen = new Map();
  for (const s of state.segments.values()) {
    const bench = model.benchById.get(s.benchId);
    if (!bench) { fail(s.key, "Unknown bench."); continue; }
    for (const id of s.instanceIds) {
      const u = model.unitById.get(id);
      if (seen.has(id)) fail(id, "Unit placed twice."); seen.set(id, s.key);
      if (u.zoneId !== bench.zoneId) fail(id, "Equipment must stay on a bench belonging to its zone.");
      const reason = misfit(model.rules, u, model.frames.get(s.benchId)); if (reason) fail(id, reason);
      if (s.workArea && !u.pipette) fail(id, "Only pipettes stand in a pipette work area.");
    }
    if (s.workArea && (s.instanceIds.length > model.rules.pipetteArea.maxPerArea || s.instanceIds.length < 1)) fail(s.key, "A work area holds one or two pipettes.");
    if (s.workArea && s.instanceIds.length === 2) {
      const [a, b] = s.instanceIds.map(id => model.unitById.get(id));
      if (a.widthFt + model.rules.gapFt + b.widthFt > s.lengthFt + EPS) fail(s.key, "Two pipettes do not fit in the back corners of this work area.");
    }
  }
  for (const benchId of new Set([...state.segments.values()].map(s => s.benchId))) {
    for (const message of benchRuleIssues(model.rules, model.frames.get(benchId), model.plan.options.workingSpacePct, segmentsOn(state, benchId))) fail(benchId, message);
  }
  const unplaced = new Set(state.unplaced.map(u => u.instanceId));
  for (const u of model.equipment) {
    const count = (seen.has(u.instanceId) ? 1 : 0) + (state.floor.has(u.instanceId) ? 1 : 0) + (unplaced.has(u.instanceId) ? 1 : 0);
    if (count !== 1) fail(u.instanceId, "Every unit must be placed or listed as unplaced exactly once.");
  }
  // Floor equipment is placed by hand in Cirrus and checked there; the
  // optimizer passes it through untouched.
  if (anchorState) {
    for (const seg of anchorState.segments.values()) if (seg.fixed) {
      const now = state.segments.get(seg.key);
      if (!now || now.benchId !== seg.benchId || Math.abs(now.offsetFt - seg.offsetFt) > EPS || now.instanceIds.join() !== seg.instanceIds.join()) fail(seg.key, "Fixed equipment moved.");
    }
    for (const [id, p] of anchorState.floor) if (JSON.stringify(state.floor.get(id)) !== JSON.stringify(p)) fail(id, "Manual floor placement changed.");
  }
  return errors;
}

// ---- Candidate moves -------------------------------------------------------
// Offsets worth trying for a stretch on a bench: flush against each end and
// each neighbour, plus every cell step along the bench (a technician's access
// point moves in cell steps). Only one offset per distinct access cell is
// kept — the rest walk identically.
export function relocations(model, state, seg) {
  const out = [];
  const zoneBenches = model.plan.benches.filter(b => b.zoneId === seg.zoneId).map(b => b.id).sort();
  const step = model.plan.gridInches / 12, gap = model.rules.gapFt;
  for (const benchId of zoneBenches) {
    const frame = model.frames.get(benchId), others = segmentsOn(state, benchId, seg.key);
    const offsets = new Set([0, frame.lengthFt - seg.lengthFt]);
    for (const o of others) { offsets.add(o.offsetFt + o.lengthFt + gap); offsets.add(o.offsetFt - gap - seg.lengthFt); }
    for (let x = 0; x + seg.lengthFt <= frame.lengthFt + EPS; x += step) offsets.add(x);
    const byAccess = new Set();
    for (const offsetFt of [...offsets].sort((a, b) => a - b)) {
      if (benchId === seg.benchId && Math.abs(offsetFt - seg.offsetFt) < EPS) continue;
      const moved = { ...seg, benchId, offsetFt };
      if (!fitsOn(model, others, moved)) continue;
      const access = segmentAccess(model, moved);
      if (byAccess.has(access)) continue;
      byAccess.add(access);
      out.push([moved]);
    }
  }
  return out;
}

// Exchange two stretches of one zone: each takes the other's spot (aligned
// to its start or its end), when both still fit.
export function swaps(model, state, a, b) {
  if (a.zoneId !== b.zoneId || a.fixed || b.fixed || (a.benchId === b.benchId && Math.abs(a.offsetFt - b.offsetFt) < EPS)) return [];
  const out = [];
  const tried = new Set();
  for (const [oa, ob] of [[b.offsetFt, a.offsetFt], [b.offsetFt + b.lengthFt - a.lengthFt, a.offsetFt + a.lengthFt - b.lengthFt]]) {
    const na = { ...a, benchId: b.benchId, offsetFt: oa }, nb = { ...b, benchId: a.benchId, offsetFt: ob };
    const sig = `${oa}|${ob}`;
    if (tried.has(sig)) continue;
    tried.add(sig);
    const next = replaceSegments(state, [na, nb]);
    if ([...new Set([a.benchId, b.benchId])].every(benchId => benchRuleIssues(model.rules, model.frames.get(benchId), model.plan.options.workingSpacePct, segmentsOn(next, benchId)).length === 0)) out.push([na, nb]);
  }
  return out;
}

export const segmentOrder = state => sortedKeys(state.segments.keys()).map(k => state.segments.get(k));
