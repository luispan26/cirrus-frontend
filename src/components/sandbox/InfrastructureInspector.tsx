import { centeredRectFootprint, polygonBounds, wallRectFootprint, wallSideOfBounds, type SandboxBaseObject, type SandboxPolygon } from '../../lib/layout-sandbox';

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
// share a width field (both are wall openings); no-placement zones have a
// width and depth.
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
    </div>
  );
}
