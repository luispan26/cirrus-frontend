import type { QuestionOption } from '../lib/questions';

export function OptionCard({
  option,
  selected,
  showRisk,
  onClick,
}: {
  option: QuestionOption;
  selected: boolean;
  showRisk?: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`opt-card${selected ? ' sel' : ''}`} onClick={onClick} tabIndex={0}>
      {showRisk && option.risk && <div className="bsl-bar" style={{ background: option.risk }} />}
      <div className="opt-body">
        <h4>{option.l}</h4>
        {option.d && <p>{option.d}</p>}
      </div>
      <div className="opt-check">✓</div>
    </div>
  );
}
