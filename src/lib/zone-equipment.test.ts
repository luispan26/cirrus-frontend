import { describe, expect, it } from 'vitest';
import { computeZoneEquipment, finalEquipmentLines, replaceProtocolEquipment, zonesForProtocol, type ProtocolEquipmentInput } from './zone-equipment';
import { QS } from './questions';

const catalog = ['pipette-set', 'shaker', 'centrifuge', 'freezer', 'microscope', 'other-centrifuge'].map((equipmentId) => ({ equipmentId, name: equipmentId }));
const lists = [
  { listKey: 'general_lab_equipment_list', equipmentIds: ['pipette-set'] },
  { listKey: 'bacterial_basic_equipment', equipmentIds: ['pipette-set', 'shaker'] },
  { listKey: 'bsl1_required_equipment', equipmentIds: ['freezer'] },
];
const HOUR = 3600;

function protocol(protocolId: string, cellTypes: string[], runsPerWeek: number, usage: [string, number][]): ProtocolEquipmentInput {
  return { protocolId, title: protocolId, runsPerWeek, cellTypes, usage: usage.map(([equipmentId, totalDurationSeconds]) => ({ equipmentId, totalDurationSeconds })) };
}

function byKey(rows: ReturnType<typeof computeZoneEquipment>) {
  return Object.fromEntries(rows.map((r) => [r.key, r]));
}

describe('zone equipment', () => {
  it('orders the steps budget, biosafety, biomaterials, protocols, equipment, space, layout', () => {
    expect(QS.map((q) => q.id)).toEqual(['budget', 'biosafety_level', 'biomaterials', 'operations', 'basic_lab_equipment', 'space', 'layout_prefs']);
  });

  it('puts basic lists in their own zone, one unit per list', () => {
    const rows = byKey(computeZoneEquipment({ biosafety_level: 'BSL-1', biomaterials: ['bacteria'] }, lists, catalog, []));
    expect(rows['general:pipette-set'].quantity).toBe(1);
    expect(rows['microbial:pipette-set'].quantity).toBe(1);
    expect(rows['microbial:shaker'].listSources).toEqual(['bacteria']);
    expect(rows['general:freezer'].locked).toBe(true);
  });

  it('maps protocols to zones by cell type', () => {
    expect(zonesForProtocol(['bacteria'], ['bacteria'])).toEqual(['microbial']);
    expect(zonesForProtocol(['yeast'], [])).toEqual(['microbial']);
    expect(zonesForProtocol(['mammalian_adherent', 'mammalian_suspension'], ['mammalian_adherent'])).toEqual(['mammalian']);
    expect(zonesForProtocol(['general'], ['bacteria'])).toEqual(['general']);
    expect(zonesForProtocol([], [])).toEqual(['general']);
  });

  it('shares protocol equipment in a zone by weekly hours (10 h per unit) and never doubles a basic-list item', () => {
    const protocols = [
      protocol('overnight', ['bacteria'], 4, [['pipette-set', 2 * HOUR], ['centrifuge', HOUR]]),
      protocol('glycerol', ['bacteria'], 3, [['pipette-set', 2 * HOUR]]),
      protocol('nanodrop', ['general'], 1, [['pipette-set', 60]]),
    ];
    const rows = byKey(computeZoneEquipment({ biomaterials: ['bacteria'] }, lists, catalog, protocols));
    // 8 h + 6 h = 14 h -> round(1.4) = 1; the Bacterial Basic list also asks for 1.
    expect(rows['microbial:pipette-set']).toMatchObject({ quantity: 1, protocolQuantity: 1, protocolIds: ['overnight', 'glycerol'] });
    expect(rows['microbial:centrifuge']).toMatchObject({ quantity: 1, protocolIds: ['overnight'], sources: ['bacteria'] });
    expect(rows['general:pipette-set'].protocolIds).toEqual(['nanodrop']);
    const busy = byKey(computeZoneEquipment({ biomaterials: ['bacteria'] }, lists, catalog, [protocol('busy', ['bacteria'], 10, [['centrifuge', 3 * HOUR]])]));
    expect(busy['microbial:centrifuge'].quantity).toBe(3);
  });

  it('leaves out non-bench items (sink, laptop, office supplies, waste collection)', () => {
    const withHidden = [...catalog, { equipmentId: 'sink', name: 'Sink' }, { equipmentId: 'laptop', name: 'Laptop' }];
    const rows = computeZoneEquipment({ biomaterials: ['bacteria'] }, lists, withHidden, [protocol('p', ['bacteria'], 1, [['sink', HOUR], ['laptop', HOUR], ['centrifuge', HOUR]])]);
    expect(rows.map((r) => r.equipmentId).filter((id) => id === 'sink' || id === 'laptop')).toEqual([]);
    expect(rows.some((r) => r.equipmentId === 'centrifuge')).toBe(true);
  });

  it('lets protocol rows go down to 1 but never be removed', () => {
    const protocols = [protocol('busy', ['bacteria'], 10, [['centrifuge', 3 * HOUR]])];
    const rows = byKey(computeZoneEquipment({
      biomaterials: ['bacteria'],
      basic_lab_equipment_quantity_overrides: { 'microbial:centrifuge': 1 },
      basic_lab_equipment_removed: ['microbial:centrifuge', 'microbial:shaker'],
    }, lists, catalog, protocols));
    expect(rows['microbial:centrifuge'].quantity).toBe(1);
    expect(rows['microbial:shaker']).toBeUndefined();
  });

  it('applies replacements for this lab to the ticked protocols only', () => {
    const protocols = [
      protocol('a', ['bacteria'], 1, [['centrifuge', HOUR]]),
      protocol('b', ['bacteria'], 1, [['centrifuge', HOUR]]),
    ];
    const replacements = replaceProtocolEquipment({}, protocols, ['a'], 'centrifuge', 'other-centrifuge');
    expect(replacements).toEqual({ a: { centrifuge: 'other-centrifuge' } });
    const rows = byKey(computeZoneEquipment({ biomaterials: ['bacteria'], protocol_equipment_replacements: replacements }, lists, catalog, protocols));
    expect(rows['microbial:other-centrifuge'].protocolIds).toEqual(['a']);
    expect(rows['microbial:centrifuge'].protocolIds).toEqual(['b']);
    // Swapping back clears the entry.
    expect(replaceProtocolEquipment(replacements, protocols, ['a'], 'other-centrifuge', 'centrifuge')).toEqual({});
  });

  it('moves basic-list rows between zones and puts Owned/New picks in their chosen zone', () => {
    const rows = byKey(computeZoneEquipment({
      biomaterials: ['bacteria'],
      equipment_zone_moves: { 'microbial:shaker': 'mammalian' },
      existing_equipment_meta: { microscope: { name: 'microscope', count: 1 } },
      equipment_zones: { microscope: 'mammalian' },
    }, lists, catalog, []));
    expect(rows['mammalian:shaker'].listSources).toEqual(['bacteria']);
    expect(rows['microbial:shaker']).toBeUndefined();
    expect(rows['mammalian:microscope']).toMatchObject({ owned: true, quantity: 1 });
  });

  it('sends the zone and protocols with every line, costing only what is not owned', () => {
    const rows = computeZoneEquipment({
      biomaterials: ['bacteria'],
      existing_equipment_meta: { centrifuge: { name: 'centrifuge', count: 1 } },
      equipment_zones: { centrifuge: 'microbial' },
    }, [], catalog, [protocol('busy', ['bacteria'], 10, [['centrifuge', 3 * HOUR]])]);
    expect(finalEquipmentLines(rows)).toEqual([
      { equipment_id: 'centrifuge', name: 'centrifuge', zone: 'microbial', protocol_ids: ['busy'], quantity: 1, sources: ['owned', 'bacteria'] },
      { equipment_id: 'centrifuge', name: 'centrifuge', zone: 'microbial', protocol_ids: ['busy'], quantity: 2, sources: ['bacteria'] },
    ]);
  });
});
