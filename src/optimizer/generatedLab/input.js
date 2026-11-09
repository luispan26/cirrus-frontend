import { buildWalkingGraph, cellKey, rectCells } from "./geometry.js";
import { benchFrame, footprint, FACING_ROTATION, offsetFromFootprint, replacesBench, rulesOf } from "./benchRules.js";

export class InputError extends Error {
  constructor(diagnostics) { super(diagnostics.map(d => `${d.path}: ${d.message}`).join("\n")); this.name = "InputError"; this.diagnostics = diagnostics; }
}
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const id = v => typeof v === "string" && v.trim().length > 0;
const finite = v => typeof v === "number" && Number.isFinite(v);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
export function parseJson(text, label = "JSON") {
  try { return JSON.parse(text); } catch (e) { throw new InputError([{ path: label, message: e.message }]); }
}

export const RULE_TYPES = ["notSameBench", "sameBench", "maxWalkFt", "minWalkFt"];
export const WALK_RULE_TYPES = ["maxWalkFt", "minWalkFt"];

// Accept the downloaded document, report.generated_layout wrapper, the
// LabLayout record ({ layoutId, revision, data }), a bare plan, or the
// optimizer envelope. A companion scenario cannot replace geometry.
export function unwrapInput(input, companion = {}) {
  const envelope = input?.optimizerSchemaVersion !== undefined ? input : {};
  let layout = envelope.layout ?? input;
  let source = envelope.source ?? {};
  const wrapper = layout?.data?.generated_layout ?? layout?.generated_layout ?? (layout?.data?.plan ? layout : null);
  if (wrapper) { source = { layoutId: wrapper.layoutId, revision: wrapper.revision, ...source }; layout = wrapper.data; }
  if (layout?.aisle && layout?.benches) layout = { plan: layout };
  if (companion?.source) {
    for (const field of ["layoutId", "revision", "layoutHash"]) {
      if (source[field] !== undefined && companion.source[field] !== undefined && source[field] !== companion.source[field]) throw new InputError([{ path: `source.${field}`, message: "Companion scenario refers to a different source layout." }]);
    }
    source = { ...source, ...companion.source };
  }
  return { ...envelope, ...companion, source, layout };
}

export function normalizeInput(input, companion = {}, { geometryOnly = false } = {}) {
  const raw = unwrapInput(input, companion), errors = [], warnings = [];
  const fail = (path, message) => errors.push({ path, message });
  const check = () => { if (errors.length) throw new InputError(errors); };
  if (!object(input) || !object(companion)) fail("input", "Expected JSON objects.");
  if (raw.settings !== undefined && !object(raw.settings)) fail("settings", "Expected an object.");
  if (!object(raw.source)) fail("source", "Expected an object.");
  if (raw.optimizerSchemaVersion !== undefined && raw.optimizerSchemaVersion !== 1) fail("optimizerSchemaVersion", "Only version 1 is supported.");
  if (raw.source?.hashAlgorithm !== undefined && raw.source.hashAlgorithm !== "sha256-canonical-json-v1") fail("source.hashAlgorithm", "Unsupported layout hashing scheme.");
  const plan = raw.layout?.plan;
  if (!object(plan)) fail("layout.plan", "Expected a Cirrus layout document containing plan.");
  check();

  // ---- Geometry -----------------------------------------------------------
  if (plan.version !== 1) fail("plan.version", "Only plan version 1 is supported.");
  if (!finite(plan.gridInches) || plan.gridInches <= 0) fail("plan.gridInches", "Expected a positive cell size.");
  if (![plan.rows, plan.columns].every(n => Number.isInteger(n) && n > 0) || plan.rows * plan.columns > 250000) fail("plan", "Room must have positive integer rows/columns and at most 250,000 cells.");
  for (const key of ["benches", "zones", "floorItems"]) if (!Array.isArray(plan[key])) fail(`plan.${key}`, "Expected an array.");
  for (const key of ["aisle", "obstacles", "unusedFloor", "doorClearance"]) if (!Array.isArray(plan[key]?.cells)) fail(`plan.${key}.cells`, "Expected a cell array.");
  if (!finite(plan.options?.workingSpacePct) || plan.options.workingSpacePct < 20 || plan.options.workingSpacePct > 50) fail("plan.options.workingSpacePct", "Expected a number from 20 to 50.");
  check();
  const inBounds = cell => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger) && cell[0] >= 0 && cell[0] < plan.rows && cell[1] >= 0 && cell[1] < plan.columns;
  const validRect = r => object(r) && [r.row, r.column, r.width, r.height].every(Number.isInteger) && r.width > 0 && r.height > 0 && inBounds([r.row, r.column]) && inBounds([r.row + r.height - 1, r.column + r.width - 1]);
  function ids(items, path) {
    const found = new Set();
    items.forEach((item, i) => { if (!id(item?.id) || found.has(item.id)) fail(`${path}[${i}].id`, "Expected a unique nonempty ID."); else found.add(item.id); });
    return found;
  }
  const benchIds = ids(plan.benches, "plan.benches"), zoneIds = ids(plan.zones, "plan.zones");
  const occupancy = new Map();
  function occupy(cell, category) {
    const key = cellKey(cell);
    if (occupancy.has(key)) { if (errors.length < 40) fail(category, `Cell ${key} also occurs in ${occupancy.get(key)}.`); }
    else occupancy.set(key, category);
  }
  // doorClearance.aisleCells are a subset of the aisle, not a sixth category.
  for (const category of ["aisle", "obstacles", "unusedFloor", "doorClearance"]) {
    for (const cell of plan[category].cells) {
      if (!inBounds(cell)) { fail(`plan.${category}`, "Out-of-bounds or invalid cell."); break; }
      occupy(cell, `plan.${category}`);
    }
  }
  const aisle = new Set(plan.aisle.cells.filter(inBounds).map(cellKey));
  if (plan.doorClearance.aisleCells !== undefined && (!Array.isArray(plan.doorClearance.aisleCells) || plan.doorClearance.aisleCells.some(c => !inBounds(c) || !aisle.has(cellKey(c))))) fail("plan.doorClearance.aisleCells", "Door clearance crossed by an aisle must also be aisle.");
  for (const [i, bench] of plan.benches.entries()) {
    const path = `plan.benches[${i}]`;
    if (!validRect(bench?.rect) || !validRect(bench?.accessRect)) { fail(path, "Bench and access rectangles must be nonempty integer rectangles inside the room."); continue; }
    if (!zoneIds.has(bench.zoneId)) fail(path + ".zoneId", "Unknown zone.");
    if (!["N", "S", "E", "W"].includes(bench.facing)) fail(path + ".facing", "Expected N, S, E or W.");
    for (const cell of rectCells(bench.rect)) occupy(cell, path);
    if ([...rectCells(bench.accessRect)].some(c => !aisle.has(cellKey(c)))) fail(path + ".accessRect", "Every access cell must belong to the aisle.");
    const b = bench.rect, a = bench.accessRect;
    const meets = { N: a.row + a.height === b.row && a.column <= b.column && a.column + a.width >= b.column + b.width,
      S: a.row === b.row + b.height && a.column <= b.column && a.column + a.width >= b.column + b.width,
      W: a.column + a.width === b.column && a.row <= b.row && a.row + a.height >= b.row + b.height,
      E: a.column === b.column + b.width && a.row <= b.row && a.row + a.height >= b.row + b.height };
    if (!meets[bench.facing]) fail(path + ".accessRect", "Access strip must adjoin and cover the bench's facing edge.");
  }
  if (occupancy.size !== plan.rows * plan.columns) fail("plan", "Bench, aisle, obstacle, unused-floor and door-clearance cells must partition the room.");
  for (const [i, zone] of plan.zones.entries()) {
    if (!Array.isArray(zone?.benchIds) || !Array.isArray(zone?.equipment)) { fail(`plan.zones[${i}]`, "Expected benchIds and equipment arrays."); continue; }
    const listed = new Set(zone.benchIds);
    if (listed.size !== zone.benchIds.length || [...listed].some(b => !benchIds.has(b)) || plan.benches.some(b => listed.has(b.id) !== (b.zoneId === zone.id))) fail(`plan.zones[${i}].benchIds`, "Zone bench lists must match benches[].zoneId exactly.");
  }
  check();
  const graph = buildWalkingGraph(plan);
  if (!graph.connected) fail("plan.aisle", "Aisle must be one nonempty four-connected component.");
  check();
  if (geometryOnly) return { layout: clone(raw.layout), plan: clone(plan), source: clone(raw.source ?? {}), graph };

  // ---- Inventory ----------------------------------------------------------
  const rules = rulesOf(plan);
  for (const field of ["benchLengthFt", "benchDepthFt", "gapFt", "frontStripCountsBelowDepthFt"]) if (!finite(rules[field]) || rules[field] <= 0) fail(`plan.benchRules.${field}`, "Expected a positive finite dimension.");
  for (const field of ["lengthFt", "depthFt"]) if (!finite(rules.pipetteArea[field]) || rules.pipetteArea[field] <= 0) fail(`plan.benchRules.pipetteArea.${field}`, "Expected a positive finite dimension.");
  if (![1, 2].includes(rules.pipetteArea.maxPerArea)) fail("plan.benchRules.pipetteArea.maxPerArea", "Only one or two pipettes per area are supported.");
  if (!Array.isArray(rules.pipetteArea.equipmentIds) || rules.pipetteArea.equipmentIds.some(e => !id(e))) fail("plan.benchRules.pipetteArea.equipmentIds", "Expected catalog IDs.");
  for (const [field, expected] of Object.entries({ oneRowPerBench: true, neverRotated: true, pushedTo: "back", gapsCountAsWorkingSpace: false })) if (rules[field] !== undefined && rules[field] !== expected) fail(`plan.benchRules.${field}`, "Unsupported bench rule semantics.");
  for (const b of plan.benches) {
    const f = benchFrame(plan, b);
    if (Math.abs(f.depthFt - rules.benchDepthFt) > 1e-6) fail(b.id, "Bench depth must match benchRules.benchDepthFt for working-space accounting.");
  }
  check();
  const pipetteIds = new Set(rules.pipetteArea.equipmentIds);
  const catalog = object(raw.equipmentCatalog) ? raw.equipmentCatalog : {};
  const notes = [];
  const inventory = new Map(), derived = [];
  function collect(item, zoneId, path, placement) {
    if (!object(item) || !id(item.equipmentId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) { fail(path, "Expected equipmentId and positive integer quantity (at most 10,000)."); return; }
    if (item.placement !== placement || typeof item.fixed !== "boolean" || typeof item.placeholderSize !== "boolean") fail(path, "Expected placement, fixed and placeholderSize from the generator contract.");
    const key = JSON.stringify([zoneId, item.equipmentId, placement]);
    if (inventory.has(key)) { fail(path, "Duplicate inventory row; combine quantities explicitly."); return; }
    inventory.set(key, item);
    for (let n = 1; n <= item.quantity; n++) derived.push({ ...item, quantity: undefined, zoneId, instanceId: `${zoneId ?? "floor"}:${item.equipmentId}:${n}` });
  }
  plan.zones.forEach((z, i) => z.equipment.forEach((item, j) => collect(item, z.id, `plan.zones[${i}].equipment[${j}]`, "bench")));
  plan.floorItems.forEach((item, i) => collect(item, item.zoneId ?? null, `plan.floorItems[${i}]`, "floor"));
  check();
  if (derived.length > 10000) fail("equipmentInstances", "At most 10,000 units are supported.");
  const units = raw.equipmentInstances ?? derived;
  if (!Array.isArray(units)) fail("equipmentInstances", "Expected an array.");
  const protocols = raw.protocols ?? [], runs = raw.protocolRuns ?? [], constraints = raw.constraints ?? [];
  for (const [key, value] of Object.entries({ protocols, protocolRuns: runs, constraints })) if (!Array.isArray(value)) fail(key, "Expected an array.");
  check();
  const settings = { validationMode: "strict", maxEvaluations: 50000, restarts: 2, seed: 1, unresolvedVisits: "block", ...raw.settings };
  settings.optimizerBalance = raw.settings?.optimizerBalance ?? plan.options.optimizerBalance ?? 0.5;
  if (!["strict", "exploratory"].includes(settings.validationMode)) fail("settings.validationMode", "Expected strict or exploratory.");
  if (!Number.isInteger(settings.maxEvaluations) || settings.maxEvaluations < 1 || settings.maxEvaluations > 1000000) fail("settings.maxEvaluations", "Expected an integer from 1 to 1,000,000.");
  if (!Number.isInteger(settings.restarts) || settings.restarts < 0 || settings.restarts > 50) fail("settings.restarts", "Expected an integer from 0 to 50.");
  if (!Number.isInteger(settings.seed)) fail("settings.seed", "Expected an integer seed.");
  if (!finite(settings.optimizerBalance) || settings.optimizerBalance < 0 || settings.optimizerBalance > 1) fail("settings.optimizerBalance", "Expected a number from 0 (soft constraints) to 1 (walking distance).");
  if (!["block", "exclude"].includes(settings.unresolvedVisits)) fail("settings.unresolvedVisits", "Expected block or exclude.");
  if (settings.routingPolicy !== undefined && settings.routingPolicy !== "aisle4-per-bench-v3") fail("settings.routingPolicy", "Unsupported routing policy; remap with aisle4-per-bench-v3.");
  settings.timeLimitMs = raw.settings?.timeLimitMs ?? 30000;
  if (!Number.isInteger(settings.timeLimitMs) || settings.timeLimitMs < 100 || settings.timeLimitMs > 600000) fail("settings.timeLimitMs", "Expected an integer from 100 to 600,000 milliseconds (10 minutes).");
  const counts = new Map(), seen = new Set();
  const equipment = units.map((unit, i) => {
    const path = `equipmentInstances[${i}]`;
    if (!object(unit)) { fail(path, "Expected an object."); return {}; }
    const key = JSON.stringify([unit.placement === "floor" ? (plan.floorItems.find(f => f.equipmentId === unit.equipmentId)?.zoneId ?? null) : unit.zoneId, unit.equipmentId, unit.placement]);
    const row = inventory.get(key);
    if (!row) fail(path, "Unit does not match the layout's zone inventory.");
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const u = { ...row, ...unit };
    delete u.quantity; // Quantity belongs to inventory rows, never physical units.
    // Floor equipment is placed by hand in Cirrus and is outside the
    // optimizer: always immovable, whatever its catalog flag says.
    if (u.placement === "floor") u.fixed = true;
    if (!id(u.instanceId) || seen.has(u.instanceId)) fail(path + ".instanceId", "Expected a unique unit ID.");
    seen.add(u.instanceId);
    if (row?.fixed && !u.fixed) fail(path + ".fixed", "Cannot unlock a unit fixed by the generator.");
    if (typeof u.fixed !== "boolean" || typeof u.placeholderSize !== "boolean") fail(path, "fixed and placeholderSize must be booleans.");
    if (u.zoneId !== null && !zoneIds.has(u.zoneId)) fail(path + ".zoneId", "Unknown zone.");
    // Measured sizes from the Cirrus catalog (MongoDB) replace a placeholder
    // size in the export; real sizes in the export are kept, since the
    // layout was generated around them.
    const measured = catalog[u.equipmentId];
    if (measured && u.placeholderSize && measured.needsDimensions === false && [measured.widthFt, measured.depthFt].every(n => finite(n) && n > 0)) {
      u.widthFt = measured.widthFt; u.depthFt = measured.depthFt; u.heightFt = measured.heightFt ?? u.heightFt;
      u.placeholderSize = false; u.dimensionsFrom = "catalog";
    }
    if (measured?.name && !u.name) u.name = measured.name;
    u.pipette = pipetteIds.has(u.equipmentId);
    u.replacesBench = u.placement === "bench" && replacesBench(rules, u, plan.options.workingSpacePct);
    return u;
  });
  for (const [key, item] of inventory) if (counts.get(key) !== item.quantity) fail("equipmentInstances", `Unit counts must match inventory: ${key}.`);
  const refreshed = equipment.filter(u => u.dimensionsFrom === "catalog");
  if (refreshed.length) notes.push({ path: "equipmentCatalog", message: `${new Set(refreshed.map(u => u.equipmentId)).size} placeholder size(s) replaced with measured sizes from the Cirrus catalog.` });
  for (const u of equipment) {
    if (u.placement === "floor") continue; // Floor footprints come from their manual placement.
    if (![u.widthFt, u.depthFt].every(n => finite(n) && n > 0)) {
      fail(u.instanceId, "Missing positive numeric dimensions; measure it in the Cirrus catalog or supply equipmentInstances.");
    }
    if (u.placeholderSize) {
      if (settings.validationMode === "strict") fail(u.instanceId, "Placeholder dimensions: measure it in the Cirrus catalog or allow placeholder sizes (exploratory).");
      else warnings.push({ path: u.instanceId, message: "Exploratory dimensions; physical fit is unverified." });
    }
  }

  // ---- Protocols and runs ---------------------------------------------------
  const protocolIds = ids(protocols, "protocols");
  ids(runs, "protocolRuns");
  for (const [i, p] of protocols.entries()) {
    if (!Array.isArray(p?.steps) || !p.steps.length) { fail(`protocols[${i}].steps`, "Expected an ordered, nonempty visit array."); continue; }
    ids(p.steps, `protocols[${i}].steps`);
    if (p.zoneIds !== undefined && (!Array.isArray(p.zoneIds) || p.zoneIds.some(z => !zoneIds.has(z)))) fail(`protocols[${i}].zoneIds`, "Unknown execution zone.");
    for (const [j, step] of p.steps.entries()) {
      const path = `protocols[${i}].steps[${j}]`;
      const set = step?.equipmentIds;
      if (set !== undefined && (!Array.isArray(set) || !set.length || set.some(e => !id(e)) || new Set(set).size !== set.length)) fail(path, "equipmentIds must be a nonempty list of distinct catalog IDs.");
      if ((set === undefined) === !id(step?.equipmentId)) fail(path, "Each step needs one equipmentId, or equipmentIds for a step using several pieces of equipment in any order.");
      if (step?.instanceId !== undefined && (set !== undefined || !seen.has(step.instanceId))) fail(path + ".instanceId", "Unknown unit (instance binding only applies to single-equipment steps).");
      if (["branches", "parallel", "substeps"].some(k => step?.[k] !== undefined)) fail(path, "Only linear steps are supported; expand operations into ordered steps.");
    }
    if (["branches", "parallel", "start", "end", "startCell", "endCell"].some(k => p?.[k] !== undefined)) fail(`protocols[${i}]`, "Branches and explicit route endpoints are not supported yet.");
  }
  const periods = new Set();
  runs.forEach((r, i) => {
    const path = `protocolRuns[${i}]`;
    if (!protocolIds.has(r?.protocolId) || !zoneIds.has(r?.zoneId)) fail(path, "Unknown protocol or execution zone.");
    if (!finite(r?.runsPerPeriod) || r.runsPerPeriod < 0) fail(path + ".runsPerPeriod", "Expected a nonnegative finite frequency.");
    if (!["day", "week", "month"].includes(r?.period)) fail(path + ".period", "Expected day, week or month.");
    periods.add(r?.period);
    const p = protocols.find(p => p.id === r?.protocolId);
    if (p?.zoneIds && !p.zoneIds.includes(r.zoneId)) fail(path + ".zoneId", "Protocol is not mapped to this zone.");
  });
  if (periods.size > 1) fail("protocolRuns", "Use one common frequency period; no implicit conversion is performed.");

  // ---- Equipment relations (hard rules and soft preferences) ----------------
  const equipmentIds = new Set(equipment.map(u => u.equipmentId));
  ids(constraints, "constraints");
  constraints.forEach((c, i) => {
    const path = `constraints[${i}]`;
    if (!RULE_TYPES.includes(c?.type)) { fail(path + ".type", `Supported rule types: ${RULE_TYPES.join(", ")}. Unsupported rules cannot be ignored.`); return; }
    if (!["hard", "soft"].includes(c.severity)) fail(path + ".severity", "Expected hard or soft.");
    // [A, B]: B may be a list (any of those types).
    const bs = Array.isArray(c.equipmentIds) ? [c.equipmentIds[1]].flat() : [];
    if (!Array.isArray(c.equipmentIds) || c.equipmentIds.length !== 2 || !equipmentIds.has(c.equipmentIds[0]) || !bs.length || bs.some(e => !equipmentIds.has(e))) fail(path + ".equipmentIds", "Expected [A, B] catalog equipment IDs present in this lab (B may be a list, any of which counts).");
    if (WALK_RULE_TYPES.includes(c.type) && (!finite(c.distanceFt) || c.distanceFt <= 0)) fail(path + ".distanceFt", "Expected a positive walking distance in feet.");
    if (c.severity === "soft" && c.weight !== undefined && (!finite(c.weight) || c.weight <= 0)) fail(path + ".weight", "Expected a positive weight.");
  });
  check();

  // ---- Supplied placements (Cirrus initialEquipment, or a companion) --------
  const byId = new Map(equipment.map(u => [u.instanceId, u]));
  const benchById = new Map(plan.benches.map(b => [b.id, b]));
  const frames = new Map(plan.benches.map(b => [b.id, benchFrame(plan, b)]));
  const supplied = raw.initialPlacements ?? plan.initialEquipment?.placements ?? [];
  const suppliedAreas = raw.initialWorkAreas ?? plan.initialEquipment?.workAreas ?? [];
  if (!Array.isArray(supplied) || !Array.isArray(suppliedAreas)) fail("initialPlacements", "Expected arrays of placements and work areas.");
  check();
  const workAreas = new Map();
  suppliedAreas.forEach((a, i) => {
    const frame = frames.get(a?.benchId);
    if (!id(a?.id) || workAreas.has(a.id) || !frame || !finite(a.offsetFt) || !Array.isArray(a.instanceIds)) { fail(`initialWorkAreas[${i}]`, "Expected id, benchId, offsetFt and instanceIds."); return; }
    if (a.lengthFt !== undefined && Math.abs(a.lengthFt - rules.pipetteArea.lengthFt) > 1e-6) fail(`initialWorkAreas[${i}].lengthFt`, "Work area length must match the pipette bench rule.");
    if (!a.instanceIds.length || new Set(a.instanceIds).size !== a.instanceIds.length || a.instanceIds.some(id => !byId.get(id)?.pipette)) fail(`initialWorkAreas[${i}].instanceIds`, "Expected distinct pipette instance IDs.");
    workAreas.set(a.id, { id: a.id, benchId: a.benchId, offsetFt: a.offsetFt, lengthFt: rules.pipetteArea.lengthFt, instanceIds: [...a.instanceIds] });
  });
  const placements = [];
  const placedIds = new Set();
  supplied.forEach((p, i) => {
    const path = `initialPlacements[${i}]`;
    const u = byId.get(p?.instanceId);
    if (!u) { fail(path, "Unknown instanceId."); return; }
    if (placedIds.has(u.instanceId)) { fail(path, "Duplicate placement for one instance."); return; }
    placedIds.add(u.instanceId);
    if (p.fixed === true && !u.fixed) fail(path, "Anchored placement cannot be unlocked by inventory.");
    if ((p.equipmentId !== undefined && p.equipmentId !== u.equipmentId) || (p.zoneId !== undefined && p.zoneId !== u.zoneId)) fail(path, "Placement identity/zone disagrees with inventory.");
    if (u.placement === "floor") {
      // Never block on a hand placement the optimizer does not own; an
      // unusable one just leaves the unit unplaced (its visits unresolved).
      const spanXFt = p.spanXFt ?? p.widthFt ?? u.widthFt, spanYFt = p.spanYFt ?? p.depthFt ?? u.depthFt;
      if (p.benchId !== null || ![p.xFt, p.yFt].every(finite) || !inBounds(p.accessCell) || ![spanXFt, spanYFt].every(n => finite(n) && n > 0)) {
        notes.push({ path: u.instanceId, message: "Floor placement has no usable footprint or aisle accessCell; left out." });
        return;
      }
      placements.push({ instanceId: u.instanceId, benchId: null, xFt: p.xFt, yFt: p.yFt, spanXFt, spanYFt, accessCell: p.accessCell });
      return;
    }
    const frame = frames.get(p.benchId);
    if (!frame) { fail(path + ".benchId", "Unknown bench."); return; }
    // A size change from the catalog moves a movable unit back into the
    // pool to be re-placed; a fixed anchor can never be resized.
    const sizeChanged = finite(p.widthFt) && finite(p.depthFt) && (Math.abs(p.widthFt - u.widthFt) > 1e-6 || Math.abs(p.depthFt - u.depthFt) > 1e-6);
    if (sizeChanged) {
      if (u.fixed) fail(path, `Fixed ${u.name ?? u.equipmentId} was placed at ${p.widthFt} × ${p.depthFt} ft but inventory says ${u.widthFt} × ${u.depthFt} ft; regenerate the layout in Cirrus.`);
      else notes.push({ path: u.instanceId, message: "Size changed since the layout was generated; it is placed again." });
      return;
    }
    let offsetFt = p.offsetFt;
    if (!finite(offsetFt)) {
      const area = p.workAreaId ? workAreas.get(p.workAreaId) : null;
      offsetFt = area ? null : finite(p.xFt) && finite(p.yFt) ? offsetFromFootprint(frame, p, u.widthFt, u.depthFt) : null;
      if (offsetFt === null && !area) {
        if (u.fixed) fail(path, "Fixed placement predates the one-row bench rules (not pushed to the back); regenerate the layout in Cirrus.");
        else notes.push({ path: u.instanceId, message: "Placement predates the one-row bench rules; it is placed again." });
        return;
      }
    }
    if (p.workAreaId) {
      const area = workAreas.get(p.workAreaId);
      const member = area?.instanceIds.indexOf(u.instanceId) ?? -1;
      if (!area || member < 0 || area.benchId !== p.benchId) { fail(path, "Pipette placement must match its work area membership and bench."); return; }
      const expectedOffset = member === 0 ? area.offsetFt : area.offsetFt + area.lengthFt - u.widthFt;
      if (finite(offsetFt) && Math.abs(offsetFt - expectedOffset) > 1e-6) fail(path, "Pipette offset disagrees with its work area.");
      offsetFt = expectedOffset;
    } else if (u.pipette) { fail(path, "Pipettes require a supplied work area or an omitted placement for first-fit."); }
    const expected = { ...footprint(frame, offsetFt, u.widthFt, u.depthFt), rotationDegrees: FACING_ROTATION[frame.facing] };
    for (const [field, value] of Object.entries(expected)) if (p[field] !== undefined && (!finite(p[field]) || Math.abs(p[field] - value) > 1e-6)) fail(path + "." + field, "Coordinates/orientation disagree with bench, offset and equipment dimensions; regenerate or correct this placement.");
    placements.push({ instanceId: u.instanceId, benchId: p.benchId, offsetFt, ...(p.workAreaId ? { workAreaId: p.workAreaId } : {}) });
  });
  for (const p of placements) if (p.workAreaId && !workAreas.has(p.workAreaId)) fail(p.instanceId, "Placement names a pipette work area that is not supplied.");
  for (const area of workAreas.values()) if (area.instanceIds.some(id => !placements.some(p => p.instanceId === id && p.workAreaId === area.id))) fail(area.id, "Every work area member must have a matching placement.");
  check();
  for (const u of plan.initialEquipment?.unplaced ?? []) notes.push({ path: u.instanceId, message: `Cirrus could not place it: ${u.reason}` });
  if (!runs.length) warnings.push({ path: "protocolRuns", message: "No protocol runs supplied. Geometry/placement can be inspected, but optimization needs protocols." });

  const units_ = clone(equipment);
  return {
    optimizerSchemaVersion: 1, layout: clone(raw.layout), plan: clone(plan), source: clone(raw.source ?? {}), rules,
    equipment: units_, unitById: new Map(units_.map(u => [u.instanceId, u])),
    initialPlacements: placements, initialWorkAreas: [...workAreas.values()],
    protocols: clone(protocols), protocolRuns: clone(runs), constraints: clone(constraints), settings, warnings, notes,
    graph, benchById, frames, databaseNotes: clone(raw.databaseNotes ?? []),
  };
}
