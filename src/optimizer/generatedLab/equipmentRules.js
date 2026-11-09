// DAMPLab's equipment placement rules for one lab, as Cirrus applies them in
// every optimization. A JavaScript copy of cirrus-backend
// src/optimizer/equipment-rules.ts (equipmentRulesFor, unreachableNearRules);
// the data file is equipmentRules.data.js. Keep them in step with Cirrus.
//   - keep apart ("Equipment Conflicts"): two bench items never share a
//     bench; with a floor-standing item they stay KEEP_APART_FT walking apart;
//   - keep near: every unit within KEEP_NEAR_FT walking of one it needs.
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_BY_NAME, KEEP_APART, KEEP_NEAR } from "./equipmentRules.data.js";

export const KEEP_APART_FT = 6;
export const KEEP_NEAR_FT = 12;

export const normalizeName = s => s.toLowerCase().replace(/[™®]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const SYNONYMS = {
  "incubator shaker": "Shaking Incubator", "shaking incubator": "Shaking Incubator", "thermal cycler": "Thermocycler", "pcr": "Thermocycler",
  "vortex": "Vortexer", "plate spinner": "Centrifuge", "microcentrifuge": "Centrifuge", "heat sealer": "Plate Sealer",
  "gel electrophoresis": "Electrophoresis System", "gel doc": "Gel Imager", "opentrons": "Liquid Handler", "liquid handl": "Liquid Handler",
  "nanodrop": "Spectrophotometer", "hot plate": "Hot Plate/Stirrer", "stirrer": "Hot Plate/Stirrer", "scale": "Balance",
  "bsc": "Biosafety Cabinet", "laminar flow": "Laminar Flow Cabinet", "pipet": "Pipette Aid", "myspin": "Centrifuge",
};
const KEYWORDS = [...EQUIPMENT_CATEGORIES.map(c => [normalizeName(c), c]), ...Object.entries(SYNONYMS)].sort((a, b) => b[0].length - a[0].length);

export function equipmentCategory(name) {
  const n = normalizeName(name ?? "");
  if (EQUIPMENT_CATEGORY_BY_NAME[n]) return EQUIPMENT_CATEGORY_BY_NAME[n];
  const padded = ` ${n} `;
  for (const [word, category] of KEYWORDS) if (padded.includes(` ${word} `) || padded.includes(` ${word}s `) || (word.length > 5 && n.includes(word))) return category;
  return null;
}

const list = names => (names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`);

export function equipmentRulesFor(plan) {
  const items = new Map();
  for (const e of plan.zones.flatMap(z => z.equipment)) if (!items.has(e.equipmentId)) items.set(e.equipmentId, { name: e.name, floor: false, category: equipmentCategory(e.name) });
  for (const e of plan.floorItems ?? []) items.set(e.equipmentId, { name: e.name, floor: true, category: equipmentCategory(e.name) });
  const ofCategory = category => [...items].filter(([, i]) => i.category === category);
  const rules = [];
  const add = rule => rules.push({ ...rule, severity: "hard", id: `${rule.kind}:${rule.type}:${rule.equipmentIds[0]}:${rule.equipmentIds[1].join("+")}` });
  for (const pair of KEEP_APART) {
    for (const [catA, catB] of [pair, [pair[1], pair[0]]]) {
      for (const [a, ia] of ofCategory(catA)) {
        const others = ofCategory(catB).filter(([b]) => b !== a);
        const bench = ia.floor ? [] : others.filter(([, ib]) => !ib.floor);
        const floor = others.filter(([, ib]) => ia.floor || ib.floor).filter(([, ib]) => !(ia.floor && !ib.floor));
        if (bench.length && catA < catB) add({ type: "notSameBench", equipmentIds: [a, bench.map(([b]) => b)], kind: "apart", description: `${ia.name} not on the same bench as any ${catB.toLowerCase()} (${list(bench.map(([, ib]) => ib.name))})` });
        if (floor.length) add({ type: "minWalkFt", distanceFt: KEEP_APART_FT, equipmentIds: [a, floor.map(([b]) => b)], kind: "apart", description: `${ia.name} at least ${KEEP_APART_FT} ft from any ${catB.toLowerCase()} (${list(floor.map(([, ib]) => ib.name))})` });
      }
    }
  }
  for (const rule of KEEP_NEAR) {
    for (const [a, ia] of ofCategory(rule.category)) {
      const anchors = ofCategory(rule.near).filter(([b]) => b !== a);
      if (anchors.length) add({ type: "maxWalkFt", distanceFt: KEEP_NEAR_FT, equipmentIds: [a, anchors.map(([b]) => b)], kind: "near", description: `${ia.name} within ${KEEP_NEAR_FT} ft of a ${rule.near.toLowerCase()} (${rule.because.toLowerCase()})` });
    }
  }
  return rules;
}

// "Keep near" rules no placement can meet (no bench of the item's zones is
// within walking distance of anywhere a target can stand). Cirrus never sends
// these to the solver.
export function unreachableNearRules(plan, rules) {
  const s = plan.gridInches / 12, key = (r, c) => r * plan.columns + c;
  const blocked = new Set((plan.floorEquipmentCells ?? []).map(([r, c]) => key(r, c)));
  const walkable = new Set([...plan.aisle.cells, ...(plan.unusedFloor?.cells ?? []), ...(plan.doorClearance?.cells ?? []), ...(plan.doorClearance?.aisleCells ?? [])].map(([r, c]) => key(r, c)).filter(k => !blocked.has(k)));
  const benchCells = b => {
    const out = [];
    for (let r = b.accessRect.row; r < b.accessRect.row + b.accessRect.height; r++) for (let c = b.accessRect.column; c < b.accessRect.column + b.accessRect.width; c++) if (walkable.has(key(r, c))) out.push(key(r, c));
    return out;
  };
  const zonesOf = id => plan.zones.filter(z => z.equipment.some(e => e.equipmentId === id)).map(z => z.id);
  const floorAt = new Map((plan.initialEquipment?.placements ?? []).filter(p => p.benchId === null && p.accessCell).map(p => [p.equipmentId, key(p.accessCell[0], p.accessCell[1])]));
  const spots = id => {
    const zones = zonesOf(id);
    if (zones.length) return plan.benches.filter(b => zones.includes(b.zoneId)).flatMap(benchCells);
    const at = floorAt.get(id);
    return at === undefined ? null : [at];
  };
  const out = new Set();
  for (const rule of rules) {
    if (rule.type !== "maxWalkFt") continue;
    const from = spots(rule.equipmentIds[0]), targets = rule.equipmentIds[1].map(spots);
    if (from === null || targets.every(t => t === null)) continue;
    const limit = Math.floor((rule.distanceFt + 1e-9) / s), dist = new Map(), queue = [];
    for (const t of targets.flat()) if (t !== null && !dist.has(t)) { dist.set(t, 0); queue.push(t); }
    for (let i = 0; i < queue.length; i++) {
      const v = queue[i], d = dist.get(v);
      if (d >= limit) continue;
      const r = Math.floor(v / plan.columns), c = v % plan.columns;
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        if (nr < 0 || nc < 0 || nr >= plan.rows || nc >= plan.columns) continue;
        const k = key(nr, nc);
        if (walkable.has(k) && !dist.has(k)) { dist.set(k, d + 1); queue.push(k); }
      }
    }
    if (!from.some(f => dist.has(f))) out.add(rule.id);
  }
  return out;
}

// The rules Cirrus would send for this plan: every rule except "keep near"
// rules the floor plan already rules out.
export function damplabRules(plan) {
  const rules = equipmentRulesFor(plan), unreachable = unreachableNearRules(plan, rules);
  return { rules: rules.filter(r => !unreachable.has(r.id)), unreachable: rules.filter(r => unreachable.has(r.id)) };
}
