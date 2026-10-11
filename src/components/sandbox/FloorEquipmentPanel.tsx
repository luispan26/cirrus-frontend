import type { FixtureKind } from '../../lib/layout-sandbox';

// Floor-standing equipment from the report this layout came from
// (plan.floorItems): cold storage, hoods, cabinets. Each one is dragged into
// the room as a fixture carrying its equipmentId; when the room is used in the
// intake and generated again, benches and aisles keep clear of it and the
// generator records it as placed (cirrus-backend floor-equipment.ts).
export interface FloorEquipmentItem { equipmentId: string; name: string; quantity: number; widthFt: number; depthFt: number; placeholderSize?: boolean }
export interface FloorEquipmentDragSpec { kind: FixtureKind; widthFt: number; depthFt: number; name: string; equipmentId: string }

// Which sandbox fixture a floor item is drawn as: hoods and biosafety
// cabinets keep the laminar hood's front clearance.
export function floorFixtureKind(item: { equipmentId: string; name: string }): FixtureKind {
  const text = `${item.equipmentId} ${item.name}`.toLowerCase();
  if (/freez|fridge|refrig|-20|-80|4 ?c\b|cold/.test(text)) return 'refrigerator';
  if (/hood|laminar|biosafety|\bbsc\b|flow cabinet/.test(text)) return 'laminarHood';
  return 'cabinet';
}

// afterGeneration: placed on a report's generated layout (benches stay),
// saved with the sandbox's Done button rather than used in the intake.
export function FloorEquipmentPanel({ items, placedCount, startDrag, moveDrag, finishDrag, cancelDrag, afterGeneration = false }: {
  afterGeneration?: boolean;
  items: FloorEquipmentItem[];
  placedCount: (equipmentId: string) => number;
  startDrag: (event: React.PointerEvent<HTMLDivElement>, spec: FloorEquipmentDragSpec) => void;
  moveDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  finishDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  cancelDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  if (items.length === 0) return null;
  const remaining = items.reduce((n, item) => n + Math.max(0, item.quantity - placedCount(item.equipmentId)), 0);
  return <>
    <div className="ls-section-title">Floor equipment</div>
    <p className="ls-help">
      {afterGeneration
        ? (remaining > 0
          ? <>Drag each item onto open floor. Against a wall it needs 2 ft clear beside each side and 3 ft in front. Then click Done.</>
          : <>All floor equipment is in the room. Click Done to save it to your report.</>)
        : remaining > 0
          ? <>Drag each item into the room. Against a wall, benches keep 2 ft clear beside each side and 3 ft in front of it. Anything you don’t place is listed as unplaced on your report.</>
          : <>All floor equipment is in the room. Use this room in your intake — benches are planned around it.</>}
    </p>
    {items.map((item) => {
      const placed = placedCount(item.equipmentId);
      const done = placed >= item.quantity;
      const spec: FloorEquipmentDragSpec = { kind: floorFixtureKind(item), widthFt: Math.max(0.5, item.widthFt), depthFt: Math.max(0.5, item.depthFt), name: item.name, equipmentId: item.equipmentId };
      return (
        <div
          key={item.equipmentId}
          className={`ls-palette-item ls-fixture-template ${spec.kind}`}
          style={{ touchAction: 'none', opacity: done ? 0.55 : 1, cursor: done ? 'default' : undefined }}
          title={done ? 'Every unit is already in the room — drag the placed one to move it.' : `Drag ${item.name} into the room`}
          onPointerDown={done ? undefined : (event) => startDrag(event, spec)}
          onPointerMove={done ? undefined : moveDrag}
          onPointerUp={done ? undefined : finishDrag}
          onPointerCancel={done ? undefined : cancelDrag}
        >
          <span>
            <b>{item.name}</b>
            <small>{spec.widthFt} × {spec.depthFt} ft{item.placeholderSize ? ' (size not measured yet)' : ''} · {Math.min(placed, item.quantity)} of {item.quantity} placed</small>
          </span>
        </div>
      );
    })}
  </>;
}
