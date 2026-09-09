import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  EQUIPMENT_LIST_QUERY, EQUIPMENT_LISTS_QUERY,
  ADD_EQUIPMENT_TO_LIST_MUTATION, ADD_EQUIPMENT_TO_LIST_BULK_MUTATION, REMOVE_EQUIPMENT_FROM_LIST_MUTATION,
} from '../graphql/operations';

interface EquipmentRow { equipmentId: string; name: string; }
interface EquipmentListRow { listKey: string; displayName: string; equipmentIds: string[]; }

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function EquipmentListsPage() {
  const navigate = useNavigate();
  const { data: equipmentData } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const equipment = equipmentData?.equipmentList ?? [];
  const equipmentNameById = new Map(equipment.map((eq) => [eq.equipmentId, eq.name]));

  // equipmentLists is returned in a fixed list-definition order (see
  // equipment-list.service.ts's listLists) — the right-hand column below
  // relies on that for "ordered by type of equipment list".
  const { data, refetch, loading, error } = useQuery<{ equipmentLists: EquipmentListRow[] }>(EQUIPMENT_LISTS_QUERY);
  const lists = data?.equipmentLists ?? [];

  // Membership isn't exclusive — a piece of equipment can legitimately sit
  // on more than one list (matches Prompt 2's own dedup rule, which sums
  // quantities when the same equipmentId reaches the Basic Lab Equipment
  // List from more than one source list). This is an array (not
  // last-list-wins) so every list an item is actually on stays visible —
  // the banner below surfaces anything on more than one as a flag, not an
  // error to fix.
  const listsByEquipmentId = new Map<string, EquipmentListRow[]>();
  for (const list of lists) {
    for (const equipmentId of list.equipmentIds) {
      const existing = listsByEquipmentId.get(equipmentId);
      if (existing) existing.push(list);
      else listsByEquipmentId.set(equipmentId, [list]);
    }
  }
  const unassigned = [...equipment]
    .filter((eq) => (listsByEquipmentId.get(eq.equipmentId) ?? []).length === 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const overlapping = [...equipment]
    .filter((eq) => (listsByEquipmentId.get(eq.equipmentId) ?? []).length > 1)
    .sort((a, b) => a.name.localeCompare(b.name));

  const [addEquipmentToList] = useMutation(ADD_EQUIPMENT_TO_LIST_MUTATION);
  const [addEquipmentToListBulk] = useMutation(ADD_EQUIPMENT_TO_LIST_BULK_MUTATION);
  const [removeEquipmentFromList] = useMutation(REMOVE_EQUIPMENT_FROM_LIST_MUTATION);

  const [unassignedTarget, setUnassignedTarget] = useState<Record<string, string>>({});
  const [unassignedError, setUnassignedError] = useState<Record<string, string>>({});
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [checkedUnassigned, setCheckedUnassigned] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const visibleUnassigned = unassignedSearch.trim()
    ? unassigned.filter((eq) => eq.name.toLowerCase().includes(unassignedSearch.trim().toLowerCase()))
    : unassigned;
  const allVisibleChecked = visibleUnassigned.length > 0 && visibleUnassigned.every((eq) => checkedUnassigned.has(eq.equipmentId));

  function toggleChecked(equipmentId: string) {
    const next = new Set(checkedUnassigned);
    if (next.has(equipmentId)) next.delete(equipmentId);
    else next.add(equipmentId);
    setCheckedUnassigned(next);
  }

  function toggleAllVisible() {
    const next = new Set(checkedUnassigned);
    if (allVisibleChecked) {
      for (const eq of visibleUnassigned) next.delete(eq.equipmentId);
    } else {
      for (const eq of visibleUnassigned) next.add(eq.equipmentId);
    }
    setCheckedUnassigned(next);
  }

  async function handleBulkAssign() {
    if (!bulkTarget || checkedUnassigned.size === 0) return;
    setBulkError('');
    setBulkBusy(true);
    try {
      await addEquipmentToListBulk({ variables: { listKey: bulkTarget, equipmentIds: Array.from(checkedUnassigned) } });
      setCheckedUnassigned(new Set());
      setBulkTarget('');
      refetch();
    } catch (e) {
      setBulkError(errMsg(e));
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleAssignFromUnassigned(equipmentId: string) {
    const listKey = unassignedTarget[equipmentId];
    if (!listKey) return;
    setUnassignedError({ ...unassignedError, [equipmentId]: '' });
    try {
      await addEquipmentToList({ variables: { listKey, equipmentId } });
      const { [equipmentId]: _removed, ...rest } = unassignedTarget;
      setUnassignedTarget(rest);
      refetch();
    } catch (e) {
      setUnassignedError({ ...unassignedError, [equipmentId]: errMsg(e) });
    }
  }

  async function handleRemove(listKey: string, equipmentId: string) {
    await removeEquipmentFromList({ variables: { listKey, equipmentId } });
    refetch();
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            EQUIPMENT LISTS
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Assign Equipment Specification List entries into each configurable list — an item can be on more than one, flagged below if so</div>
        </div>
        <button className="btn-out" onClick={() => navigate('/settings')}>← Settings</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {error && <div style={{ color: '#a33', fontSize: 12, marginBottom: 16 }}>{error.message}</div>}
        {!loading && lists.length === 0 && <div style={{ color: 'var(--mid)' }}>No lists found.</div>}

        {overlapping.length > 0 && (
          <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 10, border: '1px solid #a67c00', background: '#fdf6e3' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a67c00', marginBottom: 4 }}>On more than one list ({overlapping.length})</div>
            <div style={{ fontSize: 12, color: 'var(--dark)' }}>
              {overlapping.map((eq) => (
                <div key={eq.equipmentId}>
                  {eq.name} — {(listsByEquipmentId.get(eq.equipmentId) ?? []).map((l) => l.displayName).join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ width: 300, flexShrink: 0 }}>
            <div className="sec-head">
              Unassigned
              <span style={{ fontWeight: 500, color: 'var(--mid)', marginLeft: 6 }}>({unassigned.length})</span>
              <div className="sec-line" />
            </div>

            {unassigned.length > 0 && (
              <input
                className="field-input"
                style={{ width: '100%', fontSize: 12, marginBottom: 10 }}
                placeholder="Search unassigned equipment…"
                value={unassignedSearch}
                onChange={(e) => setUnassignedSearch(e.target.value)}
              />
            )}

            {unassigned.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--mid)', padding: '6px 0' }}>Every piece of equipment is on a list.</div>
            ) : visibleUnassigned.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--mid)', padding: '6px 0' }}>No unassigned equipment matches "{unassignedSearch}".</div>
            ) : (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mid)', marginBottom: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={allVisibleChecked} onChange={toggleAllVisible} />
                  Select all {unassignedSearch.trim() ? 'matching' : ''} ({visibleUnassigned.length})
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    maxHeight: 420,
                    overflowY: 'scroll',
                    border: '1px solid var(--br)',
                    borderRadius: 8,
                    padding: '10px 10px 2px',
                    background: '#fafafa',
                    boxShadow: 'inset 0 6px 6px -6px rgba(0,0,0,.12), inset 0 -6px 6px -6px rgba(0,0,0,.12)',
                  }}
                >
                  {visibleUnassigned.map((eq) => (
                    <div key={eq.equipmentId} style={{ paddingBottom: 8, borderBottom: '1px solid var(--br)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={checkedUnassigned.has(eq.equipmentId)} onChange={() => toggleChecked(eq.equipmentId)} />
                        {eq.name}
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          className="field-input"
                          style={{ flex: 1, fontSize: 12 }}
                          value={unassignedTarget[eq.equipmentId] ?? ''}
                          onChange={(e) => setUnassignedTarget({ ...unassignedTarget, [eq.equipmentId]: e.target.value })}
                        >
                          <option value="">Assign to…</option>
                          {lists.map((l) => <option key={l.listKey} value={l.listKey}>{l.displayName}</option>)}
                        </select>
                        <button className="btn-teal" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleAssignFromUnassigned(eq.equipmentId)}>Assign</button>
                      </div>
                      {unassignedError[eq.equipmentId] && <div style={{ color: '#a33', fontSize: 11, marginTop: 4 }}>{unassignedError[eq.equipmentId]}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {checkedUnassigned.size > 0 && (
              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--br)', background: 'var(--bg-alt, #f7f7f5)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  {checkedUnassigned.size} selected
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="field-input"
                    style={{ flex: 1, fontSize: 12 }}
                    value={bulkTarget}
                    onChange={(e) => setBulkTarget(e.target.value)}
                  >
                    <option value="">Add all to…</option>
                    {lists.map((l) => <option key={l.listKey} value={l.listKey}>{l.displayName}</option>)}
                  </select>
                  <button
                    className="btn-teal"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    disabled={!bulkTarget || bulkBusy}
                    onClick={handleBulkAssign}
                  >
                    {bulkBusy ? 'Adding…' : 'Add'}
                  </button>
                </div>
                <button
                  className="btn-out"
                  style={{ padding: '4px 10px', fontSize: 12, marginTop: 6 }}
                  onClick={() => setCheckedUnassigned(new Set())}
                >
                  Clear selection
                </button>
                {bulkError && <div style={{ color: '#a33', fontSize: 11, marginTop: 6 }}>{bulkError}</div>}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {lists.map((list) => {
              return (
                <div key={list.listKey} style={{ marginBottom: 28 }}>
                  <div className="sec-head">
                    {list.displayName}
                    <span style={{ fontWeight: 500, color: 'var(--mid)', marginLeft: 6 }}>({list.equipmentIds.length})</span>
                    <div className="sec-line" />
                  </div>

                  {list.equipmentIds.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--mid)', padding: '6px 0' }}>No equipment assigned yet.</div>
                  ) : (
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <tbody>
                        {list.equipmentIds.map((equipmentId) => (
                          <tr key={equipmentId} style={{ borderBottom: '1px solid var(--br)' }}>
                            <td style={{ padding: 6 }}>{equipmentNameById.get(equipmentId) ?? equipmentId}</td>
                            <td style={{ padding: 6, fontFamily: 'var(--mono)', color: 'var(--mid)' }}>{equipmentId}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn-out" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleRemove(list.listKey, equipmentId)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
