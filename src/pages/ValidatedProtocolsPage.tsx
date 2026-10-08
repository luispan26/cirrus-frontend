import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  VALIDATED_PROTOCOLS_QUERY, REMOVE_VALIDATED_PROTOCOL_MUTATION,
  SET_VALIDATED_PROTOCOL_CELL_TYPES_MUTATION, SET_VALIDATED_PROTOCOL_ESSENTIAL_MUTATION,
} from '../graphql/operations';
import { CELL_TYPE_OPTS } from '../lib/questions';

interface ValidatedProtocolRow { id: string; protocolId: string; title: string; sourceUrl: string; cellTypes?: string[] | null; essential: boolean; createdAt?: string; }

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function ValidatedProtocolsPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<{ validatedProtocols: ValidatedProtocolRow[] }>(VALIDATED_PROTOCOLS_QUERY);
  const protocols = data?.validatedProtocols ?? [];

  const [removeValidatedProtocol] = useMutation(REMOVE_VALIDATED_PROTOCOL_MUTATION);
  const [setCellTypes] = useMutation(SET_VALIDATED_PROTOCOL_CELL_TYPES_MUTATION);
  const [setEssential] = useMutation(SET_VALIDATED_PROTOCOL_ESSENTIAL_MUTATION);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [cellTypeError, setCellTypeError] = useState('');
  const [essentialError, setEssentialError] = useState('');

  // Toggles one biomaterial tag on/off a protocol's cellTypes array — a
  // protocol can now carry more than one (e.g. a gel or BCA assay that's
  // also run on yeast/mammalian lysates), unlike the old single-select.
  async function handleToggleCellType(row: ValidatedProtocolRow, value: string) {
    setCellTypeError('');
    const current = row.cellTypes ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    try {
      await setCellTypes({ variables: { protocolId: row.protocolId, cellTypes: next } });
      refetch();
    } catch (e) {
      setCellTypeError(errMsg(e));
    }
  }

  // The checkbox itself is disabled whenever a row has no cellTypes (see the
  // essential <td> below), so this only ever runs with at least one cellType
  // already set — the server still enforces the same invariant independently
  // (see ValidatedProtocolsService.setEssential), this is just the UI-side half.
  async function handleSetEssential(protocolId: string, essential: boolean) {
    setEssentialError('');
    try {
      await setEssential({ variables: { protocolId, essential } });
      refetch();
    } catch (e) {
      setEssentialError(errMsg(e));
    }
  }

  // window.confirm rather than a custom modal — same pattern as
  // DesignHistoryPage's report delete, which is the only other
  // permanent-removal action in the app today.
  async function handleRemove(row: ValidatedProtocolRow) {
    if (!window.confirm(`Remove "${row.title}" from the questionnaire's Validated Protocols list? It will no longer be selectable there until re-validated on the Protocols page.`)) return;
    setRemoveError('');
    setRemovingId(row.protocolId);
    try {
      await removeValidatedProtocol({ variables: { protocolId: row.protocolId } });
      refetch();
    } catch (e) {
      setRemoveError(errMsg(e));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            VALIDATED PROTOCOLS
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Every protocol currently selectable in the intake questionnaire — remove one to pull it from that list</div>
        </div>
        <button className="btn-out" onClick={() => navigate('/settings')}>← Settings</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {error && <div style={{ color: '#a33', fontSize: 12, marginBottom: 16 }}>{error.message}</div>}
        {removeError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 16 }}>{removeError}</div>}
        {cellTypeError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 16 }}>{cellTypeError}</div>}
        {essentialError && <div style={{ color: '#a33', fontSize: 12, marginBottom: 16 }}>{essentialError}</div>}
        {!loading && protocols.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--mid)' }}>
            No protocols have been validated yet — assign equipment to at least one step and click Validate on the Protocols page.
          </div>
        )}

        {protocols.length > 0 && (
          <>
            <div className="sec-head">
              Validated
              <span style={{ fontWeight: 500, color: 'var(--mid)', marginLeft: 6 }}>({protocols.length})</span>
              <div className="sec-line" />
            </div>

            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--br)' }}>
                  <th style={{ padding: '6px 6px 6px 0', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mid)' }}>Title</th>
                  <th style={{ padding: 6, textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mid)' }}>Protocol ID</th>
                  <th style={{ padding: 6, textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mid)' }}>Cell Type</th>
                  <th style={{ padding: 6, textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mid)' }}>Recommended</th>
                  <th style={{ padding: 6, textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mid)' }}>Validated</th>
                  <th style={{ padding: 6 }} />
                </tr>
              </thead>
              <tbody>
                {protocols.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--br)' }}>
                    <td style={{ padding: '10px 6px 10px 0' }}>
                      <a href={row.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--dark)', fontWeight: 600, textDecoration: 'none' }}>
                        {row.title}
                      </a>
                    </td>
                    <td style={{ padding: 6, fontFamily: 'var(--mono)', color: 'var(--mid)' }}>{row.protocolId}</td>
                    <td style={{ padding: 6, minWidth: 220 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {CELL_TYPE_OPTS.map((opt) => {
                          const checked = (row.cellTypes ?? []).includes(opt.v);
                          return (
                            <span
                              key={opt.v}
                              onClick={() => handleToggleCellType(row, opt.v)}
                              style={{
                                cursor: 'pointer', userSelect: 'none', fontSize: 11, padding: '3px 8px', borderRadius: 999,
                                border: '1px solid var(--br)',
                                background: checked ? 'var(--teal)' : 'transparent',
                                color: checked ? 'white' : 'var(--dark)',
                              }}
                            >
                              {opt.l}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        type="checkbox"
                        checked={row.essential}
                        disabled={(row.cellTypes ?? []).length === 0}
                        title={(row.cellTypes ?? []).length > 0 ? undefined : 'Set a cell type before marking recommended'}
                        onChange={(e) => handleSetEssential(row.protocolId, e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: 6, color: 'var(--mid)' }}>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>
                      <button
                        className="btn-out"
                        style={{ padding: '4px 12px', fontSize: 12, color: '#a33', borderColor: '#e6b3b3' }}
                        onClick={() => handleRemove(row)}
                        disabled={removingId === row.protocolId}
                      >
                        {removingId === row.protocolId ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
