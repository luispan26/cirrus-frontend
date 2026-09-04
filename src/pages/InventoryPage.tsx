import { useState } from 'react';
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

  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', costUsd: '', widthFt: '', depthFt: '', heightFt: '' });
  const [editFormError, setEditFormError] = useState('');

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
  function startEditEquipment(eq: EquipmentRow) {
    setEditingEquipmentId(eq.equipmentId);
    setEditForm({ name: eq.name, costUsd: String(eq.costUsd), widthFt: String(eq.widthFt), depthFt: String(eq.depthFt), heightFt: String(eq.heightFt) });
    setEditFormError('');
  }
  function cancelEditEquipment() {
    setEditingEquipmentId(null);
    setEditFormError('');
  }
  async function handleSaveEquipment(id: string) {
    setEditFormError('');
    const { name, costUsd, widthFt, depthFt, heightFt } = editForm;
    if (!name.trim() || !costUsd || !widthFt || !depthFt || !heightFt) {
      setEditFormError('Name, cost, and all three dimensions are required.');
      return;
    }
    try {
      await updateEquipment({
        variables: {
          equipmentId: id,
          input: { name: name.trim(), costUsd: parseFloat(costUsd), widthFt: parseFloat(widthFt), depthFt: parseFloat(depthFt), heightFt: parseFloat(heightFt) },
        },
      });
      setEditingEquipmentId(null);
      refetchEquipment();
    } catch (e) {
      setEditFormError(errMsg(e));
    }
  }
  async function handleReassignEquipment(id: string, stationId: string) {
    await assignEquipment({ variables: { equipmentId: id, stationId: stationId || null } });
    refetchEquipment();
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            EQUIPMENT & INVENTORY
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Publish equipment to the backend, and assign it to stations</div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 1300, margin: '0 auto', width: '100%' }}>

        <div className="sec-head">Equipment<div className="sec-line" /></div>
        <p className="q-inline-help" style={{ marginTop: 0 }}>
          Fields boxed in <span style={{ color: '#a67c00', fontWeight: 600 }}>amber</span> are still Canvas-synced placeholders — edit them to confirm the real value.
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
            <col style={{ width: 100 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 150 }} />
          </colgroup>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--br)' }}>
              <th style={{ padding: '6px 10px 6px 6px' }}>ID</th>
              <th style={{ padding: '6px 10px' }}>Name</th>
              <th style={{ padding: '6px 10px' }}>Cost</th>
              <th style={{ padding: '6px 10px' }}>Dimensions (ft)</th>
              <th style={{ padding: '6px 10px' }}>Station</th>
              <th style={{ padding: '6px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(equipmentData?.equipmentList ?? []).map((eq) => {
              if (editingEquipmentId === eq.equipmentId) {
                return (
                  <tr key={eq.equipmentId} style={{ borderBottom: '1px solid var(--br)' }}>
                    <td style={{ padding: '6px 10px 6px 6px', fontFamily: 'var(--mono)' }}>{eq.equipmentId}</td>
                    <td colSpan={5} style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', maxWidth: 900 }}>
                        <div style={{ flex: '0 1 220px' }}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Name</label>
                          <input className="field-input" style={{ width: '100%' }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div style={{ flex: '0 0 100px' }}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Cost ($)</label>
                          <input className="field-input" style={{ width: '100%' }} type="number" value={editForm.costUsd} onChange={(e) => setEditForm({ ...editForm, costUsd: e.target.value })} />
                        </div>
                        <div style={{ flex: '0 0 90px' }}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Width (ft)</label>
                          <input className="field-input" style={{ width: '100%' }} type="number" value={editForm.widthFt} onChange={(e) => setEditForm({ ...editForm, widthFt: e.target.value })} />
                        </div>
                        <div style={{ flex: '0 0 90px' }}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Depth (ft)</label>
                          <input className="field-input" style={{ width: '100%' }} type="number" value={editForm.depthFt} onChange={(e) => setEditForm({ ...editForm, depthFt: e.target.value })} />
                        </div>
                        <div style={{ flex: '0 0 90px' }}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Height (ft)</label>
                          <input className="field-input" style={{ width: '100%' }} type="number" value={editForm.heightFt} onChange={(e) => setEditForm({ ...editForm, heightFt: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-teal" style={{ padding: '9px 14px', fontSize: 12 }} onClick={() => handleSaveEquipment(eq.equipmentId)}>Save</button>
                          <button className="btn-out" style={{ padding: '9px 14px', fontSize: 12 }} onClick={cancelEditEquipment}>Cancel</button>
                        </div>
                      </div>
                      {editFormError && <div style={{ color: '#a33', fontSize: 12, marginTop: 8 }}>{editFormError}</div>}
                    </td>
                  </tr>
                );
              }
              // needsDimensions means this row is still a Canvas-synced
              // placeholder, but the placeholder only ever touches two
              // areas — cost and the width/depth/height trio (see
              // upsertEquipmentFromCanvas's placeholder values: costUsd 0,
              // widthFt/depthFt/heightFt 1) — so only box the field(s) that
              // still hold that sentinel value, not the whole row, matching
              // what a human still needs to go confirm.
              const costIsPlaceholder = eq.needsDimensions && eq.costUsd === 0;
              const dimsArePlaceholder = eq.needsDimensions && eq.widthFt === 1 && eq.depthFt === 1 && eq.heightFt === 1;
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
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', ...(costIsPlaceholder ? placeholderCellStyle : {}) }}>${eq.costUsd.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', ...(dimsArePlaceholder ? placeholderCellStyle : {}) }}>{eq.widthFt} × {eq.depthFt} × {eq.heightFt}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <SearchableSelect
                      style={{ width: '100%' }}
                      options={[{ value: '', label: 'Unassigned' }, ...stationOptions]}
                      value={eq.stationId ?? ''}
                      onChange={(v) => handleReassignEquipment(eq.equipmentId, v)}
                      placeholder="Unassigned"
                    />
                  </td>
                  <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                    <button className="btn-out" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEditEquipment(eq)}>Edit</button>
                    <button className="btn-out" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteEquipment(eq.equipmentId)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {!eqLoading && (equipmentData?.equipmentList ?? []).length === 0 && (
              <tr><td colSpan={6} style={{ padding: 12, color: 'var(--mid)' }}>No equipment yet.</td></tr>
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}