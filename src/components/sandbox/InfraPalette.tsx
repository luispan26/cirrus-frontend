import type { SandboxLayer } from '../../lib/layout-sandbox';
import { INFRA_PALETTE, type PlaceableBaseKind } from './constants';

export function InfraPalette({ placingKind, beginPlacing, visibleLayers }: { placingKind: PlaceableBaseKind | null; beginPlacing: (kind: PlaceableBaseKind, layer: SandboxLayer) => void; visibleLayers: ReadonlySet<SandboxLayer> }) {
  const groups = INFRA_PALETTE.filter((group) => visibleLayers.has(group.layer));
  return <>
    <div className="ls-section-title">Infrastructure</div><p className="ls-help">Pick a point, then click the room to place it — wall-mounted kinds snap to the nearest wall.</p>
    {groups.length === 0 && <p className="ls-help">No infrastructure marked for manual placement yet — answer the infrastructure question above.</p>}
    {groups.map((group) => <div key={group.layer} className="ls-infra-group"><div className="ls-infra-group-title">{group.title}</div><div className="ls-infra-buttons">{group.items.map((item) => <button key={item.kind} className={placingKind === item.kind ? 'active' : ''} onClick={() => beginPlacing(item.kind, group.layer)}>+ {item.label}</button>)}</div></div>)}
  </>;
}
