import { ZONE_FAMILY_COLORS } from '../../lib/zone-requirements';
import { computeDoorSwing, deriveCirculationSpace, fixtureFootprint, validateSandboxLayout, type SandboxLayer, type SandboxLayout } from '../../lib/layout-sandbox';
import { POINT_KINDS } from './constants';
import { baseObjectLayer, hexToRgba } from './helpers';
import type { ZoningOverlay } from './types';
import { VentilationMarker } from './VentilationMarker';
import type { PlaceableBaseKind } from './constants';

export function CanvasLayers({ layout, layers, violations, selected, placingKind, zoning, onSelect, onPlace, onDrag, onDragEnd }: { layout: SandboxLayout; layers: Record<SandboxLayer, boolean>; violations: ReturnType<typeof validateSandboxLayout>; selected: string | null; placingKind: PlaceableBaseKind | null; zoning: ZoningOverlay | null; onSelect: (id: string, event: React.PointerEvent<SVGElement>) => void; onPlace: (event: React.MouseEvent<SVGSVGElement>) => void; onDrag: (event: React.PointerEvent<SVGSVGElement>) => void; onDragEnd: (event: React.PointerEvent<SVGSVGElement>) => void }) {
  const polygon = (points: { x: number; y: number }[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
  const circulation = deriveCirculationSpace(layout);
  const grid = layout.room.gridFt;
  return <svg className="ls-canvas-layers" viewBox={`0 0 ${layout.room.widthFt} ${layout.room.heightFt}`} preserveAspectRatio="none" aria-hidden="true" onPointerMove={onDrag} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} onClick={placingKind ? onPlace : undefined}>
    {layers.zoning && zoning && zoning.cellZones.map((zoneIndex, cell) => {
      if (zoneIndex === 0) return null;
      // zoneIndex is a solver implementation detail — color/identity always
      // comes from the legend entry it points to, never the number itself.
      const requirement = zoning.legend[zoneIndex - 1];
      if (!requirement) return null;
      const col = cell % zoning.roomWidth;
      const row = Math.floor(cell / zoning.roomWidth);
      return <rect key={`zone-${cell}`} className="ls-zone-cell" x={col * grid} y={row * grid} width={grid} height={grid} fill={hexToRgba(ZONE_FAMILY_COLORS[requirement.family] || '#999', .4)} />;
    })}
    {layout.baseObjects.filter((object) => layers[baseObjectLayer(object.kind)]).map((object) => {
      const isPoint = POINT_KINDS.includes(object.kind);
      const swing = object.kind === 'door' ? computeDoorSwing(object, layout.room) : null;
      const anchor = object.footprint.points[0] ?? { x: 0, y: 0 };
      return <g key={object.id} className={selected === object.id ? 'overlay-selected' : ''} onPointerDown={placingKind ? undefined : (event) => onSelect(object.id, event)}>
        {object.utility && <circle className={`ls-reach-zone ${object.kind}`} cx={anchor.x} cy={anchor.y} r={object.utility.connectionRadiusFt} />}
        {isPoint
          ? object.kind === 'ventilation_point' && object.ventilation ? <VentilationMarker object={object} /> : <circle className={`ls-infra-point ${object.kind}`} cx={anchor.x} cy={anchor.y} r={.3} />
          : <polygon className={`ls-base-shape ${object.kind}`} points={polygon(object.footprint.points)} />}
        <text x={anchor.x} y={anchor.y - (isPoint ? .45 : .2)}>{object.name}</text>
        {swing && <><line className="ls-door-leaf" x1={swing.hinge.x} y1={swing.hinge.y} x2={swing.leafTip.x} y2={swing.leafTip.y} /><polyline className="ls-door-swing" points={swing.arcPoints.map((p) => `${p.x},${p.y}`).join(' ')} /></>}
      </g>;
    })}
    {layers.circulation && circulation.reachable.map((cell) => <rect key={`circulation-${cell.x}-${cell.y}`} className="ls-derived-circulation" x={cell.x * circulation.gridFt} y={cell.y * circulation.gridFt} width={circulation.gridFt} height={circulation.gridFt} />)}
    {layers.validation && violations.flatMap((violation) => violation.objectIds.map((id) => { const fixture = layout.fixtures.find((item) => item.instanceId === id); if (!fixture) return null; const size = fixtureFootprint(fixture, layout.room.gridFt); return <rect key={`${violation.id}-${id}`} className={`ls-validation-shape ${violation.severity}`} x={fixture.x * layout.room.gridFt} y={fixture.y * layout.room.gridFt} width={size.width * layout.room.gridFt} height={size.height * layout.room.gridFt} />; }))}
  </svg>;
}
