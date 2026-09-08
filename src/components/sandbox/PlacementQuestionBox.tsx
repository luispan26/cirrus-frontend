import { CATEGORY_CTA_VERB, CATEGORY_LABELS, CATEGORY_QUESTIONS, type PlacementCategory } from './guidedFlow';

export interface PlacementSubgroup {
  key: string;
  label: string;
  // Infrastructure subgroups reveal their INFRA_PALETTE items on hover (see
  // LayoutSandboxPage); fixtures subgroups pass this as undefined and get no
  // hover behavior at all.
  hoverItems?: string[];
}

// The guided-flow question card for one placement category — a header, the
// category's question sentence, and (for infrastructure/fixtures only) a
// grid of selectable subgroup boxes (outlined when unselected, filled when
// selected for manual placement) the user toggles, then two commit buttons.
// Stations and zoning have no grid (subgroups is empty): they're a single
// "do you know this or should Cirrus derive it" choice. Rendered as a
// full-viewport centered overlay (see .ls-placement-backdrop in index.css)
// so it reads as a real step in the flow, not a tooltip pinned to the
// canvas.
export function PlacementQuestionBox({
  category, index, subgroups, selected, onToggleSubgroup, onSelectAll, hoveredSubgroup, onHoverSubgroup, note, onCommit,
}: {
  category: PlacementCategory;
  index: number;
  subgroups: PlacementSubgroup[];
  selected: Record<string, boolean>;
  onToggleSubgroup: (key: string) => void;
  onSelectAll: () => void;
  hoveredSubgroup: string | null;
  onHoverSubgroup: (key: string | null) => void;
  note?: string;
  onCommit: (mode: 'manual' | 'derived') => void;
}) {
  const hasGrid = subgroups.length > 0;
  const anySelected = !hasGrid || subgroups.some((s) => selected[s.key]);
  const allSelected = hasGrid && subgroups.every((s) => selected[s.key]);
  return (
    <div className="ls-placement-backdrop">
      <div className="ls-placement-question">
        <div className="ls-placement-question-header">{index}. {CATEGORY_LABELS[category]}</div>
        <p className="ls-placement-question-text">{CATEGORY_QUESTIONS[category]}</p>
        {hasGrid && (
          <>
            <div className="ls-placement-subgroups-toolbar">
              <button type="button" className="ls-placement-select-all" disabled={allSelected} onClick={onSelectAll}>Select all</button>
            </div>
            <div className="ls-placement-subgroups">
              {subgroups.map((subgroup) => (
                <button
                  key={subgroup.key}
                  type="button"
                  className={`ls-placement-subgroup ${selected[subgroup.key] ? 'manual' : 'derived'}`}
                  onClick={() => onToggleSubgroup(subgroup.key)}
                  onMouseEnter={subgroup.hoverItems ? () => onHoverSubgroup(subgroup.key) : undefined}
                  onMouseLeave={subgroup.hoverItems ? () => onHoverSubgroup(null) : undefined}
                >
                  <b>{subgroup.label}</b>
                  {subgroup.hoverItems && hoveredSubgroup === subgroup.key && (
                    <small>{subgroup.hoverItems.join(', ')}</small>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
        {note && <p className="ls-help">{note}</p>}
        <div className="ls-placement-question-actions">
          <button type="button" className={`ls-qb-manual ${anySelected ? 'active' : ''}`} disabled={!anySelected} onClick={() => onCommit('manual')}>Manually place</button>
          <button type="button" className="ls-qb-derive" disabled={allSelected} onClick={() => onCommit('derived')}>Derive from unassigned space</button>
        </div>
        <p className="ls-help ls-placement-verb-hint">{hasGrid ? `${CATEGORY_CTA_VERB[category]} what you selected yourself — everything else is derived from unassigned space.` : 'Cirrus calculates and generates whatever you leave derived.'}</p>
      </div>
    </div>
  );
}
