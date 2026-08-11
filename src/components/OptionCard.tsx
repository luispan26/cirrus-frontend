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
  const disabled = option.disabled ?? false;
  return (
    <div
      className={`opt-card${selected ? ' sel' : ''}`}
      style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
      onClick={disabled ? undefined : onClick}
      tabIndex={disabled ? -1 : 0}
    >
      {showRisk && option.risk && <div className="bsl-bar" style={{ background: option.risk }} />}
      <div className="opt-body">
        <h4>{option.l}{disabled && <span style={{ fontWeight: 600, fontSize: 11, marginLeft: 6, color: 'var(--mid)' }}>Coming soon</span>}</h4>
        {option.d && <p>{option.d}</p>}
        {option.link && (
          <a
            href={option.link.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 11, color: 'var(--teal)', display: 'inline-block', marginTop: 4 }}
          >
            {option.link.label} →
          </a>
        )}
      </div>
      <div className="opt-check">✓</div>
    </div>
  );
}
