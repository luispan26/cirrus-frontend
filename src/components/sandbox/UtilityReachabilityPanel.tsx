import type { UtilityReachabilityResult } from '../../lib/layout-sandbox';

// The one validator this pass adds: for the selected bench (or one of its
// stations), which utility points are actually within reach, and for each
// piece of assigned equipment's utilityRequirements, whether a matching
// reachable point exists — and why not, when it doesn't.
export function UtilityReachabilityPanel({ check }: { check: UtilityReachabilityResult }) {
  return (
    <div className="ls-utility-check">
      <div className="ls-section-title">Utility reachability</div>
      {check.reachable.length === 0
        ? <p className="ls-help">No utility points are within reach of this bench.</p>
        : <ul className="ls-reachable-list">{check.reachable.map(({ object, distanceFt }) => (
            <li key={object.id}><b>{object.name}</b><small>{distanceFt.toFixed(1)} ft · {object.utility?.status}</small></li>
          ))}</ul>}
      {check.requirementResults.length > 0 && <ul className="ls-requirement-list">{check.requirementResults.map((result, index) => (
        <li key={index} className={result.satisfied ? 'ok' : result.requirement.required ? 'error' : 'warning'}>
          <b>{result.equipmentName}</b><small>{result.stationName} · {result.reason}</small>
        </li>
      ))}</ul>}
    </div>
  );
}
