import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChatWidget } from '../components/ChatWidget';
import { SyncBadge } from '../components/SyncBadge';
import { useIntakeSync } from '../hooks/useIntakeSync';

export function ChatPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const { sessionId, status, completeIntake } = useIntakeSync(() => {
    navigate('/generating');
  });

  async function handleIntakeComplete(finalIntakeJson: Record<string, unknown>) {
    await completeIntake(finalIntakeJson);
    navigate('/generating');
  }

  return (
    <div className="screen customchat-screen">
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>CIRRUS</div>
        <div style={{ flex: 1 }} />
        <SyncBadge status={status} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button className="qm-mode-toggle" onClick={() => navigate('/scenario')}>← Back</button>
      </div>
      <ChatWidget
        sessionId={sessionId}
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
        onIntakeComplete={handleIntakeComplete}
      />
    </div>
  );
}
