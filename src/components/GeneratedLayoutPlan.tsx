import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { BENCH_SURFACE_AREA_SQFT, parseSandboxLayout, type SandboxLayout } from '../lib/layout-sandbox';
import { benchContents, readLabPlan, WALL_LABELS, zoneColor, type LabPlan, type PlanOptions, type PlanWall } from '../lib/lab-plan';
import { DISMISS_FLOOR_EQUIPMENT_PROMPT_MUTATION, UPDATE_REPORT_LAYOUT_MUTATION } from '../graphql/operations';
import { LayoutFloorPlan } from './LayoutFloorPlan';

type LegacyDecisionReport = {
  topologyProduced: { wallBenchPositions: number; doubleIslandPairs: number; singleIslandBenchPositions: number; totalBenchPositions: number };
  structuralChecksPassed: string[];
  adjustments: string[];
  notYetImplemented: string[];
};

export type GeneratedLayout = {
  layoutId?: string;
  revision?: number;
  warnings?: string[];
  decisionReport?: Record<string, unknown>;
  data?: unknown;
};

// The report's generated floor plan. Layouts generated with workflow zones
// (layout.plan present) get the zone editor; older reports still show the
// station-colored plan they were generated with.
// floorPromptPending: the user chose to place floor equipment after
// generation (or never answered) and hasn't been asked yet — the report
// asks once, in a pop-up.
export function GeneratedLayoutPlan({ value, reportId, onUpdated, floorPromptPending }: { value: unknown; reportId?: string | null; onUpdated?: (generated: GeneratedLayout, reportData?: Record<string, unknown>) => void; floorPromptPending?: boolean }) {
  const generated = value && typeof value === 'object' ? value as GeneratedLayout : null;
  const layout = parseSandboxLayout(generated?.data);
  const plan = readLabPlan(generated?.data);
  if (!generated || !layout) return null;
  if (!plan) return <LegacyLayoutPlan generated={generated} layout={layout} />;
  return <ZonedLayoutPlan generated={generated} layout={layout} plan={plan} reportId={reportId ?? null} onUpdated={onUpdated} floorPromptPending={!!floorPromptPending} />;
}

interface EditableZone {
  id: string;
  name: string;
  workflows: string[];
  benchIds: string[];
  mergedFrom: string[];
}

type SettingsDraft = Required<PlanOptions>;

function zonesFromPlan(plan: LabPlan): EditableZone[] {
  return plan.zones.map((z) => ({ id: z.id, name: z.name, workflows: [...z.workflows], benchIds: [...z.benchIds], mergedFrom: [] }));
}

function settingsFromPlan(plan: LabPlan): SettingsDraft {
  const { mode, mainWall, sameDirection, wallBenches, workingSpacePct, zoneHeadroom, separateZonesWithAisles, optimizerBalance } = plan.options;
  return { mode, mainWall, sameDirection, wallBenches, workingSpacePct, zoneHeadroom: zoneHeadroom ?? 1.25, separateZonesWithAisles, optimizerBalance: optimizerBalance ?? 0.5 };
}

function ZonedLayoutPlan({ generated, layout, plan, reportId, onUpdated, floorPromptPending }: { generated: GeneratedLayout; layout: SandboxLayout; plan: LabPlan; reportId: string | null; onUpdated?: (generated: GeneratedLayout, reportData?: Record<string, unknown>) => void; floorPromptPending: boolean }) {
  const navigate = useNavigate();
  // Unplaced units with no zone are floor-standing equipment (placed by hand
  // in the sandbox); placements with no bench are the ones already placed.
  const benchUnplaced = (plan.initialEquipment?.unplaced ?? []).filter((u) => u.zoneId !== null);
  const floorUnplaced = (plan.initialEquipment?.unplaced ?? []).filter((u) => u.zoneId === null);
  const floorPlaced = (equipmentId: string) => (plan.initialEquipment?.placements ?? []).filter((p) => p.benchId === null && p.equipmentId === equipmentId).length;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zones, setZones] = useState<EditableZone[]>(() => zonesFromPlan(plan));
  // The zone benches are being moved into ('' = not moving benches: a
  // click pins that bench's details instead).
  const [activeZoneId, setActiveZoneId] = useState<string>('');
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsDraft>(() => settingsFromPlan(plan));
  const [error, setError] = useState<string | null>(null);
  const [updateReportLayout, { loading: saving }] = useMutation<{ updateReportLayout: { id: string; data: Record<string, unknown> } }>(UPDATE_REPORT_LAYOUT_MUTATION);
  const [dismissFloorPrompt] = useMutation(DISMISS_FLOOR_EQUIPMENT_PROMPT_MUTATION);
  const floorToPlace = plan.floorItems.reduce((n, e) => n + Math.max(0, e.quantity - floorPlaced(e.equipmentId)), 0);
  const [showFloorPrompt, setShowFloorPrompt] = useState(floorPromptPending && floorToPlace > 0 && !!reportId);
  // Floor equipment is placed on the generated layout as it is: benches
  // stay, the sandbox only takes floor equipment, and Done saves it here.
  const location = useLocation();
  const placeFloorEquipment = () => navigate('/layout-sandbox', { state: { loadLayout: generated.data, placeFloorForReport: reportId, returnState: location.state } });
  async function answerFloorPrompt(placeNow: boolean) {
    setShowFloorPrompt(false);
    if (reportId) await dismissFloorPrompt({ variables: { reportId } }).catch(() => undefined);
    if (placeNow) placeFloorEquipment();
  }

  // A new plan (after a re-run, or a different report) resets every draft.
  useEffect(() => {
    setZones(zonesFromPlan(plan));
    setSettings(settingsFromPlan(plan));
    setActiveZoneId((current) => (plan.zones.some((z) => z.id === current) ? current : ''));
    setPinnedId((current) => (current && plan.benches.some((b) => b.fixtureId === current) ? current : null));
  }, [plan]);

  const zoneIds = zones.map((z) => z.id);
  const zoneOfBench = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones) for (const benchId of z.benchIds) map.set(benchId, z.id);
    return map;
  }, [zones]);
  const zonesChanged = JSON.stringify(zones) !== JSON.stringify(zonesFromPlan(plan));
  const draftZoneOf = useMemo(() => (zonesChanged ? (benchId: string) => zoneOfBench.get(benchId) : undefined), [zonesChanged, zoneOfBench]);
  const settingsChanged = JSON.stringify(settings) !== JSON.stringify(settingsFromPlan(plan));
  const planZoneById = new Map(plan.zones.map((z) => [z.id, z]));
  const benchByFixture = new Map(plan.benches.map((b) => [b.fixtureId, b]));

  // Click: with a zone picked, move the bench's aisle into it; otherwise
  // pin (or unpin) that bench's details.
  function clickBench(fixtureId: string) {
    if (activeZoneId && reportId) moveBench(fixtureId);
    else setPinnedId((current) => (current === fixtureId ? null : fixtureId));
  }
  const toggleZone = (zoneId: string) => setActiveZoneId((current) => (current === zoneId ? '' : zoneId));

  // Click: every bench facing into that bench's working aisle (its zone
  // unit) joins the selected zone, so one aisle never holds two zones.
  function moveBench(fixtureId: string) {
    const bench = benchByFixture.get(fixtureId);
    if (!bench || !activeZoneId || saving) return;
    const moving = new Set(bench.zoneUnitId ? plan.benches.filter((b) => b.zoneUnitId === bench.zoneUnitId).map((b) => b.id) : [bench.id]);
    setZones((current) => current.map((z) => ({
      ...z,
      benchIds: z.id === activeZoneId ? [...new Set([...z.benchIds, ...moving])] : z.benchIds.filter((id) => !moving.has(id)),
    })));
  }

  function discard() {
    setZones(zonesFromPlan(plan));
    setSettings(settingsFromPlan(plan));
    setError(null);
  }

  async function rerun() {
    if (!reportId) return;
    setError(null);
    try {
      const { data } = await updateReportLayout({
        variables: {
          reportId,
          edit: {
            // "Maximum fit" is no longer offered: any settings change runs
            // rows from a main wall (none picked = the main door's wall).
            options: settingsChanged ? { ...settings, mode: 'main_wall', mainWall: settings.mainWall } : undefined,
            zones: zones.map((z) => ({ id: z.id, name: z.name, workflows: z.workflows, benchIds: z.benchIds, mergedFrom: z.mergedFrom.length ? z.mergedFrom : undefined })),
          },
        },
      });
      const updated = data?.updateReportLayout.data?.generated_layout as GeneratedLayout | undefined;
      if (updated) onUpdated?.(updated, data?.updateReportLayout.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(generated.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cirrus-lab-plan${generated.layoutId ? `-${generated.layoutId.slice(0, 8)}` : ''}-r${generated.revision ?? 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // The bench described below the plan: the one under the pointer, else the pinned one.
  const shownId = hoveredId ?? pinnedId;
  const hovered = shownId ? benchByFixture.get(shownId) : undefined;
  const hoveredZone = hovered ? zones.find((z) => z.id === zoneOfBench.get(hovered.id)) : undefined;
  const onBench = hovered ? benchContents(plan, hovered.id) : null;
  const canRerun = !!reportId && (zonesChanged || settingsChanged);
  // Changes that place every bench again (and so reset zone clicks).
  const placesAgain = (['mode', 'mainWall', 'sameDirection', 'wallBenches', 'workingSpacePct', 'zoneHeadroom'] as const).some((key) => settings[key] !== settingsFromPlan(plan)[key])
    || (plan.options.separateZonesWithAisles && !settings.separateZonesWithAisles);

  return (
    <>
      <div className="sec-head">Generated lab plan<div className="sec-line" /></div>
      <section className="generated-layout-card">
        <div className="generated-layout-heading">
          <div>
            <div className="generated-layout-title">{layout.name}</div>
            <div className="generated-layout-meta">
              {layout.room.widthFt} × {layout.room.heightFt} ft · {plan.totals.benches} benches in {plan.islands.length} island{plan.islands.length === 1 ? '' : 's'} · {plan.arrangement.workingAisleFt} ft working aisles, {plan.arrangement.crossAisleFt} ft cross-aisles · Revision {generated.revision ?? 1}
            </div>
          </div>
          <div className="plan-heading-actions">
            <button className="btn-out" onClick={downloadJson} title="Everything in this plan — benches, aisles, zones, unused floor, equipment per zone, fixed flags — for the optimizer.">Download plan JSON</button>
            <button className="btn-teal" onClick={() => navigate('/layout-sandbox', { state: { loadLayout: generated.data } })}>Open in sandbox</button>
          </div>
        </div>

        <div className="plan-editor">
          <div className="plan-editor-canvas">
            <LayoutFloorPlan
              layout={layout}
              plan={plan}
              className="generated-layout-preview plan-editor-preview"
              hoveredId={shownId}
              onHoverChange={setHoveredId}
              zoneOfBench={draftZoneOf}
              onFixtureClick={clickBench}
              fixtureClickHint={activeZoneId && reportId ? `Click to move this bench's aisle into ${zones.find((z) => z.id === activeZoneId)?.name ?? 'the selected'} zone.` : 'Click to pin its equipment list.'}
            />
            <div className="generated-layout-legend">
              <span><i style={{ background: 'rgba(52,98,201,.35)' }} />Aisles (where technicians walk)</span>
              <span><i style={{ background: 'rgba(214,79,79,.3)' }} />Door clearance</span>
              <span><i style={{ background: '#fbfbfa' }} />Unused floor</span>
            </div>
            <div className={`generated-layout-hover-card ${hovered ? 'visible' : ''}`} aria-live="polite">
              {hovered && onBench ? (
                <>
                  <div className="bench-card-head">
                    <strong>{hoveredZone?.name ?? 'Unzoned'} zone · {hovered.kind === 'wall' ? 'wall bench' : 'island bench'}</strong>
                    {pinnedId === hovered.fixtureId && <button type="button" className="bench-card-close" aria-label="Unpin this bench" onClick={() => setPinnedId(null)}>×</button>}
                  </div>
                  <span>6 × 2.5 ft · worked from the {WALL_LABELS[hovered.facing].split(' ')[0].toLowerCase()} side{onBench.replacedBy ? '' : ` · ${onBench.items.length} item${onBench.items.length === 1 ? '' : 's'}, ${onBench.usedFt} of 6 ft used`}</span>
                  {onBench.replacedBy ? (
                    <span className="bench-card-replaced">Replaced by <b>{onBench.replacedBy}</b> — too big for a bench, it takes this bench's place when the lab is built.</span>
                  ) : onBench.items.length ? (
                    <ul>{onBench.items.map((item) => <li key={item.key}>{item.name}<small>{item.detail}</small></li>)}</ul>
                  ) : <span>No equipment on this bench yet — it's free working space.</span>}
                </>
              ) : <span>{activeZoneId && reportId ? `Moving benches into ${zones.find((z) => z.id === activeZoneId)?.name ?? 'the selected'} zone: click benches to move their aisle. Click the zone again to stop, then "Save layout changes".` : `Hover a bench to see its equipment; click to pin it.${reportId ? ' To move benches between zones, click a zone on the right first.' : ''}`}</span>}
            </div>
          </div>

          <aside className="plan-editor-side">
            <div className="plan-side-title">Zones</div>
            {zones.map((zone) => {
              const stored = planZoneById.get(zone.id);
              const benchArea = zone.benchIds.length * BENCH_SURFACE_AREA_SQFT;
              const need = stored?.benchNeedSqFt ?? 0;
              const active = zone.id === activeZoneId;
              return (
                <div key={zone.id} className={`plan-zone ${active ? 'active' : ''}`} onClick={() => reportId && toggleZone(zone.id)} title={reportId ? (active ? 'Click to stop moving benches into this zone' : 'Click, then click benches to move them into this zone') : undefined}>
                  <div className="plan-zone-head">
                    <i style={{ background: zoneColor(zone.id, zoneIds) }} />
                    <button className="plan-zone-select" type="button" aria-pressed={active} onClick={(e) => { e.stopPropagation(); if (reportId) toggleZone(zone.id); }}>{zone.name}{active ? ' — moving benches' : ''}</button>
                    <span className="plan-zone-count">{zone.benchIds.length} bench{zone.benchIds.length === 1 ? '' : 'es'}</span>
                  </div>
                  <div className={`plan-zone-area ${benchArea < need ? 'short' : ''}`}>
                    {benchArea} sq ft of bench · needs {Math.round(need)} sq ft{benchArea < need ? ` (short ${Math.round(need - benchArea)})` : ''}
                  </div>
                  {stored && stored.equipment.length > 0 && (
                    <details className="plan-zone-equipment" onClick={(e) => e.stopPropagation()}>
                      <summary>{stored.equipment.length} equipment item{stored.equipment.length === 1 ? '' : 's'}</summary>
                      <ul>{stored.equipment.map((e) => <li key={e.equipmentId}>{e.name} ×{e.quantity}{e.fixed ? <b className="plan-fixed">fixed</b> : null}{e.placeholderSize ? <small> (size not measured yet)</small> : null}</li>)}</ul>
                    </details>
                  )}
                </div>
              );
            })}


            {reportId && (
              <>
                <div className="plan-side-title">Layout settings</div>
                <div className="plan-settings">
                  <label className="plan-range">
                    Main wall
                    <select value={settings.mode === 'main_wall' ? settings.mainWall ?? '' : ''} onChange={(e) => setSettings({ ...settings, mode: 'main_wall', mainWall: (e.target.value || null) as PlanWall | null })} aria-label="Main wall">
                      <option value="">Wall with the main door</option>
                      {(Object.keys(WALL_LABELS) as PlanWall[]).map((w) => <option key={w} value={w}>{WALL_LABELS[w]}</option>)}
                    </select>
                  </label>
                  <p className="plan-note">Rows of benches run straight out from this wall, so every aisle leads toward it. Benches go along the walls only when the islands alone can't give every zone its space.</p>
                  <label className="plan-range">
                    Working space kept free on every bench: <b>{settings.workingSpacePct}%</b>
                    <input type="range" min={20} max={50} step={1} value={settings.workingSpacePct} onChange={(e) => setSettings({ ...settings, workingSpacePct: Number(e.target.value) })} />
                  </label>
                  <label className="plan-range">
                    Zone headroom (spare benches go to General): <b>{settings.zoneHeadroom.toFixed(2)}×</b>
                    <input type="range" min={1} max={2} step={0.05} value={settings.zoneHeadroom} onChange={(e) => setSettings({ ...settings, zoneHeadroom: Number(e.target.value) })} />
                  </label>
                  <label className="plan-check"><input type="checkbox" checked={settings.separateZonesWithAisles} onChange={(e) => setSettings({ ...settings, separateZonesWithAisles: e.target.checked })} />Contamination control — keep an aisle between zones</label>
                  <label className="plan-range">
                    Equipment optimizer focus (saved for the optimizer)
                    <input type="range" min={0} max={1} step={0.05} value={settings.optimizerBalance} onChange={(e) => setSettings({ ...settings, optimizerBalance: Number(e.target.value) })} />
                    <span className="plan-range-ends"><span>Meet soft constraints</span><span>Minimize walking</span></span>
                  </label>
                  {placesAgain && <p className="plan-note warn">This places every bench again, so zone changes made by clicking are reset.</p>}
                  {!placesAgain && settings.separateZonesWithAisles && <p className="plan-note">Benches stay where they are; wherever two zones touch, the bench of the zone with the most spare space is removed to open a walkway.</p>}
                </div>
                <div className="plan-actions">
                  <button className="btn-teal" onClick={rerun} disabled={!canRerun || saving}>{saving ? 'Saving…' : 'Save layout changes'}</button>
                  <button className="btn-out" onClick={discard} disabled={saving || (!zonesChanged && !settingsChanged)}>Discard changes</button>
                </div>
                {error && <div className="plan-error">{error}</div>}
              </>
            )}
          </aside>
        </div>

        {(generated.warnings?.length ?? 0) > 0 && <div className="generated-layout-warnings"><strong>Draft notes</strong>{generated.warnings!.map((warning) => <div key={warning}>{warning}</div>)}</div>}
        {benchUnplaced.length > 0 && (
          <div className="plan-floor-items">
            <strong>Bench equipment still to place</strong>
            <ul>{benchUnplaced.map((item) => <li key={item.instanceId}>{plan.zones.find((zone) => zone.id === item.zoneId)?.equipment.find((e) => e.equipmentId === item.equipmentId)?.name ?? item.equipmentId}: {item.reason}</li>)}</ul>
          </div>
        )}
        {plan.floorItems.length > 0 && (
          <div className="plan-floor-items">
            <strong>Floor-standing equipment</strong>
            <ul>{plan.floorItems.map((e) => {
              const placed = floorPlaced(e.equipmentId);
              const reason = floorUnplaced.find((u) => u.equipmentId === e.equipmentId)?.reason;
              return <li key={e.equipmentId}>{e.name}{e.placeholderSize ? '' : ` (${e.widthFt} × ${e.depthFt} ft)`}: {placed >= e.quantity ? `placed${e.quantity > 1 ? ` (${e.quantity})` : ''}` : <><b className="plan-unplaced">Unplaced</b> {placed} of {e.quantity} placed{reason ? ` — ${reason}` : ''}</>}</li>;
            })}</ul>
            {floorToPlace > 0 && (
              <p style={{ margin: '6px 0 0' }}>
                Unplaced floor equipment can be placed on this layout's open floor — benches stay where they are.{' '}
                {reportId && <button type="button" className="btn-out" style={{ padding: '2px 10px', fontSize: 12 }} onClick={placeFloorEquipment}>Place floor equipment</button>}
              </p>
            )}
          </div>
        )}
        {showFloorPrompt && (
          <div className="ls-placement-backdrop" role="dialog" aria-modal="true" aria-labelledby="floor-prompt-title">
            <div className="ls-placement-question">
              <div className="ls-placement-question-header" id="floor-prompt-title">Place your floor equipment</div>
              <p className="ls-placement-question-text">
                {floorToPlace} floor-standing unit{floorToPlace === 1 ? '' : 's'} (cold storage, hoods) {floorToPlace === 1 ? 'isn\u2019t' : 'aren\u2019t'} placed yet. Place {floorToPlace === 1 ? 'it' : 'them'} on this layout now? Benches stay where they are; anything you don’t place is listed as unplaced.
              </p>
              <div className="ls-placement-question-actions">
                <button type="button" className="ls-qb-manual active" onClick={() => void answerFloorPrompt(true)}>Place my floor equipment now</button>
                <button type="button" className="ls-qb-derive" onClick={() => void answerFloorPrompt(false)}>Skip</button>
              </div>
            </div>
          </div>
        )}
        <p className="generated-layout-caption">Cirrus places equipment on benches within its assigned zone, keeping the requested working space free. The optimizer can refine this starting arrangement. Every bench's working aisle, the aisles between rows and the cross-aisles form one connected walking area.</p>
      </section>
    </>
  );
}

// Reports generated before workflow zones existed.
function LegacyLayoutPlan({ generated, layout }: { generated: GeneratedLayout; layout: SandboxLayout }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = layout.fixtures.find((fixture) => fixture.instanceId === hoveredId);
  const decisionReport = generated.decisionReport as LegacyDecisionReport | undefined;
  return (
    <>
      <div className="sec-head">Generated lab plan<div className="sec-line" /></div>
      <section className="generated-layout-card">
        <div className="generated-layout-heading">
          <div>
            <div className="generated-layout-title">{layout.name}</div>
            <div className="generated-layout-meta">
              {layout.room.widthFt} × {layout.room.heightFt} ft · {layout.fixtures.length} bench positions · Draft revision {generated.revision ?? 1}
            </div>
          </div>
          {/* Passes the layout via router state, not a `?layoutId=` query
              string — the sandbox never read search params (see its
              state.loadLayout mount effect). */}
          <button className="btn-teal" onClick={() => navigate('/layout-sandbox', { state: { loadLayout: generated.data } })}>Open in sandbox</button>
        </div>
        <LayoutFloorPlan layout={layout} hoveredId={hoveredId} onHoverChange={setHoveredId} />
        <div className={`generated-layout-hover-card ${hovered ? 'visible' : ''}`} aria-live="polite">
          {hovered ? <><strong>{hovered.name}</strong><span>{hovered.widthFt} × {hovered.depthFt} ft</span></> : <span>Hover or focus a bench to inspect it.</span>}
        </div>
        {(generated.warnings?.length ?? 0) > 0 && <div className="generated-layout-warnings"><strong>Draft notes</strong>{generated.warnings!.map((warning) => <div key={warning}>{warning}</div>)}</div>}
        <p className="generated-layout-caption">This draft was generated before workflow zones and aisles existed. Generate the report again to get zones you can edit.</p>
        {decisionReport?.topologyProduced && <LegacyDecisionReportSection report={decisionReport} />}
      </section>
    </>
  );
}

function LegacyDecisionReportSection({ report }: { report: LegacyDecisionReport }) {
  const { topologyProduced, structuralChecksPassed, adjustments, notYetImplemented } = report;
  return (
    <div className="generated-layout-decision">
      {adjustments?.length > 0 && (
        <div className="decision-adjustments">
          <h4>What we changed to make this buildable</h4>
          <ul>{adjustments.map((adjustment) => <li key={adjustment}>{adjustment}</li>)}</ul>
        </div>
      )}
      <div>
        <h4>Topology produced</h4>
        <ul>
          <li>{topologyProduced.wallBenchPositions} perimeter (wall) bench position{topologyProduced.wallBenchPositions === 1 ? '' : 's'}</li>
          <li>{topologyProduced.doubleIslandPairs} double-sided island pair{topologyProduced.doubleIslandPairs === 1 ? '' : 's'}</li>
          <li>{topologyProduced.singleIslandBenchPositions} single-sided island position{topologyProduced.singleIslandBenchPositions === 1 ? '' : 's'}</li>
          <li>{topologyProduced.totalBenchPositions} total bench positions</li>
        </ul>
      </div>
      <div>
        <h4>Structural checks passed</h4>
        <ul>{structuralChecksPassed.map((check) => <li key={check}>{check}</li>)}</ul>
      </div>
      <div className="decision-notyet">
        <h4>Not yet implemented (not evaluated for this draft)</h4>
        <ul>{notYetImplemented.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  );
}

