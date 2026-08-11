import { useEffect, useRef, useState } from 'react';
import { CHAT_STREAM_URL } from '../apollo';

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  isNote?: boolean;
}

let msgId = 0;

export function ChatWidget({
  sessionId,
  expanded,
  onToggleExpand,
  onIntakeComplete,
}: {
  sessionId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onIntakeComplete: (finalIntakeJson: Record<string, unknown>) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setMessages([{ id: msgId++, role: 'ai', text: 'Hi — I am the Cirrus assistant. Tell me about the lab you want to build (biosafety level, what you will run, budget) and I will take it from there.' }]);
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, typing]);

  function extractIntakeJSON(fullText: string): Record<string, unknown> | null {
    const idx = fullText.indexOf('INTAKE_COMPLETE');
    if (idx === -1) return null;
    const before = fullText.slice(0, idx);
    const m = before.match(/```json\s*([\s\S]*?)```/) || before.match(/(\{[\s\S]*\})/);
    if (!m) return null;
    try {
      return JSON.parse((m[1] || m[0]).trim());
    } catch {
      return null;
    }
  }

  async function callBackendStreaming(text: string, onToken: (piece: string) => void): Promise<string> {
    const res = await fetch(CHAT_STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, chatInput: text }),
    });
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        let obj: any;
        try {
          obj = JSON.parse(trimmed.slice(5).trim());
        } catch {
          continue;
        }
        if (obj.type === 'item' && obj.content) {
          full += obj.content;
          onToken(obj.content);
        }
        if (obj.type === 'error') throw new Error(obj.content || 'Chat stream error');
      }
    }
    return full;
  }

  async function runTurn(text: string) {
    setTyping(true);
    let streamId: number | null = null;
    let visible = '';
    let frozen = false;

    const full = await callBackendStreaming(text, (piece) => {
      if (streamId === null) {
        setTyping(false);
        streamId = msgId++;
        setMessages((prev) => [...prev, { id: streamId as number, role: 'ai', text: '' }]);
      }
      if (!frozen) {
        const bracePos = piece.indexOf('{');
        if (bracePos === -1) {
          visible += piece;
        } else {
          visible += piece.slice(0, bracePos);
          frozen = true;
        }
        const capturedId = streamId;
        const capturedVisible = visible;
        setMessages((prev) => prev.map((m) => (m.id === capturedId ? { ...m, text: capturedVisible } : m)));
      }
    });

    if (streamId === null) {
      setTyping(false);
      streamId = msgId++;
      setMessages((prev) => [...prev, { id: streamId as number, role: 'ai', text: '' }]);
    }

    const parsed = extractIntakeJSON(full);
    if (parsed) {
      const idToRemove = visible.trim() ? null : streamId;
      setMessages((prev) => {
        const withoutEmpty = idToRemove !== null ? prev.filter((m) => m.id !== idToRemove) : prev;
        return [...withoutEmpty, { id: msgId++, role: 'ai', text: 'Got everything I need — handing this off to generate your report…', isNote: true }];
      });
      try {
        onIntakeComplete(parsed);
      } catch (e) {
        setMessages((prev) => [...prev, { id: msgId++, role: 'ai', text: 'Could not start report generation: ' + String((e as Error).message || e), isNote: true }]);
      }
    }
  }

  async function handleSend() {
    if (sending) return;
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [...prev, { id: msgId++, role: 'user', text }]);
    setSending(true);
    try {
      await runTurn(text);
    } catch (e) {
      setTyping(false);
      setMessages((prev) => [...prev, { id: msgId++, role: 'ai', text: 'Connection error: ' + String((e as Error).message || e), isNote: true }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`wb-panel${expanded ? ' wb-expanded' : ''}`}>
      <div className="wb-header">
        <div className="wb-header-title">Cirrus assistant <span className="wb-header-sub">— via cirrus-backend</span></div>
        <button className="wb-expand-btn" onClick={onToggleExpand} title={expanded ? 'Collapse' : 'Expand to full-screen'}>
          {expanded ? '⤡' : '⤢'}
        </button>
      </div>
      <div className="wb-body" ref={bodyRef}>
        {messages.map((m) => (
          <div key={m.id} className={`wb-msg ${m.role}`} style={m.isNote ? { fontSize: 11, color: m.text.startsWith('Connection') || m.text.startsWith('Could not') ? '#FF3FA4' : '#69707F' } : undefined}>
            {m.text}
          </div>
        ))}
        {typing && (
          <div className="wb-typing"><span /><span /><span /></div>
        )}
      </div>
      <div className="wb-input-row">
        <input
          type="text"
          className="wb-input"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button className="btn-teal" style={{ padding: '12px 26px', borderRadius: 24 }} onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
