import { describe, expect, it } from 'vitest';
import { selectProtocols } from './protocol-selection';
import { BIOMATERIAL_OPTS, buildFinalIntakeJson, QS } from './questions';

describe('questionnaire regressions', () => {
  it('selects a filtered group atomically without losing existing or zero run counts', () => {
    const selected = selectProtocols({ operations: ['outside', 'a'], protocol_runs_per_week: { outside: 7, a: 0 } }, [{ value: 'a' }, { value: 'b', operationId: 'miniprep' }], true);
    expect(selected.operations).toEqual(['outside', 'a', 'b']);
    expect(selected.protocol_runs_per_week).toEqual({ outside: 7, a: 0, b: 1 });
    expect(selected.protocol_operation_by_id).toEqual({ b: 'miniprep' });
    const cleared = selectProtocols(selected, [{ value: 'a' }, { value: 'b' }], false);
    expect(cleared.operations).toEqual(['outside']);
    expect(cleared.protocol_runs_per_week).toEqual({ outside: 7 });
    expect(cleared.protocol_operation_by_id).toEqual({});
  });
  it('starts with advisory equipment-only budget and excludes retired biomaterials', () => {
    expect(QS[0].id).toBe('budget');
    expect(BIOMATERIAL_OPTS.map((o) => o.v)).not.toContain('mice');
    const intake = buildFinalIntakeJson({ biomaterials: ['mice', 'yeast'], budget_scope: 'equipment_and_construction', layout_mode: 'main_wall', layout_main_wall: 'E', layout_same_direction: false, layout_wall_benches: true, equipment_zones: { e: 'microbial' }, equipment_fixed: ['e'] });
    expect(intake.biomaterials).toEqual(['yeast']);
    expect(intake.budget.scope).toBe('equipment_only');
    expect(intake.layout_options).toMatchObject({ mode: 'main_wall', main_wall: 'E', same_direction: false, wall_benches: true });
    expect(intake.equipment_zones).toEqual({ e: 'microbial' });
    expect(intake.equipment_fixed).toEqual(['e']);
  });
});
