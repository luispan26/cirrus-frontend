import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  STATIONS_QUERY, UPDATE_STATION_MUTATION, DELETE_STATION_MUTATION,
  EQUIPMENT_LIST_QUERY, INVENTORY_ITEMS_QUERY,
} from '../graphql/operations';

interface StationRow { stationId: string; name: string; category: string; zone: string; typicalSqft: number; positions: number | null; }
interface EquipmentRow { equipmentId: string; name: string; stationId: string | null; }
interface InventoryRow { inventoryId: string; name: string; stationId: string | null; }

type EditBuffer = Partial<{ name: string; category: string; zone: string; typicalSqft: string; positions: string }>;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function StationsPage() {
  const navigate = useNavigate();
  const { data: stationsData, refetch: refetchStations } = useQuery<{ stations: StationRow[] }>(STATIONS_QUERY);
  const { data: equipmentData } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const { data: inventoryData } = useQuery<{ inventoryItems: InventoryRow[] }>(INVENTORY_ITEMS_QUERY);

  const [updateStation] = useMutation(UPDATE_STATION_MUTATION);
  const [deleteStation] = useMutation(DELETE_STATION_MUTATION);

  const [edits, setEdits] = useState<Record<string, EditBuffer>>({});
  const [errorByStation, setErrorByStation] = useState<Record<string, string>>({});

  const stations = stationsData?.stations ?? [];
  const equipment = equipmentData?.equipmentList ?? [];
  const inventory = inventoryData?.inventoryItems ?? [];

  function handleFieldChange(stationId: string, field: keyof EditBuffer, value: string) {
    setEdits((prev) => ({ ...prev, [stationId]: { ...prev[stationId], [field]: value } }));
  }

  async function handleSave(station: StationRow) {
    setErrorByStation((prev) => ({ ...prev, [station.stationId]: '' }));
    const e = edits[station.stationId] ?? {};
    try {
      await updateStation({
        variables: {
          stationId: station.stationId,
          input: {
            name: e.name ?? station.name,
            category: e.category ?? station.category,
            zone: e.zone ?? station.zone,
            typicalSqft: e.typicalSqft !== undefined ? parseInt(e.typicalSqft, 10) : station.typicalSqft,
            positions: e.positions !== undefined && e.positions !== '' ? parseInt(e.positions, 10) : station.positions,
          },
        },
      });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[station.stationId];
        return next;
      });
      refetchStations();
    } catch (err) {
      setErrorByStation((prev) => ({ ...prev, [station.stationId]: errMsg(err) }));
    }
  }

  async function handleDelete(stationId: string) {
    await deleteStation({ variables: { stationId } });
    refetchStations();
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            STATIONS
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>
            Edit or delete stations, and see what equipment/inventory is assigned — station IDs are permanent and can't be changed
          </div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {stations.map((station) => {
          const assignedEquipment = equipment.filter((eq) => eq.stationId === station.stationId);
          const assignedInventory = inventory.filter((inv) => inv.stationId === station.stationId);
          const error = errorByStation[station.stationId];

          return (
            <div key={station.stationId} style={{ border: '1px solid var(--br)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{station.stationId}</span>
                <button className="btn-out" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(station.stationId)}>Delete station</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
                <div>
                  <label className="field-label">Name</label>
                  <input className="field-input" defaultValue={station.name} onChange={(e) => handleFieldChange(station.stationId, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Category</label>
                  <input className="field-input" defaultValue={station.category} onChange={(e) => handleFieldChange(station.stationId, 'category', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Zone</label>
                  <input className="field-input" defaultValue={station.zone} onChange={(e) => handleFieldChange(station.stationId, 'zone', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Typical sqft</label>
                  <input className="field-input" type="number" defaultValue={station.typicalSqft} onChange={(e) => handleFieldChange(station.stationId, 'typicalSqft', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Positions</label>
                  <input className="field-input" type="number" defaultValue={station.positions ?? ''} onChange={(e) => handleFieldChange(station.stationId, 'positions', e.target.value)} />
                </div>
              </div>
              <button className="btn-teal" style={{ marginBottom: 10 }} onClick={() => handleSave(station)}>Save changes</button>
              {error && <div style={{ color: '#a33', fontSize: 12, marginBottom: 10 }}>{error}</div>}

              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                <strong>Equipment assigned:</strong>{' '}
                {assignedEquipment.length ? assignedEquipment.map((e) => e.name).join(', ') : 'none'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                <strong>Inventory assigned:</strong>{' '}
                {assignedInventory.length ? assignedInventory.map((i) => i.name).join(', ') : 'none'}
              </div>
            </div>
          );
        })}
        {stations.length === 0 && <div style={{ color: 'var(--mid)', fontSize: 13 }}>No stations found.</div>}
      </div>
    </div>
  );
}