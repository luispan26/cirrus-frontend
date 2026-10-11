import { describe, expect, it } from 'vitest';
import { categoryOrder, emptyCategoryModeState, firstUnanswered, seedCategoryModesFrom } from './guidedFlow';
import { EMPTY_SANDBOX_LAYOUT } from '../../lib/layout-sandbox';

describe('guided flow', () => {
  it('asks about floor equipment last, only when there is some', () => {
    expect(categoryOrder(false)).toEqual(['infrastructure', 'fixtures']);
    expect(categoryOrder(true)).toEqual(['infrastructure', 'fixtures', 'floorEquipment']);
    const answered = { ...emptyCategoryModeState(), infrastructure: 'derived' as const, fixtures: 'manual' as const };
    expect(firstUnanswered(answered, categoryOrder(false))).toBeNull();
    expect(firstUnanswered(answered, categoryOrder(true))).toBe('floorEquipment');
  });

  it('treats a save from before the floor question as unanswered', () => {
    const old = { infrastructure: 'manual', fixtures: 'manual' } as unknown as ReturnType<typeof emptyCategoryModeState>;
    expect(firstUnanswered(old, categoryOrder(true))).toBe('floorEquipment');
  });

  it('counts floor equipment already in the room as placed before generation', () => {
    const fridge = { instanceId: 'f', kind: 'refrigerator' as const, name: 'Fridge', x: 0, y: 0, widthFt: 2, depthFt: 2, orientation: 0 as const, equipmentId: 'fridge' };
    const seeded = seedCategoryModesFrom({ ...EMPTY_SANDBOX_LAYOUT, fixtures: [fridge] });
    expect(seeded.modes.floorEquipment).toBe('manual');
    expect(seeded.modes.fixtures).toBe('unanswered');
  });
});
