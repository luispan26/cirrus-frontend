import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Drop-in for a native <select> once its option list can realistically run
// past ~10 items — scanning a plain dropdown that long is slow, so this
// swaps in a type-to-filter combobox instead. Falls back to a plain
// <select> automatically at 10 or fewer options, so nothing changes for the
// small fixed-enum pickers elsewhere in the app (voltage, phase, etc.) even
// if they're ever pointed at this component by mistake. Callers own their
// own blank/placeholder entry (e.g. {value: '', label: 'Unassigned'}) in
// `options`, exactly like they would with a leading <option value="">, so
// this has no opinion on whether a blank choice makes sense for a given field.
export function SearchableSelect({
  options, value, onChange, placeholder = 'Select…', className, style, disabled,
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  if (options.length <= 10) {
    return (
      <select className={className ?? 'field-input'} style={style} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    );
  }
  return <SearchableSelectCombobox options={options} value={value} onChange={onChange} placeholder={placeholder} className={className} style={style} disabled={disabled} />;
}

function SearchableSelectCombobox({
  options, value, onChange, placeholder, className, style, disabled,
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upwards = below < 200 && above > below;
      setMenuStyle({ position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), width: Math.min(rect.width, window.innerWidth - 16), maxHeight: Math.max(80, Math.min(300, upwards ? above : below)), ...(upwards ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function selectOption(o: SearchableSelectOption) {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }} className={className}>
      <input
        className="field-input"
        style={{ width: '100%' }}
        placeholder={placeholder}
        disabled={disabled}
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          // Several places this is used (the guided-questions flow, in
          // particular) treat a bare Enter as "advance to the next step" via
          // a document-level listener — without stopping propagation here,
          // typing a search term and pressing Enter to pick the top match
          // would also fire that navigation.
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (filtered.length > 0) selectOption(filtered[0]);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            setQuery('');
          }
        }}
      />
      {open && createPortal(
        <div ref={menuRef} role="listbox" style={{ ...menuStyle, zIndex: 10000, overflowY: 'auto', background: 'var(--white)', border: '1px solid var(--br)', borderRadius: 8, boxShadow: 'var(--shadow-sm)' }}>
          {filtered.length === 0 && <div style={{ padding: '8px 12px', fontSize: 16, color: 'var(--mid)' }}>No matches.</div>}
          {filtered.map((o) => (
            <div
              key={o.value}
              role="option" aria-selected={o.value === value} aria-disabled={o.disabled}
              // mousedown (not click) so this fires before the input blurs /
              // the outside-click handler closes the dropdown.
              onMouseDown={(e) => { e.preventDefault(); selectOption(o); }}
              style={{
                padding: '8px 12px',
                fontSize: 16,
                cursor: o.disabled ? 'not-allowed' : 'pointer',
                opacity: o.disabled ? 0.5 : 1,
                background: o.value === value ? 'var(--tl)' : 'transparent',
              }}
            >
              {o.label}
            </div>
          ))}
        </div>, document.body
      )}
    </div>
  );
}
