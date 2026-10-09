import { describe, expect, it } from 'vitest';
import { benchContents, type LabPlan } from './lab-plan';

const placement = (instanceId: string, benchId: string | null, extra: Record<string, unknown> = {}) => ({
  instanceId, equipmentId: instanceId.split(':')[1], zoneId: 'general', benchId, name: instanceId.split(':')[1], fixed: false, placeholderSize: false,
  xFt: 0, yFt: 0, widthFt: 1.5, depthFt: 1, offsetFt: 0, ...extra,
});
const plan = {
  benches: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }],
  initialEquipment: {
    placements: [
      placement('general:reader:1', 'b1', { offsetFt: 2, widthFt: 1.25, depthFt: 0.9 }),
      placement('general:centrifuge:1', 'b1', { offsetFt: 0, widthFt: 1.5, placeholderSize: true }),
      placement('general:pipette-set:1', 'b1', { offsetFt: 3.5, widthFt: 0.5, workAreaId: 'general:pipette-set:1:area' }),
      placement('general:hamilton:1', 'b2', { widthFt: 5.46, depthFt: 2.56, replacesBench: true }),
      placement('floor:freezer:1', null),
    ],
    workAreas: [{ id: 'general:pipette-set:1:area', benchId: 'b1', zoneId: 'general', offsetFt: 3.5, lengthFt: 3, xFt: 0, yFt: 0, spanXFt: 3, spanYFt: 2.5, instanceIds: ['general:pipette-set:1'] }],
    unplaced: [],
  },
} as unknown as LabPlan;

describe('what is on a bench', () => {
  it('lists its items in order along the bench, with sizes and pipette work areas', () => {
    const c = benchContents(plan, 'b1');
    expect(c.replacedBy).toBeNull();
    expect(c.items.map((i) => i.name)).toEqual(['centrifuge', 'reader', 'pipette-set']);
    expect(c.items.map((i) => i.detail)).toEqual(['1.5 × 1 ft, size not measured', '1.25 × 0.9 ft', 'pipette work area (3 ft)']);
    // 1.5 + 1.25 of items plus the 3 ft work area, capped at the bench's 6 ft.
    expect(c.usedFt).toBe('5.75');
  });

  it('names the equipment replacing a bench', () => {
    expect(benchContents(plan, 'b2')).toEqual({ items: [], usedFt: '5.46', replacedBy: 'hamilton' });
  });

  it('says a bench with nothing on it is empty', () => {
    expect(benchContents(plan, 'b3')).toEqual({ items: [], usedFt: '0', replacedBy: null });
  });
});
