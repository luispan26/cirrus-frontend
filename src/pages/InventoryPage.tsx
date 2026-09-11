import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  STATIONS_QUERY, EQUIPMENT_LIST_QUERY,
  CREATE_EQUIPMENT_MUTATION,
  ASSIGN_EQUIPMENT_TO_STATION_MUTATION,
  DELETE_EQUIPMENT_MUTATION, UPDATE_EQUIPMENT_MUTATION,
} from '../graphql/operations';
import { SearchableSelect } from '../components/SearchableSelect';

interface Station { stationId: string; name: string; }
interface EquipmentRow {
  equipmentId: string; name: string; costUsd: number; widthFt: number; depthFt: number; heightFt: number; stationId: string | null;
  needsDimensions: boolean; canvasDeleted: boolean;
  // canvasTags: sync-owned, replaced wholesale from Canvas on every sync.
  // tags: human-entered, never touched by the sync. allTags: the deduped
  // union of both — what a row is actually filterable/searchable by.
  canvasTags: string[]; tags: string[]; allTags: string[];
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function InventoryPage() {
  const navigate = useNavigate();
  const { data: stationsData } = useQuery<{ stations: Station[] }>(STATIONS_QUERY);
  const stations = stationsData?.stations ?? [];
  const stationOptions = stations.map((s) => ({ value: s.stationId, label: s.name }));

  const { data: equipmentData, refetch: refetchEquipment, loading: eqLoading, error: eqError } =
    useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);

  const [createEquipment] = useMutation(CREATE_EQUIPMENT_MUTATION);
  const [assignEquipment] = useMutation(ASSIGN_EQUIPMENT_TO_STATION_MUTATION);
  const [deleteEquipment] = useMutation(DELETE_EQUIPMENT_MUTATION);
  const [updateEquipment] = useMutation(UPDATE_EQUIPMENT_MUTATION);

  const [eqForm, setEqForm] = useState({ equipmentId: '', name: '', costUsd: '', widthFt: '', depthFt: '', heightFt: '', stationId: '' });
  const [eqFormError, setEqFormError] = useState('');
  const [rowError, setRowError] = useState<{ equipmentId: string; message: string } | null>(null);

  async function handleCreateEquipment() {
    setEqFormError('');
    const { equipmentId, name, costUsd, widthFt, depthFt, heightFt, stationId } = eqForm;
    if (!equipmentId.trim() || !name.trim() || !costUsd || !widthFt || !depthFt || !heightFt) {
      setEqFormError('ID, name, cost, and all three dimensions are required.');
      return;
    }
    try {
      await createEquipment({
        variables: {
          input: {
            equipmentId: equipmentId.trim(), name: name.trim(),
            costUsd: parseFloat(costUsd), widthFt: parseFloat(widthFt), depthFt: parseFloat(depthFt), heightFt: parseFloat(heightFt),
            stationId: stationId || null,
          },
        },
      });
      setEqForm({ equipmentId: '', name: '', costUsd: '', widthFt: '', depthFt: '', heightFt: '', stationId: '' });
      refetchEquipment();
    } catch (e) {
      setEqFormError(errMsg(e));
    }
  }

  async function handleDeleteEquipment(id: string) {
    await deleteEquipment({ variables: { equipmentId: id } });
    refetchEquipment();
  }
  async function handleReassignEquipment(id: string, stationId: string) {
    await assignEquipment({ variables: { equipmentId: id, stationId: stationId || null } });
    refetchEquipment();
  }

  // Commits a single field edited in place in the table. `value` is the raw
  // input string; a no-op (blank, unchanged, or unparsable number) skips the
  // mutation entirely so blurring a field you didn't touch doesn't refetch.
  async function handleUpdateField(eq: EquipmentRow, field: 'costUsd' | 'widthFt' | 'depthFt' | 'heightFt', value: string) {
    const num = parseFloat(value);
    if (Number.isNaN(num) || num === eq[field]) return;
    setRowError(null);
    try {
      await updateEquipment({ variables: { equipmentId: eq.equipmentId, input: { [field]: num } } });
      refetchEquipment();
    } catch (e) {
      setRowError({ equipmentId: eq.equipmentId, message: errMsg(e) });
    }
  }

  // The dropdown's vocabulary is every tag Canvas actually uses across the
  // catalog (canvasTags, not allTags — a human-added tag on one item
  // shouldn't get offered as a suggestion everywhere else), deduped and
  // sorted. Same source of truth as QuestionsPage's TagFilterPopover.
  const canvasTagOptions = useMemo(() => {
    const equipment = equipmentData?.equipmentList ?? [];
    return Array.from(new Set(equipment.flatMap((eq) => eq.canvasTags))).sort((a, b) => a.localeCompare(b));
  }, [equipmentData]);

  async function handleAddTag(eq: EquipmentRow, tag: string) {
    if (!tag || eq.allTags.includes(tag)) return;
    await updateEquipment({ variables: { equipmentId: eq.equipmentId, input: { tags: [...eq.tags, tag] } } });
    refetchEquipment();
  }

  // Only tags in eq.tags (human-entered) can be removed here — a tag that's
  // in allTags solely via canvasTags is sync-owned and would just reappear
  // on the next Canvas sync, so it's not offered a remove control.
  async function handleRemoveTag(eq: EquipmentRow, tag: string) {
    await updateEquipment({ variables: { equipmentId: eq.equipmentId, input: { tags: eq.tags.filter((t) => t !== tag) } } });
    refetchEquipment();
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            EQUIPMENT DATABASE
          </div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 1300, margin: '0 auto', width: '100%' }}>

        <div className="sec-head">Equipment<div className="sec-line" /></div>
        <p className="q-inline-help" style={{ marginTop: 0 }}>
          Fields boxed in <span style={{ color: '#a67c00', fontWeight: 600 }}>amber</span> still need attention — Canvas-synced cost/dimension placeholders to confirm, or equipment with no tags at all.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input className="field-input" style={{ width: 110 }} placeholder="ID" value={eqForm.equipmentId} onChange={(e) => setEqForm({ ...eqForm, equipmentId: e.target.value })} />
          <input className="field-input" style={{ width: 180, flex: '1 1 180px' }} placeholder="Name" value={eqForm.name} onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })} />
          <input className="field-input" style={{ width: 100 }} placeholder="Cost ($)" type="number" value={eqForm.costUsd} onChange={(e) => setEqForm({ ...eqForm, costUsd: e.target.value })} />
          <input className="field-input" style={{ width: 100 }} placeholder="Width (ft)" type="number" value={eqForm.widthFt} onChange={(e) => setEqForm({ ...eqForm, widthFt: e.target.value })} />
          <input className="field-input" style={{ width: 100 }} placeholder="Depth (ft)" type="number" value={eqForm.depthFt} onChange={(e) => setEqForm({ ...eqForm, depthFt: e.target.value })} />
          <input className="field-input" style={{ width: 100 }} placeholder="Height (ft)" type="number" value={eqForm.heightFt} onChange={(e) => setEqForm({ ...eqForm, heightFt: e.target.value })} />
          <SearchableSelect
            style={{ width: 200 }}
            options={[{ value: '', label: 'No station (unassigned)' }, ...stationOptions]}
            value={eqForm.stationId}
            onChange={(v) => setEqForm({ ...eqForm, stationId: v })}
            placeholder="No station (unassigned)"
          />
          <button className="btn-teal" onClick={handleCreateEquipment}>+ Add equipment</button>
        </div>
        {eqFormError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 12 }}>{eqFormError}</div>}
        {eqError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 12 }}>{eqError.message}</div>}

        <table style={{ width: '100%', fontSize: 13, marginBottom: 32, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 130 }} />
            <col />
            <col style={{ width: 120 }} />
            <col style={{ width: 230 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--br)' }}>
              <th style={{ padding: '6px 10px 6px 6px' }}>ID</th>
              <th style={{ padding: '6px 10px' }}>Name</th>
              <th style={{ padding: '6px 10px' }}>Cost</th>
              <th style={{ padding: '6px 10px' }}>Dimensions (ft)</th>
              <th style={{ padding: '6px 10px' }}>Station</th>
              <th style={{ padding: '6px 10px' }}>Tags</th>
              <th style={{ padding: '6px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(equipmentData?.equipmentList ?? []).map((eq) => {
              // needsDimensions means this row is still a Canvas-synced
              // placeholder, but the placeholder only ever touches two
              // areas — cost and the width/depth/height trio (see
              // upsertEquipmentFromCanvas's placeholder values: costUsd 0,
              // widthFt/depthFt/heightFt 1) — so only box the field(s) that
              // still hold that sentinel value, not the whole row, matching
              // what a human still needs to go confirm.
              const costIsPlaceholder = eq.needsDimensions && eq.costUsd === 0;
              const dimsArePlaceholder = eq.needsDimensions && eq.widthFt === 1 && eq.depthFt === 1 && eq.heightFt === 1;
              const isUntagged = eq.allTags.length === 0;
              const placeholderInputStyle = { outline: '2px solid #a67c00', outlineOffset: -2 };
              const placeholderCellStyle = { outline: '2px solid #a67c00', outlineOffset: -2, borderRadius: 3 };
              return (
                <tr key={eq.equipmentId} style={{ borderBottom: '1px solid var(--br)' }}>
                  <td style={{ padding: '6px 10px 6px 6px', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eq.equipmentId}</td>
                  <td style={{ padding: '6px 10px' }}>
                    {eq.name}
                    {eq.canvasDeleted && (
                      <span title="No longer seen in the last Canvas sync" style={{ marginLeft: 6, fontSize: 11, color: 'var(--mid)', border: '1px solid var(--br)', borderRadius: 4, padding: '1px 5px' }}>missing from Canvas</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <input
                      key={`cost-${eq.costUsd}`}
                      className="field-input"
                      style={{ width: 90, padding: '5px 8px', fontSize: 13, ...(costIsPlaceholder ? placeholderInputStyle : {}) }}
                      type="number"
                      defaultValue={eq.costUsd}
                      onBlur={(e) => handleUpdateField(eq, 'costUsd', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        key={`w-${eq.widthFt}`}
                        className="field-input"
                        title="Width (ft)"
                        style={{ width: 54, padding: '5px 6px', fontSize: 13, ...(dimsArePlaceholder ? placeholderInputStyle : {}) }}
                        type="number"
                        defaultValue={eq.widthFt}
                        onBlur={(e) => handleUpdateField(eq, 'widthFt', e.target.value)}
                      />
                      <span style={{ color: 'var(--mid)' }}>×</span>
                      <input
                        key={`d-${eq.depthFt}`}
                        className="field-input"
                        title="Depth (ft)"
                        style={{ width: 54, padding: '5px 6px', fontSize: 13, ...(dimsArePlaceholder ? placeholderInputStyle : {}) }}
                        type="number"
                        defaultValue={eq.depthFt}
                        onBlur={(e) => handleUpdateField(eq, 'depthFt', e.target.value)}
                      />
                      <span style={{ color: 'var(--mid)' }}>×</span>
                      <input
                        key={`h-${eq.heightFt}`}
                        className="field-input"
                        title="Height (ft)"
                        style={{ width: 54, padding: '5px 6px', fontSize: 13, ...(dimsArePlaceholder ? placeholderInputStyle : {}) }}
                        type="number"
                        defaultValue={eq.heightFt}
                        onBlur={(e) => handleUpdateField(eq, 'heightFt', e.target.value)}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <SearchableSelect
                      style={{ width: '100%' }}
                      options={[{ value: '', label: 'Unassigned' }, ...stationOptions]}
                      value={eq.stationId ?? ''}
                      onChange={(v) => handleReassignEquipment(eq.equipmentId, v)}
                      placeholder="Unassigned"
                    />
                  </td>
                  <td style={{ padding: '6px 10px', ...(isUntagged ? placeholderCellStyle : {}) }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: eq.allTags.length > 0 ? 6 : 0 }}>
                      {eq.allTags.map((tag) => {
                        const removable = eq.tags.includes(tag);
                        return (
                          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--td)', background: 'var(--tl)', border: '1px solid var(--tline)', borderRadius: 4, padding: '1px 4px 1px 6px' }}>
                            {tag}
                            {removable ? (
                              <button
                                onClick={() => handleRemoveTag(eq, tag)}
                                title={`Remove "${tag}"`}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 12, lineHeight: 1, padding: 0 }}
                              >
                                ×
                              </button>
                            ) : (
                              <span title="Synced from Canvas — remove it there" style={{ color: 'var(--mid)', fontSize: 10 }}>🔒</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                    {/* Always reset to blank after adding — this is a
                        one-shot "add a tag" action, not a persistent
                        selection, since a row can carry many tags at once. */}
                    <SearchableSelect
                      style={{ width: '100%' }}
                      options={[
                        { value: '', label: '+ Add tag…', disabled: true },
                        ...canvasTagOptions.filter((tag) => !eq.allTags.includes(tag)).map((tag) => ({ value: tag, label: tag })),
                      ]}
                      value=""
                      onChange={(v) => handleAddTag(eq, v)}
                      placeholder="+ Add tag…"
                    />
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <button className="btn-out" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteEquipment(eq.equipmentId)}>Delete</button>
                    {rowError?.equipmentId === eq.equipmentId && (
                      <div style={{ color: '#a33', fontSize: 11, marginTop: 4 }}>{rowError.message}</div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!eqLoading && (equipmentData?.equipmentList ?? []).length === 0 && (
              <tr><td colSpan={7} style={{ padding: 12, color: 'var(--mid)' }}>No equipment yet.</td></tr>
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}