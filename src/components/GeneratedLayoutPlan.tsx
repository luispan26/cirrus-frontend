import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { BENCH_SURFACE_AREA_SQFT, parseSandboxLayout, type SandboxLayout } from '../lib/layout-sandbox';
import { readLabPlan, WALL_LABELS, zoneColor, type LabPlan, type PlanOptions, type PlanWall } from '../lib/lab-plan';
import { UPDATE_REPORT_LAYOUT_MUTATION } from '../graphql/operations';
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
export function GeneratedLayoutPlan({ value, reportId, onUpdated }: { value: unknown; reportId?: string | null; onUpdated?: (generated: GeneratedLayout, reportData?: Record<string, unknown>) => void }) {
  const generated = value && typeof value === 'object' ? value as GeneratedLayout : null;
  const layout = parseSandboxLayout(generated?.data);
  const plan = readLabPlan(generated?.data);
  if (!generated || !layout) return null;
  if (!plan) return <LegacyLayoutPlan generated={generated} layout={layout} />;
  return <ZonedLayoutPlan generated={generated} layout={layout} plan={plan} reportId={reportId ?? null} onUpdated={onUpdated} />;
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

function ZonedLayoutPlan({ generated, layout, plan, reportId, onUpdated }: { generated: GeneratedLayout; layout: SandboxLayout; plan: LabPlan; reportId: string | null; onUpdated?: (generated: GeneratedLayout, reportData?: Record<string, unknown>) => void }) {
  const navigate = useNavigate();
  // Unplaced units with no zone are floor-standing equipment (placed by hand
  // in the sandbox); placements with no bench are the ones already placed.
  const benchUnplaced = (plan.initialEquipment?.unplaced ?? []).filter((u) => u.zoneId !== null);
  const floorUnplaced = (plan.initialEquipment?.unplaced ?? []).filter((u) => u.zoneId === null);
  const floorPlaced = (equipmentId: string) => (plan.initialEquipment?.placements ?? []).filter((p) => p.benchId === null && p.equipmentId === equipmentId).length;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zones, setZones] = useState<EditableZone[]>(() => zonesFromPlan(plan));
  const [activeZoneId, setActiveZoneId] = useState<string>(() => plan.zones[0]?.id ?? '');
  const [settings, setSettings] = useState<SettingsDraft>(() => settingsFromPlan(plan));
  const [error, setError] = useState<string | null>(null);
  const [updateReportLayout, { loading: saving }] = useMutation<{ updateReportLayout: { id: string; data: Record<string, unknown> } }>(UPDATE_REPORT_LAYOUT_MUTATION);

  // A new plan (after a re-run, or a different report) resets every draft.
  useEffect(() => {
    setZones(zonesFromPlan(plan));
    setSettings(settingsFromPlan(plan));
    setActiveZoneId((current) => (plan.zones.some((z) => z.id === current) ? current : plan.zones[0]?.id ?? ''));
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

  // Click: that bench and the one facing it across its aisle (its zone
  // unit) join the selected zone — never its whole island.
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
            options: settingsChanged ? { ...settings, mainWall: settings.mode === 'main_wall' ? settings.mainWall : null } : undefined,
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

  const hovered = hoveredId ? benchByFixture.get(hoveredId) : undefined;
  const hoveredZone = hovered ? zones.find((z) => z.id === zoneOfBench.get(hovered.id)) : undefined;
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
              hoveredId={hoveredId}
              onHoverChange={setHoveredId}
              zoneOfBench={draftZoneOf}
              onFixtureClick={reportId ? moveBench : undefined}
            />
            <div className="generated-layout-legend">
              <span><i style={{ background: 'rgba(52,98,201,.35)' }} />Aisles (where technicians walk)</span>
              <span><i style={{ background: 'rgba(214,79,79,.3)' }} />Door clearance</span>
              <span><i style={{ background: '#fbfbfa' }} />Unused floor</span>
            </div>
            <div className={`generated-layout-hover-card ${hovered ? 'visible' : ''}`} aria-live="polite">
              {hovered ? (
                <>
                  <strong>{hoveredZone?.name ?? 'Unzoned'} zone</strong>
                  <span>{hovered.kind === 'wall' ? 'Wall bench' : 'Island bench'} · 6 × 2.5 ft · worked from the {WALL_LABELS[hovered.facing].split(' ')[0].toLowerCase()} side</span>
                </>
              ) : <span>{reportId ? 'Pick a zone on the right, then click benches one at a time to move them into that zone. Press "Save layout changes" to save.' : 'Hover a bench to see its zone.'}</span>}
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
                <div key={zone.id} className={`plan-zone ${active ? 'active' : ''}`} onClick={() => setActiveZoneId(zone.id)}>
                  <div className="plan-zone-head">
                    <i style={{ background: zoneColor(zone.id, zoneIds) }} />
                    <button className="plan-zone-select" type="button" aria-pressed={active} onClick={() => setActiveZoneId(zone.id)}>{zone.name}</button>
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
                  <label className="plan-radio"><input type="radio" checked={settings.mode === 'max_fit'} onChange={() => setSettings({ ...settings, mode: 'max_fit' })} />Maximum fit</label>
                  {settings.mode === 'max_fit' && (
                    <label className="plan-check"><input type="checkbox" checked={settings.sameDirection} onChange={(e) => setSettings({ ...settings, sameDirection: e.target.checked })} />All islands run the same direction</label>
                  )}
                  <label className="plan-radio"><input type="radio" checked={settings.mode === 'main_wall'} onChange={() => setSettings({ ...settings, mode: 'main_wall', mainWall: settings.mainWall ?? 'S' })} />Main wall</label>
                  {settings.mode === 'main_wall' && (
                    <>
                      <select value={settings.mainWall ?? 'S'} onChange={(e) => setSettings({ ...settings, mainWall: e.target.value as PlanWall })} aria-label="Main wall">
                        {(Object.keys(WALL_LABELS) as PlanWall[]).map((w) => <option key={w} value={w}>{WALL_LABELS[w]}</option>)}
                      </select>
                      <p className="plan-note">Rows of benches run straight out from the wall you pick (for example the wall with your main entrance), so every aisle leads toward it.</p>
                    </>
                  )}
                  <label className="plan-check"><input type="checkbox" checked={settings.wallBenches} onChange={(e) => setSettings({ ...settings, wallBenches: e.target.checked })} />Also line the walls with benches</label>
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
              return <li key={e.equipmentId}>{e.name}{e.placeholderSize ? '' : ` (${e.widthFt} × ${e.depthFt} ft)`}: {placed >= e.quantity ? `placed${e.quantity > 1 ? ` (${e.quantity})` : ''}` : <>{placed} of {e.quantity} placed{reason && placed > 0 ? ` — ${reason}` : ''}</>}</li>;
            })}</ul>
            {plan.floorItems.some((e) => floorPlaced(e.equipmentId) < e.quantity) && (
              <p style={{ margin: '6px 0 0' }}>
                Place these in the layout sandbox (Floor equipment, in its sidebar), use the room in your intake, then generate again.{' '}
                <button type="button" className="btn-out" style={{ padding: '2px 10px', fontSize: 12 }} onClick={() => navigate('/layout-sandbox', { state: { loadLayout: generated.data } })}>Place in sandbox</button>
              </p>
            )}
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
