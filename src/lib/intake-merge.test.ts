import { expect, it } from 'vitest';
import { mergeIntakeFields } from './intake-merge';

it('keeps protocol choices and frequencies through delayed old server snapshots', () => {
  const current = { operations: ['a', 'b'], protocol_runs_per_week: { a: 0, b: 5 }, door_wall: 'N', layout_same_direction: true };
  const edited = new Set(['operations', 'protocol_runs_per_week']);
  const stale = { operations: ['a'], protocol_runs_per_week: { a: 1 }, door_wall: null, layout_same_direction: false };
  expect(mergeIntakeFields(current, stale, edited)).toEqual({ ...current, door_wall: null, layout_same_direction: false });
  expect(mergeIntakeFields(current, { operations: [], protocol_runs_per_week: {} }, edited)).toBe(current);
});

it('keeps explicit local clears and ignores unrecognized remote keys', () => {
  expect(mergeIntakeFields({ operations: [] }, { operations: ['old'], arbitrary: 'value' }, new Set(['operations']))).toEqual({ operations: [] });
});
