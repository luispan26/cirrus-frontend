import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { APPROVE_SANDBOX_LAYOUT_MUTATION, EQUIPMENT_LIST_QUERY, LAYOUT_SANDBOX_CAPABILITIES_QUERY, STATIONS_QUERY } from '../graphql/operations';
import { ZONE_COLORS } from '../lib/kb';
import { BENCH_DEPTH_FT, BENCH_SURFACE_AREA_SQFT, BENCH_WIDTH_FT, EMPTY_SANDBOX_LAYOUT, canPlaceFixture, deriveCirculationSpace, fixtureFootprint, parseSandboxLayout, validateSandboxLayout, type FixtureClearance, type FixtureKind, type SandboxBaseObject, type SandboxEquipmentAssignment, type SandboxFixture, type SandboxLayer, type SandboxLayout, type SandboxStationAssignment } from '../lib/layout-sandbox';

interface StationCatalogItem { stationId: string; name: string; zone: string; }
interface EquipmentCatalogItem { equipmentId: string; name: string; widthFt: number; depthFt: number; heightFt: number; stationId: string | null; }
interface ApproveSandboxLayoutResponse { approveSandboxLayout: { seedId: string } }
interface LayoutCapabilities { schemaVersion: number; layers: string[]; fixtureKinds: string[]; collections: string[]; }
const STORAGE_KEY = 'cirrus.layout-sandbox.v2';
const FIXTURE_DEFAULTS: Record<FixtureKind, { name: string; widthFt: number; depthFt: number }> = {
  bench: { name: 'Bench', widthFt: BENCH_WIDTH_FT, depthFt: BENCH_DEPTH_FT }, laminarHood: { name: 'Laminar hood', widthFt: 4, depthFt: 2.5 }, sink: { name: 'Sink', widthFt: 3, depthFt: 2 }, cabinet: { name: 'Cabinet', widthFt: 3, depthFt: 2 }, refrigerator: { name: 'Refrigerator', widthFt: 3, depthFt: 3 }, door: { name: 'Door', widthFt: 3, depthFt: 1 }, waste: { name: 'Waste disposal', widthFt: 2, depthFt: 2 },
};
const DEFAULT_CLEARANCE: Record<'bench' | 'laminarHood', FixtureClearance> = {
  bench: { frontFt: 5, backFt: 0, sideFt: 0 },
  laminarHood: { frontFt: 5, backFt: 0, sideFt: 0, overheadFt: 1.5 },
};

function loadSaved(): SandboxLayout {
  try { return parseSandboxLayout(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')) || structuredClone(EMPTY_SANDBOX_LAYOUT); }
  catch { return structuredClone(EMPTY_SANDBOX_LAYOUT); }
}
function ClearanceFields({ value, onChange, overhead = false }: { value: FixtureClearance; onChange: (field: keyof FixtureClearance, value: number) => void; overhead?: boolean }) {
  const fields: [keyof FixtureClearance, string][] = [['frontFt', 'Front clearance (ft)']];
  if (overhead) fields.push(['overheadFt', 'Overhead clearance (ft)']);
  return <div className="ls-clearance-fields">{fields.map(([field, label]) => <label key={field}><span className="field-label">{label}</span><input className="field-input" type="number" min={field === 'frontFt' ? '5' : '0'} step=".5" value={field === 'frontFt' ? Math.max(5, value[field] ?? 5) : value[field] ?? 0} onChange={(e) => onChange(field, field === 'frontFt' ? Math.max(5, Number(e.target.value) || 5) : Math.max(0, Number(e.target.value) || 0))} /></label>)}</div>;
}

function equipmentArea(equipment: Pick<SandboxEquipmentAssignment, 'widthFt' | 'depthFt'>) {
  return Math.max(0, equipment.widthFt ?? 0) * Math.max(0, equipment.depthFt ?? 0);
}

function benchEquipmentArea(fixture: SandboxFixture) {
  return fixture.stations.reduce((total, station) => total + station.equipment.reduce((sum, equipment) => sum + equipmentArea(equipment), 0), 0);
}

function CanvasLayers({ layout, layers, violations, selected, onSelect, onDrag, onDragEnd }: { layout: SandboxLayout; layers: Record<SandboxLayer, boolean>; violations: ReturnType<typeof validateSandboxLayout>; selected: { layer: 'base' | 'electrical'; id: string } | null; onSelect: (layer: 'base' | 'electrical', id: string, event: React.PointerEvent<SVGElement>) => void; onDrag: (event: React.PointerEvent<SVGSVGElement>) => void; onDragEnd: (event: React.PointerEvent<SVGSVGElement>) => void }) {
  const polygon = (points: { x: number; y: number }[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
  const circulation = deriveCirculationSpace(layout);
  return <svg className="ls-canvas-layers" viewBox={`0 0 ${layout.room.widthFt} ${layout.room.heightFt}`} preserveAspectRatio="none" aria-hidden="true" onPointerMove={onDrag} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
    {layers.base && layout.baseObjects.map((object) => <g key={object.id} className={selected?.layer === 'base' && selected.id === object.id ? 'overlay-selected' : ''} onPointerDown={(event) => onSelect('base', object.id, event)}><polygon className={`ls-base-shape ${object.kind}`} points={polygon(object.footprint.points)} /><text x={object.footprint.points[0]?.x ?? 0} y={(object.footprint.points[0]?.y ?? 0) - .2}>{object.name}{object.locked ? ' 🔒' : ''}</text>{object.door?.swingArc && <polygon className="ls-door-swing" points={polygon(object.door.swingArc.points)} />}</g>)}
    {layers.circulation && circulation.reachable.map((cell) => <rect key={`circulation-${cell.x}-${cell.y}`} className="ls-derived-circulation" x={cell.x * circulation.gridFt} y={cell.y * circulation.gridFt} width={circulation.gridFt} height={circulation.gridFt} />)}
    {layers.electrical && layout.electricalEndpoints.map((endpoint) => <g key={endpoint.id} className={`ls-electrical-overlay ${selected?.layer === 'electrical' && selected.id === endpoint.id ? 'overlay-selected' : ''}`} onPointerDown={(event) => onSelect('electrical', endpoint.id, event)}><circle cx={endpoint.position.x} cy={endpoint.position.y} r={.35} /><text x={endpoint.position.x + .45} y={endpoint.position.y}>{endpoint.voltage}V · {endpoint.circuitId}</text></g>)}
    {layers.validation && violations.flatMap((violation) => violation.objectIds.map((id) => { const fixture = layout.fixtures.find((item) => item.instanceId === id); if (!fixture) return null; const size = fixtureFootprint(fixture, layout.room.gridFt); return <rect key={`${violation.id}-${id}`} className={`ls-validation-shape ${violation.severity}`} x={fixture.x * layout.room.gridFt} y={fixture.y * layout.room.gridFt} width={size.width * layout.room.gridFt} height={size.height * layout.room.gridFt} />; }))}
  </svg>;
}

export function LayoutSandboxPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasNode, setCanvasNode] = useState<HTMLDivElement | null>(null);
  const dragFrame = useRef<number | null>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number; x: number; y: number } | null>(null);
  const overlayDrag = useRef<{ layer: 'base' | 'electrical'; id: string; clientX: number; clientY: number } | null>(null);
  const [layout, setLayout] = useState<SandboxLayout>(loadSaved);
  const [layers, setLayers] = useState<Record<SandboxLayer, boolean>>({ base: true, stations: true, equipment: true, circulation: true, electrical: false, validation: true });
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<{ layer: 'base' | 'electrical'; id: string } | null>(null);
  const [backendNotice, setBackendNotice] = useState<{ kind: 'progress' | 'error'; text: string } | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<FixtureKind>('bench');
  const [newWidth, setNewWidth] = useState(6);
  const [newDepth, setNewDepth] = useState(2.5);
  const [newClearance, setNewClearance] = useState<FixtureClearance>(DEFAULT_CLEARANCE.bench);
  const [message, setMessage] = useState('Set fixture dimensions, then drag it into the room.');
  const { data: stationData, loading: stationsLoading, error: stationsError, refetch: refetchStations } = useQuery<{ stations: StationCatalogItem[] }>(STATIONS_QUERY, { fetchPolicy: 'cache-and-network' });
  const { data: equipmentData, loading: equipmentLoading, error: equipmentError, refetch: refetchEquipment } = useQuery<{ equipmentList: EquipmentCatalogItem[] }>(EQUIPMENT_LIST_QUERY, { fetchPolicy: 'cache-and-network' });
  const { data: capabilityData } = useQuery<{ layoutSandboxCapabilities: LayoutCapabilities }>(LAYOUT_SANDBOX_CAPABILITIES_QUERY, { fetchPolicy: 'cache-and-network' });
  const [approveSandboxLayout, { loading: sendingToSeedGenerator }] = useMutation<ApproveSandboxLayoutResponse>(APPROVE_SANDBOX_LAYOUT_MUTATION);
  const stationCatalog = stationData?.stations ?? [];
  const equipmentCatalog = equipmentData?.equipmentList ?? [];
  const catalogError = stationsError || equipmentError;
  const columns = Math.max(1, Math.ceil(layout.room.widthFt / layout.room.gridFt));
  const rows = Math.max(1, Math.ceil(layout.room.heightFt / layout.room.gridFt));
  const selectedFixture = layout.fixtures.find((f) => f.instanceId === selectedFixtureId) || null;
  const selectedStation = selectedFixture?.stations.find((s) => s.instanceId === selectedStationId) || null;
  const visibleEquipment = selectedStation ? equipmentCatalog.filter((e) => !e.stationId || e.stationId === selectedStation.stationId) : equipmentCatalog;
  const selectedBenchCapacity = selectedFixture?.kind === 'bench' ? BENCH_SURFACE_AREA_SQFT : 0;
  const selectedBenchUsedArea = selectedFixture?.kind === 'bench' ? benchEquipmentArea(selectedFixture) : 0;
  const assignedEquipment = new Set(layout.fixtures.flatMap((f) => f.stations.flatMap((s) => s.equipment.map((e) => e.equipmentId))));
  const utilization = useMemo(() => Math.round(layout.fixtures.reduce((sum, f) => { const size = fixtureFootprint(f, layout.room.gridFt); return sum + size.width * size.height; }, 0) / (columns * rows) * 100), [layout, columns, rows]);
  const violations = useMemo(() => validateSandboxLayout(layout, columns, rows), [layout, columns, rows]);
  useEffect(() => setCanvasNode(canvasRef.current), []);
  useEffect(() => {
    const capabilities = capabilityData?.layoutSandboxCapabilities;
    if (!capabilities) return;
    const editorLayers: SandboxLayer[] = ['base', 'stations', 'equipment', 'circulation', 'electrical', 'validation'];
    const editorCollections = ['fixtures', 'baseObjects', 'electricalEndpoints', 'electricalCircuits'];
    const unsupported = [
      ...capabilities.layers.filter((value) => !editorLayers.includes(value as SandboxLayer)),
      ...capabilities.fixtureKinds.filter((value) => !(value in FIXTURE_DEFAULTS)),
      ...capabilities.collections.filter((value) => !editorCollections.includes(value)),
    ];
    if (capabilities.schemaVersion === EMPTY_SANDBOX_LAYOUT.version && unsupported.length === 0) return;
    setBackendNotice({ kind: 'error', text: `Layout editor schema v${EMPTY_SANDBOX_LAYOUT.version} does not fully support generator schema v${capabilities.schemaVersion}${unsupported.length ? ` (${unsupported.join(', ')})` : ''}. Update the sandbox before editing this layout.` });
  }, [capabilityData]);
  useEffect(() => {
    function onBackspace(event: KeyboardEvent) {
      if (event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (!selectedOverlay && !selectedStationId && !selectedFixtureId) return;
      event.preventDefault(); deleteSelection();
    }
    window.addEventListener('keydown', onBackspace);
    return () => window.removeEventListener('keydown', onBackspace);
  });

  function updateLayout(fn: (previous: SandboxLayout) => SandboxLayout) { setLayout((previous) => ({ ...fn(previous), updatedAt: new Date().toISOString() })); }
  function setKind(kind: FixtureKind) { const d = FIXTURE_DEFAULTS[kind]; setNewKind(kind); setNewWidth(d.widthFt); setNewDepth(d.depthFt); if (kind === 'bench' || kind === 'laminarHood') setNewClearance({ ...DEFAULT_CLEARANCE[kind] }); }
  function createFixture(x: number, y: number) {
    const d = FIXTURE_DEFAULTS[newKind];
    const fixture: SandboxFixture = { instanceId: `${newKind}-${Date.now()}`, kind: newKind, name: d.name, x, y, widthFt: newKind === 'bench' ? BENCH_WIDTH_FT : Math.max(.5, newWidth), depthFt: newKind === 'bench' ? BENCH_DEPTH_FT : Math.max(.5, newDepth), orientation: 0, clearance: newKind === 'bench' || newKind === 'laminarHood' ? { ...newClearance } : undefined, stations: [] };
    if (!canPlaceFixture(fixture, layout.fixtures, columns, rows, layout.room.gridFt)) return setMessage('That fixture does not fit there or overlaps another fixture.');
    updateLayout((p) => ({ ...p, fixtures: [...p.fixtures, fixture] })); setSelectedFixtureId(fixture.instanceId); setSelectedStationId(null); setMessage(`${fixture.name} placed.`);
  }
  function moveFixture(id: string, x: number, y: number) {
    const fixture = layout.fixtures.find((f) => f.instanceId === id); if (!fixture) return;
    const moved = { ...fixture, x, y };
    if (!canPlaceFixture(moved, layout.fixtures, columns, rows, layout.room.gridFt)) return setMessage('That move is outside the room or overlaps another fixture.');
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId === id ? moved : f) })); setSelectedFixtureId(id); setMessage(`${fixture.name} moved.`);
  }
  function startFixtureMove(event: React.PointerEvent<HTMLDivElement>, fixture: SandboxFixture) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const pointerX = (event.clientX - rect.left) / rect.width * columns;
    const pointerY = (event.clientY - rect.top) / rect.height * rows;
    dragState.current = { id: fixture.instanceId, offsetX: pointerX - fixture.x, offsetY: pointerY - fixture.y, x: fixture.x, y: fixture.y };
    setSelectedOverlay(null); setSelectedFixtureId(fixture.instanceId); setSelectedStationId(null); setDragPreview({ id: fixture.instanceId, x: fixture.x, y: fixture.y });
  }
  function previewFixtureMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    drag.x = Math.min(columns - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * columns - drag.offsetX)));
    drag.y = Math.min(rows - 1, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * rows - drag.offsetY)));
    if (dragFrame.current !== null) return;
    dragFrame.current = requestAnimationFrame(() => { dragFrame.current = null; const current = dragState.current; if (current) setDragPreview({ id: current.id, x: current.x, y: current.y }); });
  }
  function finishFixtureMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current; if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId); dragState.current = null;
    if (dragFrame.current !== null) { cancelAnimationFrame(dragFrame.current); dragFrame.current = null; }
    setDragPreview(null); moveFixture(drag.id, drag.x, drag.y);
  }
  function moveFixtureWithKeyboard(event: React.KeyboardEvent<HTMLDivElement>, fixture: SandboxFixture) {
    const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = delta[event.key]; if (!direction) return;
    event.preventDefault(); event.stopPropagation(); moveFixture(fixture.instanceId, fixture.x + direction[0], fixture.y + direction[1]);
  }
  function dropOnCanvas(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(columns - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * columns)));
    const y = Math.min(rows - 1, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * rows)));
    const type = event.dataTransfer.getData('cirrus/type'); if (type === 'fixture-template') createFixture(x, y); if (type === 'fixture-instance') moveFixture(event.dataTransfer.getData('cirrus/id'), x, y);
  }
  function assignStation(stationId: string) {
    if (!selectedFixture || selectedFixture.kind !== 'bench') return setMessage('Select a bench before assigning a station.');
    const catalog = stationCatalog.find((s) => s.stationId === stationId); if (!catalog) return;
    const station: SandboxStationAssignment = { instanceId: `${stationId}-${Date.now()}`, stationId, name: catalog.name, zone: catalog.zone || 'unassigned', equipment: [], accessFaces: ['front'], operatingClearances: [], serviceClearances: [] };
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId === selectedFixture.instanceId ? { ...f, stations: [...f.stations, station] } : f) })); setSelectedStationId(station.instanceId); setMessage(`${station.name} assigned to ${selectedFixture.name}.`);
  }
  function assignEquipment(equipmentId: string) {
    if (!selectedStation || !selectedFixture) return setMessage('Select an assigned station first.');
    if (assignedEquipment.has(equipmentId)) return setMessage('That equipment is already assigned.');
    const e = equipmentCatalog.find((item) => item.equipmentId === equipmentId); if (!e) return;
    const nextArea = selectedBenchUsedArea + equipmentArea(e);
    if (selectedFixture.kind !== 'bench' || nextArea > selectedBenchCapacity + Number.EPSILON) return setMessage(`${e.name} does not fit. This bench has ${Math.max(0, selectedBenchCapacity - selectedBenchUsedArea).toFixed(2)} sq ft available.`);
    const assignment: SandboxEquipmentAssignment = { equipmentId, name: e.name, widthFt: e.widthFt, depthFt: e.depthFt, heightFt: e.heightFt };
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId !== selectedFixture.instanceId ? f : { ...f, stations: f.stations.map((s) => s.instanceId === selectedStation.instanceId ? { ...s, equipment: [...s.equipment, assignment] } : s) }) })); setMessage(`${e.name} assigned to ${selectedStation.name}.`);
  }
  function rotateSelected() { if (!selectedFixture) return; const rotated: SandboxFixture = { ...selectedFixture, orientation: ((selectedFixture.orientation + 90) % 360) as SandboxFixture['orientation'] }; if (!canPlaceFixture(rotated, layout.fixtures, columns, rows, layout.room.gridFt)) return setMessage('There is not enough clear space to rotate this fixture.'); updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId === rotated.instanceId ? rotated : f) })); setMessage(`${rotated.name} rotated to ${rotated.orientation}°.`); }
  function updateSelectedClearance(field: keyof FixtureClearance, value: number) {
    if (!selectedFixture || (selectedFixture.kind !== 'bench' && selectedFixture.kind !== 'laminarHood')) return;
    const clearance = { ...(selectedFixture.clearance ?? { frontFt: 0, backFt: 0, sideFt: 0 }), [field]: Math.max(0, value || 0) };
    const changed = { ...selectedFixture, clearance };
    if (!canPlaceFixture(changed, layout.fixtures, columns, rows, layout.room.gridFt)) return setMessage('That clearance would overlap another fixture or extend outside the room.');
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId === changed.instanceId ? changed : f) }));
    setMessage('Bench clearance updated.');
  }
  function removeSelected() { if (!selectedFixture) return; updateLayout((p) => ({ ...p, fixtures: p.fixtures.filter((f) => f.instanceId !== selectedFixture.instanceId) })); setSelectedFixtureId(null); setSelectedStationId(null); setMessage('Fixture removed.'); }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); setMessage('Layout saved in this browser.'); }
  async function sendToSeedGenerator() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    setBackendNotice({ kind: 'progress', text: 'Adding this design to the approved seed library…' });
    try {
      const response = await approveSandboxLayout({ variables: { layout } });
      if (!response.data?.approveSandboxLayout?.seedId) throw new Error('The server did not return an approved seed');
      setBackendNotice(null);
      navigate('/layout-candidates');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setBackendNotice({ kind: 'error', text: `Could not add this design to the approved seed library: ${detail}` });
      setMessage('The design was kept in the sandbox. Fix the save error and try again.');
    }
  }
  async function refreshCatalogs() { try { await Promise.all([refetchStations(), refetchEquipment()]); setMessage('Stations and equipment refreshed from MongoDB.'); } catch { setMessage('Could not refresh the MongoDB catalog. Check the Cirrus API connection.'); } }
  function addBaseObject(kind: 'column' | 'door' | 'restricted_region') {
    const x = Math.max(1, layout.room.widthFt / 2 - 1), y = Math.max(1, layout.room.heightFt / 2 - 1);
    const footprint = { points: [{ x, y }, { x: x + (kind === 'door' ? 3 : 2), y }, { x: x + (kind === 'door' ? 3 : 2), y: y + (kind === 'door' ? .5 : 2) }, { x, y: y + (kind === 'door' ? .5 : 2) }] };
    const object: SandboxBaseObject = { id: `${kind}-${Date.now()}`, kind, name: kind === 'restricted_region' ? 'Restricted region' : kind === 'door' ? 'Exit door' : 'Column', footprint, locked: true, door: kind === 'door' ? { clearWidthIn: 36, isExit: true, swingArc: { points: [{ x, y }, { x: x + 3, y }, { x, y: y + 3 }] } } : undefined };
    updateLayout((current) => ({ ...current, baseObjects: [...current.baseObjects, object] })); setMessage(`${object.name} added and locked.`);
  }
  function addElectricalEndpoint() {
    const circuitId = `C-${layout.electricalCircuits.length + 1}`;
    updateLayout((current) => ({ ...current, electricalCircuits: [...current.electricalCircuits, { id: circuitId, allowableLoadVa: 1440, existingLoadVa: 0 }], electricalEndpoints: [...current.electricalEndpoints, { id: `outlet-${Date.now()}`, position: { x: 1, y: 1 }, voltage: 120, amperage: 15, phase: 1, frequencyHz: 60, plugType: 'NEMA 5-15', circuitId, powerClass: 'normal' }] })); setMessage('Electrical endpoint and circuit added.');
  }
  function startOverlayMove(layer: 'base' | 'electrical', id: string, event: React.PointerEvent<SVGElement>) {
    event.preventDefault(); event.stopPropagation(); setSelectedFixtureId(null); setSelectedStationId(null); setSelectedOverlay({ layer, id });
    const base = layer === 'base' ? layout.baseObjects.find((object) => object.id === id) : null;
    if (base?.locked) { setMessage(`${base.name} is locked. Unlock it before moving.`); return; }
    event.currentTarget.setPointerCapture(event.pointerId);
    overlayDrag.current = { layer, id, clientX: event.clientX, clientY: event.clientY };
  }
  function moveOverlay(event: React.PointerEvent<SVGSVGElement>) {
    const drag = overlayDrag.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    const dx = (event.clientX - drag.clientX) / rect.width * layout.room.widthFt;
    const dy = (event.clientY - drag.clientY) / rect.height * layout.room.heightFt;
    if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return;
    drag.clientX = event.clientX; drag.clientY = event.clientY;
    updateLayout((current) => {
      if (drag.layer === 'base') return { ...current, baseObjects: current.baseObjects.map((object) => object.id !== drag.id ? object : { ...object, footprint: { points: object.footprint.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) }, door: object.door ? { ...object.door, swingArc: object.door.swingArc ? { points: object.door.swingArc.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) } : undefined } : undefined }) };
      return { ...current, electricalEndpoints: current.electricalEndpoints.map((endpoint) => endpoint.id !== drag.id ? endpoint : { ...endpoint, position: { x: endpoint.position.x + dx, y: endpoint.position.y + dy } }) };
    });
  }
  function finishOverlayMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!overlayDrag.current) return; overlayDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setMessage('Layer object moved.');
  }
  function toggleSelectedBaseLock() {
    if (selectedOverlay?.layer !== 'base') return;
    updateLayout((current) => ({ ...current, baseObjects: current.baseObjects.map((object) => object.id === selectedOverlay.id ? { ...object, locked: !object.locked } : object) }));
  }
  function deleteSelection() {
    if (selectedOverlay) {
      updateLayout((current) => selectedOverlay.layer === 'base'
        ? { ...current, baseObjects: current.baseObjects.filter((object) => object.id !== selectedOverlay.id) }
        : { ...current, electricalEndpoints: current.electricalEndpoints.filter((endpoint) => endpoint.id !== selectedOverlay.id) });
      setSelectedOverlay(null); setMessage('Selected layer object deleted.'); return;
    }
    if (selectedStationId && selectedFixtureId) {
      updateLayout((current) => ({ ...current, fixtures: current.fixtures.map((fixture) => fixture.instanceId !== selectedFixtureId ? fixture : { ...fixture, stations: fixture.stations.filter((station) => station.instanceId !== selectedStationId) }) }));
      setSelectedStationId(null); setMessage('Selected station assignment deleted.'); return;
    }
    if (selectedFixtureId) {
      updateLayout((current) => ({ ...current, fixtures: current.fixtures.filter((fixture) => fixture.instanceId !== selectedFixtureId) }));
      setSelectedFixtureId(null); setMessage('Selected fixture deleted.');
    }
  }
  function applySuggestedFix(violation: (typeof violations)[number]) {
    const fix = violation.fix; if (!fix) return;
    if (fix.type === 'add-exit') { addBaseObject('door'); return; }
    updateLayout((current) => {
      if (fix.type === 'set-door-width') return { ...current, baseObjects: current.baseObjects.map((object) => object.id === fix.targetId && object.door ? { ...object, door: { ...object.door, clearWidthIn: fix.value ?? 32 } } : object) };
      if (fix.type === 'set-access-face') return { ...current, fixtures: current.fixtures.map((fixture) => ({ ...fixture, stations: fixture.stations.map((station) => station.instanceId === fix.targetId ? { ...station, accessFaces: ['front'] } : station) })) };
      if (fix.type === 'add-circuit') {
        const endpoint = current.electricalEndpoints.find((item) => item.id === fix.targetId); if (!endpoint || current.electricalCircuits.some((circuit) => circuit.id === endpoint.circuitId)) return current;
        return { ...current, electricalCircuits: [...current.electricalCircuits, { id: endpoint.circuitId, allowableLoadVa: endpoint.voltage * endpoint.amperage * .8, existingLoadVa: 0 }] };
      }
      if (fix.type === 'remove-largest-equipment') {
        const fixture = current.fixtures.find((item) => item.instanceId === fix.targetId); if (!fixture) return current;
        const largest = fixture.stations.flatMap((station) => station.equipment).sort((a, b) => equipmentArea(b) - equipmentArea(a))[0]; if (!largest) return current;
        return { ...current, fixtures: current.fixtures.map((item) => item.instanceId !== fixture.instanceId ? item : { ...item, stations: item.stations.map((station) => ({ ...station, equipment: station.equipment.filter((equipment) => equipment.equipmentId !== largest.equipmentId) })) }) };
      }
      if (fix.type === 'move-fixture') {
        const fixture = current.fixtures.find((item) => item.instanceId === fix.targetId); if (!fixture) return current;
        const spots = Array.from({ length: columns * rows }, (_, index) => ({ x: index % columns, y: Math.floor(index / columns) })).sort((a, b) => Math.abs(a.x - fixture.x) + Math.abs(a.y - fixture.y) - Math.abs(b.x - fixture.x) - Math.abs(b.y - fixture.y));
        for (const spot of spots) {
          const moved = { ...fixture, ...spot }; const candidate = { ...current, fixtures: current.fixtures.map((item) => item.instanceId === fixture.instanceId ? moved : item) };
          const blocking = validateSandboxLayout(candidate, columns, rows).some((item) => item.severity === 'error' && item.objectIds.includes(fixture.instanceId) && (item.id.startsWith('placement-') || item.id.startsWith('base-overlap-')));
          if (!blocking) return candidate;
        }
      }
      return current;
    });
    setMessage(`Applied suggestion: ${fix.label}.`);
  }
  function selectViolation(violation: (typeof violations)[number]) {
    const id = violation.objectIds[0]; if (!id) return;
    if (layout.fixtures.some((fixture) => fixture.instanceId === id)) { setSelectedOverlay(null); setSelectedFixtureId(id); return; }
    if (layout.baseObjects.some((object) => object.id === id)) setSelectedOverlay({ layer: 'base', id });
    else if (layout.electricalEndpoints.some((endpoint) => endpoint.id === id)) setSelectedOverlay({ layer: 'electrical', id });
  }
  function exportLayout() { const url = URL.createObjectURL(new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `${layout.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'layout'}.json`; a.click(); URL.revokeObjectURL(url); }
  async function importLayout(file?: File) { if (!file) return; try { const parsed = parseSandboxLayout(JSON.parse(await file.text())); if (!parsed) throw Error(); setLayout(parsed); setSelectedFixtureId(null); setSelectedStationId(null); setMessage('Layout imported.'); } catch { setMessage('That file is not a valid Cirrus layout. Version 2 and 3 files are supported.'); } }

  return <div className={`screen layout-sandbox ${layers.base ? 'show-base' : 'hide-base'} ${layers.stations ? 'show-stations' : 'hide-stations'} ${layers.equipment ? 'show-equipment' : 'hide-equipment'} ${layers.circulation ? 'show-circulation' : 'hide-circulation'} ${layers.electrical ? 'show-electrical' : 'hide-electrical'}`}>
    <div className="ls-control-deck">
    <div className="ls-layer-tabs" aria-label="Canvas layers">{(['base','stations','equipment','circulation','electrical','validation'] as SandboxLayer[]).map((layer) => <button key={layer} className={layers[layer] ? 'active' : ''} onClick={() => setLayers((current) => ({ ...current, [layer]: !current[layer] }))}>{layer}{layer === 'validation' && violations.length ? ` (${violations.length})` : ''}</button>)}</div>
    <div className="ls-layer-tools">{layers.base && <><button onClick={() => addBaseObject('column')}>+ Column</button><button onClick={() => addBaseObject('door')}>+ Exit</button><button onClick={() => addBaseObject('restricted_region')}>+ Restricted</button>{selectedOverlay?.layer === 'base' && <button onClick={toggleSelectedBaseLock}>{layout.baseObjects.find((object) => object.id === selectedOverlay.id)?.locked ? 'Unlock selected' : 'Lock selected'}</button>}</>}{layers.circulation && <span className="ls-derived-note">Derived from unassigned space</span>}{layers.electrical && <button onClick={addElectricalEndpoint}>+ Outlet</button>}</div>
    <div className="ls-backend-actions"><button disabled={sendingToSeedGenerator} onClick={() => void sendToSeedGenerator()}>{sendingToSeedGenerator ? 'Saving approved seed…' : 'Use in seed generator'}</button></div>
    {backendNotice && <div className={`ls-optimization-notice ${backendNotice.kind}`}><span>{backendNotice.kind === 'progress' ? '⏳' : '⚠'}</span><b>{backendNotice.text}</b>{backendNotice.kind === 'error' && <button onClick={() => setBackendNotice(null)}>×</button>}</div>}
    {canvasNode && createPortal(<CanvasLayers layout={layout} layers={layers} violations={violations} selected={selectedOverlay} onSelect={startOverlayMove} onDrag={moveOverlay} onDragEnd={finishOverlayMove} />, canvasNode)}
    {layers.validation && violations.length > 0 && <div className="ls-violations">{violations.map((violation) => <div key={violation.id} className={`ls-violation-card ${violation.severity}`} onClick={() => selectViolation(violation)}><b>{violation.severity === 'error' ? 'Hard violation' : 'Recommendation'}</b><span>{violation.message}</span>{violation.fix && <button onClick={(event) => { event.stopPropagation(); applySuggestedFix(violation); }}>✨ {violation.fix.label}</button>}</div>)}</div>}
    </div>
    <div className="qm-topbar"><div className="logo-mark">CIRRUS</div><div><b>Layout sandbox</b><div className="ls-subtitle">Place fixtures, assign stations to benches, then add equipment</div></div><div style={{ flex: 1 }} /><button className="btn-out" onClick={save}>Save</button><button className="btn-out" onClick={exportLayout}>Export JSON</button><button className="btn-out" onClick={() => fileInput.current?.click()}>Import</button><input ref={fileInput} hidden type="file" accept="application/json" onChange={(e) => importLayout(e.target.files?.[0])} /><button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button></div>
    <div className="ls-workspace">
      <aside className="ls-sidebar"><label className="field-label">Layout name</label><input className="field-input" value={layout.name} onChange={(e) => updateLayout((p) => ({ ...p, name: e.target.value }))} /><div className="ls-room-fields"><label><span className="field-label">Width (ft)</span><input className="field-input" type="number" min="5" value={layout.room.widthFt} onChange={(e) => updateLayout((p) => ({ ...p, room: { ...p.room, widthFt: Math.max(5, Number(e.target.value)) } }))} /></label><label><span className="field-label">Depth (ft)</span><input className="field-input" type="number" min="5" value={layout.room.heightFt} onChange={(e) => updateLayout((p) => ({ ...p, room: { ...p.room, heightFt: Math.max(5, Number(e.target.value)) } }))} /></label></div>
        <div className="ls-section-title">1. Place fixtures</div><div className="ls-kind-tabs">{(['bench','laminarHood','sink','cabinet','refrigerator','door','waste'] as FixtureKind[]).map((kind) => <button key={kind} className={newKind === kind ? 'active' : ''} onClick={() => setKind(kind)}>{FIXTURE_DEFAULTS[kind].name}</button>)}</div><div className="ls-room-fields"><label><span className="field-label">Width (ft)</span><input className="field-input" type="number" min=".5" step=".5" value={newWidth} disabled={newKind === 'bench'} onChange={(e) => setNewWidth(Number(e.target.value))} /></label><label><span className="field-label">Depth (ft)</span><input className="field-input" type="number" min=".5" step=".5" value={newDepth} disabled={newKind === 'bench'} onChange={(e) => setNewDepth(Number(e.target.value))} /></label></div>{newKind === 'bench' && <p className="ls-help">Benches have a fixed 6 × 2.5 ft footprint and 15 sq ft equipment surface.</p>}{(newKind === 'bench' || newKind === 'laminarHood') && <ClearanceFields value={newClearance} overhead={newKind === 'laminarHood'} onChange={(field, value) => setNewClearance({ ...newClearance, [field]: value })} />}<div className={`ls-palette-item ls-fixture-template ${newKind}`} draggable onDragStart={(e) => e.dataTransfer.setData('cirrus/type', 'fixture-template')}><span><b>Drag {FIXTURE_DEFAULTS[newKind].name}</b><small>{newWidth} × {newDepth} ft</small></span></div>
        <div className="ls-section-title">2. Assign stations</div><div className="ls-catalog-status"><span>{stationsLoading || equipmentLoading ? 'Syncing with MongoDB…' : catalogError ? 'Database unavailable' : `${stationCatalog.length} stations · ${equipmentCatalog.length} equipment`}</span><button className="btn-out" onClick={refreshCatalogs}>Refresh</button></div>{catalogError && <p className="ls-data-error">Could not load the MongoDB catalog through the Cirrus API: {catalogError.message}</p>}<p className="ls-help">Select a bench, then add a database station it supports. Stations do not occupy grid space.</p><div className="ls-palette">{stationCatalog.map((s) => <button key={s.stationId} className="ls-palette-item ls-station-choice" disabled={selectedFixture?.kind !== 'bench'} onClick={() => assignStation(s.stationId)}><i style={{ background: ZONE_COLORS[s.zone] || ZONE_COLORS.unassigned }} /><span><b>{s.name}</b><small>Add to selected bench</small></span></button>)}{!stationsLoading && !stationsError && stationCatalog.length === 0 && <p className="ls-help">No stations exist in MongoDB yet.</p>}</div>
      </aside>
      <main className="ls-main"><div className="ls-metrics"><span>{layout.room.widthFt} × {layout.room.heightFt} ft room</span><span>{layout.fixtures.filter((f) => f.kind === 'bench').length} benches</span><span>{layout.fixtures.flatMap((f) => f.stations).length} stations</span><span>{assignedEquipment.size} equipment assigned</span><span>{utilization}% occupied</span></div><div className="ls-canvas-wrap"><div ref={canvasRef} className="ls-canvas" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, aspectRatio: `${columns} / ${rows}`, '--grid-cols': columns, '--grid-rows': rows } as React.CSSProperties} onDragOver={(e) => e.preventDefault()} onDrop={dropOnCanvas} onClick={() => { setSelectedFixtureId(null); setSelectedStationId(null); }}>{layout.fixtures.map((f) => { const size = fixtureFootprint(f, layout.room.gridFt); const position = dragPreview?.id === f.instanceId ? dragPreview : f; return <div key={f.instanceId} tabIndex={0} role="button" aria-label={`${f.name}. Use arrow keys to move.`} className={`ls-fixture ${f.kind} ${selectedFixtureId === f.instanceId ? 'selected' : ''} ${dragPreview?.id === f.instanceId ? 'dragging' : ''}`} onPointerDown={(e) => startFixtureMove(e, f)} onPointerMove={previewFixtureMove} onPointerUp={finishFixtureMove} onPointerCancel={finishFixtureMove} onKeyDown={(e) => moveFixtureWithKeyboard(e, f)} onClick={(e) => { e.stopPropagation(); setSelectedFixtureId(f.instanceId); setSelectedStationId(null); }} style={{ gridColumn: `${position.x + 1} / span ${size.width}`, gridRow: `${position.y + 1} / span ${size.height}` }}><b>{f.name}</b><small>{f.widthFt} × {f.depthFt} ft{f.kind === 'bench' ? ` · ${f.stations.length} stations` : ''}</small></div>; })}</div></div><div className="ls-status">{message}</div></main>
      <aside className="ls-sidebar ls-right"><div className="ls-section-title first">3. Fixture details</div>{!selectedFixture ? <p className="ls-help">Select a fixture to inspect it.</p> : <div className="ls-inspector"><b>{selectedFixture.name}</b><small>{selectedFixture.widthFt} × {selectedFixture.depthFt} ft · {selectedFixture.orientation}° · front faces {({ 0: 'down', 90: 'right', 180: 'up', 270: 'left' } as const)[selectedFixture.orientation]}</small><div className="ls-inspector-actions"><button className="btn-out" onClick={rotateSelected}>Rotate 90°</button><button className="btn-out" onClick={removeSelected}>Remove</button></div>{(selectedFixture.kind === 'bench' || selectedFixture.kind === 'laminarHood') && <><ClearanceFields value={selectedFixture.clearance ?? { frontFt: 0, backFt: 0, sideFt: 0 }} overhead={selectedFixture.kind === 'laminarHood'} onChange={updateSelectedClearance} /><p className="ls-help">Front and back rotate with the fixture. Side clearance applies to both sides.</p></>}{selectedFixture.kind === 'laminarHood' && <div className="ls-hood-guidance"><b>Placement checks</b><ul><li>Keep away from doors, windows, busy walkways, HVAC diffusers, fans, and other air-moving equipment.</li><li>Verify room currents at the face remain within the hood manufacturer’s limits; 30–50 fpm is a common caution range.</li><li>Confirm level, vibration-free support, suitable room pressure, and a dedicated circuit where required.</li><li>Preserve certification access to HEPA filters, motor, and plenum; confirm duct routing for ducted units.</li></ul><small>Overhead clearance is recorded but cannot be validated without room-height and obstruction data.</small></div>}{selectedFixture.kind === 'bench' && <><div className="ls-capacity"><span>Equipment area</span><b>{selectedBenchUsedArea.toFixed(2)} / {selectedBenchCapacity.toFixed(2)} sq ft</b><progress max={selectedBenchCapacity} value={selectedBenchUsedArea} /></div>{selectedFixture.stations.length === 0 ? <p className="ls-help">Assign a station from the left.</p> : selectedFixture.stations.map((s) => <button key={s.instanceId} className={`ls-station-card ${selectedStationId === s.instanceId ? 'active' : ''}`} onClick={() => setSelectedStationId(s.instanceId)}><span style={{ background: ZONE_COLORS[s.zone] || ZONE_COLORS.unassigned }} /><b>{s.name}</b><small>{s.equipment.length} equipment</small></button>)}</>}</div>}<div className="ls-section-title">4. Equipment</div><p className="ls-help">Select a station above, then assign MongoDB equipment linked to that station.</p><div className="ls-palette ls-equipment-list">{visibleEquipment.map((e) => { const assigned = assignedEquipment.has(e.equipmentId); const tooLarge = selectedFixture?.kind === 'bench' && selectedBenchUsedArea + equipmentArea(e) > selectedBenchCapacity + Number.EPSILON; return <button key={e.equipmentId} className={`ls-palette-item ls-station-choice ${assigned || tooLarge ? 'disabled' : ''}`} disabled={!selectedStation || assigned || tooLarge} onClick={() => assignEquipment(e.equipmentId)}><span><b>{e.name}</b><small>{assigned ? 'Assigned' : tooLarge ? `${equipmentArea(e).toFixed(2)} sq ft · Does not fit` : `${e.widthFt} × ${e.depthFt} ft · Assign to selected station`}</small></span></button>; })}{!equipmentLoading && !equipmentError && visibleEquipment.length === 0 && <p className="ls-help">{selectedStation ? 'No MongoDB equipment is linked to this station.' : 'No equipment exists in MongoDB yet.'}</p>}</div>{selectedStation && <><div className="ls-section-title">{selectedStation.name}</div>{selectedStation.equipment.map((e) => <div className="ls-assignment" key={e.equipmentId}><span>{e.name}</span><button onClick={() => updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId !== selectedFixtureId ? f : { ...f, stations: f.stations.map((s) => s.instanceId === selectedStationId ? { ...s, equipment: s.equipment.filter((x) => x.equipmentId !== e.equipmentId) } : s) }) }))}>×</button></div>)}</>}</aside>
    </div>
  </div>;
}
