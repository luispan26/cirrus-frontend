import type { ZoningPlanSummary } from './types';

export function SavedPlansPanel({
  zoningPlansLoading, zoningPlansError, savedZoningPlans, currentPlanId, loadingZoningPlan, loadPlan, deletePlan,
}: {
  zoningPlansLoading: boolean;
  zoningPlansError: { message: string } | undefined;
  savedZoningPlans: ZoningPlanSummary[];
  currentPlanId: string | null;
  loadingZoningPlan: boolean;
  loadPlan: (planId: string) => void;
  deletePlan: (planId: string) => void;
}) {
  return <>
    <div className="ls-section-title">Saved plans</div>
    <p className="ls-help">Saves the room size + planned operations above (with a snapshot of the catalogue) under this layout's name — reloadable later, even after the catalogue changes.</p>
    <div className="ls-catalog-status"><span>{zoningPlansLoading ? 'Syncing with MongoDB…' : zoningPlansError ? 'Database unavailable' : `${savedZoningPlans.length} saved plan${savedZoningPlans.length === 1 ? '' : 's'}`}</span></div>
    {zoningPlansError && <p className="ls-data-error">Could not load saved plans through the Cirrus API: {zoningPlansError.message}</p>}
    {savedZoningPlans.length === 0 ? <p className="ls-help">No plans saved yet.</p> : <div className="ls-palette">{savedZoningPlans.map((plan) => <div key={plan.planId} className={`ls-assignment ${currentPlanId === plan.planId ? 'active' : ''}`}><span><b>{plan.name}</b> · {plan.roomWidthFt} × {plan.roomHeightFt} ft · {new Date(plan.updatedAt).toLocaleString()}</span><span style={{ display: 'flex', gap: 6 }}><button disabled={loadingZoningPlan} onClick={() => void loadPlan(plan.planId)}>Load</button><button onClick={() => void deletePlan(plan.planId)}>Delete</button></span></div>)}</div>}
  </>;
}
