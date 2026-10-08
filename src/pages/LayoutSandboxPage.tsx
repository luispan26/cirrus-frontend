import { BenchArrangement, DEFAULT_ARRANGEMENT } from '../components/sandbox/BenchArrangement';
import { readLabPlan } from '../lib/lab-plan';
import type { Answers } from '../lib/questions';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LAYOUT_SANDBOX_CAPABILITIES_QUERY, MAXIMIZE_ZONES_AND_BENCHES_FOR_SANDBOX_MUTATION } from '../graphql/operations';
import { isAutoPlacedBench, BENCH_DEPTH_FT, BENCH_WIDTH_FT, EMPTY_SANDBOX_LAYOUT, buildBenchPlacementGeometryInput, canPlaceBaseObject, canPlaceFixture, centeredRectFootprint, computePlacementAvailability, fixtureFootprint, fixtureRectFt, offsetAlongWall, parseSandboxLayout, pointOnWall, polygonBounds, resizeRoom, SANDBOX_GRID_FT, sandboxFixturesFromBenchPlacement, validateSandboxLayout, wallRectFootprint, wallSideOfBounds, withGridFt, type FixtureClearance, type FixtureKind, type FixtureOrientation, type SandboxBaseObject, type SandboxFixture, type SandboxLayer, type SandboxLayout, type SandboxPolygon, type WallSide } from '../lib/layout-sandbox';
import { Logo } from '../components/Logo';
import { CanvasLayers } from '../components/sandbox/CanvasLayers';
import { FixtureDetailsPanel } from '../components/sandbox/FixtureDetailsPanel';
import { FixturePalette } from '../components/sandbox/FixturePalette';
import { FloorEquipmentPanel, type FloorEquipmentDragSpec } from '../components/sandbox/FloorEquipmentPanel';
import { InfraPalette } from '../components/sandbox/InfraPalette';
import { DEFAULT_CLEARANCE, FIXTURE_DEFAULTS, INFRA_PALETTE, ZONE_FAMILY_COLORS, ZONE_FAMILY_LABELS, type PlaceableBaseKind } from '../components/sandbox/constants';
import type { ZoneRequirementSummary, ZoningOverlay } from '../components/sandbox/types';
import { PlacementQuestionBox, type PlacementSubgroup } from '../components/sandbox/PlacementQuestionBox';
import { GuidedFlowIntro } from '../components/sandbox/GuidedFlowIntro';
import { CATEGORY_CTA_VERB, CATEGORY_LABELS, CATEGORY_ORDER, FIXTURE_SUBGROUP_KINDS, emptyCategoryModeState, emptySubSelectionState, firstUnanswered, paletteVisible, seedCategoryModesFrom, subgroupVisible, type CategoryModeState, type PlacementCategory, type SubSelectionState } from '../components/sandbox/guidedFlow';
import { SANDBOX_LAYOUT_STORAGE_KEY } from '../lib/session';

interface LayoutCapabilities { schemaVersion: number; layers: string[]; fixtureKinds: string[]; collections: string[]; }

interface PlacedBenchEntry { id: string; requirementId: string; zoneId: string; origin: { row: number; column: number }; rotationDegrees: number; accessSide?: string | null; footprintCells: { row: number; column: number }[]; }

// maximizeZonesAndBenchesForSandbox's zones carry id/family only — the
// zoning overlay's legend reads .family (see CanvasLayers.tsx and this
// page's own legend strip).
interface MaximizeZonesAndBenchesForSandboxResponse {
  maximizeZonesAndBenchesForSandbox: {
    totalZones: number;
    totalBenches: number;
    zoneHandoff: {
      zones: Array<{ id: string; family: string; cells: { row: number; column: number }[] }>;
    };
    benchResult: {
      solveStatus: string | null;
      placementGrid: { cellSizeInches: number };
      validation: { state: string; violations: string[]; unroutableBenchIds: string[] | null };
      benches: PlacedBenchEntry[];
      aisleAreaSqFt: number;
      equipmentPlaceableAreaSqFt: number;
      unusedAreaSqFt: number;
      islands: { id: string; orientation: number; benchIds: string[] }[];
      arrangement: { orientation: number | null; workingAisleFt: number; crossAisleFt: number };
    };
  };
}

// Persists the sandbox's working layout AND guided-flow answers across
// visits — "Use this room in my intake" (or any other navigation away) no
// longer loses hand-placed work, or re-asks questions already answered, the
// moment the user leaves the page. Explicit hand-offs (an approved report's
// layout via router state) still take priority over this on mount; this is
// only the fallback for "I didn't pass anything specific, resume whatever I
// was last working on."
interface PersistedSandboxState {
  arrangement?: Answers;
  layout: SandboxLayout;
  categoryMode: CategoryModeState;
  subSelection: SubSelectionState;
  activeCategory: PlacementCategory | null;
}
function readPersistedState(): PersistedSandboxState | null {
  try {
    const raw = localStorage.getItem(SANDBOX_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { layout?: unknown; arrangement?: Answers; categoryMode?: CategoryModeState; subSelection?: SubSelectionState; activeCategory?: PlacementCategory | null } | null;
    // Falls back to treating the whole payload as a bare layout — the
    // pre-guided-flow-persistence format, before this wrapped it with
    // categoryMode/subSelection/activeCategory.
    const saved = parseSandboxLayout(data?.layout) ?? parseSandboxLayout(data);
    if (!saved) return null;
    // Layouts saved on the old 1 ft grid move onto the 6" grid.
    const layout = withGridFt(saved, SANDBOX_GRID_FT);
    // Older saves (before categoryMode/subSelection were persisted) only
    // have a layout — re-derive the answers from its content, same as any
    // other freshly-loaded layout, rather than losing it entirely.
    const seeded = seedCategoryModesFrom(layout);
    const categoryMode = data?.categoryMode ?? seeded.modes;
    return {
      layout,
      arrangement: data?.arrangement,
      categoryMode,
      subSelection: data?.subSelection ?? seeded.subSelection,
      activeCategory: data?.activeCategory ?? (CATEGORY_ORDER.find((category) => categoryMode[category] === 'manual') ?? null),
    };
  } catch {
    return null;
  }
}
function initialPersistedState(): PersistedSandboxState {
  return readPersistedState() ?? {
    layout: structuredClone(EMPTY_SANDBOX_LAYOUT),
    categoryMode: emptyCategoryModeState(),
    subSelection: emptySubSelectionState(),
    activeCategory: null,
  };
}

export function LayoutSandboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasNode, setCanvasNode] = useState<HTMLDivElement | null>(null);
  const dragFrame = useRef<number | null>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number; x: number; y: number } | null>(null);
  const paletteDragFrame = useRef<number | null>(null);
  const paletteDragState = useRef<{ kind: FixtureKind; widthFt: number; depthFt: number; x: number; y: number; onCanvas: boolean; floorItem?: FloorEquipmentDragSpec } | null>(null);
  // Room-object drags are computed from where the drag started plus the
  // pointer's total travel, so a refused or wall-clamped frame never leaves
  // the object lagging behind the cursor.
  const overlayDrag = useRef<{ id: string; startX: number; startY: number; origin: SandboxBaseObject } | null>(null);
  // Box selection: drag a box over empty floor to pick up every fixture and
  // room object it touches, then drag any of them to move them together or
  // press Delete to remove them all. Doors and windows (and wall-mounted
  // points) can be picked up and deleted but stay put in a group move.
  const [group, setGroup] = useState<{ fixtures: string[]; objects: string[] } | null>(null);
  const [marquee, setMarquee] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressCanvasClick = useRef(false);
  const groupDrag = useRef<{ startX: number; startY: number; fixtures: SandboxFixture[]; objects: SandboxBaseObject[] } | null>(null);
  // Resumes whatever was last edited here (see readPersistedState) unless a
  // specific layout is handed in explicitly via router state (e.g. "open
  // this candidate in the sandbox" or "edit this report's layout"), which
  // the mount effect below loads on top of this and takes priority.
  const [arrangement, setArrangement] = useState<Answers>(() => ({ ...DEFAULT_ARRANGEMENT, ...initialPersistedState().arrangement }));
  const [layout, setLayout] = useState<SandboxLayout>(() => initialPersistedState().layout);
  // The nine-tab layer toggle is gone (WS-8b guided flow replaces it) — every
  // layer always renders now, so nothing placed is ever silently hidden.
  const [layers, setLayers] = useState<Record<SandboxLayer, boolean>>({ base: true, equipment: true, circulation: true, electrical: true, plumbing: true, ventilation: true, validation: true, zoning: true });
  const [zoning, setZoning] = useState<ZoningOverlay | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [paletteDragPos, setPaletteDragPos] = useState<{ kind: FixtureKind; widthFt: number; depthFt: number; x: number; y: number; onCanvas: boolean; floorItem?: FloorEquipmentDragSpec } | null>(null);
  const [placementPreview, setPlacementPreview] = useState<{ widthFt: number; depthFt: number; orientation: FixtureOrientation; excludeInstanceId?: string } | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [placingKind, setPlacingKind] = useState<PlaceableBaseKind | null>(null);
  const [backendNotice, setBackendNotice] = useState<{ kind: 'progress' | 'error'; text: string } | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<FixtureKind>('bench');
  const [newWidth, setNewWidth] = useState(6);
  const [newDepth, setNewDepth] = useState(2.5);
  const [newClearance, setNewClearance] = useState<FixtureClearance>(DEFAULT_CLEARANCE.bench);
  const [message, setMessage] = useState('Set fixture dimensions, then drag it into the room.');
  // Guided placement flow (WS-8b) — UI-only state, deliberately not part of
  // SandboxLayout (that would re-break the seedId fingerprint). Gates only
  // which left-sidebar palettes/subgroups show; never gates the canvas
  // render of layout.fixtures or the portaled CanvasLayers below, so nothing
  // already placed can vanish when a category's mode changes.
  const [categoryMode, setCategoryMode] = useState<CategoryModeState>(() => initialPersistedState().categoryMode);
  const [subSelection, setSubSelection] = useState<SubSelectionState>(() => initialPersistedState().subSelection);
  const [openQuestion, setOpenQuestion] = useState<PlacementCategory | null>(() => firstUnanswered(initialPersistedState().categoryMode));
  const [hoveredSubgroup, setHoveredSubgroup] = useState<string | null>(null);
  // Only one category's palette shows in the sidebar at a time — the one
  // most recently answered manual — so the sidebar always reflects just the
  // question the user is currently working through, not every category
  // they've ever touched.
  const [activeCategory, setActiveCategory] = useState<PlacementCategory | null>(() => initialPersistedState().activeCategory);
  // Shown once before the first question box on a genuinely fresh visit —
  // skipped when resuming a layout that already has content (restored from
  // storage, or handed in via router state — see the mount effect below),
  // since there's nothing to walk through that isn't already on screen.
  const [showIntro, setShowIntro] = useState(() => {
    const resumed = initialPersistedState().layout;
    return resumed.fixtures.length === 0 && resumed.baseObjects.length === 0;
  });
  const { data: capabilityData } = useQuery<{ layoutSandboxCapabilities: LayoutCapabilities }>(LAYOUT_SANDBOX_CAPABILITIES_QUERY, { fetchPolicy: 'cache-and-network' });
  const [maximizeZonesAndBenchesForSandbox, { loading: maximizingLoading }] = useMutation<MaximizeZonesAndBenchesForSandboxResponse>(MAXIMIZE_ZONES_AND_BENCHES_FOR_SANDBOX_MUTATION);
  const columns = Math.max(1, Math.ceil(layout.room.widthFt / layout.room.gridFt));
  const rows = Math.max(1, Math.ceil(layout.room.heightFt / layout.room.gridFt));
  const selectedFixture = layout.fixtures.find((f) => f.instanceId === selectedFixtureId) || null;
  const selectedBaseObject = selectedOverlay ? layout.baseObjects.find((object) => object.id === selectedOverlay) ?? null : null;
  const utilization = useMemo(() => Math.round(layout.fixtures.reduce((sum, f) => { const size = fixtureFootprint(f, layout.room.gridFt); return sum + size.width * size.height; }, 0) / (columns * rows) * 100), [layout, columns, rows]);
  const violations = useMemo(() => validateSandboxLayout(layout), [layout]);
  // Floor-standing equipment to place: the questionnaire's current list when
  // opened from the intake, else that of the report this layout came from.
  const floorItems = useMemo(() => layout.floorEquipment ?? readLabPlan(layout)?.floorItems ?? [], [layout]);
  // Only computed while a fixture is actively being picked up or dragged —
  // the whole room's green/red availability for that exact footprint, not
  // just a single cell under the cursor, so the user can see every open
  // spot at a glance instead of guessing and checking one position at a
  // time.
  const placementHeatmap = useMemo(
    () => placementPreview ? computePlacementAvailability(placementPreview, layout.fixtures, layout.baseObjects, layout.room.gridFt, columns, rows, placementPreview.excludeInstanceId) : null,
    [placementPreview, layout.fixtures, layout.baseObjects, layout.room.gridFt, columns, rows],
  );
  useEffect(() => setCanvasNode(canvasRef.current), []);
  // Keeps the last-edited layout AND guided-flow answers resumable on the
  // next visit (see initialPersistedState/readPersistedState above) — every
  // change here, including ones made after an explicit router-state load,
  // becomes the new "last layout".
  useEffect(() => {
    try { localStorage.setItem(SANDBOX_LAYOUT_STORAGE_KEY, JSON.stringify({ layout, arrangement, categoryMode, subSelection, activeCategory })); } catch { /* private browsing, quota, etc — resuming is a convenience, not a guarantee */ }
  }, [layout, arrangement, categoryMode, subSelection, activeCategory]);
  useEffect(() => {
    const state = location.state as { loadLayout?: unknown; arrangement?: Answers; floorEquipment?: SandboxLayout['floorEquipment'] } | null;
    if (state?.arrangement) setArrangement({ ...DEFAULT_ARRANGEMENT, ...state.arrangement });
    else {
      const options = readLabPlan(state?.loadLayout)?.options;
      if (options) setArrangement({ layout_mode: options.mode, layout_main_wall: options.mainWall ?? 'S', layout_same_direction: options.sameDirection, layout_wall_benches: options.wallBenches });
    }
    const floorEquipment = state?.floorEquipment;
    if (!state?.loadLayout) {
      if (floorEquipment) { setLayout((previous) => ({ ...previous, floorEquipment })); navigate(location.pathname, { replace: true, state: null }); }
      return;
    }
    const loaded = parseSandboxLayout(state.loadLayout);
    const parsed = loaded && withGridFt(loaded, SANDBOX_GRID_FT);
    if (parsed) { const withFloor = floorEquipment ? { ...parsed, floorEquipment } : parsed; setLayout(withFloor); applySeededCategoryModes(withFloor); }
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const capabilities = capabilityData?.layoutSandboxCapabilities;
    if (!capabilities) return;
    const editorLayers: SandboxLayer[] = ['base', 'equipment', 'circulation', 'electrical', 'plumbing', 'ventilation', 'validation'];
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
    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && placingKind) { setPlacingKind(null); setMessage('Placement cancelled.'); return; }
      if (event.key === 'Escape' && openQuestion) { setOpenQuestion(null); return; }
      if (event.key === 'Escape' && group) { clearGroup(); return; }
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (!group && !selectedOverlay && !selectedFixtureId) return;
      event.preventDefault(); deleteSelection();
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  // Replaces categoryMode/subSelection wholesale from a freshly loaded
  // layout (mount effect, importLayout) — see seedCategoryModesFrom for why
  // only categories with existing content come back pre-answered. A
  // pre-answered category also becomes the active (sidebar-visible) one so
  // opening a finished layout shows its content immediately, not a blank
  // sidebar behind a question box.
  function applySeededCategoryModes(loaded: SandboxLayout) {
    const seeded = seedCategoryModesFrom(loaded);
    setCategoryMode(seeded.modes);
    setSubSelection(seeded.subSelection);
    setActiveCategory(CATEGORY_ORDER.find((category) => seeded.modes[category] === 'manual') ?? null);
    setOpenQuestion(firstUnanswered(seeded.modes));
    // A layout loaded from somewhere specific (router state, an imported
    // file) is resumed work, not a blank room — skip the walkthrough.
    if (loaded.fixtures.length > 0 || loaded.baseObjects.length > 0) setShowIntro(false);
  }
  function toggleSubgroup(category: PlacementCategory, key: string) {
    setSubSelection((current) => ({ ...current, [category]: { ...current[category], [key]: !current[category][key] } }));
  }
  function selectAllSubgroups(category: PlacementCategory) {
    const keys = subgroupsFor(category).map((s) => s.key);
    setSubSelection((current) => ({ ...current, [category]: Object.fromEntries(keys.map((key) => [key, true])) }));
  }
  // Commits the current subSelection for one category's question box.
  // "Manually place" keeps whatever's currently selected as-is and closes the box —
  // there's something to go place, so the next box only opens once the user
  // explicitly clicks "Place <next category>" (or a category chip), never
  // automatically. "Derive from unassigned space" clears every subgroup back
  // to unselected — it's the "I don't know/don't need any of this" bailout,
  // and since there's nothing for the user to go place, the next unanswered
  // question opens immediately instead of waiting on a click. If this was
  // the last category, there's no next question — the box just closes, and
  // the user stays in the sandbox (never auto-navigated away) so they can
  // still revisit any category via its chip to add or change placements.
  function commitCategoryQuestion(category: PlacementCategory, mode: 'manual' | 'derived') {
    const nextSub = mode === 'derived' ? { ...subSelection, [category]: {} } : subSelection;
    const nextModes = { ...categoryMode, [category]: mode };
    setSubSelection(nextSub);
    setCategoryMode(nextModes);
    setActiveCategory(mode === 'manual' ? category : null);
    if (mode === 'manual' && category === 'fixtures') {
      const green = FIXTURE_SUBGROUP_KINDS.filter((kind) => nextSub.fixtures[kind]);
      if (green.length && !green.includes(newKind)) setKind(green[0]);
    }
    setOpenQuestion(mode === 'derived' ? firstUnanswered(nextModes) : null);
  }
  // Reopens a category's question box for editing (category-selector chip,
  // or the topbar's guided CTA) without touching which palette is currently
  // active — that only changes once the box is committed again.
  function openCategoryChip(category: PlacementCategory) {
    setOpenQuestion(category);
  }
  function subgroupsFor(category: PlacementCategory): PlacementSubgroup[] {
    if (category === 'infrastructure') return INFRA_PALETTE.map((group) => ({ key: group.layer, label: group.title, hoverItems: group.items.map((item) => item.label) }));
    return FIXTURE_SUBGROUP_KINDS.map((kind) => ({ key: kind, label: FIXTURE_DEFAULTS[kind].name }));
  }
  function updateLayout(fn: (previous: SandboxLayout) => SandboxLayout) { setLayout((previous) => ({ ...fn(previous), updatedAt: new Date().toISOString() })); }
  function setKind(kind: FixtureKind) { const d = FIXTURE_DEFAULTS[kind]; setNewKind(kind); setNewWidth(d.widthFt); setNewDepth(d.depthFt); if (kind === 'bench' || kind === 'laminarHood') setNewClearance({ ...DEFAULT_CLEARANCE[kind] }); }
  function createFixture(x: number, y: number, floorItem?: FloorEquipmentDragSpec) {
    const d = FIXTURE_DEFAULTS[newKind];
    const fixture: SandboxFixture = floorItem
      // Floor equipment from the report: its own name, catalog size and id.
      ? { instanceId: `${floorItem.kind}-${Date.now()}`, kind: floorItem.kind, name: floorItem.name, x, y, widthFt: floorItem.widthFt, depthFt: floorItem.depthFt, orientation: 0, clearance: floorItem.kind === 'laminarHood' ? { ...DEFAULT_CLEARANCE.laminarHood } : undefined, equipmentId: floorItem.equipmentId }
      : { instanceId: `${newKind}-${Date.now()}`, kind: newKind, name: d.name, x, y, widthFt: newKind === 'bench' ? BENCH_WIDTH_FT : Math.max(.5, newWidth), depthFt: newKind === 'bench' ? BENCH_DEPTH_FT : Math.max(.5, newDepth), orientation: 0, clearance: newKind === 'bench' || newKind === 'laminarHood' ? { ...newClearance } : undefined };
    if (!canPlaceFixture(fixture, layout.fixtures, layout.baseObjects, layout.room.gridFt)) return setMessage('That fixture overlaps another fixture or object.');
    updateLayout((p) => ({ ...p, fixtures: [...p.fixtures, fixture] })); setSelectedFixtureId(fixture.instanceId); setMessage(`${fixture.name} placed.`);
  }
  function moveFixture(id: string, x: number, y: number) {
    const fixture = layout.fixtures.find((f) => f.instanceId === id); if (!fixture) return;
    const moved = { ...fixture, x, y };
    if (!canPlaceFixture(moved, layout.fixtures, layout.baseObjects, layout.room.gridFt)) return setMessage('That move overlaps another fixture or object.');
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId === id ? moved : f) })); setSelectedFixtureId(id); setMessage(`${fixture.name} moved.`);
  }
  function startFixtureMove(event: React.PointerEvent<HTMLDivElement>, fixture: SandboxFixture) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    if (group?.fixtures.includes(fixture.instanceId)) { startGroupDrag(event); return; }
    setGroup(null);
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const pointerX = (event.clientX - rect.left) / rect.width * columns;
    const pointerY = (event.clientY - rect.top) / rect.height * rows;
    dragState.current = { id: fixture.instanceId, offsetX: pointerX - fixture.x, offsetY: pointerY - fixture.y, x: fixture.x, y: fixture.y };
    setSelectedOverlay(null); setSelectedFixtureId(fixture.instanceId); setDragPreview({ id: fixture.instanceId, x: fixture.x, y: fixture.y });
    setPlacementPreview({ widthFt: fixture.widthFt, depthFt: fixture.depthFt, orientation: fixture.orientation, excludeInstanceId: fixture.instanceId });
  }
  function previewFixtureMove(event: React.PointerEvent<HTMLDivElement>) {
    if (groupDrag.current) { moveGroup(event); return; }
    const drag = dragState.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    // Nearest cell to where the grab point now is (flooring made the
    // fixture trail the pointer by up to a cell).
    drag.x = Math.min(columns - 1, Math.max(0, Math.round((event.clientX - rect.left) / rect.width * columns - drag.offsetX)));
    drag.y = Math.min(rows - 1, Math.max(0, Math.round((event.clientY - rect.top) / rect.height * rows - drag.offsetY)));
    if (dragFrame.current !== null) return;
    dragFrame.current = requestAnimationFrame(() => { dragFrame.current = null; const current = dragState.current; if (current) setDragPreview({ id: current.id, x: current.x, y: current.y }); });
  }
  function finishFixtureMove(event: React.PointerEvent<HTMLDivElement>) {
    if (groupDrag.current) { finishGroupDrag(event); return; }
    const drag = dragState.current; if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId); dragState.current = null;
    if (dragFrame.current !== null) { cancelAnimationFrame(dragFrame.current); dragFrame.current = null; }
    setDragPreview(null); setPlacementPreview(null); moveFixture(drag.id, drag.x, drag.y);
  }
  function moveFixtureWithKeyboard(event: React.KeyboardEvent<HTMLDivElement>, fixture: SandboxFixture) {
    const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = delta[event.key]; if (!direction) return;
    event.preventDefault(); event.stopPropagation(); moveFixture(fixture.instanceId, fixture.x + direction[0], fixture.y + direction[1]);
  }
  // The grid cell a palette item dropped here would start at: centred on
  // the pointer (not hanging off it by its top-left corner), kept inside
  // the room.
  function paletteCell(event: React.PointerEvent<HTMLDivElement>, rect: DOMRect, widthFt: number, depthFt: number) {
    const spanX = Math.max(1, Math.ceil(widthFt / layout.room.gridFt));
    const spanY = Math.max(1, Math.ceil(depthFt / layout.room.gridFt));
    const x = Math.round((event.clientX - rect.left) / rect.width * columns - spanX / 2);
    const y = Math.round((event.clientY - rect.top) / rect.height * rows - spanY / 2);
    return { x: Math.min(Math.max(0, columns - spanX), Math.max(0, x)), y: Math.min(Math.max(0, rows - spanY), Math.max(0, y)) };
  }
  // floorItem: dragging one of the report's floor-standing equipment items
  // (FloorEquipmentPanel) rather than the fixture palette's current kind.
  function startPaletteDrag(event: React.PointerEvent<HTMLDivElement>, floorItem?: FloorEquipmentDragSpec) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const kind = floorItem?.kind ?? newKind;
    const widthFt = floorItem ? floorItem.widthFt : newKind === 'bench' ? BENCH_WIDTH_FT : Math.max(.5, newWidth);
    const depthFt = floorItem ? floorItem.depthFt : newKind === 'bench' ? BENCH_DEPTH_FT : Math.max(.5, newDepth);
    const rect = canvasRef.current?.getBoundingClientRect();
    const onCanvas = !!rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    const { x, y } = rect ? paletteCell(event, rect, widthFt, depthFt) : { x: 0, y: 0 };
    const next = { kind, widthFt, depthFt, x, y, onCanvas, floorItem };
    paletteDragState.current = next; setPaletteDragPos(next);
    setPlacementPreview({ widthFt, depthFt, orientation: 0 });
  }
  function movePaletteDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = paletteDragState.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    drag.onCanvas = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    Object.assign(drag, paletteCell(event, rect, drag.widthFt, drag.depthFt));
    if (paletteDragFrame.current !== null) return;
    paletteDragFrame.current = requestAnimationFrame(() => { paletteDragFrame.current = null; const current = paletteDragState.current; if (current) setPaletteDragPos({ ...current }); });
  }
  function finishPaletteDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = paletteDragState.current; if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId); paletteDragState.current = null;
    if (paletteDragFrame.current !== null) { cancelAnimationFrame(paletteDragFrame.current); paletteDragFrame.current = null; }
    setPaletteDragPos(null); setPlacementPreview(null);
    if (drag.onCanvas) createFixture(drag.x, drag.y, drag.floorItem);
  }
  function cancelPaletteDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId); paletteDragState.current = null;
    if (paletteDragFrame.current !== null) { cancelAnimationFrame(paletteDragFrame.current); paletteDragFrame.current = null; }
    setPaletteDragPos(null); setPlacementPreview(null);
  }
  function rotateSelected() { if (!selectedFixture) return; const rotated: SandboxFixture = { ...selectedFixture, orientation: ((selectedFixture.orientation + 90) % 360) as SandboxFixture['orientation'] }; if (!canPlaceFixture(rotated, layout.fixtures, layout.baseObjects, layout.room.gridFt)) return setMessage('Rotating this fixture would overlap another fixture or object.'); updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId === rotated.instanceId ? rotated : f) })); setMessage(`${rotated.name} rotated to ${rotated.orientation}°.`); }
  function updateSelectedClearance(field: keyof FixtureClearance, value: number) {
    if (!selectedFixture || (selectedFixture.kind !== 'bench' && selectedFixture.kind !== 'laminarHood')) return;
    const clearance = { ...(selectedFixture.clearance ?? { frontFt: 0, backFt: 0, sideFt: 0 }), [field]: Math.max(0, value || 0) };
    const changed = { ...selectedFixture, clearance };
    if (!canPlaceFixture(changed, layout.fixtures, layout.baseObjects, layout.room.gridFt)) return setMessage('That clearance would overlap another fixture.');
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId === changed.instanceId ? changed : f) }));
    setMessage('Bench clearance updated.');
  }
  function removeSelected() { if (!selectedFixture) return; updateLayout((p) => ({ ...p, fixtures: p.fixtures.filter((f) => f.instanceId !== selectedFixture.instanceId) })); setSelectedFixtureId(null); setMessage('Fixture removed.'); }
  // Hands the room back to the intake wizard (QuestionsPage.tsx) via router
  // state — a one-shot hand-off: its size, the exit door (still used when no
  // sandbox room is available), and the whole room — every door, column,
  // no-placement area and fixture already in it, both as drawn (layout) and
  // as the grid cells the generator plans on (geometry, the same input the
  // sandbox's own bench placement uses). Benches placed automatically are
  // left out: generation replaces them.
  function useInIntake() {
    const keptFixtures = layout.fixtures.filter((fixture) => !isAutoPlacedBench(fixture));
    const roomLayout = { ...layout, fixtures: keptFixtures };
    const geometry = { ...buildBenchPlacementGeometryInput(layout), cellSizeInches: Math.round(layout.room.gridFt * 12) };
    const exitDoor = layout.baseObjects.find((object) => object.kind === 'door' && object.door?.isExit && object.footprint.points.length > 0);
    let door: { wall: 'N' | 'S' | 'E' | 'W'; offsetFt: number } | undefined;
    if (exitDoor) {
      const bounds = polygonBounds(exitDoor.footprint);
      const side = wallSideOfBounds(bounds, layout.room);
      const center = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
      // layout-sandbox.ts's WallSide (top/bottom/left/right, geometry-shaped)
      // -> the intake questionnaire's WallSide (N/S/E/W, mirrors the
      // backend's — see questions.ts). Offset is along the same axis in both
      // (x for top/bottom <-> N/S, y for left/right <-> W/E), so it carries
      // over unchanged; only the label needs translating.
      const SANDBOX_WALL_TO_INTAKE: Record<WallSide, 'N' | 'S' | 'E' | 'W'> = { top: 'N', bottom: 'S', left: 'W', right: 'E' };
      door = { wall: SANDBOX_WALL_TO_INTAKE[side], offsetFt: Math.round(offsetAlongWall(side, center) * 100) / 100 };
    }
    navigate('/questions', { state: { spaceFromSandbox: { width_ft: layout.room.widthFt, height_ft: layout.room.heightFt, door, layout: roomLayout, geometry, arrangement } } });
  }
  // Fills the room with as many benches as fit (no operations needed) and
  // shows the zones they were carved into. Replaces only benches a previous
  // fit placed, never a hand-placed one.
  async function runMaximizeZonesAndBenches() {
    // Fixtures already in the room are no-placement areas (see
    // buildBenchPlacementGeometryInput).
    const geometry = buildBenchPlacementGeometryInput(layout);
    setBackendNotice({ kind: 'progress', text: 'Fitting benches…' });
    try {
      const response = await maximizeZonesAndBenchesForSandbox({
        variables: { input: { roomWidth: geometry.roomWidth, roomHeight: geometry.roomHeight, blockedCells: geometry.blockedCells, entranceCells: geometry.entranceCells, sinkCells: geometry.sinkCells, cellSizeInches: Math.round(layout.room.gridFt * 12), options: { mode: arrangement.layout_mode, mainWall: arrangement.layout_main_wall, sameDirection: arrangement.layout_same_direction, wallBenches: arrangement.layout_wall_benches } } },
      });
      const result = response.data?.maximizeZonesAndBenchesForSandbox;
      if (!result) throw new Error('The server did not return a result');

      const zoneNumberById = new Map(result.zoneHandoff.zones.map((z, i) => [z.id, i + 1] as const));
      const cellZones = new Array(geometry.roomWidth * geometry.roomHeight).fill(0);
      for (const zone of result.zoneHandoff.zones) {
        const zoneNumber = zoneNumberById.get(zone.id);
        if (!zoneNumber) continue;
        for (const cell of zone.cells) cellZones[cell.row * geometry.roomWidth + cell.column] = zoneNumber;
      }
      const legend: ZoneRequirementSummary[] = result.zoneHandoff.zones.map((zone) => ({
        id: zone.id, family: zone.family, operationIds: [], materialClasses: [],
        requiresBsc: false, sharingPolicy: '', confirmedBiosafetyLevel: 0,
        minimumAreaCells: zone.cells.length, targetAreaCells: zone.cells.length,
      }));
      setZoning({ roomWidth: geometry.roomWidth, roomHeight: geometry.roomHeight, cellZones, legend });
      setLayers((current) => ({ ...current, zoning: true }));

      const benchResult = result.benchResult;
      if (benchResult.solveStatus !== 'SATISFIED' || benchResult.validation.state !== 'VALID') {
        setBackendNotice(null);
        setMessage('No bench fits this room with the required door clearances and working aisles.');
        return;
      }

      const zoneNameById = new Map(result.zoneHandoff.zones.map((z) => [z.id, z.family] as const));
      const workingAisleFt = benchResult.arrangement.workingAisleFt;
      const benchFixtures = sandboxFixturesFromBenchPlacement(benchResult.benches, benchResult.placementGrid.cellSizeInches, zoneNameById, workingAisleFt, layout.room.gridFt);
      updateLayout((current) => ({
        ...current,
        fixtures: [...current.fixtures.filter((f) => !isAutoPlacedBench(f)), ...benchFixtures],
      }));
      setLayers((current) => ({ ...current, equipment: true }));
      setBackendNotice(null);
      setMessage(`Placed ${benchFixtures.length} bench(es) in ${benchResult.islands.length} island(s) — the room's own maximum, not a target count. ${workingAisleFt} ft working aisles, ${benchResult.arrangement.crossAisleFt} ft cross-aisles. ${Math.round(benchResult.equipmentPlaceableAreaSqFt)} sq ft of bench top, ${Math.round(benchResult.aisleAreaSqFt)} sq ft of aisle, ${Math.round(benchResult.unusedAreaSqFt)} sq ft unused.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setBackendNotice({ kind: 'error', text: `Could not maximize zones and benches: ${detail}` });
    }
  }

  // Wall-mounted kinds snap flush to whichever room edge the click landed
  // nearest (wallRectFootprint/snapToNearestWall handle the geometry);
  // column and restricted_region place freely, centered on the click.
  function placeBaseObjectAt(kind: PlaceableBaseKind, x: number, y: number) {
    const room = layout.room;
    const point = { x: Math.max(0, Math.min(room.widthFt, x)), y: Math.max(0, Math.min(room.heightFt, y)) };
    let object: SandboxBaseObject;
    if (kind === 'door' || kind === 'window') {
      const { footprint } = wallRectFootprint(point, room, 3, kind === 'door' ? .5 : .3);
      object = { id: `${kind}-${Date.now()}`, kind, name: kind === 'door' ? 'Door' : 'Window', footprint, door: kind === 'door' ? { clearWidthIn: 36, isExit: true } : undefined };
    } else {
      const footprint = centeredRectFootprint(point, 2, 2);
      object = { id: `${kind}-${Date.now()}`, kind, name: kind === 'restricted_region' ? 'Restricted region' : 'Column', footprint };
    }
    updateLayout((current) => ({ ...current, baseObjects: [...current.baseObjects, object] }));
    setSelectedFixtureId(null); setSelectedOverlay(object.id); setPlacingKind(null);
    setMessage(`${object.name} placed.`);
  }
  // Turns on the kind's layer before entering placement mode — otherwise a
  // freshly-placed object would immediately vanish (CanvasLayers only
  // renders a baseObject when its layer is visible).
  function beginPlacing(kind: PlaceableBaseKind, layer: SandboxLayer) {
    setLayers((current) => ({ ...current, [layer]: true }));
    setPlacingKind((current) => current === kind ? null : kind);
  }
  function placeOnCanvasClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!placingKind) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * layout.room.widthFt;
    const y = (event.clientY - rect.top) / rect.height * layout.room.heightFt;
    placeBaseObjectAt(placingKind, x, y);
  }
  function startOverlayMove(id: string, event: React.PointerEvent<SVGElement>) {
    event.preventDefault(); event.stopPropagation(); setSelectedFixtureId(null); setSelectedOverlay(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (group?.objects.includes(id)) { setSelectedOverlay(null); startGroupDrag(event); return; }
    setGroup(null);
    const origin = layout.baseObjects.find((object) => object.id === id);
    overlayDrag.current = origin ? { id, startX: event.clientX, startY: event.clientY, origin } : null;
  }
  function moveOverlay(event: React.PointerEvent<SVGSVGElement>) {
    if (groupDrag.current) { moveGroup(event); return; }
    const drag = overlayDrag.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    const dx = (event.clientX - drag.startX) / rect.width * layout.room.widthFt;
    const dy = (event.clientY - drag.startY) / rect.height * layout.room.heightFt;
    let blocked = false;
    updateLayout((current) => ({ ...current, baseObjects: current.baseObjects.map((placed) => {
      if (placed.id !== drag.id) return placed;
      const object = drag.origin;
      let candidate: SandboxBaseObject;
      // Wall-mounted utility points slide along their own wall — the drag's
      // component perpendicular to the wall is ignored rather than used to
      // hop to whichever wall is nearest, so the point can never drift off
      // the wall it's attached to.
      if (object.utility?.mountingSurface === 'wall' && object.utility.wallId) {
        const wallId = object.utility.wallId;
        const currentOffset = object.utility.offsetFt ?? offsetAlongWall(wallId, object.footprint.points[0]);
        const axisDelta = wallId === 'top' || wallId === 'bottom' ? dx : dy;
        const point = pointOnWall(wallId, currentOffset + axisDelta, current.room);
        candidate = { ...object, footprint: { points: [point] }, utility: { ...object.utility, offsetFt: offsetAlongWall(wallId, point) } };
      } else if (object.kind === 'door' || object.kind === 'window') {
        // Door/window openings are wall-flush rectangles (built by
        // wallRectFootprint at placement, see placeBaseObjectAt) rather than
        // a single wall-anchored point, so they need their own re-snap here:
        // only the along-wall component of the drag moves them, and the
        // resulting rect is rebuilt with wallRectFootprint so it stays flush
        // against the same wall (clamped at the corners) instead of
        // drifting freely into the room — this is what the removed lock
        // feature used to prevent by simply blocking the drag outright (see
        // startOverlayMove above, formerly the WS-5 lock gate).
        const bounds = polygonBounds(object.footprint);
        const side = wallSideOfBounds(bounds, current.room);
        const alongWall = side === 'top' || side === 'bottom';
        const openingWidthFt = alongWall ? bounds.right - bounds.left : bounds.bottom - bounds.top;
        const depthFt = alongWall ? bounds.bottom - bounds.top : bounds.right - bounds.left;
        const centerAlongCurrent = alongWall ? (bounds.left + bounds.right) / 2 : (bounds.top + bounds.bottom) / 2;
        const nextCenterAlong = centerAlongCurrent + (alongWall ? dx : dy);
        const point = side === 'top' ? { x: nextCenterAlong, y: 0 }
          : side === 'bottom' ? { x: nextCenterAlong, y: current.room.heightFt }
          : side === 'left' ? { x: 0, y: nextCenterAlong }
          : { x: current.room.widthFt, y: nextCenterAlong };
        candidate = { ...object, footprint: wallRectFootprint(point, current.room, openingWidthFt, depthFt).footprint };
      } else {
        const moved = object.footprint.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
        candidate = { ...object, footprint: { points: moved } };
      }
      // The lock feature used to be what stopped a dragged object from ever
      // overlapping a fixture or another object — removing it (WS-5) left
      // this drag with no overlap check at all. Reject just this frame's
      // move (hold the object at its last valid position) rather than the
      // whole drag, so a blocked drag resumes moving the moment the pointer
      // reaches a valid spot again.
      if (!canPlaceBaseObject(candidate, current.fixtures, current.baseObjects, current.room.gridFt)) { blocked = true; return placed; }
      return candidate;
    }) }));
    if (blocked) setMessage('That move would overlap another fixture or object.');
  }
  function finishOverlayMove(event: React.PointerEvent<SVGSVGElement>) {
    if (groupDrag.current) { finishGroupDrag(event); return; }
    if (!overlayDrag.current) return; overlayDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setMessage('Layer object moved.');
  }
  // Pointer position in feet on the canvas.
  function pointerFt(event: { clientX: number; clientY: number }) {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return null;
    return { x: (event.clientX - rect.left) / rect.width * columns * layout.room.gridFt, y: (event.clientY - rect.top) / rect.height * rows * layout.room.gridFt };
  }
  // Doors, windows and wall-mounted points belong to their wall: a group
  // move leaves them where they are.
  const movesWithGroup = (object: SandboxBaseObject) => object.kind !== 'door' && object.kind !== 'window' && object.utility?.mountingSurface !== 'wall' && object.footprint.points.length > 0;
  function startMarquee(event: React.PointerEvent<HTMLDivElement>) {
    if (placingKind || event.button !== 0) return;
    const start = pointerFt(event); if (!start) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    marqueeStart.current = start;
  }
  function moveMarquee(event: React.PointerEvent<HTMLDivElement>) {
    const start = marqueeStart.current; if (!start) return;
    const at = pointerFt(event); if (!at) return;
    setMarquee({ left: Math.min(start.x, at.x), top: Math.min(start.y, at.y), right: Math.max(start.x, at.x), bottom: Math.max(start.y, at.y) });
  }
  function finishMarquee(event: React.PointerEvent<HTMLDivElement>) {
    const start = marqueeStart.current; if (!start) return;
    marqueeStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const at = pointerFt(event);
    setMarquee(null);
    // A plain click (no real box) keeps its old meaning: clear the selection.
    if (!at || (Math.abs(at.x - start.x) < .25 && Math.abs(at.y - start.y) < .25)) return;
    suppressCanvasClick.current = true;
    const box = { left: Math.min(start.x, at.x), top: Math.min(start.y, at.y), right: Math.max(start.x, at.x), bottom: Math.max(start.y, at.y) };
    // Anything the box touches, even partly.
    const touches = (b: { left: number; top: number; right: number; bottom: number }) => b.left <= box.right && box.left <= b.right && b.top <= box.bottom && box.top <= b.bottom;
    const fixtures = layout.fixtures.filter((f) => touches(fixtureRectFt(f, layout.room.gridFt))).map((f) => f.instanceId);
    const objects = layout.baseObjects.filter((o) => o.footprint.points.length > 0 && touches(polygonBounds(o.footprint))).map((o) => o.id);
   
    if (fixtures.length + objects.length <= 1) {
      setGroup(null);
      setSelectedFixtureId(fixtures[0] ?? null);
      setSelectedOverlay(objects[0] ?? null);
      if (fixtures.length + objects.length === 0) setMessage('Nothing in that box.');
      return;
    }
    setSelectedFixtureId(null); setSelectedOverlay(null);
    setGroup({ fixtures, objects });
    const stayPut = layout.baseObjects.filter((o) => objects.includes(o.id) && !movesWithGroup(o)).length;
    setMessage(`${fixtures.length + objects.length} items selected. Drag any of them to move them together, or press Delete to remove them.${stayPut ? ' Doors and windows stay on their walls when the group moves.' : ''}`);
  }
  function startGroupDrag(event: React.PointerEvent<Element>) {
    if (!group) return;
    groupDrag.current = {
      startX: event.clientX, startY: event.clientY,
      fixtures: layout.fixtures.filter((f) => group.fixtures.includes(f.instanceId)),
      objects: layout.baseObjects.filter((o) => group.objects.includes(o.id) && movesWithGroup(o)),
    };
  }
  // Moves the whole group by the pointer's total travel, in whole grid
  // cells, kept inside the room; a move that would overlap something
  // outside the group is refused and the group stays at its last valid spot.
  function moveGroup(event: React.PointerEvent<Element>) {
    const drag = groupDrag.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    const grid = layout.room.gridFt;
    let dx = Math.round((event.clientX - drag.startX) / rect.width * columns) * grid;
    let dy = Math.round((event.clientY - drag.startY) / rect.height * rows) * grid;
    const bounds = [...drag.fixtures.map((f) => fixtureRectFt(f, grid)), ...drag.objects.map((o) => polygonBounds(o.footprint))];
    if (bounds.length === 0) return;
    dx = Math.min(layout.room.widthFt - Math.max(...bounds.map((b) => b.right)), Math.max(-Math.min(...bounds.map((b) => b.left)), dx));
    dy = Math.min(layout.room.heightFt - Math.max(...bounds.map((b) => b.bottom)), Math.max(-Math.min(...bounds.map((b) => b.top)), dy));
    const movedFixtures = drag.fixtures.map((f) => ({ ...f, x: f.x + dx / grid, y: f.y + dy / grid }));
    const movedObjects = drag.objects.map((o) => ({ ...o, footprint: { points: o.footprint.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) } }));
    const fixtureIds = new Set(drag.fixtures.map((f) => f.instanceId));
    const objectIds = new Set(drag.objects.map((o) => o.id));
    const otherFixtures = layout.fixtures.filter((f) => !fixtureIds.has(f.instanceId));
    const otherObjects = layout.baseObjects.filter((o) => !objectIds.has(o.id));
    const valid = movedFixtures.every((f) => canPlaceFixture(f, otherFixtures, otherObjects, grid))
      && movedObjects.every((o) => canPlaceBaseObject(o, otherFixtures, otherObjects, grid));
    if (!valid) { setMessage('That move would overlap something outside the selection.'); return; }
    const fixtureById = new Map(movedFixtures.map((f) => [f.instanceId, f]));
    const objectById = new Map(movedObjects.map((o) => [o.id, o]));
    updateLayout((current) => ({
      ...current,
      fixtures: current.fixtures.map((f) => fixtureById.get(f.instanceId) ?? f),
      baseObjects: current.baseObjects.map((o) => objectById.get(o.id) ?? o),
    }));
  }
  function finishGroupDrag(event: React.PointerEvent<Element>) {
    groupDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setMessage(`${(group?.fixtures.length ?? 0) + (group?.objects.length ?? 0)} selected items moved together.`);
  }
  function clearGroup() { setGroup(null); setMarquee(null); }
  function updateSelectedBaseObject(fn: (object: SandboxBaseObject) => SandboxBaseObject) {
    if (!selectedOverlay) return;
    updateLayout((current) => ({ ...current, baseObjects: current.baseObjects.map((object) => object.id === selectedOverlay ? fn(object) : object) }));
  }
  // Same revert-on-invalid pattern as updateSelectedClearance above, applied
  // to a resized footprint (door/window width, or the new restricted_region
  // width/depth — see InfrastructureInspector's onResize) instead of a
  // fixture's clearance — another gap the removed lock feature happened to
  // mask, since a resize is really just a same-place, different-size move.
  function updateSelectedBaseFootprint(nextFootprint: SandboxPolygon) {
    if (!selectedOverlay) return;
    const current = layout.baseObjects.find((object) => object.id === selectedOverlay);
    if (!current) return;
    const candidate = { ...current, footprint: nextFootprint };
    if (!canPlaceBaseObject(candidate, layout.fixtures, layout.baseObjects, layout.room.gridFt)) return setMessage('That size would overlap another fixture or object.');
    updateLayout((prev) => ({ ...prev, baseObjects: prev.baseObjects.map((object) => object.id === selectedOverlay ? candidate : object) }));
    setMessage('Layer object resized.');
  }
  function deleteSelection() {
    if (group) {
      const fixtures = new Set(group.fixtures), objects = new Set(group.objects);
      updateLayout((current) => ({ ...current, fixtures: current.fixtures.filter((f) => !fixtures.has(f.instanceId)), baseObjects: current.baseObjects.filter((o) => !objects.has(o.id)) }));
      setGroup(null); setMessage(`${fixtures.size + objects.size} selected items deleted.`); return;
    }
    if (selectedOverlay) {
      updateLayout((current) => ({ ...current, baseObjects: current.baseObjects.filter((object) => object.id !== selectedOverlay) }));
      setSelectedOverlay(null); setMessage('Selected layer object deleted.'); return;
    }
    if (selectedFixtureId) {
      updateLayout((current) => ({ ...current, fixtures: current.fixtures.filter((fixture) => fixture.instanceId !== selectedFixtureId) }));
      setSelectedFixtureId(null); setMessage('Selected fixture deleted.');
    }
  }
  function applySuggestedFix(violation: (typeof violations)[number]) {
    const fix = violation.fix; if (!fix) return;
    if (fix.type === 'add-exit') { placeBaseObjectAt('door', layout.room.widthFt / 2, layout.room.heightFt); return; }
    updateLayout((current) => {
      if (fix.type === 'set-door-width') return { ...current, baseObjects: current.baseObjects.map((object) => object.id === fix.targetId && object.door ? { ...object, door: { ...object.door, clearWidthIn: fix.value ?? 32 } } : object) };
      if (fix.type === 'move-fixture') {
        const fixture = current.fixtures.find((item) => item.instanceId === fix.targetId); if (!fixture) return current;
        const spots = Array.from({ length: columns * rows }, (_, index) => ({ x: index % columns, y: Math.floor(index / columns) })).sort((a, b) => Math.abs(a.x - fixture.x) + Math.abs(a.y - fixture.y) - Math.abs(b.x - fixture.x) - Math.abs(b.y - fixture.y));
        for (const spot of spots) {
          const moved = { ...fixture, ...spot }; const candidate = { ...current, fixtures: current.fixtures.map((item) => item.instanceId === fixture.instanceId ? moved : item) };
          const blocking = validateSandboxLayout(candidate).some((item) => item.severity === 'error' && item.objectIds.includes(fixture.instanceId) && (item.id.startsWith('placement-') || item.id.startsWith('base-overlap-')));
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
    if (layout.baseObjects.some((object) => object.id === id)) setSelectedOverlay(id);
  }
  function exportLayout() { const url = URL.createObjectURL(new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `${layout.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'layout'}.json`; a.click(); URL.revokeObjectURL(url); }
  async function importLayout(file?: File) { if (!file) return; try { const imported = parseSandboxLayout(JSON.parse(await file.text())); if (!imported) throw Error(); const parsed = withGridFt(imported, SANDBOX_GRID_FT); setLayout(parsed); setSelectedFixtureId(null); applySeededCategoryModes(parsed); setMessage('Layout imported.'); } catch { setMessage('That file is not a valid Cirrus layout. Version 2 and 3 files are supported.'); } }

  // Guided-flow gating — applied only to the left-sidebar palettes below.
  // The canvas render of layout.fixtures and the portaled CanvasLayers are
  // never gated: anything already placed stays rendered, selectable,
  // draggable, and inspectable regardless of category/subgroup mode.
  const guidedCategory = firstUnanswered(categoryMode);
  const infraVisibleLayers = new Set(INFRA_PALETTE.map((group) => group.layer).filter((layer) => subgroupVisible('infrastructure', layer, categoryMode.infrastructure, subSelection)));
  const fixtureVisibleKinds = FIXTURE_SUBGROUP_KINDS.filter((kind) => subgroupVisible('fixtures', kind, categoryMode.fixtures, subSelection));

  return <div className={`screen layout-sandbox ${layers.base ? 'show-base' : 'hide-base'} ${layers.equipment ? 'show-equipment' : 'hide-equipment'} ${layers.circulation ? 'show-circulation' : 'hide-circulation'}`}>
    <div className="ls-control-deck">
    <div className="ls-category-selector" aria-label="Placement categories">{CATEGORY_ORDER.map((category, index) => <button key={category} className={`ls-category-chip ${categoryMode[category]}`} onClick={() => openCategoryChip(category)}><i className={`ls-category-dot ${categoryMode[category]}`} />{index + 1}. {CATEGORY_LABELS[category]}</button>)}</div>
    <div className="ls-layer-tools">{placingKind && <span className="ls-derived-note">Click the room to place a {placingKind.replace(/_/g, ' ')} — Esc to cancel</span>}{layers.circulation && !placingKind && <span className="ls-derived-note">Derived from unassigned space</span>}</div>
    <div className="ls-backend-actions"><button disabled={maximizingLoading} title="No operations needed — keeps door landings clear and fills the room with islands of back-to-back benches on one room-wide grid, with straight aisles, where every bench's working aisle stays reachable." onClick={() => void runMaximizeZonesAndBenches()}>{maximizingLoading ? 'Fitting benches…' : 'Fit as many benches as possible'}</button></div>
    {backendNotice && <div className={`ls-optimization-notice ${backendNotice.kind}`}><span>{backendNotice.kind === 'progress' ? '⏳' : '⚠'}</span><b>{backendNotice.text}</b>{backendNotice.kind === 'error' && <button onClick={() => setBackendNotice(null)}>×</button>}</div>}
    {zoning && <div className="ls-derived-note" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '4px 0' }}>{[...new Map(zoning.legend.map((z) => [z.family, z])).values()].map((z) => <span key={z.family} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: ZONE_FAMILY_COLORS[z.family] || '#999' }} />{ZONE_FAMILY_LABELS[z.family] || z.family}</span>)}</div>}
    {canvasNode && createPortal(<CanvasLayers layout={layout} layers={layers} violations={violations} selected={selectedOverlay} groupSelected={group?.objects} placingKind={placingKind} zoning={zoning} onSelect={startOverlayMove} onPlace={placeOnCanvasClick} onDrag={moveOverlay} onDragEnd={finishOverlayMove} />, canvasNode)}
    {layers.validation && violations.length > 0 && <div className="ls-violations">{violations.map((violation) => <div key={violation.id} className={`ls-violation-card ${violation.severity}`} onClick={() => selectViolation(violation)}><b>{violation.severity === 'error' ? 'Hard violation' : 'Recommendation'}</b><span>{violation.message}</span>{violation.fix && <button onClick={(event) => { event.stopPropagation(); applySuggestedFix(violation); }}>✨ {violation.fix.label}</button>}</div>)}</div>}
    </div>
    <div className="qm-topbar"><div className="logo-mark"><Logo height={40} /></div><div><b>Layout sandbox</b><div className="ls-subtitle">Draw the room, place fixtures, then fit benches</div></div><div style={{ flex: 1 }} /><button className="ls-guided-cta" onClick={guidedCategory ? () => openCategoryChip(guidedCategory) : useInIntake}>{guidedCategory ? <>{CATEGORY_CTA_VERB[guidedCategory]} {CATEGORY_LABELS[guidedCategory]} <span aria-hidden="true">→</span></> : 'Use this room in my intake →'}</button><button className="btn-out" onClick={exportLayout}>Export JSON</button><button className="btn-out" onClick={() => fileInput.current?.click()}>Import</button><input ref={fileInput} hidden type="file" accept="application/json" onChange={(e) => importLayout(e.target.files?.[0])} /><button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button></div>
    <div className="ls-workspace">
      <aside className="ls-sidebar"><label className="field-label">Layout name</label><input className="field-input" value={layout.name} onChange={(e) => updateLayout((p) => ({ ...p, name: e.target.value }))} /><div className="ls-room-fields"><label><span className="field-label">Width (ft)</span><input className="field-input" type="number" min="5" value={layout.room.widthFt} onChange={(e) => updateLayout((p) => resizeRoom(p, { widthFt: Math.max(5, Number(e.target.value)), heightFt: p.room.heightFt }))} /></label><label><span className="field-label">Depth (ft)</span><input className="field-input" type="number" min="5" value={layout.room.heightFt} onChange={(e) => updateLayout((p) => resizeRoom(p, { widthFt: p.room.widthFt, heightFt: Math.max(5, Number(e.target.value)) }))} /></label></div>
        <BenchArrangement value={arrangement} onChange={setArrangement} />
        <FloorEquipmentPanel items={floorItems} placedCount={(equipmentId) => layout.fixtures.filter((f) => f.equipmentId === equipmentId).length} startDrag={startPaletteDrag} moveDrag={movePaletteDrag} finishDrag={finishPaletteDrag} cancelDrag={cancelPaletteDrag} />
        {paletteVisible('infrastructure', activeCategory) && <InfraPalette placingKind={placingKind} beginPlacing={beginPlacing} visibleLayers={infraVisibleLayers} />}
        {paletteVisible('fixtures', activeCategory) && <FixturePalette newKind={newKind} setKind={setKind} newWidth={newWidth} setNewWidth={setNewWidth} newDepth={newDepth} setNewDepth={setNewDepth} newClearance={newClearance} setNewClearance={setNewClearance} startPaletteDrag={startPaletteDrag} movePaletteDrag={movePaletteDrag} finishPaletteDrag={finishPaletteDrag} cancelPaletteDrag={cancelPaletteDrag} visibleKinds={fixtureVisibleKinds} />}
        {!activeCategory && <p className="ls-help">Answer the placement questions (top right) to start placing things — whatever you leave derived, Cirrus places for you automatically.</p>}
      </aside>
      <main className="ls-main"><div className="ls-metrics"><span>{layout.room.widthFt} × {layout.room.heightFt} ft room</span><span>{layout.fixtures.filter((f) => f.kind === 'bench').length} benches</span><span>{utilization}% occupied</span></div><div className="ls-canvas-wrap"><div ref={canvasRef} className={`ls-canvas ${placingKind ? 'placing' : ''}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, aspectRatio: `${columns} / ${rows}`, '--grid-cols': columns, '--grid-rows': rows } as React.CSSProperties} onPointerDown={startMarquee} onPointerMove={moveMarquee} onPointerUp={finishMarquee} onPointerCancel={finishMarquee} onClick={() => { if (suppressCanvasClick.current) { suppressCanvasClick.current = false; return; } if (!placingKind) { setSelectedFixtureId(null); clearGroup(); } }}>{placementHeatmap && placementHeatmap.flatMap((row, y) => row.map((valid, x) => <div key={`ph-${x}-${y}`} className={`ls-placement-cell ${valid ? 'valid' : 'invalid'}`} style={{ gridColumn: `${x + 1} / span 1`, gridRow: `${y + 1} / span 1` }} />))}{layout.fixtures.map((f) => { const position = dragPreview?.id === f.instanceId ? dragPreview : f; const rect = fixtureRectFt({ ...f, x: position.x, y: position.y }, layout.room.gridFt); const cellFt = layout.room.gridFt; return <div key={f.instanceId} tabIndex={0} role="button" aria-label={`${f.name}. Use arrow keys to move.`} className={`ls-fixture ${f.kind} ${selectedFixtureId === f.instanceId || group?.fixtures.includes(f.instanceId) ? 'selected' : ''} ${dragPreview?.id === f.instanceId ? 'dragging' : ''}`} onPointerDown={(e) => startFixtureMove(e, f)} onPointerMove={previewFixtureMove} onPointerUp={finishFixtureMove} onPointerCancel={finishFixtureMove} onKeyDown={(e) => moveFixtureWithKeyboard(e, f)} onClick={(e) => { e.stopPropagation(); if (group?.fixtures.includes(f.instanceId)) return; setSelectedFixtureId(f.instanceId); }} style={{ position: 'absolute', left: `${rect.left / cellFt / columns * 100}%`, top: `${rect.top / cellFt / rows * 100}%`, width: `${(rect.right - rect.left) / cellFt / columns * 100}%`, height: `${(rect.bottom - rect.top) / cellFt / rows * 100}%` }}><b>{f.name}</b><small>{f.widthFt} × {f.depthFt} ft</small></div>; })}{paletteDragPos && paletteDragPos.onCanvas && <div className={`ls-fixture ${paletteDragPos.kind} ls-fixture-ghost`} style={{ gridColumn: `${paletteDragPos.x + 1} / span ${Math.max(1, Math.ceil(paletteDragPos.widthFt / layout.room.gridFt))}`, gridRow: `${paletteDragPos.y + 1} / span ${Math.max(1, Math.ceil(paletteDragPos.depthFt / layout.room.gridFt))}` }}><b>{paletteDragPos.floorItem?.name ?? FIXTURE_DEFAULTS[paletteDragPos.kind].name}</b><small>{paletteDragPos.widthFt} × {paletteDragPos.depthFt} ft</small></div>}{marquee && <div className="ls-marquee" style={{ left: `${marquee.left / (columns * layout.room.gridFt) * 100}%`, top: `${marquee.top / (rows * layout.room.gridFt) * 100}%`, width: `${(marquee.right - marquee.left) / (columns * layout.room.gridFt) * 100}%`, height: `${(marquee.bottom - marquee.top) / (rows * layout.room.gridFt) * 100}%` }} />}</div></div>{group && <div className="ls-group-bar"><span>{group.fixtures.length + group.objects.length} items selected</span><button type="button" onClick={deleteSelection}>Delete selected</button><button type="button" onClick={clearGroup}>Clear selection</button></div>}<div className="ls-status">{message}</div></main>
      {showIntro && <GuidedFlowIntro onDismiss={() => { setShowIntro(false); setOpenQuestion(firstUnanswered(categoryMode)); }} />}
      {!showIntro && openQuestion && <PlacementQuestionBox category={openQuestion} index={CATEGORY_ORDER.indexOf(openQuestion) + 1} subgroups={subgroupsFor(openQuestion)} selected={subSelection[openQuestion]} onToggleSubgroup={(key) => toggleSubgroup(openQuestion, key)} onSelectAll={() => selectAllSubgroups(openQuestion)} hoveredSubgroup={hoveredSubgroup} onHoverSubgroup={setHoveredSubgroup} note={openQuestion === 'fixtures' ? 'Any fixtures not placed manually will be derived from unassigned space.' : undefined} onCommit={(mode) => commitCategoryQuestion(openQuestion, mode)} />}
      <aside className="ls-sidebar ls-right">
        <FixtureDetailsPanel selectedBaseObject={selectedBaseObject} room={layout.room} updateSelectedBaseObject={updateSelectedBaseObject} updateSelectedBaseFootprint={updateSelectedBaseFootprint} deleteSelection={deleteSelection} selectedFixture={selectedFixture} rotateSelected={rotateSelected} removeSelected={removeSelected} updateSelectedClearance={updateSelectedClearance} />
      </aside>
    </div>
  </div>;
}
