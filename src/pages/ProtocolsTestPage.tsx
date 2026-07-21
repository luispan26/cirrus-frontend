import { useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { PROTOCOLS_IO_PROTOCOL_QUERY } from '../graphql/operations';

interface ProtocolStepFile { name: string; url: string; }
interface ProtocolStepImage { url: string; legend?: string; width?: number; height?: number; }
interface ProtocolStepTable { colTitles: string[]; rowsJson: string; legend?: string; }
interface ProtocolStepWellPlate { wellJson: string; columnHeaders: string[]; rowHeaders: string[]; }
interface ProtocolStep {
  id: string; number: string; text: string; durationSeconds?: number;
  station?: string; stationColor?: string; stationLocation?: string;
  files: ProtocolStepFile[]; notes: string[]; images: ProtocolStepImage[];
  tables: ProtocolStepTable[]; wellPlates: ProtocolStepWellPlate[];
}
interface ProtocolSection { title: string; estimatedTime: string; steps: ProtocolStep[]; }
interface ProtocolsIoProtocol {
  id: string; title: string; sourceUrl: string;
  abstract?: string; beforeStart?: string; guidelines?: string;
  sections: ProtocolSection[];
}

function durationLabel(seconds?: number): string | null {
  if (seconds === undefined || seconds === null) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} hr`;
}

export function ProtocolsTestPage() {
  const navigate = useNavigate();
  const [protocolId, setProtocolId] = useState('');
  const [fetchProtocol, { data, loading, error }] = useLazyQuery<{ protocolsIoProtocol: ProtocolsIoProtocol }>(
    PROTOCOLS_IO_PROTOCOL_QUERY,
  );

  function handleFetch() {
    const trimmed = protocolId.trim();
    if (!trimmed) return;
    fetchProtocol({ variables: { protocolId: trimmed } });
  }

  const protocol = data?.protocolsIoProtocol;

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            PROTOCOLS.IO TEST PAGE
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Fetch and render a protocol by ID — dev tool, not a polished feature</div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          className="field-input"
          style={{ flex: 1 }}
          placeholder="Protocol ID (e.g. 12345)"
          value={protocolId}
          onChange={(e) => setProtocolId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
        />
        <button className="btn-teal" onClick={handleFetch} disabled={loading || !protocolId.trim()}>
          {loading ? 'Fetching…' : 'Fetch'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 14, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginBottom: 20 }}>
          {error.message}
        </div>
      )}

      {protocol && (
        <div>
          <h2 style={{ marginBottom: 4 }}>{protocol.title}</h2>
          <a href={protocol.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--teal)' }}>
            {protocol.sourceUrl}
          </a>

          {protocol.abstract && (
            <div style={{ marginTop: 16 }}>
              <div className="field-label">Abstract</div>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{protocol.abstract}</p>
            </div>
          )}
          {protocol.beforeStart && (
            <div style={{ marginTop: 16 }}>
              <div className="field-label">Before starting</div>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{protocol.beforeStart}</p>
            </div>
          )}
          {protocol.guidelines && (
            <div style={{ marginTop: 16 }}>
              <div className="field-label">Guidelines</div>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{protocol.guidelines}</p>
            </div>
          )}

          <div className="sec-head" style={{ marginTop: 28 }}>
            Sections ({protocol.sections.length})
            <div className="sec-line" />
          </div>

          {protocol.sections.map((section) => (
            <div key={section.title} style={{ marginBottom: 20, border: '1px solid var(--br)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>{section.title || '(untitled section)'}</strong>
                <span style={{ fontSize: 12, color: 'var(--mid)' }}>{section.estimatedTime}</span>
              </div>
              {section.steps.map((step) => {
                const dur = durationLabel(step.durationSeconds);
                const extras: string[] = [];
                if (step.files.length) extras.push(`${step.files.length} file(s)`);
                if (step.notes.length) extras.push(`${step.notes.length} note(s)`);
                if (step.images.length) extras.push(`${step.images.length} image(s)`);
                if (step.tables.length) extras.push(`${step.tables.length} table(s)`);
                if (step.wellPlates.length) extras.push(`${step.wellPlates.length} well plate(s)`);
                return (
                  <div key={step.id} style={{ padding: '8px 0', borderTop: '1px solid var(--br)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--mid)', minWidth: 32 }}>{step.number}</span>
                      <span style={{ fontSize: 13 }}>{step.text}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, marginLeft: 40, fontSize: 11, color: 'var(--mid)' }}>
                      {dur && <span>⏱ {dur}</span>}
                      {step.station && <span>📍 {step.station}</span>}
                      {extras.map((e) => <span key={e}>{e}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}