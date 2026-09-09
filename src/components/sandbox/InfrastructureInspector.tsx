import { centeredRectFootprint, offsetAlongWall, polygonBounds, snapToNearestWall, wallRectFootprint, wallSideOfBounds, type MountingSurface, type SandboxBaseObject, type SandboxPolygon, type UtilityStatus } from '../../lib/layout-sandbox';
import { PLUMBING_FIELD_LABELS, VENTILATION_PLACEMENT_LABELS } from './constants';

// Re-centers a door/window's footprint on a new width without disturbing
// which wall it's on or how far it projects into the room — reuses the same
// wallRectFootprint the click-to-place flow builds the opening from in the
// first place, just re-run around the opening's current center.
function resizeWallOpening(object: SandboxBaseObject, room: { widthFt: number; heightFt: number }, newWidthFt: number) {
  const bounds = polygonBounds(object.footprint);
  const side = wallSideOfBounds(bounds, room);
  const alongWall = side === 'top' || side === 'bottom';
  const depthFt = alongWall ? bounds.bottom - bounds.top : bounds.right - bounds.left;
  const center = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
  return wallRectFootprint(center, room, Math.max(1, newWidthFt), depthFt).footprint;
}

// The properties drawer for a selected infrastructure object — door/window
// share a width field (both are wall openings), the three typed point kinds
// each show only the minimal fields the user's spec called for (no pipe
// sizing, no duct CFM, no circuit routing).
export function InfrastructureInspector({ object, room, onUpdate, onResize, onDelete }: { object: SandboxBaseObject; room: { widthFt: number; heightFt: number }; onUpdate: (fn: (object: SandboxBaseObject) => SandboxBaseObject) => void; onResize: (footprint: SandboxPolygon) => void; onDelete: () => void }) {
  const bounds = polygonBounds(object.footprint);
  const side = wallSideOfBounds(bounds, room);
  const openingWidthFt = side === 'top' || side === 'bottom' ? bounds.right - bounds.left : bounds.bottom - bounds.top;
  const restrictedWidthFt = bounds.right - bounds.left;
  const restrictedDepthFt = bounds.bottom - bounds.top;
  const restrictedCenter = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
  return (
    <div className="ls-inspector">
      <b>{object.name}</b>
      <small>{object.kind.replace(/_/g, ' ')}</small>
      <div className="ls-inspector-actions">
        <button className="btn-out" onClick={onDelete}>Remove</button>
      </div>
      {(object.kind === 'door' || object.kind === 'window') && (
        <label><span className="field-label">Width (ft)</span><input className="field-input" type="number" min="1" step=".5" value={openingWidthFt} onChange={(e) => onResize(resizeWallOpening(object, room, Number(e.target.value) || openingWidthFt))} /></label>
      )}
      {object.kind === 'restricted_region' && (
        <div className="ls-room-fields">
          <label><span className="field-label">Width (ft)</span><input className="field-input" type="number" min=".5" step=".5" value={restrictedWidthFt} onChange={(e) => onResize(centeredRectFootprint(restrictedCenter, Math.max(.5, Number(e.target.value) || restrictedWidthFt), restrictedDepthFt))} /></label>
          <label><span className="field-label">Depth (ft)</span><input className="field-input" type="number" min=".5" step=".5" value={restrictedDepthFt} onChange={(e) => onResize(centeredRectFootprint(restrictedCenter, restrictedWidthFt, Math.max(.5, Number(e.target.value) || restrictedDepthFt)))} /></label>
        </div>
      )}
      {object.kind === 'door' && object.door && (
        <>
          <label><span className="field-label">Clear width (in)</span><input className="field-input" type="number" min="24" value={object.door.clearWidthIn} onChange={(e) => onUpdate((current) => ({ ...current, door: { ...current.door!, clearWidthIn: Number(e.target.value) || 24 } }))} /></label>
          <label className="ls-check"><input type="checkbox" checked={object.door.isExit} onChange={(e) => onUpdate((current) => ({ ...current, door: { ...current.door!, isExit: e.target.checked } }))} /> Is exit</label>
        </>
      )}
      {object.kind === 'electrical_point' && object.electrical && (
        <>
          <label><span className="field-label">Voltage</span>
            <select className="field-input" value={object.electrical.voltage} onChange={(e) => onUpdate((current) => ({ ...current, electrical: { ...current.electrical!, voltage: (e.target.value === 'other' ? 'other' : Number(e.target.value)) as 120 | 208 | 240 | 'other' } }))}>
              <option value={120}>120V</option><option value={208}>208V</option><option value={240}>240V</option><option value="other">Other</option>
            </select>
          </label>
          {object.electrical.voltage === 'other' && <label><span className="field-label">Voltage (other)</span><input className="field-input" value={object.electrical.voltageOther ?? ''} onChange={(e) => onUpdate((current) => ({ ...current, electrical: { ...current.electrical!, voltageOther: e.target.value } }))} /></label>}
          <label><span className="field-label">Phase</span>
            <select className="field-input" value={object.electrical.phase} onChange={(e) => onUpdate((current) => ({ ...current, electrical: { ...current.electrical!, phase: e.target.value as 'single' | 'three' } }))}>
              <option value="single">Single</option><option value="three">Three</option>
            </select>
          </label>
          <label><span className="field-label">Amperage (A)</span><input className="field-input" type="number" min="0" value={object.electrical.amperage} onChange={(e) => onUpdate((current) => ({ ...current, electrical: { ...current.electrical!, amperage: Math.max(0, Number(e.target.value) || 0) } }))} /></label>
          <label><span className="field-label">Receptacle count</span><input className="field-input" type="number" min="0" step="1" value={object.electrical.receptacleCount} onChange={(e) => onUpdate((current) => ({ ...current, electrical: { ...current.electrical!, receptacleCount: Math.max(0, Math.round(Number(e.target.value) || 0)) } }))} /></label>
          <label className="ls-check"><input type="checkbox" checked={object.electrical.dedicated} onChange={(e) => onUpdate((current) => ({ ...current, electrical: { ...current.electrical!, dedicated: e.target.checked } }))} /> Dedicated circuit</label>
          <label className="ls-check"><input type="checkbox" checked={object.electrical.emergencyPower} onChange={(e) => onUpdate((current) => ({ ...current, electrical: { ...current.electrical!, emergencyPower: e.target.checked } }))} /> Emergency / backup power</label>
        </>
      )}
      {object.kind === 'plumbing_point' && object.plumbing && (
        <>{(Object.keys(PLUMBING_FIELD_LABELS) as Array<keyof typeof PLUMBING_FIELD_LABELS>).map((field) => (
          <label className="ls-check" key={field}><input type="checkbox" checked={object.plumbing![field]} onChange={(e) => onUpdate((current) => ({ ...current, plumbing: { ...current.plumbing!, [field]: e.target.checked } }))} /> {PLUMBING_FIELD_LABELS[field]}</label>
        ))}
        <label><span className="field-label">Flow (gpm)</span><input className="field-input" type="number" min="0" step=".1" value={object.plumbing.flowGpm ?? ''} onChange={(e) => onUpdate((current) => ({ ...current, plumbing: { ...current.plumbing!, flowGpm: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) } }))} /></label>
        </>
      )}
      {object.kind === 'ventilation_point' && object.ventilation && (
        <>
          <div><span className="field-label">Category</span><div>{VENTILATION_PLACEMENT_LABELS[object.ventilation.category]}</div></div>
          <label><span className="field-label">Airflow (cfm)</span><input className="field-input" type="number" min="0" value={object.ventilation.cfm ?? ''} onChange={(e) => onUpdate((current) => ({ ...current, ventilation: { ...current.ventilation!, cfm: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) } }))} /></label>
          <label className="ls-check"><input type="checkbox" checked={object.ventilation.ducted} onChange={(e) => onUpdate((current) => ({ ...current, ventilation: { ...current.ventilation!, ducted: e.target.checked } }))} /> Ducted</label>
        </>
      )}
      {object.utility && (
        <>
          <label><span className="field-label">Mounting surface</span>
            <select className="field-input" value={object.utility.mountingSurface} onChange={(e) => {
              const mountingSurface = e.target.value as MountingSurface;
              onUpdate((current) => {
                if (mountingSurface !== 'wall') return { ...current, utility: { ...current.utility!, mountingSurface, wallId: undefined, offsetFt: undefined } };
                const anchor = current.footprint.points[0]; if (!anchor) return { ...current, utility: { ...current.utility!, mountingSurface } };
                const { point: snapped, side } = snapToNearestWall(anchor, room);
                return { ...current, footprint: { points: [snapped] }, utility: { ...current.utility!, mountingSurface, wallId: side, offsetFt: offsetAlongWall(side, snapped) } };
              });
            }}>
              <option value="wall">Wall</option><option value="ceiling">Ceiling</option><option value="floor">Floor</option><option value="bench">Bench</option>
            </select>
            {object.utility.mountingSurface === 'wall' && object.utility.wallId && <small>{object.utility.wallId} wall · {(object.utility.offsetFt ?? 0).toFixed(1)} ft from corner · slides along wall only</small>}
          </label>
          {/* HVAC supply/return/general exhaust describe a coverage zone (no
              discrete connection count); local exhaust connection — and
              electrical/plumbing points — describe an actual connectable
              service, so they keep both fields. Same underlying field either
              way, just relabeled. */}
          {object.kind === 'ventilation_point' && object.ventilation && object.ventilation.category !== 'local_exhaust_connection' ? (
            <label><span className="field-label">Coverage radius (ft)</span><input className="field-input" type="number" min="0" step=".5" value={object.utility.connectionRadiusFt} onChange={(e) => onUpdate((current) => ({ ...current, utility: { ...current.utility!, connectionRadiusFt: Math.max(0, Number(e.target.value) || 0) } }))} /></label>
          ) : (
            <>
              <label><span className="field-label">Connection radius (ft)</span><input className="field-input" type="number" min="0" step=".5" value={object.utility.connectionRadiusFt} onChange={(e) => onUpdate((current) => ({ ...current, utility: { ...current.utility!, connectionRadiusFt: Math.max(0, Number(e.target.value) || 0) } }))} /></label>
              <label><span className="field-label">Max connections</span><input className="field-input" type="number" min="1" step="1" value={object.utility.maxConnections} onChange={(e) => onUpdate((current) => ({ ...current, utility: { ...current.utility!, maxConnections: Math.max(1, Math.round(Number(e.target.value) || 1)) } }))} /></label>
            </>
          )}
          <label><span className="field-label">System / circuit ID</span><input className="field-input" value={object.utility.systemId ?? ''} onChange={(e) => onUpdate((current) => ({ ...current, utility: { ...current.utility!, systemId: e.target.value } }))} /></label>
          <label><span className="field-label">Status</span>
            <select className="field-input" value={object.utility.status} onChange={(e) => onUpdate((current) => ({ ...current, utility: { ...current.utility!, status: e.target.value as UtilityStatus } }))}>
              <option value="proposed">Proposed</option><option value="existing">Existing</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}
