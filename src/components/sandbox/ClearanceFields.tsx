import type { FixtureClearance } from '../../lib/layout-sandbox';

export function ClearanceFields({ value, onChange, overhead = false }: { value: FixtureClearance; onChange: (field: keyof FixtureClearance, value: number) => void; overhead?: boolean }) {
  const fields: [keyof FixtureClearance, string][] = [['frontFt', 'Front clearance (ft)']];
  if (overhead) fields.push(['overheadFt', 'Overhead clearance (ft)']);
  return <div className="ls-clearance-fields">{fields.map(([field, label]) => <label key={field}><span className="field-label">{label}</span><input className="field-input" type="number" min={field === 'frontFt' ? '5' : '0'} step=".5" value={field === 'frontFt' ? Math.max(5, value[field] ?? 5) : value[field] ?? 0} onChange={(e) => onChange(field, field === 'frontFt' ? Math.max(5, Number(e.target.value) || 5) : Math.max(0, Number(e.target.value) || 0))} /></label>)}</div>;
}
