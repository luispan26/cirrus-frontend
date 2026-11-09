// Builds the optimizer's protocol scenario from Cirrus database records —
// pure, no I/O (server/cirrusDb.js does the reading), so it runs the same in
// the browser, the CLI and tests.
//
// The lab JSON only says which protocols run there: plan.protocols =
// [{ protocolId, title, runsPerWeek }] (the questionnaire's selection). Each
// protocol's steps and step->equipment mapping come from the database at
// run time:
//   validatedprotocols  { protocolId, title, cellTypes } (older records: cellType)
//   stepequipmentmaps   { protocolId, stepId, stepNumber, equipmentId, canvasDeleted }
//   equipment           { equipmentId, name, widthFt, depthFt, heightFt, mounting, needsDimensions, ... }
// A step is every mapping row sharing a stepId; steps run in stepNumber
// order ("1.2" < "1.10" < "2.1"); several equipment on one step are visited
// in whatever order walks least (no order is stored). Rows Canvas no longer
// reports (canvasDeleted) are ignored.

// Questionnaire biomaterials (validatedprotocols.cellTypes) -> workflow
// zone: the first of these the plan has (Bacterial and Yeast zones; plans
// made before they were split have one Microbial zone).
export const CELL_TYPE_ZONES = { bacteria: ["bacterial", "microbial"], yeast: ["yeast", "microbial"], mammalian_adherent: ["mammalian"], mammalian_suspension: ["mammalian"], general: ["general"] };
// Cirrus tags a protocol with any number of cell types (cellTypes); records
// from before that change carry a single cellType.
export const cellTypesOf = v => Array.isArray(v?.cellTypes) ? v.cellTypes.map(String) : v?.cellType ? [String(v.cellType)] : [];

export function compareStepNumbers(a, b) {
  const pa = String(a ?? "").split(/[.\s]+/).map(Number), pb = String(b ?? "").split(/[.\s]+/).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? -1, y = pb[i] ?? -1;
    if (Number.isNaN(x) || Number.isNaN(y)) return String(a).localeCompare(String(b));
    if (x !== y) return x - y;
  }
  return 0;
}

// The plan's protocol references plus any added by hand, deduplicated.
export function protocolRefs(plan, extra = []) {
  const seen = new Set(), out = [];
  for (const r of [...(Array.isArray(plan?.protocols) ? plan.protocols : []), ...extra]) {
    if (!r?.protocolId || seen.has(String(r.protocolId))) continue;
    seen.add(String(r.protocolId));
    out.push({ protocolId: String(r.protocolId), title: String(r.title ?? "").trim(), runsPerWeek: Number(r.runsPerWeek ?? 0) });
  }
  return out;
}

// Every equipment ID the plan or the protocols mention, for the catalog read.
export function equipmentIdsOf(plan, stepEquipmentMaps = []) {
  return [...new Set([...(plan?.zones ?? []).flatMap(z => z.equipment.map(e => e.equipmentId)), ...(plan?.floorItems ?? []).map(e => e.equipmentId), ...stepEquipmentMaps.map(m => m.equipmentId)])].sort();
}

// overrides: { [protocolId]: { include?: boolean, runsPerWeek?: number, zoneId?: string } }
export function scenarioFromDatabase(plan, db, { overrides = {}, extraProtocols = [] } = {}) {
  const notes = [], protocols = [], protocolRuns = [], summaries = [];
  const zones = (plan?.zones ?? []).map(z => z.id);
  const inZone = new Map((plan?.zones ?? []).map(z => [z.id, new Set(z.equipment.map(e => e.equipmentId))]));
  const floor = new Set((plan?.floorItems ?? []).map(e => e.equipmentId));
  const nameOf = new Map([...(db.equipment ?? []).map(e => [e.equipmentId, e.name]), ...(plan?.zones ?? []).flatMap(z => z.equipment.map(e => [e.equipmentId, e.name]))].filter(([, n]) => n));
  const validated = new Map((db.validatedProtocols ?? []).map(v => [String(v.protocolId), v]));
  const rowsOf = new Map();
  for (const m of db.stepEquipmentMaps ?? []) if (!m.canvasDeleted) (rowsOf.get(String(m.protocolId)) ?? rowsOf.set(String(m.protocolId), []).get(String(m.protocolId))).push(m);
  const refs = protocolRefs(plan, extraProtocols);
  if (!refs.length) notes.push({ level: "warning", path: "plan.protocols", message: "This lab JSON lists no protocols. Regenerate it in Cirrus (plan.protocols is written from the questionnaire's protocol selection) or add protocols by hand." });
  for (const ref of refs) {
    const o = overrides[ref.protocolId] ?? {};
    const v = validated.get(ref.protocolId);
    const title = (v?.title ?? ref.title ?? ref.protocolId).trim() || ref.protocolId;
    const runsPerWeek = o.runsPerWeek ?? ref.runsPerWeek;
    const summary = { protocolId: ref.protocolId, title, runsPerWeek, include: o.include !== false, validated: !!v, cellTypes: cellTypesOf(v), steps: 0, equipmentIds: [], missingEquipment: [], floorEquipment: [], zoneGaps: [], zoneId: null, zoneSource: null };
    summaries.push(summary);
    if (!v) notes.push({ level: "warning", path: ref.protocolId, message: `${title} is not on the Validated Protocols list any more; its mapping is used as stored.` });
    const rows = rowsOf.get(ref.protocolId) ?? [];
    if (!rows.length) { notes.push({ level: "error", path: ref.protocolId, message: `${title} has no step-to-equipment mapping in the database, so it cannot be routed.` }); summary.include = false; continue; }
    const byStep = new Map();
    for (const r of rows) {
      const s = byStep.get(r.stepId) ?? byStep.set(r.stepId, { id: String(r.stepId), stepNumber: r.stepNumber ?? null, equipmentIds: new Set() }).get(r.stepId);
      if (!s.stepNumber && r.stepNumber) s.stepNumber = r.stepNumber;
      s.equipmentIds.add(r.equipmentId);
    }
    const steps = [...byStep.values()].sort((a, b) => compareStepNumbers(a.stepNumber, b.stepNumber) || a.id.localeCompare(b.id)).map(s => {
      const ids = [...s.equipmentIds].sort();
      return { id: s.id, stepNumber: s.stepNumber, substepLabel: s.stepNumber ?? s.id, ...(ids.length === 1 ? { equipmentId: ids[0] } : { equipmentIds: ids }) };
    });
    const used = [...new Set(rows.map(r => r.equipmentId))].sort();
    Object.assign(summary, { steps: steps.length, equipmentIds: used, floorEquipment: used.filter(e => floor.has(e)), missingEquipment: used.filter(e => !floor.has(e) && ![...inZone.values()].some(set => set.has(e))) });
    // Execution zone: an explicit choice, else the zone of one of the
    // protocol's cell types (the one covering most of its equipment when the
    // cell types span several zones), else the zone whose equipment (with
    // General's and the shared floor items) covers the most of the protocol.
    // A protocol uses its own zone's equipment and General's.
    const usable = z => e => inZone.get(z)?.has(e) || inZone.get("general")?.has(e) || floor.has(e);
    const coverage = z => used.filter(usable(z)).length;
    const byCoverage = list => [...list].sort((a, b) => coverage(b) - coverage(a) || (b === "general") - (a === "general") || zones.indexOf(a) - zones.indexOf(b))[0];
    const cellTypeZones = [...new Set(summary.cellTypes.map(ct => (CELL_TYPE_ZONES[ct] ?? []).find(z => zones.includes(z))).filter(Boolean))];
    let zoneId, zoneSource;
    if (o.zoneId && zones.includes(o.zoneId)) { zoneId = o.zoneId; zoneSource = "chosen"; }
    else if (cellTypeZones.length) { zoneId = byCoverage(cellTypeZones); zoneSource = "cellType"; }
    else { zoneId = byCoverage(zones); zoneSource = "auto-coverage"; }
    // Equipment the lab has, but not in this protocol's zone: a gap to fix in
    // Cirrus (add the equipment to the zone) or by choosing another zone.
    const gaps = used.filter(e => !usable(zoneId)(e) && [...inZone.values()].some(set => set.has(e)));
    Object.assign(summary, { zoneId, zoneSource, zoneGaps: gaps.map(e => ({ equipmentId: e, name: nameOf.get(e) ?? e, inZones: zones.filter(z => inZone.get(z)?.has(e)) })) });
    if (!summary.include) continue;
    if (!zoneId) { notes.push({ level: "error", path: ref.protocolId, message: "The lab has no zones to run it in." }); continue; }
    if (!Number.isFinite(runsPerWeek) || runsPerWeek < 0) { notes.push({ level: "error", path: ref.protocolId, message: `${title}: runs per week must be zero or more.` }); continue; }
    protocols.push({ id: ref.protocolId, name: title, source: "cirrus-db", steps });
    protocolRuns.push({ id: `${ref.protocolId}@${zoneId}`, protocolId: ref.protocolId, zoneId, runsPerPeriod: runsPerWeek, period: "week" });
  }
  const gapped = summaries.filter(x => x.include && x.zoneGaps.length);
  if (gapped.length) notes.push({ level: "warning", path: "zones", kind: "zone-gaps", message: `${gapped.length} protocol(s) need equipment neither their zone nor General has: ${gapped.map(x => `${x.title} (${x.zoneId}): ${x.zoneGaps.map(g => g.name).join(", ")}`).join("; ")}. Add it to that zone or General in Cirrus, or choose another zone.` });
  const auto = summaries.filter(s => s.include && s.zoneSource === "auto-coverage");
  if (auto.length) notes.push({ level: "info", path: "zones", message: `${auto.length} protocol(s) have no cell type in Validated Protocols, so each runs in the zone whose equipment (with General's) covers the most of its steps; protocols never borrow another workflow zone's equipment. Choose a zone per protocol to override.` });
  const equipmentCatalog = Object.fromEntries((db.equipment ?? []).map(e => [e.equipmentId, e]));
  return { protocols, protocolRuns, equipmentCatalog, databaseNotes: notes, protocolSummaries: summaries };
}
