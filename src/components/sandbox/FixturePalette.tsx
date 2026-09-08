import type { FixtureClearance, FixtureKind } from '../../lib/layout-sandbox';
import { ClearanceFields } from './ClearanceFields';
import { FIXTURE_DEFAULTS } from './constants';

export function FixturePalette({
  newKind, setKind, newWidth, setNewWidth, newDepth, setNewDepth, newClearance, setNewClearance,
  startPaletteDrag, movePaletteDrag, finishPaletteDrag, cancelPaletteDrag, visibleKinds,
}: {
  newKind: FixtureKind;
  setKind: (kind: FixtureKind) => void;
  newWidth: number;
  setNewWidth: (value: number) => void;
  newDepth: number;
  setNewDepth: (value: number) => void;
  newClearance: FixtureClearance;
  setNewClearance: (value: FixtureClearance) => void;
  startPaletteDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  movePaletteDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  finishPaletteDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  cancelPaletteDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  visibleKinds: FixtureKind[];
}) {
  return <>
    <div className="ls-section-title">Place fixtures</div>
    {visibleKinds.length === 0
      ? <p className="ls-help">No fixtures marked for manual placement yet — answer the fixtures question above.</p>
      : <>
        <div className="ls-kind-tabs">{visibleKinds.map((kind) => <button key={kind} className={newKind === kind ? 'active' : ''} onClick={() => setKind(kind)}>{FIXTURE_DEFAULTS[kind].name}</button>)}</div>
        <div className="ls-room-fields"><label><span className="field-label">Width (ft)</span><input className="field-input" type="number" min=".5" step=".5" value={newWidth} disabled={newKind === 'bench'} onChange={(e) => setNewWidth(Number(e.target.value))} /></label><label><span className="field-label">Depth (ft)</span><input className="field-input" type="number" min=".5" step=".5" value={newDepth} disabled={newKind === 'bench'} onChange={(e) => setNewDepth(Number(e.target.value))} /></label></div>
        {newKind === 'bench' && <p className="ls-help">Benches have a fixed 6 × 2.5 ft footprint and 15 sq ft equipment surface.</p>}
        {(newKind === 'bench' || newKind === 'laminarHood') && <ClearanceFields value={newClearance} overhead={newKind === 'laminarHood'} onChange={(field, value) => setNewClearance({ ...newClearance, [field]: value })} />}
        <div className={`ls-palette-item ls-fixture-template ${newKind}`} style={{ touchAction: 'none' }} onPointerDown={startPaletteDrag} onPointerMove={movePaletteDrag} onPointerUp={finishPaletteDrag} onPointerCancel={cancelPaletteDrag}><span><b>Drag {FIXTURE_DEFAULTS[newKind].name}</b><small>{newWidth} × {newDepth} ft</small></span></div>
      </>}
  </>;
}
