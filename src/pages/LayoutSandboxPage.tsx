import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APPROVE_SANDBOX_LAYOUT_MUTATION, DAMP_OPERATIONS_QUERY, DELETE_ZONING_PLAN_MUTATION, EQUIPMENT_LIST_QUERY, LAYOUT_SANDBOX_CAPABILITIES_QUERY, SAVE_ZONING_PLAN_MUTATION, SOLVE_ZONE_REQUIREMENTS_MUTATION, STATIONS_QUERY, ZONING_PLANS_QUERY, ZONING_PLAN_CATALOGUE_DRIFT_QUERY, ZONING_PLAN_QUERY } from '../graphql/operations';
import { ZONE_FAMILY_COLORS, ZONE_FAMILY_LABELS, fromPlannedOperationSnapshot, isPlannedOperationComplete, isZoneable, toOperationContextInput, toPlannedOperationSnapshot, type PlannedOperation, type PlannedOperationSnapshot } from '../lib/zone-requirements';
import { BENCH_DEPTH_FT, BENCH_SURFACE_AREA_SQFT, BENCH_WIDTH_FT, EMPTY_SANDBOX_LAYOUT, buildLayoutGeometryInput, canPlaceBaseObject, canPlaceFixture, centeredRectFootprint, computePlacementAvailability, evaluateUtilityReachability, fixtureFootprint, offsetAlongWall, parseSandboxLayout, pointOnWall, polygonBounds, reanchorWallMountedObjects, snapToNearestWall, validateSandboxLayout, wallRectFootprint, wallSideOfBounds, type FixtureClearance, type FixtureKind, type FixtureOrientation, type MountingSurface, type SandboxBaseObject, type SandboxEquipmentAssignment, type SandboxFixture, type SandboxLayer, type SandboxLayout, type SandboxPolygon, type SandboxStationAssignment, type WallSide } from '../lib/layout-sandbox';
import { Logo } from '../components/Logo';
import { CanvasLayers } from '../components/sandbox/CanvasLayers';
import { EquipmentPanel } from '../components/sandbox/EquipmentPanel';
import { FixtureDetailsPanel } from '../components/sandbox/FixtureDetailsPanel';
import { FixturePalette } from '../components/sandbox/FixturePalette';
import { InfraPalette } from '../components/sandbox/InfraPalette';
import { SavedPlansPanel } from '../components/sandbox/SavedPlansPanel';
import { StationPalette } from '../components/sandbox/StationPalette';
import { ZoneRequirementsPanel } from '../components/sandbox/ZoneRequirementsPanel';
import { DEFAULT_CLEARANCE, FIXTURE_DEFAULTS, INFRA_PALETTE, VENTILATION_PLACEMENT_LABELS, type PlaceableBaseKind, type VentilationPlacementKind } from '../components/sandbox/constants';
import { benchEquipmentArea, benchFill, equipmentArea } from '../components/sandbox/helpers';
import type { EquipmentCatalogItem, OperationCatalogueItem, StationCatalogItem, ZoneRequirementSummary, ZoningOverlay, ZoningPlanSummary } from '../components/sandbox/types';
import { PlacementQuestionBox, type PlacementSubgroup } from '../components/sandbox/PlacementQuestionBox';
import { GuidedFlowIntro } from '../components/sandbox/GuidedFlowIntro';
import { CATEGORY_CTA_VERB, CATEGORY_LABELS, CATEGORY_ORDER, FIXTURE_SUBGROUP_KINDS, emptyCategoryModeState, emptySubSelectionState, firstUnanswered, paletteVisible, seedCategoryModesFrom, subgroupVisible, type CategoryModeState, type PlacementCategory, type SubSelectionState } from '../components/sandbox/guidedFlow';

interface DampOperationsResponse { operations: OperationCatalogueItem[]; }

interface ZoningPlanFull extends ZoningPlanSummary { operations: PlannedOperationSnapshot[]; gridSizeFeet: number; zoneCompilerVersion: string; miniZincModelVersion: string; areaCalculationVersion: string; }
interface ZoningPlansResponse { zoningPlans: ZoningPlanSummary[]; }
interface ZoningPlanResponse { zoningPlan: ZoningPlanFull; }
interface SaveZoningPlanResponse { saveZoningPlan: ZoningPlanFull; }
interface CatalogueDriftEntry { operationId: string; savedRevision: string; currentRevision: string | null; }
interface ZoningPlanCatalogueDriftResponse { zoningPlanCatalogueDrift: CatalogueDriftEntry[]; }
interface ApproveSandboxLayoutResponse { approveSandboxLayout: { seedId: string } }
interface LayoutCapabilities { schemaVersion: number; layers: string[]; fixtureKinds: string[]; collections: string[]; }

interface PolicyDiagnosticEntry { operationId: string; disposition: string; reason: string; }
interface InsufficientDataEntry { operationIds: string[]; reason: string; }
interface SolveZoneRequirementsResponse {
  solveZoneRequirements: {
    status: string;
    solveStatus: string | null;
    cellZones: number[];
    blockingDiagnostics: PolicyDiagnosticEntry[];
    insufficientDataDiagnostics: InsufficientDataEntry[];
    zoneRequirements: ZoneRequirementSummary[];
  };
}

// Persists the sandbox's working layout AND guided-flow answers across
// visits — "Use this room in my intake" (or any other navigation away) no
// longer loses hand-placed work, or re-asks questions already answered, the
// moment the user leaves the page. Explicit hand-offs (an approved report's
// layout via router state) still take priority over this on mount; this is
// only the fallback for "I didn't pass anything specific, resume whatever I
// was last working on."
const SANDBOX_STORAGE_KEY = 'cirrus:sandbox:last-layout';
interface PersistedSandboxState {
  layout: SandboxLayout;
  categoryMode: CategoryModeState;
  subSelection: SubSelectionState;
  activeCategory: PlacementCategory | null;
}
function readPersistedState(): PersistedSandboxState | null {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { layout?: unknown; categoryMode?: CategoryModeState; subSelection?: SubSelectionState; activeCategory?: PlacementCategory | null } | null;
    // Falls back to treating the whole payload as a bare layout — the
    // pre-guided-flow-persistence format, before this wrapped it with
    // categoryMode/subSelection/activeCategory.
    const layout = parseSandboxLayout(data?.layout) ?? parseSandboxLayout(data);
    if (!layout) return null;
    // Older saves (before categoryMode/subSelection were persisted) only
    // have a layout — re-derive the answers from its content, same as any
    // other freshly-loaded layout, rather than losing it entirely.
    const seeded = seedCategoryModesFrom(layout);
    const categoryMode = data?.categoryMode ?? seeded.modes;
    return {
      layout,
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
  const paletteDragState = useRef<{ kind: FixtureKind; widthFt: number; depthFt: number; x: number; y: number; onCanvas: boolean } | null>(null);
  const overlayDrag = useRef<{ id: string; clientX: number; clientY: number } | null>(null);
  // Resumes whatever was last edited here (see readPersistedState) unless a
  // specific layout is handed in explicitly via router state (e.g. "open
  // this candidate in the sandbox" or "edit this report's layout"), which
  // the mount effect below loads on top of this and takes priority.
  const [layout, setLayout] = useState<SandboxLayout>(() => initialPersistedState().layout);
  // The nine-tab layer toggle is gone (WS-8b guided flow replaces it) — every
  // layer always renders now, so nothing placed is ever silently hidden.
  const [layers, setLayers] = useState<Record<SandboxLayer, boolean>>({ base: true, stations: true, equipment: true, circulation: true, electrical: true, plumbing: true, ventilation: true, validation: true, zoning: true });
  const [zoning, setZoning] = useState<ZoningOverlay | null>(null);
  const [zoningBlocked, setZoningBlocked] = useState<{ diagnostics: PolicyDiagnosticEntry[] } | null>(null);
  const [plannedOperations, setPlannedOperations] = useState<PlannedOperation[]>([]);
  const [operationDraft, setOperationDraft] = useState<PlannedOperation | null>(null);
  const [operationSearch, setOperationSearch] = useState('');
  // Set once a plan is saved or loaded — a further "Save plan" overwrites
  // this same plan in place instead of creating a new one. Cleared whenever
  // the planned-operations list changes by hand (add/remove), so a plan
  // loaded and then edited saves as what it now is, not silently
  // overwriting the plan it started from under a stale identity.
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [catalogueDrift, setCatalogueDrift] = useState<CatalogueDriftEntry[] | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [paletteDragPos, setPaletteDragPos] = useState<{ kind: FixtureKind; widthFt: number; depthFt: number; x: number; y: number; onCanvas: boolean } | null>(null);
  const [placementPreview, setPlacementPreview] = useState<{ widthFt: number; depthFt: number; orientation: FixtureOrientation; excludeInstanceId?: string } | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [placingKind, setPlacingKind] = useState<PlaceableBaseKind | null>(null);
  const [backendNotice, setBackendNotice] = useState<{ kind: 'progress' | 'error'; text: string } | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
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
  const { data: stationData, loading: stationsLoading, error: stationsError, refetch: refetchStations } = useQuery<{ stations: StationCatalogItem[] }>(STATIONS_QUERY, { fetchPolicy: 'cache-and-network' });
  const { data: equipmentData, loading: equipmentLoading, error: equipmentError, refetch: refetchEquipment } = useQuery<{ equipmentList: EquipmentCatalogItem[] }>(EQUIPMENT_LIST_QUERY, { fetchPolicy: 'cache-and-network' });
  const { data: capabilityData } = useQuery<{ layoutSandboxCapabilities: LayoutCapabilities }>(LAYOUT_SANDBOX_CAPABILITIES_QUERY, { fetchPolicy: 'cache-and-network' });
  const { data: operationsData, loading: operationsLoading, error: operationsError } = useQuery<DampOperationsResponse>(DAMP_OPERATIONS_QUERY, { fetchPolicy: 'cache-and-network' });
  const [approveSandboxLayout, { loading: sendingToSeedGenerator }] = useMutation<ApproveSandboxLayoutResponse>(APPROVE_SANDBOX_LAYOUT_MUTATION);
  const [solveZoneRequirements, { loading: zoningLoading }] = useMutation<SolveZoneRequirementsResponse>(SOLVE_ZONE_REQUIREMENTS_MUTATION);
  const { data: zoningPlansData, loading: zoningPlansLoading, error: zoningPlansError, refetch: refetchZoningPlans } = useQuery<ZoningPlansResponse>(ZONING_PLANS_QUERY, { fetchPolicy: 'cache-and-network' });
  const [saveZoningPlan, { loading: savingZoningPlan }] = useMutation<SaveZoningPlanResponse>(SAVE_ZONING_PLAN_MUTATION);
  const [deleteZoningPlan] = useMutation(DELETE_ZONING_PLAN_MUTATION);
  const [loadZoningPlan, { loading: loadingZoningPlan }] = useLazyQuery<ZoningPlanResponse>(ZONING_PLAN_QUERY, { fetchPolicy: 'network-only' });
  const [checkCatalogueDrift] = useLazyQuery<ZoningPlanCatalogueDriftResponse>(ZONING_PLAN_CATALOGUE_DRIFT_QUERY, { fetchPolicy: 'network-only' });
  const savedZoningPlans = zoningPlansData?.zoningPlans ?? [];
  const stationCatalog = stationData?.stations ?? [];
  const dampOperations = operationsData?.operations ?? [];
  const filteredOperations = useMemo(() => {
    const q = operationSearch.trim().toLowerCase();
    if (!q) return dampOperations;
    return dampOperations.filter((o) => o.name.toLowerCase().includes(q) || o.operationId.toLowerCase().includes(q) || o.equipment.some((e) => e.toLowerCase().includes(q)));
  }, [dampOperations, operationSearch]);
  const equipmentCatalog = equipmentData?.equipmentList ?? [];
  const catalogError = stationsError || equipmentError;
  const columns = Math.max(1, Math.ceil(layout.room.widthFt / layout.room.gridFt));
  const rows = Math.max(1, Math.ceil(layout.room.heightFt / layout.room.gridFt));
  const selectedFixture = layout.fixtures.find((f) => f.instanceId === selectedFixtureId) || null;
  const selectedBaseObject = selectedOverlay ? layout.baseObjects.find((object) => object.id === selectedOverlay) ?? null : null;
  const selectedStation = selectedFixture?.stations.find((s) => s.instanceId === selectedStationId) || null;
  const visibleEquipment = selectedStation ? equipmentCatalog.filter((e) => !e.stationId || e.stationId === selectedStation.stationId) : equipmentCatalog;
  const selectedBenchCapacity = selectedFixture?.kind === 'bench' ? BENCH_SURFACE_AREA_SQFT : 0;
  const selectedBenchUsedArea = selectedFixture?.kind === 'bench' ? benchEquipmentArea(selectedFixture) : 0;
  const assignedEquipment = new Set(layout.fixtures.flatMap((f) => f.stations.flatMap((s) => s.equipment.map((e) => e.equipmentId))));
  const utilization = useMemo(() => Math.round(layout.fixtures.reduce((sum, f) => { const size = fixtureFootprint(f, layout.room.gridFt); return sum + size.width * size.height; }, 0) / (columns * rows) * 100), [layout, columns, rows]);
  const violations = useMemo(() => validateSandboxLayout(layout), [layout]);
  // Scoped to the selected station's equipment when one is picked, otherwise
  // all of the selected bench's stations pooled together.
  const utilityCheck = useMemo(() => selectedFixture && selectedFixture.kind === 'bench' ? evaluateUtilityReachability(selectedFixture, layout.baseObjects, layout.room.gridFt, selectedStation ?? undefined) : null, [selectedFixture, selectedStation, layout.baseObjects, layout.room.gridFt]);
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
    try { localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify({ layout, categoryMode, subSelection, activeCategory })); } catch { /* private browsing, quota, etc — resuming is a convenience, not a guarantee */ }
  }, [layout, categoryMode, subSelection, activeCategory]);
  useEffect(() => {
    const state = location.state as { loadLayout?: unknown } | null;
    if (!state?.loadLayout) return;
    const parsed = parseSandboxLayout(state.loadLayout);
    if (parsed) { setLayout(parsed); applySeededCategoryModes(parsed); }
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const capabilities = capabilityData?.layoutSandboxCapabilities;
    if (!capabilities) return;
    const editorLayers: SandboxLayer[] = ['base', 'stations', 'equipment', 'circulation', 'electrical', 'plumbing', 'ventilation', 'validation'];
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
      if (event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (!selectedOverlay && !selectedStationId && !selectedFixtureId) return;
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
  // "Manually place" keeps whatever's currently selected as-is (or, for the
  // grid-less stations/zoning boxes, just means "yes") and closes the box —
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
  // Stations and zoning intentionally return no subgroups — their question
  // box is a plain manual-or-derive choice with no item grid (see
  // hasSubgroupGrid); the full station list / zone requirements panel only
  // ever shows up in the sidebar, once that category is active and manual.
  function subgroupsFor(category: PlacementCategory): PlacementSubgroup[] {
    if (category === 'infrastructure') return INFRA_PALETTE.map((group) => ({ key: group.layer, label: group.title, hoverItems: group.items.map((item) => item.label) }));
    if (category === 'fixtures') return FIXTURE_SUBGROUP_KINDS.map((kind) => ({ key: kind, label: FIXTURE_DEFAULTS[kind].name }));
    return [];
  }
  function updateLayout(fn: (previous: SandboxLayout) => SandboxLayout) { setLayout((previous) => ({ ...fn(previous), updatedAt: new Date().toISOString() })); }
  function setKind(kind: FixtureKind) { const d = FIXTURE_DEFAULTS[kind]; setNewKind(kind); setNewWidth(d.widthFt); setNewDepth(d.depthFt); if (kind === 'bench' || kind === 'laminarHood') setNewClearance({ ...DEFAULT_CLEARANCE[kind] }); }
  function createFixture(x: number, y: number) {
    const d = FIXTURE_DEFAULTS[newKind];
    const fixture: SandboxFixture = { instanceId: `${newKind}-${Date.now()}`, kind: newKind, name: d.name, x, y, widthFt: newKind === 'bench' ? BENCH_WIDTH_FT : Math.max(.5, newWidth), depthFt: newKind === 'bench' ? BENCH_DEPTH_FT : Math.max(.5, newDepth), orientation: 0, clearance: newKind === 'bench' || newKind === 'laminarHood' ? { ...newClearance } : undefined, stations: [] };
    if (!canPlaceFixture(fixture, layout.fixtures, layout.baseObjects, layout.room.gridFt)) return setMessage('That fixture overlaps another fixture or object.');
    updateLayout((p) => ({ ...p, fixtures: [...p.fixtures, fixture] })); setSelectedFixtureId(fixture.instanceId); setSelectedStationId(null); setMessage(`${fixture.name} placed.`);
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
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const pointerX = (event.clientX - rect.left) / rect.width * columns;
    const pointerY = (event.clientY - rect.top) / rect.height * rows;
    dragState.current = { id: fixture.instanceId, offsetX: pointerX - fixture.x, offsetY: pointerY - fixture.y, x: fixture.x, y: fixture.y };
    setSelectedOverlay(null); setSelectedFixtureId(fixture.instanceId); setSelectedStationId(null); setDragPreview({ id: fixture.instanceId, x: fixture.x, y: fixture.y });
    setPlacementPreview({ widthFt: fixture.widthFt, depthFt: fixture.depthFt, orientation: fixture.orientation, excludeInstanceId: fixture.instanceId });
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
    setDragPreview(null); setPlacementPreview(null); moveFixture(drag.id, drag.x, drag.y);
  }
  function moveFixtureWithKeyboard(event: React.KeyboardEvent<HTMLDivElement>, fixture: SandboxFixture) {
    const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = delta[event.key]; if (!direction) return;
    event.preventDefault(); event.stopPropagation(); moveFixture(fixture.instanceId, fixture.x + direction[0], fixture.y + direction[1]);
  }
  function startPaletteDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const widthFt = newKind === 'bench' ? BENCH_WIDTH_FT : Math.max(.5, newWidth);
    const depthFt = newKind === 'bench' ? BENCH_DEPTH_FT : Math.max(.5, newDepth);
    const rect = canvasRef.current?.getBoundingClientRect();
    const onCanvas = !!rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    const x = rect ? Math.min(columns - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * columns))) : 0;
    const y = rect ? Math.min(rows - 1, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * rows))) : 0;
    const next = { kind: newKind, widthFt, depthFt, x, y, onCanvas };
    paletteDragState.current = next; setPaletteDragPos(next);
    setPlacementPreview({ widthFt, depthFt, orientation: 0 });
  }
  function movePaletteDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = paletteDragState.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    drag.onCanvas = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    drag.x = Math.min(columns - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * columns)));
    drag.y = Math.min(rows - 1, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * rows)));
    if (paletteDragFrame.current !== null) return;
    paletteDragFrame.current = requestAnimationFrame(() => { paletteDragFrame.current = null; const current = paletteDragState.current; if (current) setPaletteDragPos({ ...current }); });
  }
  function finishPaletteDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = paletteDragState.current; if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId); paletteDragState.current = null;
    if (paletteDragFrame.current !== null) { cancelAnimationFrame(paletteDragFrame.current); paletteDragFrame.current = null; }
    setPaletteDragPos(null); setPlacementPreview(null);
    if (drag.onCanvas) createFixture(drag.x, drag.y);
  }
  function cancelPaletteDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId); paletteDragState.current = null;
    if (paletteDragFrame.current !== null) { cancelAnimationFrame(paletteDragFrame.current); paletteDragFrame.current = null; }
    setPaletteDragPos(null); setPlacementPreview(null);
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
    const assignment: SandboxEquipmentAssignment = { equipmentId, name: e.name, widthFt: e.widthFt, depthFt: e.depthFt, heightFt: e.heightFt, utilityRequirements: e.utilityRequirements, mounting: e.mounting };
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId !== selectedFixture.instanceId ? f : { ...f, stations: f.stations.map((s) => s.instanceId === selectedStation.instanceId ? { ...s, equipment: [...s.equipment, assignment] } : s) }) })); setMessage(`${e.name} assigned to ${selectedStation.name}.`);
  }
  function removeAssignedEquipment(equipmentId: string) {
    updateLayout((p) => ({ ...p, fixtures: p.fixtures.map((f) => f.instanceId !== selectedFixtureId ? f : { ...f, stations: f.stations.map((s) => s.instanceId === selectedStationId ? { ...s, equipment: s.equipment.filter((x) => x.equipmentId !== equipmentId) } : s) }) }));
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
  function removeSelected() { if (!selectedFixture) return; updateLayout((p) => ({ ...p, fixtures: p.fixtures.filter((f) => f.instanceId !== selectedFixture.instanceId) })); setSelectedFixtureId(null); setSelectedStationId(null); setMessage('Fixture removed.'); }
  // Hands the room size back to the intake wizard's "space" question
  // (QuestionsPage.tsx) via router state — a one-shot hand-off.
  function useInIntake() {
    navigate('/questions', { state: { spaceFromSandbox: { width_ft: layout.room.widthFt, height_ft: layout.room.heightFt } } });
  }
  async function sendToSeedGenerator() {
    setBackendNotice({ kind: 'progress', text: 'Adding this design to the approved seed library…' });
    try {
      const response = await approveSandboxLayout({ variables: { layout } });
      if (!response.data?.approveSandboxLayout?.seedId) throw new Error('The server did not return an approved seed');
      setBackendNotice(null);
      navigate('/layout-candidates', { state: { sourceLayout: layout } });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setBackendNotice({ kind: 'error', text: `Could not add this design to the approved seed library: ${detail}` });
      setMessage('The design was kept in the sandbox. Fix the save error and try again.');
    }
  }
  // Sandbox -> operation contexts -> zone-policy -> lab-program ->
  // MiniZinc -> zone overlay (see cirrus-backend's src/zone-policy,
  // src/lab-program, src/zoning). Only the room shell (baseObjects — walls,
  // doors, columns, plumbing points) goes in, no fixtures: zoning happens
  // before benches are placed. Areas/equipment/utilities come from the
  // actual selected operations via OPERATION_LAYOUT_PROFILES, not a
  // heuristic split.
  function addPlannedOperation() {
    if (!operationDraft || !isPlannedOperationComplete(operationDraft)) return;
    setPlannedOperations((current) => [...current, operationDraft]);
    setOperationDraft(null);
    setOperationSearch('');
    setCurrentPlanId(null);
  }
  function removePlannedOperation(key: string) {
    setPlannedOperations((current) => current.filter((op) => op.key !== key));
    setCurrentPlanId(null);
  }
  const canRunZoning = plannedOperations.length > 0 && plannedOperations.every(isPlannedOperationComplete);
  const canSavePlan = canRunZoning;

  // Saves the room's dimensions + every planned operation (each carrying a
  // catalogue snapshot, see toPlannedOperationSnapshot) as a reloadable
  // plan — layout.name doubles as the plan's own name, the same field
  // "Use in seed generator" already reads, rather than asking for a second
  // name nobody would keep in sync. Passing currentPlanId overwrites the
  // plan currently loaded/just-saved in place; omitting it (null) creates a
  // new one.
  async function saveCurrentPlan() {
    if (!canSavePlan) {
      setMessage('Add at least one operation with a complete material context before saving a plan.');
      return;
    }
    setBackendNotice({ kind: 'progress', text: 'Saving zoning plan…' });
    try {
      const response = await saveZoningPlan({
        variables: {
          input: {
            planId: currentPlanId ?? undefined,
            name: layout.name.trim() || 'Untitled plan',
            roomWidthFt: layout.room.widthFt,
            roomHeightFt: layout.room.heightFt,
            operations: plannedOperations.map(toPlannedOperationSnapshot),
            gridSizeFeet: layout.room.gridFt,
          },
        },
      });
      const saved = response.data?.saveZoningPlan;
      if (!saved) throw new Error('The server did not return a saved plan');
      setCurrentPlanId(saved.planId);
      setBackendNotice(null);
      setMessage(`Plan "${saved.name}" saved.`);
      void refetchZoningPlans();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setBackendNotice({ kind: 'error', text: `Could not save this plan: ${detail}` });
    }
  }

  // Loads a saved plan's room dims + planned operations back in — never
  // touches fixtures/baseObjects (zone requirements are deliberately not
  // tied to fixture placement, same as the rest of this section). Also
  // checks the loaded plan's catalogue snapshots against the live
  // catalogue right away: a re-seed or the eventual full protocols.io
  // import can change what one of its operationIds means since it was
  // saved, and that should be a visible warning the moment the plan comes
  // back in, not something the user only discovers if zoning behaves
  // unexpectedly.
  async function loadPlan(planId: string) {
    setBackendNotice({ kind: 'progress', text: 'Loading plan…' });
    try {
      const [planResponse, driftResponse] = await Promise.all([
        loadZoningPlan({ variables: { planId } }),
        checkCatalogueDrift({ variables: { planId } }),
      ]);
      const plan = planResponse.data?.zoningPlan;
      if (!plan) throw new Error('The server did not return that plan');
      updateLayout((current) => ({ ...current, name: plan.name, room: { ...current.room, widthFt: plan.roomWidthFt, heightFt: plan.roomHeightFt } }));
      setPlannedOperations(plan.operations.map(fromPlannedOperationSnapshot));
      setCurrentPlanId(plan.planId);
      setOperationDraft(null);
      setZoning(null);
      setZoningBlocked(null);
      // A loaded plan never touches fixtures/baseObjects/stations, so only
      // zoning is pre-answered here — the other three categories keep
      // whatever the room's own content already seeded them to.
      setCategoryMode((current) => ({ ...current, zoning: 'manual' }));
      setActiveCategory('zoning');
      setOpenQuestion((current) => current === 'zoning' ? null : current);
      const drift = driftResponse.data?.zoningPlanCatalogueDrift ?? [];
      setCatalogueDrift(drift.length > 0 ? drift : null);
      setBackendNotice(null);
      setMessage(`Plan "${plan.name}" loaded.${drift.length > 0 ? ` ${drift.length} operation(s) have drifted from the live catalogue — see the warning below.` : ''}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setBackendNotice({ kind: 'error', text: `Could not load that plan: ${detail}` });
    }
  }

  async function deletePlan(planId: string) {
    try {
      await deleteZoningPlan({ variables: { planId } });
      if (currentPlanId === planId) setCurrentPlanId(null);
      void refetchZoningPlans();
      setMessage('Plan deleted.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setBackendNotice({ kind: 'error', text: `Could not delete that plan: ${detail}` });
    }
  }

  async function runZoneRequirements() {
    if (!canRunZoning) {
      setMessage('Add at least one operation with a complete material context before zoning.');
      return;
    }
    const geometry = buildLayoutGeometryInput(layout);
    setBackendNotice({ kind: 'progress', text: 'Compiling zone requirements and solving with MiniZinc…' });
    try {
      // NonSpatialService operations (e.g. a third-party sequencing
      // send-out) stay in the planned-operations workflow list but never go
      // into the zoning request — they have no physical footprint to place.
      // The backend compiler excludes them too; this just keeps the request
      // itself honest about what it's actually asking to place.
      const response = await solveZoneRequirements({
        variables: { input: { ...geometry, operationContexts: plannedOperations.filter(isZoneable).map(toOperationContextInput) } },
      });
      const result = response.data?.solveZoneRequirements;
      if (!result) throw new Error('The server did not return a zoning result');

      if (result.status === 'blocked') {
        // Existing overlay is preserved on purpose — a blocked re-run
        // (e.g. after adding one more operation) shouldn't erase the last
        // legal layout the user was looking at.
        setZoningBlocked({ diagnostics: result.blockingDiagnostics });
        setBackendNotice({ kind: 'error', text: `${result.blockingDiagnostics.length} operation(s) need review before zoning can run — see the diagnostics below.` });
        return;
      }

      setZoningBlocked(null);
      if (result.solveStatus !== 'SATISFIED') {
        setBackendNotice({ kind: 'error', text: `MiniZinc could not find a legal zone assignment (${result.solveStatus}). Try a bigger room, fewer obstacles, or fewer/smaller operations.` });
        return;
      }

      setZoning({ roomWidth: geometry.roomWidth, roomHeight: geometry.roomHeight, cellZones: result.cellZones, legend: result.zoneRequirements });
      setLayers((current) => ({ ...current, zoning: true }));
      setBackendNotice(null);
      const insufficient = result.insufficientDataDiagnostics;
      setMessage(
        insufficient.length > 0
          ? `Zoned — but ${insufficient.length} operation(s) had no layout profile and were left out: ${insufficient.flatMap((d) => d.operationIds).join(', ')}.`
          : 'MiniZinc produced a zone assignment from the selected operations — see the zoning layer.',
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setBackendNotice({ kind: 'error', text: `Could not solve zoning: ${detail}` });
    }
  }
  async function refreshCatalogs() { try { await Promise.all([refetchStations(), refetchEquipment()]); setMessage('Stations and equipment refreshed from MongoDB.'); } catch { setMessage('Could not refresh the MongoDB catalog. Check the Cirrus API connection.'); } }
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
    } else if (kind === 'electrical_point' || kind === 'plumbing_point') {
      const { point: snapped, side } = snapToNearestWall(point, room);
      const name = kind === 'electrical_point' ? 'Electrical point' : 'Plumbing point';
      object = {
        id: `${kind}-${Date.now()}`, kind, name, footprint: { points: [snapped] },
        electrical: kind === 'electrical_point' ? { voltage: 120, amperage: 20, phase: 'single', receptacleCount: 1, dedicated: false, emergencyPower: false } : undefined,
        plumbing: kind === 'plumbing_point' ? { coldWater: true, hotWater: false, drain: true, diWater: false, processWaste: false } : undefined,
        utility: { mountingSurface: 'wall', wallId: side, offsetFt: offsetAlongWall(side, snapped), connectionRadiusFt: 3, maxConnections: 1, status: 'proposed' },
      };
    } else if (kind === 'hvac_supply' || kind === 'hvac_return' || kind === 'general_exhaust' || kind === 'local_exhaust_connection') {
      // Ceiling diffusers only ever place freely — a supply/return/general
      // exhaust register isn't pinned to a wall. Local exhaust connection is
      // wall-mounted by default, so it snaps like electrical/plumbing points.
      const mountingSurface: MountingSurface = kind === 'local_exhaust_connection' ? 'wall' : 'ceiling';
      const snap = mountingSurface === 'wall' ? snapToNearestWall(point, room) : { point, side: undefined as WallSide | undefined };
      object = {
        id: `${kind}-${Date.now()}`, kind: 'ventilation_point', name: VENTILATION_PLACEMENT_LABELS[kind], footprint: { points: [snap.point] },
        ventilation: { category: kind, ducted: true },
        utility: { mountingSurface, wallId: snap.side, offsetFt: snap.side ? offsetAlongWall(snap.side, snap.point) : undefined, connectionRadiusFt: 3, maxConnections: 1, status: 'proposed' },
      };
    } else {
      const footprint = centeredRectFootprint(point, 2, 2);
      object = { id: `${kind}-${Date.now()}`, kind, name: kind === 'restricted_region' ? 'Restricted region' : 'Column', footprint };
    }
    updateLayout((current) => ({ ...current, baseObjects: [...current.baseObjects, object] }));
    setSelectedFixtureId(null); setSelectedStationId(null); setSelectedOverlay(object.id); setPlacingKind(null);
    setMessage(`${object.name} placed.`);
  }
  // Turns on the kind's layer before entering placement mode — otherwise a
  // freshly-placed electrical/plumbing/ventilation point would immediately
  // vanish (CanvasLayers only renders a baseObject when its layer is
  // visible), which looked like placement silently failing.
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
    event.preventDefault(); event.stopPropagation(); setSelectedFixtureId(null); setSelectedStationId(null); setSelectedOverlay(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    overlayDrag.current = { id, clientX: event.clientX, clientY: event.clientY };
  }
  function moveOverlay(event: React.PointerEvent<SVGSVGElement>) {
    const drag = overlayDrag.current; const rect = canvasRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    const dx = (event.clientX - drag.clientX) / rect.width * layout.room.widthFt;
    const dy = (event.clientY - drag.clientY) / rect.height * layout.room.heightFt;
    if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return;
    drag.clientX = event.clientX; drag.clientY = event.clientY;
    let blocked = false;
    updateLayout((current) => ({ ...current, baseObjects: current.baseObjects.map((object) => {
      if (object.id !== drag.id) return object;
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
      if (!canPlaceBaseObject(candidate, current.fixtures, current.baseObjects, current.room.gridFt)) { blocked = true; return object; }
      return candidate;
    }) }));
    if (blocked) setMessage('That move would overlap another fixture or object.');
  }
  function finishOverlayMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!overlayDrag.current) return; overlayDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setMessage('Layer object moved.');
  }
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
    if (selectedOverlay) {
      updateLayout((current) => ({ ...current, baseObjects: current.baseObjects.filter((object) => object.id !== selectedOverlay) }));
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
    if (fix.type === 'add-exit') { placeBaseObjectAt('door', layout.room.widthFt / 2, layout.room.heightFt); return; }
    updateLayout((current) => {
      if (fix.type === 'set-door-width') return { ...current, baseObjects: current.baseObjects.map((object) => object.id === fix.targetId && object.door ? { ...object, door: { ...object.door, clearWidthIn: fix.value ?? 32 } } : object) };
      if (fix.type === 'set-access-face') return { ...current, fixtures: current.fixtures.map((fixture) => ({ ...fixture, stations: fixture.stations.map((station) => station.instanceId === fix.targetId ? { ...station, accessFaces: ['front'] } : station) })) };
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
  async function importLayout(file?: File) { if (!file) return; try { const parsed = parseSandboxLayout(JSON.parse(await file.text())); if (!parsed) throw Error(); setLayout(parsed); setSelectedFixtureId(null); setSelectedStationId(null); applySeededCategoryModes(parsed); setMessage('Layout imported.'); } catch { setMessage('That file is not a valid Cirrus layout. Version 2 and 3 files are supported.'); } }

  // Guided-flow gating — applied only to the left-sidebar palettes below.
  // The canvas render of layout.fixtures and the portaled CanvasLayers are
  // never gated: anything already placed stays rendered, selectable,
  // draggable, and inspectable regardless of category/subgroup mode.
  const guidedCategory = firstUnanswered(categoryMode);
  const infraVisibleLayers = new Set(INFRA_PALETTE.map((group) => group.layer).filter((layer) => subgroupVisible('infrastructure', layer, categoryMode.infrastructure, subSelection)));
  const fixtureVisibleKinds = FIXTURE_SUBGROUP_KINDS.filter((kind) => subgroupVisible('fixtures', kind, categoryMode.fixtures, subSelection));
  // Stations/zoning have no per-item grid (see hasSubgroupGrid) — "manual"
  // means show everything unfiltered, not a subSelection-filtered subset.
  const visibleStationCatalog = activeCategory === 'stations' && categoryMode.stations === 'manual' ? stationCatalog : [];
  const zoningPanelVisible = activeCategory === 'zoning' && categoryMode.zoning === 'manual';

  return <div className={`screen layout-sandbox ${layers.base ? 'show-base' : 'hide-base'} ${layers.stations ? 'show-stations' : 'hide-stations'} ${layers.equipment ? 'show-equipment' : 'hide-equipment'} ${layers.circulation ? 'show-circulation' : 'hide-circulation'}`}>
    <div className="ls-control-deck">
    <div className="ls-category-selector" aria-label="Placement categories">{CATEGORY_ORDER.map((category, index) => <button key={category} className={`ls-category-chip ${categoryMode[category]}`} onClick={() => openCategoryChip(category)}><i className={`ls-category-dot ${categoryMode[category]}`} />{index + 1}. {CATEGORY_LABELS[category]}</button>)}</div>
    <div className="ls-layer-tools">{placingKind && <span className="ls-derived-note">Click the room to place a {placingKind in VENTILATION_PLACEMENT_LABELS ? VENTILATION_PLACEMENT_LABELS[placingKind as VentilationPlacementKind] : placingKind.replace(/_/g, ' ')} — Esc to cancel</span>}{layers.circulation && !placingKind && <span className="ls-derived-note">Derived from unassigned space</span>}</div>
    <div className="ls-backend-actions"><button disabled={sendingToSeedGenerator} onClick={() => void sendToSeedGenerator()}>{sendingToSeedGenerator ? 'Saving approved seed…' : 'Use in seed generator'}</button><button disabled={zoningLoading || !canRunZoning} title={canRunZoning ? undefined : 'Add at least one operation with a complete material context first'} onClick={() => void runZoneRequirements()}>{zoningLoading ? 'Zoning…' : 'Zone with MiniZinc'}</button><button disabled={savingZoningPlan || !canSavePlan} title={canSavePlan ? undefined : 'Add at least one operation with a complete material context first'} onClick={() => void saveCurrentPlan()}>{savingZoningPlan ? 'Saving plan…' : currentPlanId ? 'Save plan (overwrite)' : 'Save plan'}</button></div>
    {backendNotice && <div className={`ls-optimization-notice ${backendNotice.kind}`}><span>{backendNotice.kind === 'progress' ? '⏳' : '⚠'}</span><b>{backendNotice.text}</b>{backendNotice.kind === 'error' && <button onClick={() => setBackendNotice(null)}>×</button>}</div>}
    {zoningBlocked && <div className="ls-violations"><div className="ls-section-title">Zoning blocked — needs review</div>{zoningBlocked.diagnostics.map((d, i) => <div key={`${d.operationId}-${i}`} className="ls-violation-card error"><b>{d.operationId} — {d.disposition}</b><span>{d.reason}</span></div>)}</div>}
    {catalogueDrift && <div className="ls-violations"><div className="ls-section-title">Loaded plan has drifted from the live catalogue</div>{catalogueDrift.map((d) => <div key={d.operationId} className="ls-violation-card warning"><b>{d.operationId}</b><span>{d.currentRevision === null ? 'No longer exists in the live catalogue.' : `Saved against catalogue revision "${d.savedRevision}", catalogue is now "${d.currentRevision}" — review this operation\'s context before zoning.`}</span></div>)}<button onClick={() => setCatalogueDrift(null)}>Dismiss</button></div>}
    {zoning && <div className="ls-derived-note" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '4px 0' }}>{[...new Map(zoning.legend.map((z) => [z.family, z])).values()].map((z) => <span key={z.family} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: ZONE_FAMILY_COLORS[z.family] || '#999' }} />{ZONE_FAMILY_LABELS[z.family] || z.family}</span>)}</div>}
    {canvasNode && createPortal(<CanvasLayers layout={layout} layers={layers} violations={violations} selected={selectedOverlay} placingKind={placingKind} zoning={zoning} onSelect={startOverlayMove} onPlace={placeOnCanvasClick} onDrag={moveOverlay} onDragEnd={finishOverlayMove} />, canvasNode)}
    {layers.validation && violations.length > 0 && <div className="ls-violations">{violations.map((violation) => <div key={violation.id} className={`ls-violation-card ${violation.severity}`} onClick={() => selectViolation(violation)}><b>{violation.severity === 'error' ? 'Hard violation' : 'Recommendation'}</b><span>{violation.message}</span>{violation.fix && <button onClick={(event) => { event.stopPropagation(); applySuggestedFix(violation); }}>✨ {violation.fix.label}</button>}</div>)}</div>}
    </div>
    <div className="qm-topbar"><div className="logo-mark"><Logo height={40} /></div><div><b>Layout sandbox</b><div className="ls-subtitle">Place fixtures, assign stations to benches, then add equipment</div></div><div style={{ flex: 1 }} /><button className="ls-guided-cta" onClick={guidedCategory ? () => openCategoryChip(guidedCategory) : useInIntake}>{guidedCategory ? <>{CATEGORY_CTA_VERB[guidedCategory]} {CATEGORY_LABELS[guidedCategory]} <span aria-hidden="true">→</span></> : 'Use this room in my intake →'}</button><button className="btn-out" onClick={exportLayout}>Export JSON</button><button className="btn-out" onClick={() => fileInput.current?.click()}>Import</button><input ref={fileInput} hidden type="file" accept="application/json" onChange={(e) => importLayout(e.target.files?.[0])} /><button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>← Dashboard</button></div>
    <div className="ls-workspace">
      <aside className="ls-sidebar"><label className="field-label">Layout name</label><input className="field-input" value={layout.name} onChange={(e) => updateLayout((p) => ({ ...p, name: e.target.value }))} /><div className="ls-room-fields"><label><span className="field-label">Width (ft)</span><input className="field-input" type="number" min="5" value={layout.room.widthFt} onChange={(e) => updateLayout((p) => { const room = { ...p.room, widthFt: Math.max(5, Number(e.target.value)) }; return { ...p, room, baseObjects: reanchorWallMountedObjects(p.baseObjects, room) }; })} /></label><label><span className="field-label">Depth (ft)</span><input className="field-input" type="number" min="5" value={layout.room.heightFt} onChange={(e) => updateLayout((p) => { const room = { ...p.room, heightFt: Math.max(5, Number(e.target.value)) }; return { ...p, room, baseObjects: reanchorWallMountedObjects(p.baseObjects, room) }; })} /></label></div>
        {paletteVisible('infrastructure', activeCategory) && <InfraPalette placingKind={placingKind} beginPlacing={beginPlacing} visibleLayers={infraVisibleLayers} />}
        {paletteVisible('fixtures', activeCategory) && <FixturePalette newKind={newKind} setKind={setKind} newWidth={newWidth} setNewWidth={setNewWidth} newDepth={newDepth} setNewDepth={setNewDepth} newClearance={newClearance} setNewClearance={setNewClearance} startPaletteDrag={startPaletteDrag} movePaletteDrag={movePaletteDrag} finishPaletteDrag={finishPaletteDrag} cancelPaletteDrag={cancelPaletteDrag} visibleKinds={fixtureVisibleKinds} />}
        {paletteVisible('stations', activeCategory) && <StationPalette stationsLoading={stationsLoading} equipmentLoading={equipmentLoading} catalogError={catalogError} stationsError={stationsError} stationCatalog={visibleStationCatalog} equipmentCount={equipmentCatalog.length} refreshCatalogs={refreshCatalogs} isBenchSelected={selectedFixture?.kind === 'bench'} assignStation={assignStation} />}
        {zoningPanelVisible && <ZoneRequirementsPanel dampOperations={dampOperations} filteredOperations={filteredOperations} operationsLoading={operationsLoading} operationsError={operationsError} operationSearch={operationSearch} setOperationSearch={setOperationSearch} operationDraft={operationDraft} setOperationDraft={setOperationDraft} addPlannedOperation={addPlannedOperation} plannedOperations={plannedOperations} removePlannedOperation={removePlannedOperation} />}
        {!activeCategory && <p className="ls-help">Answer the placement questions (top right) to start placing things — whatever you leave derived, Cirrus places for you automatically.</p>}
        <SavedPlansPanel zoningPlansLoading={zoningPlansLoading} zoningPlansError={zoningPlansError} savedZoningPlans={savedZoningPlans} currentPlanId={currentPlanId} loadingZoningPlan={loadingZoningPlan} loadPlan={loadPlan} deletePlan={deletePlan} />
      </aside>
      <main className="ls-main"><div className="ls-metrics"><span>{layout.room.widthFt} × {layout.room.heightFt} ft room</span><span>{layout.fixtures.filter((f) => f.kind === 'bench').length} benches</span><span>{layout.fixtures.flatMap((f) => f.stations).length} stations</span><span>{assignedEquipment.size} equipment assigned</span><span>{utilization}% occupied</span></div><div className="ls-canvas-wrap"><div ref={canvasRef} className={`ls-canvas ${placingKind ? 'placing' : ''}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, aspectRatio: `${columns} / ${rows}`, '--grid-cols': columns, '--grid-rows': rows } as React.CSSProperties} onClick={() => { if (!placingKind) { setSelectedFixtureId(null); setSelectedStationId(null); } }}>{placementHeatmap && placementHeatmap.flatMap((row, y) => row.map((valid, x) => <div key={`ph-${x}-${y}`} className={`ls-placement-cell ${valid ? 'valid' : 'invalid'}`} style={{ gridColumn: `${x + 1} / span 1`, gridRow: `${y + 1} / span 1` }} />))}{layout.fixtures.map((f) => { const size = fixtureFootprint(f, layout.room.gridFt); const position = dragPreview?.id === f.instanceId ? dragPreview : f; return <div key={f.instanceId} tabIndex={0} role="button" aria-label={`${f.name}. Use arrow keys to move.`} className={`ls-fixture ${f.kind} ${selectedFixtureId === f.instanceId ? 'selected' : ''} ${dragPreview?.id === f.instanceId ? 'dragging' : ''}`} onPointerDown={(e) => startFixtureMove(e, f)} onPointerMove={previewFixtureMove} onPointerUp={finishFixtureMove} onPointerCancel={finishFixtureMove} onKeyDown={(e) => moveFixtureWithKeyboard(e, f)} onClick={(e) => { e.stopPropagation(); setSelectedFixtureId(f.instanceId); setSelectedStationId(null); }} style={{ gridColumn: `${position.x + 1} / span ${size.width}`, gridRow: `${position.y + 1} / span ${size.height}`, ...(f.kind === 'bench' ? { '--bench-fill': benchFill(f) } as React.CSSProperties : {}) }}><b>{f.name}</b><small>{f.widthFt} × {f.depthFt} ft{f.kind === 'bench' ? ` · ${f.stations.length} stations` : ''}</small></div>; })}{paletteDragPos && paletteDragPos.onCanvas && <div className={`ls-fixture ${paletteDragPos.kind} ls-fixture-ghost`} style={{ gridColumn: `${paletteDragPos.x + 1} / span ${Math.max(1, Math.ceil(paletteDragPos.widthFt / layout.room.gridFt))}`, gridRow: `${paletteDragPos.y + 1} / span ${Math.max(1, Math.ceil(paletteDragPos.depthFt / layout.room.gridFt))}` }}><b>{FIXTURE_DEFAULTS[paletteDragPos.kind].name}</b><small>{paletteDragPos.widthFt} × {paletteDragPos.depthFt} ft</small></div>}</div></div><div className="ls-status">{message}</div></main>
      {showIntro && <GuidedFlowIntro onDismiss={() => { setShowIntro(false); setOpenQuestion(firstUnanswered(categoryMode)); }} />}
      {!showIntro && openQuestion && <PlacementQuestionBox category={openQuestion} index={CATEGORY_ORDER.indexOf(openQuestion) + 1} subgroups={subgroupsFor(openQuestion)} selected={subSelection[openQuestion]} onToggleSubgroup={(key) => toggleSubgroup(openQuestion, key)} onSelectAll={() => selectAllSubgroups(openQuestion)} hoveredSubgroup={hoveredSubgroup} onHoverSubgroup={setHoveredSubgroup} note={openQuestion === 'fixtures' ? 'Any fixtures not placed manually will be derived from unassigned space.' : undefined} onCommit={(mode) => commitCategoryQuestion(openQuestion, mode)} />}
      <aside className="ls-sidebar ls-right">
        <FixtureDetailsPanel selectedBaseObject={selectedBaseObject} room={layout.room} updateSelectedBaseObject={updateSelectedBaseObject} updateSelectedBaseFootprint={updateSelectedBaseFootprint} deleteSelection={deleteSelection} selectedFixture={selectedFixture} rotateSelected={rotateSelected} removeSelected={removeSelected} updateSelectedClearance={updateSelectedClearance} selectedStationId={selectedStationId} setSelectedStationId={setSelectedStationId} selectedBenchUsedArea={selectedBenchUsedArea} selectedBenchCapacity={selectedBenchCapacity} utilityCheck={utilityCheck} />
        <EquipmentPanel visibleEquipment={visibleEquipment} assignedEquipment={assignedEquipment} equipmentLoading={equipmentLoading} equipmentError={equipmentError} isBenchSelected={selectedFixture?.kind === 'bench'} selectedBenchUsedArea={selectedBenchUsedArea} selectedBenchCapacity={selectedBenchCapacity} selectedStation={selectedStation} assignEquipment={assignEquipment} onRemoveEquipment={removeAssignedEquipment} />
      </aside>
    </div>
  </div>;
}
