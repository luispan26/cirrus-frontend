import { describe, expect, it } from 'vitest';
import { buildFinalIntakeJson, naturalLayoutZone } from './questions';

describe('layout zones', () => {
  it('sends each item to its biomaterial list\'s zone, else General', () => {
    expect(naturalLayoutZone(['bacteria'])).toBe('bacterial');
    expect(naturalLayoutZone(['yeast'])).toBe('yeast');
    expect(naturalLayoutZone(['general', 'mammalian_suspension'])).toBe('mammalian');
    expect(naturalLayoutZone(['needed'])).toBe('general');
    expect(naturalLayoutZone([])).toBe('general');
  });

  it('sends the zone headroom to the generator, 1.25 by default', () => {
    expect(buildFinalIntakeJson({}).layout_options.zone_headroom).toBe(1.25);
    expect(buildFinalIntakeJson({ layout_zone_headroom: 1.5 }).layout_options.zone_headroom).toBe(1.5);
  });
});
