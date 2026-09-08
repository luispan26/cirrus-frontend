import type { SandboxStationAssignment } from '../../lib/layout-sandbox';
import { equipmentArea } from './helpers';
import type { EquipmentCatalogItem } from './types';

export function EquipmentPanel({
  visibleEquipment, assignedEquipment, equipmentLoading, equipmentError, isBenchSelected, selectedBenchUsedArea, selectedBenchCapacity,
  selectedStation, assignEquipment, onRemoveEquipment,
}: {
  visibleEquipment: EquipmentCatalogItem[];
  assignedEquipment: Set<string>;
  equipmentLoading: boolean;
  equipmentError: { message: string } | undefined;
  isBenchSelected: boolean;
  selectedBenchUsedArea: number;
  selectedBenchCapacity: number;
  selectedStation: SandboxStationAssignment | null;
  assignEquipment: (equipmentId: string) => void;
  onRemoveEquipment: (equipmentId: string) => void;
}) {
  return <>
    <div className="ls-section-title">Equipment</div>
    <p className="ls-help">Select a station above, then assign MongoDB equipment linked to that station.</p>
    <div className="ls-palette ls-equipment-list">{visibleEquipment.map((e) => { const assigned = assignedEquipment.has(e.equipmentId); const tooLarge = isBenchSelected && selectedBenchUsedArea + equipmentArea(e) > selectedBenchCapacity + Number.EPSILON; return <button key={e.equipmentId} className={`ls-palette-item ls-station-choice ${assigned || tooLarge ? 'disabled' : ''}`} disabled={!selectedStation || assigned || tooLarge} onClick={() => assignEquipment(e.equipmentId)}><span><b>{e.name}</b><small>{assigned ? 'Assigned' : tooLarge ? `${equipmentArea(e).toFixed(2)} sq ft · Does not fit` : `${e.widthFt} × ${e.depthFt} ft · Assign to selected station`}</small></span></button>; })}{!equipmentLoading && !equipmentError && visibleEquipment.length === 0 && <p className="ls-help">{selectedStation ? 'No MongoDB equipment is linked to this station.' : 'No equipment exists in MongoDB yet.'}</p>}</div>
    {selectedStation && <><div className="ls-section-title">{selectedStation.name}</div>{selectedStation.equipment.map((e) => <div className="ls-assignment" key={e.equipmentId}><span>{e.name}</span><button onClick={() => onRemoveEquipment(e.equipmentId)}>×</button></div>)}</>}
  </>;
}
