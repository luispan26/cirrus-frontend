import { ZONE_COLORS } from '../../lib/kb';
import type { SandboxBaseObject, SandboxFixture, SandboxPolygon, UtilityReachabilityResult } from '../../lib/layout-sandbox';
import { ClearanceFields } from './ClearanceFields';
import { InfrastructureInspector } from './InfrastructureInspector';
import { UtilityReachabilityPanel } from './UtilityReachabilityPanel';

export function FixtureDetailsPanel({
  selectedBaseObject, room, updateSelectedBaseObject, updateSelectedBaseFootprint, deleteSelection,
  selectedFixture, rotateSelected, removeSelected, updateSelectedClearance,
  selectedStationId, setSelectedStationId, selectedBenchUsedArea, selectedBenchCapacity, utilityCheck,
}: {
  selectedBaseObject: SandboxBaseObject | null;
  room: { widthFt: number; heightFt: number };
  updateSelectedBaseObject: (fn: (object: SandboxBaseObject) => SandboxBaseObject) => void;
  updateSelectedBaseFootprint: (footprint: SandboxPolygon) => void;
  deleteSelection: () => void;
  selectedFixture: SandboxFixture | null;
  rotateSelected: () => void;
  removeSelected: () => void;
  updateSelectedClearance: (field: 'frontFt' | 'backFt' | 'sideFt' | 'overheadFt', value: number) => void;
  selectedStationId: string | null;
  setSelectedStationId: (id: string | null) => void;
  selectedBenchUsedArea: number;
  selectedBenchCapacity: number;
  utilityCheck: UtilityReachabilityResult | null;
}) {
  return <>
    <div className="ls-section-title first">Fixture details</div>
    {selectedBaseObject
      ? <InfrastructureInspector object={selectedBaseObject} room={room} onUpdate={updateSelectedBaseObject} onResize={updateSelectedBaseFootprint} onDelete={deleteSelection} />
      : !selectedFixture
        ? <p className="ls-help">Select a fixture or an infrastructure object to inspect it.</p>
        : <div className="ls-inspector">
            <b>{selectedFixture.name}</b>
            <small>{selectedFixture.widthFt} × {selectedFixture.depthFt} ft · {selectedFixture.orientation}° · front faces {({ 0: 'down', 90: 'right', 180: 'up', 270: 'left' } as const)[selectedFixture.orientation]}</small>
            <div className="ls-inspector-actions"><button className="btn-out" onClick={rotateSelected}>Rotate 90°</button><button className="btn-out" onClick={removeSelected}>Remove</button></div>
            {(selectedFixture.kind === 'bench' || selectedFixture.kind === 'laminarHood') && <><ClearanceFields value={selectedFixture.clearance ?? { frontFt: 0, backFt: 0, sideFt: 0 }} overhead={selectedFixture.kind === 'laminarHood'} onChange={updateSelectedClearance} /><p className="ls-help">Front and back rotate with the fixture. Side clearance applies to both sides.</p></>}
            {selectedFixture.kind === 'laminarHood' && <div className="ls-hood-guidance"><b>Placement checks</b><ul><li>Keep away from doors, windows, busy walkways, HVAC diffusers, fans, and other air-moving equipment.</li><li>Verify room currents at the face remain within the hood manufacturer’s limits; 30–50 fpm is a common caution range.</li><li>Confirm level, vibration-free support, suitable room pressure, and a dedicated circuit where required.</li><li>Preserve certification access to HEPA filters, motor, and plenum; confirm duct routing for ducted units.</li></ul><small>Overhead clearance is recorded but cannot be validated without room-height and obstruction data.</small></div>}
            {selectedFixture.kind === 'bench' && <><div className="ls-capacity"><span>Equipment area</span><b>{selectedBenchUsedArea.toFixed(2)} / {selectedBenchCapacity.toFixed(2)} sq ft</b><progress max={selectedBenchCapacity} value={selectedBenchUsedArea} /></div>{selectedFixture.stations.length === 0 ? <p className="ls-help">Assign a station from the left.</p> : selectedFixture.stations.map((s) => <button key={s.instanceId} className={`ls-station-card ${selectedStationId === s.instanceId ? 'active' : ''}`} onClick={() => setSelectedStationId(s.instanceId)}><span style={{ background: ZONE_COLORS[s.zone] || ZONE_COLORS.unassigned }} /><b>{s.name}</b><small>{s.equipment.length} equipment</small></button>)}{utilityCheck && <UtilityReachabilityPanel check={utilityCheck} />}</>}
          </div>}
  </>;
}
