import { useState } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  PROTOCOLS_IO_PROTOCOL_QUERY, EQUIPMENT_LIST_QUERY,
  STEP_EQUIPMENT_MAPPINGS_FOR_PROTOCOL_QUERY,
  ASSIGN_EQUIPMENT_TO_STEP_MUTATION, REMOVE_STEP_EQUIPMENT_MAPPING_MUTATION,
} from '../graphql/operations';

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
interface EquipmentRow { equipmentId: string; name: string; }
interface StepEquipmentMapping { id: string; protocolId: string; stepId: string; stepNumber?: string; equipmentId: string; }

function durationLabel(seconds?: number): string | null {
  if (seconds === undefined || seconds === null) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? '${minutes} min' : '${(minutes / 60).toFixed(1)} hr';
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function ProtocolsTestPage() {
  const navigate = useNavigate();
  const [protocolId, setProtocolId] = useState('');
  const [fetchProtocol, { data, loading, error }] = useLazyQuery<{ protocolsIoProtocol: ProtocolsIoProtocol }>(
    PROTOCOLS_IO_PROTOCOL_QUERY,
  );
  const protocol = data?.protocolsIoProtocol;

  const { data: equipmentData } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const equipmentList = equipmentData?.equipmentList ?? [];

  const { data: mappingsData, refetch: refetchMappings } = useQuery<{ stepEquipmentMappingsForProtocol: StepEquipmentMapping[] }>(
    STEP_EQUIPMENT_MAPPINGS_FOR_PROTOCOL_QUERY,
    { variables: { protocolId: protocol?.id ?? '' }, skip: !protocol?.id },
  );
  const mappings = mappingsData?.stepEquipmentMappingsForProtocol ?? [];

  const [assignEquipmentToStep] = useMutation(ASSIGN_EQUIPMENT_TO_STEP_MUTATION);
  const [removeStepEquipmentMapping] = useMutation(REMOVE_STEP_EQUIPMENT_MAPPING_MUTATION);

  const [pickerSelection, setPickerSelection] = useState<Record<string, string>>({});
  const [assignError, setAssignError] = useState<Record<string, string>>({});

  function equipmentName(equipmentId: string): string {
    return equipmentList.find((e) => e.equipmentId === equipmentId)?.name ?? equipmentId;
  }

  function handleFetch() {
    const trimmed = protocolId.trim();
    if (!trimmed) return;
    fetchProtocol({ variables: { protocolId: trimmed } });
  }

  async function handleAssign(step: ProtocolStep) {
    const equipmentId = pickerSelection[step.id];
    if (!equipmentId || !protocol) return;
    setAssignError((prev) => ({ ...prev, [step.id]: '' }));
    try {
      await assignEquipmentToStep({
        variables: { input: { protocolId: protocol.id, stepId: step.id, stepNumber: step.number, equipmentId } },
      });
      setPickerSelection((prev) => ({ ...prev, [step.id]: '' }));
      refetchMappings();
    } catch (e) {
      setAssignError((prev) => ({ ...prev, [step.id]: errMsg(e) }));
    }
  }

  async function handleRemove(mappingId: string) {
    await removeStepEquipmentMapping({ variables: { id: mappingId } });
    refetchMappings();
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            PROTOCOLS.IO TEST PAGE
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Fetch a protocol, then assign equipment to individual steps</div>
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
                  if (step.files.length) extras.push('${step.files.length} file(s)');
                  if (step.notes.length) extras.push('${step.notes.length} note(s)');
                  if (step.images.length) extras.push('${step.images.length} image(s)');
                  if (step.tables.length) extras.push('${step.tables.length} table(s)');
                  if (step.wellPlates.length) extras.push('${step.wellPlates.length} well plate(s)');
                  const stepMappings = mappings.filter((m) => m.stepId === step.id);

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

                      <div style={{ marginLeft: 40, marginTop: 6 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          {stepMappings.map((m) => (
                            <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--teal)', color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 11 }}>
                              {equipmentName(m.equipmentId)}
                              <button onClick={() => handleRemove(m.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, padding: 0 }}>×</button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select
                            value={pickerSelection[step.id] ?? ''}
                            onChange={(e) => setPickerSelection((prev) => ({ ...prev, [step.id]: e.target.value }))}
                            style={{ fontSize: 11 }}
                          >
                            <option value="">Assign equipment…</option>
                            {equipmentList.map((eq) => <option key={eq.equipmentId} value={eq.equipmentId}>{eq.name}</option>)}
                          </select>
                          <button className="btn-out" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleAssign(step)}>+ Assign</button>
                        </div>
                        {assignError[step.id] && <div style={{ color: '#a33', fontSize: 11 }}>{assignError[step.id]}</div>}
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