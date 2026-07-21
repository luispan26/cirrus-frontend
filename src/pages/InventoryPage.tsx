import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  STATIONS_QUERY, EQUIPMENT_LIST_QUERY, INVENTORY_ITEMS_QUERY,
  CREATE_EQUIPMENT_MUTATION, CREATE_INVENTORY_ITEM_MUTATION,
  ASSIGN_EQUIPMENT_TO_STATION_MUTATION, ASSIGN_INVENTORY_ITEM_TO_STATION_MUTATION,
  DELETE_EQUIPMENT_MUTATION, DELETE_INVENTORY_ITEM_MUTATION,
} from '../graphql/operations';

interface Station { stationId: string; name: string; }
interface EquipmentRow { equipmentId: string; name: string; costUsd: number; widthFt: number; depthFt: number; heightFt: number; stationId: string | null; }
interface InventoryRow { inventoryId: string; name: string; stockNumber: number; stationId: string | null; }

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function InventoryPage() {
  const navigate = useNavigate();
  const { data: stationsData } = useQuery<{ stations: Station[] }>(STATIONS_QUERY);
  const stations = stationsData?.stations ?? [];

  const { data: equipmentData, refetch: refetchEquipment, loading: eqLoading, error: eqError } =
    useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const { data: inventoryData, refetch: refetchInventory, loading: invLoading, error: invError } =
    useQuery<{ inventoryItems: InventoryRow[] }>(INVENTORY_ITEMS_QUERY);

  const [createEquipment] = useMutation(CREATE_EQUIPMENT_MUTATION);
  const [createInventoryItem] = useMutation(CREATE_INVENTORY_ITEM_MUTATION);
  const [assignEquipment] = useMutation(ASSIGN_EQUIPMENT_TO_STATION_MUTATION);
  const [assignInventory] = useMutation(ASSIGN_INVENTORY_ITEM_TO_STATION_MUTATION);
  const [deleteEquipment] = useMutation(DELETE_EQUIPMENT_MUTATION);
  const [deleteInventoryItem] = useMutation(DELETE_INVENTORY_ITEM_MUTATION);

  const [eqForm, setEqForm] = useState({ equipmentId: '', name: '', costUsd: '', widthFt: '', depthFt: '', heightFt: '', stationId: '' });
  const [eqFormError, setEqFormError] = useState('');

  const [invForm, setInvForm] = useState({ inventoryId: '', name: '', stockNumber: '', stationId: '' });
  const [invFormError, setInvFormError] = useState('');

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

  async function handleCreateInventoryItem() {
    setInvFormError('');
    const { inventoryId, name, stockNumber, stationId } = invForm;
    if (!inventoryId.trim() || !name.trim() || !stockNumber) {
      setInvFormError('ID, name, and stock number are required.');
      return;
    }
    try {
      await createInventoryItem({
        variables: { input: { inventoryId: inventoryId.trim(), name: name.trim(), stockNumber: parseInt(stockNumber, 10), stationId: stationId || null } },
      });
      setInvForm({ inventoryId: '', name: '', stockNumber: '', stationId: '' });
      refetchInventory();
    } catch (e) {
      setInvFormError(errMsg(e));
    }
  }

  async function handleDeleteEquipment(id: string) {
    await deleteEquipment({ variables: { equipmentId: id } });
    refetchEquipment();
  }
  async function handleDeleteInventoryItem(id: string) {
    await deleteInventoryItem({ variables: { inventoryId: id } });
    refetchInventory();
  }
  async function handleReassignEquipment(id: string, stationId: string) {
    await assignEquipment({ variables: { equipmentId: id, stationId: stationId || null } });
    refetchEquipment();
  }
  async function handleReassignInventory(id: string, stationId: string) {
    await assignInventory({ variables: { inventoryId: id, stationId: stationId || null } });
    refetchInventory();
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            EQUIPMENT & INVENTORY
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Publish equipment and inventory to the backend, and assign them to stations</div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%' }}>

        <div className="sec-head">Equipment<div className="sec-line" /></div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 8 }}>
          <input className="field-input" placeholder="ID" value={eqForm.equipmentId} onChange={(e) => setEqForm({ ...eqForm, equipmentId: e.target.value })} />
          <input className="field-input" placeholder="Name" value={eqForm.name} onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })} />
          <input className="field-input" placeholder="Cost ($)" type="number" value={eqForm.costUsd} onChange={(e) => setEqForm({ ...eqForm, costUsd: e.target.value })} />
          <input className="field-input" placeholder="Width (ft)" type="number" value={eqForm.widthFt} onChange={(e) => setEqForm({ ...eqForm, widthFt: e.target.value })} />
          <input className="field-input" placeholder="Depth (ft)" type="number" value={eqForm.depthFt} onChange={(e) => setEqForm({ ...eqForm, depthFt: e.target.value })} />
          <input className="field-input" placeholder="Height (ft)" type="number" value={eqForm.heightFt} onChange={(e) => setEqForm({ ...eqForm, heightFt: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select className="field-input" style={{ flex: 1 }} value={eqForm.stationId} onChange={(e) => setEqForm({ ...eqForm, stationId: e.target.value })}>
            <option value="">No station (unassigned)</option>
            {stations.map((s) => <option key={s.stationId} value={s.stationId}>{s.name}</option>)}
          </select>
          <button className="btn-teal" onClick={handleCreateEquipment}>+ Add equipment</button>
        </div>
        {eqFormError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 12 }}>{eqFormError}</div>}
        {eqError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 12 }}>{eqError.message}</div>}

        <table style={{ width: '100%', fontSize: 13, marginBottom: 32, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--br)' }}>
              <th style={{ padding: 6 }}>ID</th><th>Name</th><th>Cost</th><th>Dimensions (ft)</th><th>Station</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(equipmentData?.equipmentList ?? []).map((eq) => (
              <tr key={eq.equipmentId} style={{ borderBottom: '1px solid var(--br)' }}>
                <td style={{ padding: 6, fontFamily: 'var(--mono)' }}>{eq.equipmentId}</td>
                <td>{eq.name}</td>
                <td>${eq.costUsd.toLocaleString()}</td>
                <td>{eq.widthFt} × {eq.depthFt} × {eq.heightFt}</td>
                <td>
                  <select value={eq.stationId ?? ''} onChange={(e) => handleReassignEquipment(eq.equipmentId, e.target.value)}>
                    <option value="">Unassigned</option>
                    {stations.map((s) => <option key={s.stationId} value={s.stationId}>{s.name}</option>)}
                  </select>
                </td>
                <td><button className="btn-out" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteEquipment(eq.equipmentId)}>Delete</button></td>
              </tr>
            ))}
            {!eqLoading && (equipmentData?.equipmentList ?? []).length === 0 && (
              <tr><td colSpan={6} style={{ padding: 12, color: 'var(--mid)' }}>No equipment yet.</td></tr>
            )}
          </tbody>
        </table>

        <div className="sec-head">Inventory<div className="sec-line" /></div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
          <input className="field-input" placeholder="ID" value={invForm.inventoryId} onChange={(e) => setInvForm({ ...invForm, inventoryId: e.target.value })} />
          <input className="field-input" placeholder="Name" value={invForm.name} onChange={(e) => setInvForm({ ...invForm, name: e.target.value })} />
          <input className="field-input" placeholder="Stock number" type="number" value={invForm.stockNumber} onChange={(e) => setInvForm({ ...invForm, stockNumber: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select className="field-input" style={{ flex: 1 }} value={invForm.stationId} onChange={(e) => setInvForm({ ...invForm, stationId: e.target.value })}>
            <option value="">No station (unassigned)</option>
            {stations.map((s) => <option key={s.stationId} value={s.stationId}>{s.name}</option>)}
          </select>
          <button className="btn-teal" onClick={handleCreateInventoryItem}>+ Add inventory item</button>
        </div>
        {invFormError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 12 }}>{invFormError}</div>}
        {invError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 12 }}>{invError.message}</div>}

        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--br)' }}>
              <th style={{ padding: 6 }}>ID</th><th>Name</th><th>Stock</th><th>Station</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(inventoryData?.inventoryItems ?? []).map((inv) => (
              <tr key={inv.inventoryId} style={{ borderBottom: '1px solid var(--br)' }}>
                <td style={{ padding: 6, fontFamily: 'var(--mono)' }}>{inv.inventoryId}</td>
                <td>{inv.name}</td>
                <td>{inv.stockNumber}</td>
                <td>
                  <select value={inv.stationId ?? ''} onChange={(e) => handleReassignInventory(inv.inventoryId, e.target.value)}>
                    <option value="">Unassigned</option>
                    {stations.map((s) => <option key={s.stationId} value={s.stationId}>{s.name}</option>)}
                  </select>
                </td>
                <td><button className="btn-out" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteInventoryItem(inv.inventoryId)}>Delete</button></td>
              </tr>
            ))}
            {!invLoading && (inventoryData?.inventoryItems ?? []).length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12, color: 'var(--mid)' }}>No inventory yet.</td></tr>
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}