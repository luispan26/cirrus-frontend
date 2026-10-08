import type { Answers } from '../../lib/questions';

export const DEFAULT_ARRANGEMENT: Answers = {
  layout_mode: 'max_fit', layout_main_wall: 'S', layout_same_direction: true, layout_wall_benches: false,
};

export function BenchArrangement({ value, onChange }: { value: Answers; onChange: (value: Answers) => void }) {
  const set = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return <fieldset className="plan-settings">
    <legend>Generated bench arrangement</legend>
    <label className="q-check-row"><input type="radio" name="arrangement" checked={value.layout_mode !== 'main_wall'} onChange={() => set('layout_mode', 'max_fit')} />Maximum fit</label>
    <label className="q-check-row"><input type="radio" name="arrangement" checked={value.layout_mode === 'main_wall'} onChange={() => set('layout_mode', 'main_wall')} />Main wall</label>
    {value.layout_mode === 'main_wall' ? <>
      <select className="field-input" aria-label="Main wall" value={String(value.layout_main_wall ?? 'S')} onChange={(e) => set('layout_main_wall', e.target.value)}>
        <option value="N">North (top)</option><option value="S">South (bottom)</option><option value="E">East (right)</option><option value="W">West (left)</option>
      </select>
      <p className="ls-help">Rows run perpendicular to the selected wall.</p>
    </> : <label className="q-check-row"><input type="checkbox" checked={value.layout_same_direction !== false} onChange={(e) => set('layout_same_direction', e.target.checked)} />All islands run the same direction</label>}
    <label className="q-check-row"><input type="checkbox" checked={value.layout_wall_benches === true} onChange={(e) => set('layout_wall_benches', e.target.checked)} />Add benches along parallel walls</label>
    <p className="ls-help">Used when you generate your report. Saved with “Use this room in my intake”.</p>
  </fieldset>;
}
