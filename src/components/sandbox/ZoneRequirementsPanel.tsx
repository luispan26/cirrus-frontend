import { AEROSOL_POTENTIALS, AMPLIFICATION_STAGES, MATERIAL_CLASSES, MATERIAL_CLASS_LABELS, SPATIAL_OPERATION_KIND_LABELS, isPlannedOperationComplete, isZoneable, newPlannedOperation, type MaterialClass, type PlannedOperation } from '../../lib/zone-requirements';
import type { OperationCatalogueItem } from './types';

// Search the DAMP operation catalogue, then fill in only what the catalogue
// doesn't already know — this is what zone-policy classifies and MiniZinc
// places. Not tied to fixture placement (see LayoutSandboxPage's
// runZoneRequirements/toOperationContextInput).
export function ZoneRequirementsPanel({
  dampOperations, filteredOperations, operationsLoading, operationsError, operationSearch, setOperationSearch,
  operationDraft, setOperationDraft, addPlannedOperation, plannedOperations, removePlannedOperation,
}: {
  dampOperations: OperationCatalogueItem[];
  filteredOperations: OperationCatalogueItem[];
  operationsLoading: boolean;
  operationsError: { message: string } | undefined;
  operationSearch: string;
  setOperationSearch: (value: string) => void;
  operationDraft: PlannedOperation | null;
  setOperationDraft: (value: PlannedOperation | null) => void;
  addPlannedOperation: () => void;
  plannedOperations: PlannedOperation[];
  removePlannedOperation: (key: string) => void;
}) {
  return <>
    <div className="ls-section-title">Zone requirements</div><p className="ls-help">Search the DAMP operation catalogue, then fill in only what the catalogue doesn't already know — this is what zone-policy classifies and MiniZinc places. Not tied to fixture placement.</p>
    {!operationsLoading && !operationsError && <p className="ls-help">Only {dampOperations.length} operation{dampOperations.length === 1 ? '' : 's'} {dampOperations.length === 1 ? 'is' : 'are'} currently mapped in the catalogue — this is a hand-curated subset of the full DAMP Lab protocol list, not the whole thing yet.</p>}
    {!operationDraft && <>
      <input className="field-input" placeholder="Search operations…" value={operationSearch} onChange={(e) => setOperationSearch(e.target.value)} />
      <div className="ls-catalog-status"><span>{operationsLoading ? 'Syncing with MongoDB…' : operationsError ? 'Database unavailable' : `${filteredOperations.length} of ${dampOperations.length} operations`}</span></div>
      {operationsError && <p className="ls-data-error">Could not load the operation catalogue through the Cirrus API: {operationsError.message}</p>}
      <div className="ls-palette">
        {filteredOperations.map((o) => <button key={o.operationId} className="ls-palette-item ls-station-choice" onClick={() => setOperationDraft(newPlannedOperation(o))}><span><b>{o.name}</b><small>{o.spatialKind === 'NonSpatialService' ? 'Non-spatial service — no zone generated' : `${o.equipment.slice(0, 3).join(', ')}${o.equipment.length > 3 ? `, +${o.equipment.length - 3} more` : ''}`}</small></span></button>)}
        {!operationsLoading && !operationsError && filteredOperations.length === 0 && <p className="ls-help">{dampOperations.length === 0 ? 'No operations exist in MongoDB yet.' : 'No operations match that search.'}</p>}
      </div>
    </>}
    {operationDraft && <div className="ls-inspector">
      <b>{operationDraft.operationName}</b>
      <small>{operationDraft.equipment.join(', ') || 'No equipment listed'}</small>
      {operationDraft.spatialKind === 'NonSpatialService' && <p className="ls-help">{SPATIAL_OPERATION_KIND_LABELS.NonSpatialService} — stays in the workflow, but won't generate a physical zone requirement.</p>}
      <div className="ls-room-fields">
        <label><span className="field-label">Material</span><select className="field-input" value={operationDraft.materialClass} onChange={(e) => setOperationDraft({ ...operationDraft, materialClass: e.target.value as PlannedOperation['materialClass'] })}><option value="">Select…</option>{MATERIAL_CLASSES.map((mc) => <option key={mc} value={mc}>{MATERIAL_CLASS_LABELS[mc]}</option>)}</select></label>
        <label><span className="field-label">Confirmed BSL (if known)</span><input className="field-input" type="number" min="1" max="4" placeholder="—" value={operationDraft.confirmedBiosafetyLevel} onChange={(e) => setOperationDraft({ ...operationDraft, confirmedBiosafetyLevel: e.target.value === '' ? '' : Number(e.target.value) })} /></label>
      </div>
      <div className="ls-room-fields">
        <label><span className="field-label">Aerosol potential</span><select className="field-input" value={operationDraft.aerosolPotential} onChange={(e) => setOperationDraft({ ...operationDraft, aerosolPotential: e.target.value as PlannedOperation['aerosolPotential'] })}><option value="">Select…</option>{AEROSOL_POTENTIALS.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
        <label><span className="field-label">Amplification stage</span><select className="field-input" value={operationDraft.amplificationStage} onChange={(e) => setOperationDraft({ ...operationDraft, amplificationStage: e.target.value as PlannedOperation['amplificationStage'] })}><option value="">Select…</option>{AMPLIFICATION_STAGES.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
      </div>
      <div className="ls-inspector-actions"><button className="btn-out" onClick={() => setOperationDraft(null)}>Cancel</button><button className="btn-teal" disabled={!isPlannedOperationComplete(operationDraft)} onClick={addPlannedOperation}>+ Add operation</button></div>
    </div>}
    {plannedOperations.length === 0 ? <p className="ls-help">No operations planned yet — the zoning button stays disabled until at least one is added.</p> : <div className="ls-palette">{plannedOperations.map((op) => <div key={op.key} className="ls-assignment"><span><b>{op.operationName}</b> · {MATERIAL_CLASS_LABELS[op.materialClass as MaterialClass] ?? op.materialClass}{op.confirmedBiosafetyLevel !== '' ? ` · BSL-${op.confirmedBiosafetyLevel}` : ''}{!isZoneable(op) ? ' · no zone' : ''}</span><button onClick={() => removePlannedOperation(op.key)}>×</button></div>)}</div>}
  </>;
}
