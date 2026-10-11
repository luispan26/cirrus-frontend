import type { Answers } from '../../lib/questions';

// Rows of benches always run out from a main wall ("Maximum fit" and the
// wall-bench toggle were removed 2026-10-11: benches go along the walls only
// when the islands can't give every zone its space). No wall picked = the
// wall with the main door.
export const DEFAULT_ARRANGEMENT: Answers = {
  layout_mode: 'main_wall', layout_main_wall: null, layout_same_direction: true,
};

export function BenchArrangement({ value, onChange }: { value: Answers; onChange: (value: Answers) => void }) {
  return <fieldset className="plan-settings">
    <legend>Generated bench arrangement</legend>
    <label className="field-label" htmlFor="arrangement-main-wall">Main wall</label>
    <select id="arrangement-main-wall" className="field-input" aria-label="Main wall" value={value.layout_mode === 'main_wall' && value.layout_main_wall ? String(value.layout_main_wall) : ''} onChange={(e) => onChange({ ...value, layout_mode: 'main_wall', layout_main_wall: e.target.value || null })}>
      <option value="">Wall with the main door</option><option value="N">North (top)</option><option value="S">South (bottom)</option><option value="E">East (right)</option><option value="W">West (left)</option>
    </select>
    <p className="ls-help">Rows run perpendicular to this wall. Benches go along the walls only when the islands can’t give every zone its space.</p>
    <p className="ls-help">Used when you generate your report. Saved with “Use this room in my intake”.</p>
  </fieldset>;
}
