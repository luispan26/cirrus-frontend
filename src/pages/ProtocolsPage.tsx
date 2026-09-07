import { useEffect, useState } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  PROTOCOLS_IO_PROTOCOL_QUERY, PROTOCOLS_IO_SEARCH_QUERY, EQUIPMENT_LIST_QUERY,
  STEP_EQUIPMENT_MAPPINGS_FOR_PROTOCOL_QUERY, EQUIPMENT_USAGE_FOR_PROTOCOL_QUERY,
  ASSIGN_EQUIPMENT_TO_STEP_MUTATION, REMOVE_STEP_EQUIPMENT_MAPPING_MUTATION,
  TRIGGER_CANVAS_SYNC_MUTATION, IS_PROTOCOL_VALIDATED_QUERY, VALIDATE_PROTOCOL_MUTATION,
} from '../graphql/operations';
import { SearchableSelect } from '../components/SearchableSelect';

const SEARCH_PAGE_SIZE = 10;

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
interface EquipmentUsageStep { stepId: string; stepNumber?: string; durationSeconds?: number | null; }
interface EquipmentUsage { equipmentId: string; totalDurationSeconds: number; missingDurationStepCount: number; steps: EquipmentUsageStep[]; }
interface ProtocolSummary { id: string; title: string; sourceUrl: string; doi?: string; publishedOn?: string; authorNames: string[]; }
interface ProtocolSearchResult { currentPage: number; totalPages: number; totalResults: number; items: ProtocolSummary[]; }
interface CanvasSyncResult { equipmentSynced: number; protocolsSynced: number; }

function durationLabel(seconds?: number): string | null {
  if (seconds === undefined || seconds === null) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} hr`;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

// Runs the DAMPLab Canvas sync (equipment first, then every Damp Lab
// workspace protocol's step->equipment mapping — see
// canvas-sync.service.ts's syncAll) so the step-equipment map shown in the
// nav/detail panels reflects Canvas's own step-level assignments. Fires
// once automatically on page load — an admin opening /protocols shouldn't
// have to remember to click Import before the mappings below are current —
// plus a manual button for an on-demand refresh right after a known Canvas
// change, without waiting for the next scheduled interval.
function useCanvasImport(onSynced: () => void) {
  const [triggerCanvasSync, { loading }] = useMutation<{ triggerCanvasSync: CanvasSyncResult }>(TRIGGER_CANVAS_SYNC_MUTATION);
  const [result, setResult] = useState<CanvasSyncResult | null>(null);
  const [error, setError] = useState('');

  async function handleImport() {
    setError('');
    try {
      const { data } = await triggerCanvasSync();
      if (data) setResult(data.triggerCanvasSync);
      onSynced();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleImport(); }, []);

  return { handleImport, loading, result, error };
}

export function ProtocolsPage() {
  const navigate = useNavigate();
  const [protocolId, setProtocolId] = useState('');
  const [fetchProtocol, { data, loading, error }] = useLazyQuery<{ protocolsIoProtocol: ProtocolsIoProtocol }>(
    PROTOCOLS_IO_PROTOCOL_QUERY,
  );
  const protocol = data?.protocolsIoProtocol;

  // Browses/searches protocols rather than requiring a protocol ID to
  // already be known — key defaults to '' (the backend treats that as
  // "browse everything in scope", not a narrowed search). Runs on mount so
  // results are visible immediately, not gated behind a first search.
  // Scope defaults to the Damp Lab workspace (omitting workspaceUri lets
  // the backend's own default apply) with an explicit opt-out to the full
  // public catalog — passing null (not omitting the variable) is what
  // actually overrides the backend default for that case.
  const [scope, setScope] = useState<'workspace' | 'public'>('workspace');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const { data: searchData, loading: searching, error: searchErrorObj } = useQuery<{ protocolsIoSearch: ProtocolSearchResult }>(
    PROTOCOLS_IO_SEARCH_QUERY,
    { variables: { key: searchKey, page: searchPage, pageSize: SEARCH_PAGE_SIZE, workspaceUri: scope === 'public' ? null : undefined } },
  );
  const searchResult = searchData?.protocolsIoSearch;

  // Counts for both scope chips at once — a single pageSize:1 request per
  // scope (we only need totalResults, not another results page) so the
  // inactive chip's count stays visible without switching scope to see it.
  const { data: workspaceCountData } = useQuery<{ protocolsIoSearch: ProtocolSearchResult }>(
    PROTOCOLS_IO_SEARCH_QUERY,
    { variables: { key: searchKey, page: 1, pageSize: 1, workspaceUri: undefined } },
  );
  const { data: publicCountData } = useQuery<{ protocolsIoSearch: ProtocolSearchResult }>(
    PROTOCOLS_IO_SEARCH_QUERY,
    { variables: { key: searchKey, page: 1, pageSize: 1, workspaceUri: null } },
  );
  const workspaceResultCount = workspaceCountData?.protocolsIoSearch.totalResults;
  const publicResultCount = publicCountData?.protocolsIoSearch.totalResults;

  function handleSearch() {
    setSearchPage(1);
    setSearchKey(searchDraft.trim());
  }

  function handleGo() {
    if (protocolId.trim()) {
      handleFetch();
    } else {
      handleSearch();
    }
  }

  function handleScopeChange(next: 'workspace' | 'public') {
    setScope(next);
    setSearchPage(1);
  }

  function handleBrowseSelect(id: string) {
    setProtocolId(id);
    fetchProtocol({ variables: { protocolId: id } });
  }

  // Every Damp Lab workspace protocol has its Canvas-imported step-equipment
  // mapping visible the moment it's opened from the nav — without this, an
  // admin would have to select a protocol before its steps' equipment tags
  // populate, which reads as the import having silently missed it.
  useEffect(() => {
    if (scope === 'workspace' && !protocol && searchResult && searchResult.items.length > 0) {
      handleBrowseSelect(searchResult.items[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResult, scope]);

  const { data: equipmentData } = useQuery<{ equipmentList: EquipmentRow[] }>(EQUIPMENT_LIST_QUERY);
  const equipmentList = equipmentData?.equipmentList ?? [];

  const { data: mappingsData, refetch: refetchMappings } = useQuery<{ stepEquipmentMappingsForProtocol: StepEquipmentMapping[] }>(
    STEP_EQUIPMENT_MAPPINGS_FOR_PROTOCOL_QUERY,
    { variables: { protocolId: protocol?.id ?? '' }, skip: !protocol?.id },
  );
  const mappings = mappingsData?.stepEquipmentMappingsForProtocol ?? [];

  // Joins those same mappings against protocols.io's own step durations
  // server-side (see step-equipment-map.service.ts's
  // getEquipmentUsageForProtocol) — refetched alongside mappings since
  // assigning/removing equipment (manually or via Canvas import) changes
  // the totals.
  const { data: usageData, refetch: refetchUsage } = useQuery<{ equipmentUsageForProtocol: EquipmentUsage[] }>(
    EQUIPMENT_USAGE_FOR_PROTOCOL_QUERY,
    { variables: { protocolId: protocol?.id ?? '' }, skip: !protocol?.id },
  );
  const equipmentUsage = usageData?.equipmentUsageForProtocol ?? [];

  function refetchStepEquipmentData() {
    refetchMappings();
    refetchUsage();
  }

  // No visible UI for this — fires once on page open so a Damp Lab
  // protocol's Canvas-imported step-equipment assignments are already
  // current by the time an admin picks it from the nav.
  useCanvasImport(refetchStepEquipmentData);

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
      refetchStepEquipmentData();
    } catch (e) {
      setAssignError((prev) => ({ ...prev, [step.id]: errMsg(e) }));
    }
  }

  async function handleRemove(mappingId: string) {
    await removeStepEquipmentMapping({ variables: { id: mappingId } });
    refetchStepEquipmentData();
  }

  // Validated Protocols: a protocol only becomes selectable in the intake
  // questionnaire's protocol-select step once a technician explicitly
  // confirms it here — being in the Damp Lab workspace (or having equipment
  // mapped) is no longer sufficient by itself. Requires at least one live
  // step-equipment mapping; the backend re-checks this too (see
  // ValidatedProtocolsService.validate) so this button being enabled is a
  // UX nicety, not the only guard.
  const { data: validatedData, refetch: refetchValidated } = useQuery<{ isProtocolValidated: boolean }>(
    IS_PROTOCOL_VALIDATED_QUERY,
    { variables: { protocolId: protocol?.id ?? '' }, skip: !protocol?.id },
  );
  const isValidated = validatedData?.isProtocolValidated ?? false;
  const [validateProtocolMutation, { loading: validating }] = useMutation(VALIDATE_PROTOCOL_MUTATION);
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [validateError, setValidateError] = useState('');

  useEffect(() => {
    setShowValidateConfirm(false);
    setValidateError('');
  }, [protocol?.id]);

  async function handleConfirmValidate() {
    if (!protocol) return;
    setValidateError('');
    try {
      await validateProtocolMutation({ variables: { input: { protocolId: protocol.id, title: protocol.title, sourceUrl: protocol.sourceUrl } } });
      setShowValidateConfirm(false);
      refetchValidated();
    } catch (e) {
      setValidateError(errMsg(e));
    }
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            PROTOCOLS
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Browse protocols, manage step-equipment assignments, and validate protocols for the questionnaire</div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Navigate menu: scrolls independently from the detail panel so paging
            through many Damp Lab protocols never requires scrolling the whole page. */}
        <nav style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--br)' }}>
          <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
            <input
              className="field-input"
              style={{ width: '100%', fontSize: 12, marginBottom: 6 }}
              placeholder="Search by ID"
              value={protocolId}
              onChange={(e) => setProtocolId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGo(); }}
            />
            <input
              className="field-input"
              style={{ width: '100%', fontSize: 12, marginBottom: 6 }}
              placeholder="Search by name"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGo(); }}
            />
            <button className="btn-teal" style={{ width: '100%', padding: '4px 10px', fontSize: 12, marginBottom: 10 }} onClick={handleGo} disabled={protocolId.trim() ? loading : searching}>
              Go
            </button>

            <div className="chips" style={{ marginBottom: 10 }}>
              <span className={`chip${scope === 'workspace' ? ' sel' : ''}`} onClick={() => handleScopeChange('workspace')}>
                Damp Lab workspace{workspaceResultCount !== undefined && ` (${workspaceResultCount})`}
              </span>
              <span className={`chip${scope === 'public' ? ' sel' : ''}`} onClick={() => handleScopeChange('public')}>
                All public protocols{publicResultCount !== undefined && ` (${publicResultCount})`}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 16px 16px' }}>
            {searchErrorObj && (
              <div style={{ padding: 10, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 12, marginBottom: 12 }}>
                {searchErrorObj.message}
              </div>
            )}

            {searchResult && (
              <>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 8 }}>
                  {searchResult.totalResults.toLocaleString()} protocol{searchResult.totalResults === 1 ? '' : 's'}
                  {searchKey ? ` matching "${searchKey}"` : ''} in {scope === 'workspace' ? 'Damp Lab' : 'public catalog'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                  {searchResult.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleBrowseSelect(item.id)}
                      style={{
                        padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                        background: protocolId === item.id ? 'var(--teal)' : 'transparent',
                        color: protocolId === item.id ? 'white' : 'inherit',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                        {item.authorNames.length > 0 && <span>{item.authorNames.join(', ')} · </span>}
                        {item.publishedOn && <span>{new Date(item.publishedOn).toLocaleDateString()} · </span>}
                        <span>ID {item.id}</span>
                      </div>
                    </div>
                  ))}
                  {searchResult.items.length === 0 && scope === 'workspace' && (
                    <div style={{ fontSize: 12, color: 'var(--mid)', padding: '8px 0' }}>
                      No protocols published to the Damp Lab workspace yet — switch to "All public protocols" to browse the wider catalog.
                    </div>
                  )}
                  {searchResult.items.length === 0 && scope === 'public' && (
                    <div style={{ fontSize: 12, color: 'var(--mid)', padding: '8px 0' }}>No published protocols matched.</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn-out"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    disabled={searchResult.currentPage <= 1 || searching}
                    onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--mid)' }}>
                    {searchResult.currentPage} / {searchResult.totalPages.toLocaleString()}
                  </span>
                  <button
                    className="btn-out"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    disabled={searchResult.currentPage >= searchResult.totalPages || searching}
                    onClick={() => setSearchPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '24px', width: '100%' }}>
          <div style={{ maxWidth: 760 }}>
            {error && (
              <div style={{ padding: 14, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginBottom: 20 }}>
                {error.message}
              </div>
            )}

            {!protocol && !error && (
              <div style={{ fontSize: 13, color: 'var(--mid)' }}>Select a protocol from the list on the left.</div>
            )}

            {protocol && (
              <div>
                <h2 style={{ marginBottom: 4 }}>{protocol.title}</h2>
                <a href={protocol.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--teal)' }}>
                  {protocol.sourceUrl}
                </a>

                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isValidated ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1a8f5f', background: '#eafaf1', border: '1px solid #b8e6cf', borderRadius: 999, padding: '4px 12px' }}>
                      ✓ Validated for the questionnaire
                    </span>
                  ) : (
                    <>
                      <button
                        className="btn-teal"
                        style={{ padding: '6px 16px', fontSize: 12 }}
                        onClick={() => setShowValidateConfirm(true)}
                        disabled={mappings.length === 0}
                        title={mappings.length === 0 ? 'Assign equipment to at least one step first.' : undefined}
                      >
                        Validate
                      </button>
                      {mappings.length === 0 && (
                        <span style={{ fontSize: 11, color: 'var(--mid)' }}>Assign equipment to at least one step first.</span>
                      )}
                    </>
                  )}
                </div>
                {validateError && <div style={{ color: '#a33', fontSize: 11, marginTop: 4 }}>{validateError}</div>}

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

                {equipmentUsage.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="sec-head">
                      Equipment usage
                      <div className="sec-line" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {equipmentUsage.map((usage) => (
                        <div
                          key={usage.equipmentId}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', border: '1px solid var(--br)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                        >
                          <span>{equipmentName(usage.equipmentId)}</span>
                          <span style={{ fontSize: 12, color: 'var(--mid)' }}>
                            {durationLabel(usage.totalDurationSeconds) ?? '0 min'} across {usage.steps.length} step{usage.steps.length === 1 ? '' : 's'}
                            {usage.missingDurationStepCount > 0 && ` (${usage.missingDurationStepCount} untimed)`}
                          </span>
                        </div>
                      ))}
                    </div>
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
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mid)', marginBottom: 4 }}>
                              Equipment{stepMappings.length === 0 ? ' — none assigned' : ''}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                              {stepMappings.map((m) => (
                                <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--teal)', color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 11 }}>
                                  {equipmentName(m.equipmentId)}
                                  <button onClick={() => handleRemove(m.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, padding: 0 }}>×</button>
                                </span>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <SearchableSelect
                                style={{ width: 220 }}
                                value={pickerSelection[step.id] ?? ''}
                                onChange={(v) => setPickerSelection((prev) => ({ ...prev, [step.id]: v }))}
                                placeholder="Assign equipment…"
                                options={equipmentList.map((eq) => ({ value: eq.equipmentId, label: eq.name }))}
                              />
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
      </div>

      {showValidateConfirm && protocol && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="q-card" style={{ maxWidth: 420 }}>
            <div className="q-title" style={{ fontSize: 17, marginBottom: 10 }}>Validate this protocol?</div>
            <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 20 }}>
              Are you sure you would like to globally validate this protocol? Once validated, "{protocol.title}" becomes selectable in the intake questionnaire's Validated Protocols list for every user.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-out" onClick={() => setShowValidateConfirm(false)} disabled={validating}>Cancel</button>
              <button className="btn-teal" onClick={handleConfirmValidate} disabled={validating}>{validating ? 'Validating…' : 'Yes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
