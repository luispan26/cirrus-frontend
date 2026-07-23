import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  STATIONS_QUERY,
  CREATE_STATION_MUTATION,
  UPDATE_STATION_MUTATION,
  DELETE_STATION_MUTATION,
  EQUIPMENT_LIST_QUERY,
  INVENTORY_ITEMS_QUERY,
} from '../graphql/operations';

interface StationRow {
  stationId: string;
  name: string;
  category: string;
  zone: string;
  typicalSqft: number;
  positions: number | null;
}

interface EquipmentRow {
  equipmentId: string;
  name: string;
  stationId: string | null;
}

interface InventoryRow {
  inventoryId: string;
  name: string;
  stationId: string | null;
}

type EditBuffer = Partial<{
  name: string;
  category: string;
  zone: string;
  typicalSqft: string;
  positions: string;
}>;

interface NewStation {
  stationId: string;
  name: string;
  category: string;
  zone: string;
  typicalSqft: string;
  positions: string;
}

const emptyStation: NewStation = {
  stationId: '',
  name: '',
  category: '',
  zone: '',
  typicalSqft: '',
  positions: '',
};

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function StationsPage() {
  const navigate = useNavigate();

  const {
    data: stationsData,
    refetch: refetchStations,
  } = useQuery<{ stations: StationRow[] }>(STATIONS_QUERY);

  const { data: equipmentData } = useQuery<{
    equipmentList: EquipmentRow[];
  }>(EQUIPMENT_LIST_QUERY);

  const { data: inventoryData } = useQuery<{
    inventoryItems: InventoryRow[];
  }>(INVENTORY_ITEMS_QUERY);

  const [createStation] = useMutation(CREATE_STATION_MUTATION);
  const [updateStation] = useMutation(UPDATE_STATION_MUTATION);
  const [deleteStation] = useMutation(DELETE_STATION_MUTATION);

  const [edits, setEdits] = useState<Record<string, EditBuffer>>({});
  const [errorByStation, setErrorByStation] = useState<
    Record<string, string>
  >({});

  const [newStation, setNewStation] =
    useState<NewStation>(emptyStation);

  const [createError, setCreateError] = useState('');

  const stations = stationsData?.stations ?? [];
  const equipment = equipmentData?.equipmentList ?? [];
  const inventory = inventoryData?.inventoryItems ?? [];

  function handleFieldChange(
    stationId: string,
    field: keyof EditBuffer,
    value: string,
  ) {
    setEdits((previous) => ({
      ...previous,
      [stationId]: {
        ...previous[stationId],
        [field]: value,
      },
    }));
  }

  async function handleCreateStation() {
    setCreateError('');

    const {
      stationId,
      name,
      category,
      zone,
      typicalSqft,
      positions,
    } = newStation;

    if (
      !stationId.trim() ||
      !name.trim() ||
      !category.trim() ||
      !zone.trim() ||
      !typicalSqft
    ) {
      setCreateError(
        'Station ID, name, category, zone, and typical sqft are required.',
      );
      return;
    }

    const parsedTypicalSqft = Number.parseInt(typicalSqft, 10);
    const parsedPositions = positions
      ? Number.parseInt(positions, 10)
      : null;

    if (
      Number.isNaN(parsedTypicalSqft) ||
      (parsedPositions !== null && Number.isNaN(parsedPositions))
    ) {
      setCreateError('Typical sqft and positions must be valid numbers.');
      return;
    }

    try {
      await createStation({
        variables: {
          input: {
            stationId: stationId.trim(),
            name: name.trim(),
            category: category.trim(),
            zone: zone.trim(),
            typicalSqft: parsedTypicalSqft,
            positions: parsedPositions,
          },
        },
      });

      setNewStation(emptyStation);
      await refetchStations();
    } catch (error) {
      setCreateError(errMsg(error));
    }
  }

  async function handleSave(station: StationRow) {
    setErrorByStation((previous) => ({
      ...previous,
      [station.stationId]: '',
    }));

    const edit = edits[station.stationId] ?? {};

    try {
      await updateStation({
        variables: {
          stationId: station.stationId,
          input: {
            name: edit.name ?? station.name,
            category: edit.category ?? station.category,
            zone: edit.zone ?? station.zone,
            typicalSqft:
              edit.typicalSqft !== undefined
                ? Number.parseInt(edit.typicalSqft, 10)
                : station.typicalSqft,
            positions:
              edit.positions !== undefined
                ? edit.positions === ''
                  ? null
                  : Number.parseInt(edit.positions, 10)
                : station.positions,
          },
        },
      });

      setEdits((previous) => {
        const next = { ...previous };
        delete next[station.stationId];
        return next;
      });

      await refetchStations();
    } catch (error) {
      setErrorByStation((previous) => ({
        ...previous,
        [station.stationId]: errMsg(error),
      }));
    }
  }

  async function handleDelete(stationId: string) {
    setErrorByStation((previous) => ({
      ...previous,
      [stationId]: '',
    }));

    try {
      await deleteStation({
        variables: { stationId },
      });

      await refetchStations();
    } catch (error) {
      setErrorByStation((previous) => ({
        ...previous,
        [stationId]: errMsg(error),
      }));
    }
  }

  return (
    <div className="screen">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          flexShrink: 0,
          borderBottom: '1px solid var(--br)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '.08em',
              color: 'var(--dark)',
            }}
          >
            STATIONS
          </div>

          <div style={{ fontSize: 12, color: 'var(--mid)' }}>
            Edit or delete stations, and see what equipment/inventory is
            assigned — station IDs are permanent and cannot be changed.
          </div>
        </div>

        <button
          className="btn-out"
          onClick={() => navigate('/dashboard')}
        >
          ← Dashboard
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          maxWidth: 800,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="sec-head">
          Add a new station
          <div className="sec-line" />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <input
            className="field-input"
            placeholder="Station ID"
            value={newStation.stationId}
            onChange={(event) =>
              setNewStation((previous) => ({
                ...previous,
                stationId: event.target.value,
              }))
            }
          />

          <input
            className="field-input"
            placeholder="Name"
            value={newStation.name}
            onChange={(event) =>
              setNewStation((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
          />

          <input
            className="field-input"
            placeholder="Category"
            value={newStation.category}
            onChange={(event) =>
              setNewStation((previous) => ({
                ...previous,
                category: event.target.value,
              }))
            }
          />

          <input
            className="field-input"
            placeholder="Zone"
            value={newStation.zone}
            onChange={(event) =>
              setNewStation((previous) => ({
                ...previous,
                zone: event.target.value,
              }))
            }
          />

          <input
            className="field-input"
            placeholder="Typical sqft"
            type="number"
            value={newStation.typicalSqft}
            onChange={(event) =>
              setNewStation((previous) => ({
                ...previous,
                typicalSqft: event.target.value,
              }))
            }
          />

          <input
            className="field-input"
            placeholder="Positions (optional)"
            type="number"
            value={newStation.positions}
            onChange={(event) =>
              setNewStation((previous) => ({
                ...previous,
                positions: event.target.value,
              }))
            }
          />
        </div>

        <button
          className="btn-teal"
          style={{ marginBottom: 8 }}
          onClick={handleCreateStation}
        >
          + Add station
        </button>

        {createError && (
          <div
            style={{
              color: '#a33',
              fontSize: 12,
              marginBottom: 20,
            }}
          >
            {createError}
          </div>
        )}

        {stations.map((station) => {
          const assignedEquipment = equipment.filter(
            (item) => item.stationId === station.stationId,
          );

          const assignedInventory = inventory.filter(
            (item) => item.stationId === station.stationId,
          );

          const error = errorByStation[station.stationId];

          return (
            <div
              key={station.stationId}
              style={{
                border: '1px solid var(--br)',
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--dark)',
                  }}
                >
                  {station.stationId}
                </span>

                <button
                  className="btn-out"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => handleDelete(station.stationId)}
                >
                  Delete station
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div>
                  <label className="field-label">Name</label>
                  <input
                    className="field-input"
                    defaultValue={station.name}
                    onChange={(event) =>
                      handleFieldChange(
                        station.stationId,
                        'name',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Category</label>
                  <input
                    className="field-input"
                    defaultValue={station.category}
                    onChange={(event) =>
                      handleFieldChange(
                        station.stationId,
                        'category',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Zone</label>
                  <input
                    className="field-input"
                    defaultValue={station.zone}
                    onChange={(event) =>
                      handleFieldChange(
                        station.stationId,
                        'zone',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Typical sqft</label>
                  <input
                    className="field-input"
                    type="number"
                    defaultValue={station.typicalSqft}
                    onChange={(event) =>
                      handleFieldChange(
                        station.stationId,
                        'typicalSqft',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Positions</label>
                  <input
                    className="field-input"
                    type="number"
                    defaultValue={station.positions ?? ''}
                    onChange={(event) =>
                      handleFieldChange(
                        station.stationId,
                        'positions',
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>

              <button
                className="btn-teal"
                style={{ marginBottom: 10 }}
                onClick={() => handleSave(station)}
              >
                Save changes
              </button>

              {error && (
                <div
                  style={{
                    color: '#a33',
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                <strong>Equipment assigned:</strong>{' '}
                {assignedEquipment.length
                  ? assignedEquipment.map((item) => item.name).join(', ')
                  : 'none'}
              </div>

              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                <strong>Inventory assigned:</strong>{' '}
                {assignedInventory.length
                  ? assignedInventory.map((item) => item.name).join(', ')
                  : 'none'}
              </div>
            </div>
          );
        })}

        {stations.length === 0 && (
          <div style={{ color: 'var(--mid)', fontSize: 13 }}>
            No stations found.
          </div>
        )}
      </div>
    </div>
  );
}