import type { SyncStatus } from '../hooks/useIntakeSync';

export function SyncBadge({ status }: { status: SyncStatus }) {
  const label = status === 'live' ? 'Connected' : status === 'err' ? 'Reconnecting…' : 'Backend';
  return (
    <div className="sync-badge">
      <span className={`sync-dot ${status === 'live' ? 'live' : status === 'err' ? 'err' : ''}`} />
      <span>{label}</span>
    </div>
  );
}
