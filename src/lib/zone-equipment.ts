// The equipment step's list, grouped into the workflow zones the floor plan
// and the equipment optimizer use (General, Bacterial, Yeast, Mammalian).
// Every item comes from one of:
//   - a basic list (General Lab, Biosafety-Required, Bacterial/Yeast/
//     Mammalian Basic) — goes to that list's zone (General Lab and
//     Biosafety-Required -> General), one unit per list, so an item on the
//     General Lab and Bacterial Basic lists gets one unit in General and one
//     in Bacterial;
//   - a selected protocol (Protocols step) — every piece of equipment
//     mapped to its steps goes to the protocol's zone, after the user's
//     replacements for this lab. Protocols in one zone share equipment:
//     their weekly hours on it add up, and it gets one unit per
//     HOURS_PER_UNIT hours (at least one). A basic-list item the protocols
//     also use is not doubled (the larger count wins);
//   - the user's Owned / New picks — go to the zone chosen when adding.
//
// Plain data in, plain data out (no Apollo), like computeBasicLabEquipment
// in questions.ts, so it stays easy to test.

import {
  BIOMATERIAL_LIST_KEYS, BSL_REQUIRED_LIST_KEYS, GENERAL_LAB_LIST_KEY,
  type Answers, type EquipmentCatalogEntry, type EquipmentListSummary,
} from './questions';

export type ZoneId = 'general' | 'bacterial' | 'yeast' | 'mammalian';

// Same colors as the report's floor plan (lab-plan.ts ZONE_COLORS).
export const EQUIPMENT_ZONES: { id: ZoneId; label: string; color: string }[] = [
  { id: 'general', label: 'General', color: '#69707F' },
  { id: 'bacterial', label: 'Bacterial', color: '#049295' },
  { id: 'yeast', label: 'Yeast', color: '#8C7CFF' },
  { id: 'mammalian', label: 'Mammalian', color: '#FF3FA4' },
];

export function isZoneId(value: unknown): value is ZoneId {
  return value === 'general' || value === 'bacterial' || value === 'yeast' || value === 'mammalian';
}

// A zone saved before Microbial was split into Bacterial and Yeast goes to
// Bacterial unless only yeast was picked (same rule as the backend's
// legacyMicrobialZone in workflow-zones.ts).
function savedZone(value: unknown, biomaterials: string[]): ZoneId | undefined {
  if (value === 'microbial') return biomaterials.includes('yeast') && !biomaterials.includes('bacteria') ? 'yeast' : 'bacterial';
  return isZoneId(value) ? value : undefined;
}

// Basic-list category keys and protocol cell types -> zone.
export const ZONE_BY_SOURCE: Record<string, ZoneId> = {
  general: 'general',
  bsl: 'general',
  bacteria: 'bacterial',
  yeast: 'yeast',
  mammalian_adherent: 'mammalian',
  mammalian_suspension: 'mammalian',
};

// One unit of protocol equipment per this many hours of weekly use (more
// than this -> hours / HOURS_PER_UNIT, rounded). Same rule as the
// backend's bom/protocol-equipment-list.ts — keep the two in sync.
export const HOURS_PER_UNIT = 10;

export function unitsForWeeklyHours(weeklyHours: number): number {
  return weeklyHours > HOURS_PER_UNIT ? Math.max(1, Math.round(weeklyHours / HOURS_PER_UNIT)) : 1;
}

// Mapped to protocol steps but not bench equipment — left out of the
// equipment step, the bill of materials and the floor plan for now (the
// backend's inventory/hidden-equipment.ts; keep the two in sync).
export const HIDDEN_EQUIPMENT_IDS: readonly string[] = ['sink', 'laptop', 'office-supplies', 'waste-collection'];

// protocolId -> (equipment mapped to that protocol's steps -> the equipment
// the user swapped in for this lab). Applies to every step of the protocol
// that uses the original; never changes the shared mappings.
export type ProtocolReplacements = Record<string, Record<string, string>>;

export interface ProtocolEquipmentInput {
  protocolId: string;
  title: string;
  runsPerWeek: number;
  cellTypes: string[];
  // Per-run seconds on each piece of mapped equipment (before replacements).
  usage: { equipmentId: string; totalDurationSeconds: number }[];
}

// The zone(s) a protocol's equipment goes in, from its Validated Protocol
// cell types: bacteria -> Bacterial, yeast -> Yeast, mammalian -> Mammalian,
// general -> General. Only cell types the user picked as biomaterials (or
// 'general') count; a protocol added by hand for a biomaterial that isn't
// picked uses all its cell types; none at all -> General. A protocol tagged
// for two families gets a copy in each zone (same rule as basic lists).
export function zonesForProtocol(cellTypes: string[] | null | undefined, biomaterials: string[]): ZoneId[] {
  const types = cellTypes ?? [];
  const picked = types.filter((t) => t === 'general' || biomaterials.includes(t));
  const zones = [...new Set((picked.length > 0 ? picked : types).map((t) => ZONE_BY_SOURCE[t]).filter(isZoneId))];
  return zones.length > 0 ? zones : ['general'];
}

// Equipment the protocol uses after this lab's replacements (seconds per run
// summed when two originals were swapped for the same item).
export function effectiveProtocolUsage(protocol: ProtocolEquipmentInput, replacements: ProtocolReplacements): Map<string, number> {
  const swaps = replacements[protocol.protocolId] ?? {};
  const seconds = new Map<string, number>();
  for (const { equipmentId, totalDurationSeconds } of protocol.usage) {
    const effective = swaps[equipmentId] ?? equipmentId;
    seconds.set(effective, (seconds.get(effective) ?? 0) + totalDurationSeconds);
  }
  return seconds;
}

// The new replacement map after swapping `fromEquipmentId` for
// `toEquipmentId` in the given protocols — every original currently showing
// as `fromEquipmentId` is pointed at the new item (a swap back to the
// original just clears the entry).
export function replaceProtocolEquipment(
  replacements: ProtocolReplacements,
  protocols: ProtocolEquipmentInput[],
  protocolIds: string[],
  fromEquipmentId: string,
  toEquipmentId: string,
): ProtocolReplacements {
  const next: ProtocolReplacements = { ...replacements };
  for (const protocol of protocols) {
    if (!protocolIds.includes(protocol.protocolId)) continue;
    const swaps = { ...(next[protocol.protocolId] ?? {}) };
    for (const { equipmentId: original } of protocol.usage) {
      if ((swaps[original] ?? original) !== fromEquipmentId) continue;
      if (original === toEquipmentId) delete swaps[original];
      else swaps[original] = toEquipmentId;
    }
    if (Object.keys(swaps).length > 0) next[protocol.protocolId] = swaps;
    else delete next[protocol.protocolId];
  }
  return next;
}

export interface ZoneEquipmentRow {
  // Unique per row: `${zone}:${equipmentId}`, plus ':owned' / ':needed'
  // when an item that is both owned and still needed splits into two rows.
  key: string;
  zone: ZoneId;
  equipmentId: string;
  name: string;
  // What's shown and sized.
  quantity: number;
  // Units the basic lists ask for in this zone, and the usage-based units
  // its protocols need (0 when no protocol uses it here).
  listQuantity: number;
  protocolQuantity: number;
  // max(listQuantity, protocolQuantity) — before owned/new and edits.
  requiredQuantity: number;
  ownedQuantity: number;
  neededQuantity: number;
  // Combined weekly hours of this zone's protocols on it.
  weeklyHours: number;
  locked: boolean; // Biosafety-Required: can't be removed
  owned: boolean;
  needed: boolean;
  // The basic lists that put it here (BASIC_EQUIPMENT_CATEGORIES keys).
  listSources: string[];
  // Selected protocols (protocols.io ids) using it in this zone.
  protocolIds: string[];
  // BASIC_EQUIPMENT_CATEGORIES keys for the report's bill of materials:
  // list sources, then the protocols' cell types, then needed/owned.
  sources: string[];
}

interface Cell {
  zone: ZoneId;
  equipmentId: string;
  listQuantity: number;
  listSources: string[];
  locked: boolean;
  weeklyHours: number;
  protocolIds: string[];
  protocolSources: string[];
  ownedQuantity: number;
  neededQuantity: number;
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

// Answer fields this reads (all optional):
//   equipment_zone_moves — `${listZone}:${equipmentId}` -> zone, for basic-
//     list items moved with a row's Zone selector;
//   equipment_zones — equipmentId -> zone for Owned / New picks;
//   protocol_equipment_replacements — ProtocolReplacements;
//   basic_lab_equipment_quantity_overrides / basic_lab_equipment_removed —
//     keyed `${zone}:${equipmentId}` (a plain equipmentId from before zones
//     applies to every zone).
export function computeZoneEquipment(
  answers: Answers,
  lists: EquipmentListSummary[],
  catalog: EquipmentCatalogEntry[],
  protocols: ProtocolEquipmentInput[],
): ZoneEquipmentRow[] {
  const listByKey = new Map(lists.map((l) => [l.listKey, l]));
  const nameById = new Map(catalog.map((c) => [c.equipmentId, c.name]));
  const moves = (answers.equipment_zone_moves as Record<string, string>) || {};
  const pickZones = (answers.equipment_zones as Record<string, string>) || {};
  const replacements = (answers.protocol_equipment_replacements as ProtocolReplacements) || {};
  const biomaterials = (answers.biomaterials as string[]) || [];
  const cells = new Map<string, Cell>();

  function cell(zone: ZoneId, equipmentId: string): Cell {
    const key = `${zone}:${equipmentId}`;
    let c = cells.get(key);
    if (!c) {
      c = { zone, equipmentId, listQuantity: 0, listSources: [], locked: false, weeklyHours: 0, protocolIds: [], protocolSources: [], ownedQuantity: 0, neededQuantity: 0 };
      cells.set(key, c);
    }
    return c;
  }

  function addList(listKey: string | undefined, sourceKey: string, locked: boolean) {
    const list = listKey ? listByKey.get(listKey) : undefined;
    if (!list) return;
    const listZone = ZONE_BY_SOURCE[sourceKey];
    for (const equipmentId of list.equipmentIds) {
      const moved = savedZone(moves[`${listZone}:${equipmentId}`], biomaterials);
      const c = cell(moved ?? listZone, equipmentId);
      c.listQuantity += 1;
      pushUnique(c.listSources, sourceKey);
      if (locked) c.locked = true;
    }
  }

  addList(GENERAL_LAB_LIST_KEY, 'general', false);
  const bslLevel = answers.biosafety_level as string | undefined;
  addList(bslLevel ? BSL_REQUIRED_LIST_KEYS[bslLevel] : undefined, 'bsl', true);
  for (const biomaterial of biomaterials) addList(BIOMATERIAL_LIST_KEYS[biomaterial], biomaterial, false);

  for (const protocol of protocols) {
    const zones = zonesForProtocol(protocol.cellTypes, biomaterials);
    for (const [equipmentId, secondsPerRun] of effectiveProtocolUsage(protocol, replacements)) {
      for (const zone of zones) {
        const c = cell(zone, equipmentId);
        c.weeklyHours += (secondsPerRun / 3600) * protocol.runsPerWeek;
        pushUnique(c.protocolIds, protocol.protocolId);
        const specific = protocol.cellTypes.filter((t) => t !== 'general' && ZONE_BY_SOURCE[t] === zone);
        for (const source of specific.length > 0 ? specific : ['general']) pushUnique(c.protocolSources, source);
      }
    }
  }

  const ownedMeta = (answers.existing_equipment_meta as Record<string, { name: string; count: number }>) || {};
  const neededMeta = (answers.needed_equipment_meta as Record<string, { name: string; count: number }>) || {};
  for (const [equipmentId, meta] of Object.entries(ownedMeta)) {
    const zone = savedZone(pickZones[equipmentId], biomaterials) ?? 'general';
    cell(zone, equipmentId).ownedQuantity = Math.max(1, Math.round(meta.count) || 1);
  }
  for (const [equipmentId, meta] of Object.entries(neededMeta)) {
    const zone = savedZone(pickZones[equipmentId], biomaterials) ?? 'general';
    cell(zone, equipmentId).neededQuantity = Math.max(1, Math.round(meta.count) || 1);
  }

  const removed = new Set((answers.basic_lab_equipment_removed as string[]) || []);
  const overrides = (answers.basic_lab_equipment_quantity_overrides as Record<string, number>) || {};
  const rows: ZoneEquipmentRow[] = [];
  for (const c of cells.values()) {
    const name = nameById.get(c.equipmentId);
    // A listed id whose catalog entry was deleted is never shown.
    if (!name || HIDDEN_EQUIPMENT_IDS.includes(c.equipmentId)) continue;
    const rowKey = `${c.zone}:${c.equipmentId}`;
    const usedByProtocol = c.protocolIds.length > 0;
    const protocolQuantity = usedByProtocol ? unitsForWeeklyHours(c.weeklyHours) : 0;
    const requiredQuantity = Math.max(c.listQuantity, protocolQuantity);
    const owned = c.ownedQuantity > 0;
    const needed = c.neededQuantity > 0;
    const sources = [...c.listSources];
    for (const source of c.protocolSources) pushUnique(sources, source);
    const base = {
      zone: c.zone, equipmentId: c.equipmentId, name, listQuantity: c.listQuantity, protocolQuantity, requiredQuantity,
      weeklyHours: c.weeklyHours, locked: c.locked, listSources: c.listSources, protocolIds: c.protocolIds,
    };

    // Owned and still needed: two rows, each with its own count — the New
    // row also covers whatever the lists/protocols need beyond what's owned.
    if (owned && needed) {
      rows.push({ ...base, key: `${rowKey}:owned`, quantity: c.ownedQuantity, ownedQuantity: c.ownedQuantity, neededQuantity: 0, owned: true, needed: false, locked: false, sources: [...sources, 'owned'] });
      rows.push({
        ...base, key: `${rowKey}:needed`, quantity: Math.max(c.neededQuantity, requiredQuantity - c.ownedQuantity),
        ownedQuantity: 0, neededQuantity: c.neededQuantity, owned: false, needed: true, locked: false, sources: [...sources, 'needed'],
      });
      continue;
    }
    // Owned or New: the count is edited through the Owned / New amount, and
    // the room is sized for at least what the lists/protocols need.
    if (owned || needed) {
      rows.push({
        ...base, key: rowKey, quantity: Math.max(requiredQuantity, c.ownedQuantity + c.neededQuantity),
        ownedQuantity: c.ownedQuantity, neededQuantity: c.neededQuantity, owned, needed, locked: false,
        sources: [...sources, owned ? 'owned' : 'needed'],
      });
      continue;
    }
    // Biosafety-Required and protocol equipment can't be removed (a
    // protocol's equipment can only be replaced).
    if (!c.locked && !usedByProtocol && (removed.has(rowKey) || removed.has(c.equipmentId))) continue;
    const override = overrides[rowKey] ?? overrides[c.equipmentId];
    rows.push({
      ...base, key: rowKey, quantity: Math.max(1, Math.round(override ?? requiredQuantity)),
      ownedQuantity: 0, neededQuantity: 0, owned: false, needed: false, sources,
    });
  }
  return rows;
}

export interface FinalEquipmentLine {
  equipment_id: string;
  name: string;
  quantity: number;
  sources: string[];
  zone: ZoneId;
  protocol_ids: string[];
}

// The rows as the intake's equipment list (basic_lab_equipment), which the
// backend turns into the bill of materials and the floor plan's zones. An
// owned row sized above what's owned splits into the owned units (no cost)
// and the rest (to buy), so only what's actually missing is costed.
export function finalEquipmentLines(rows: ZoneEquipmentRow[]): FinalEquipmentLine[] {
  const lines: FinalEquipmentLine[] = [];
  for (const row of rows) {
    const line = { equipment_id: row.equipmentId, name: row.name, zone: row.zone, protocol_ids: row.protocolIds };
    if (!row.owned) {
      lines.push({ ...line, quantity: row.quantity, sources: row.sources });
      continue;
    }
    const others = row.sources.filter((s) => s !== 'owned' && s !== 'needed');
    lines.push({ ...line, quantity: Math.min(row.quantity, row.ownedQuantity), sources: ['owned', ...others] });
    const toBuy = row.quantity - row.ownedQuantity;
    if (toBuy > 0) lines.push({ ...line, quantity: toBuy, sources: others.length > 0 ? others : ['general'] });
  }
  return lines;
}
