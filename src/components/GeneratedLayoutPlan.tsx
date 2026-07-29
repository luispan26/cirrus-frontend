import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deriveCirculationSpace, fixtureFootprint, parseSandboxLayout } from '../lib/layout-sandbox';

type DecisionReport = {
  requiredProgram: Array<{ stationId: string; stationName: string; requiredUnits: number; weeklyHoursNeeded: number }>;
  topologyProduced: { wallBenchPositions: number; doubleIslandPairs: number; singleIslandBenchPositions: number; totalBenchPositions: number };
  structuralChecksPassed: string[];
  notYetImplemented: string[];
};

type GeneratedLayout = {
  layoutId?: string;
  revision?: number;
  warnings?: string[];
  decisionReport?: DecisionReport;
  data?: unknown;
};

const STATION_COLORS = ['#4FB3AC', '#D1316B', '#8A7BB0', '#4A7B93', '#C99A4A', '#5E9E72', '#D77B4A', '#6476B8'];

function stationColor(stationId?: string) {
  if (!stationId) return '#A7A2AD';
  let hash = 0;
  for (const character of stationId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return STATION_COLORS[Math.abs(hash) % STATION_COLORS.length];
}

export function GeneratedLayoutPlan({ value }: { value: unknown }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const generated = value && typeof value === 'object' ? value as GeneratedLayout : null;
  const layout = parseSandboxLayout(generated?.data);
  if (!generated || !layout) return null;
  const stations = [...new Map(layout.fixtures.flatMap((fixture) => fixture.stations).map((station) => [station.stationId, station])).values()];
  const hovered = layout.fixtures.find((fixture) => fixture.instanceId === hoveredId);
  const hoveredStation = hovered?.stations[0];
  const hoverEquipment = hovered?.stations.flatMap((station) => station.equipment) ?? [];
  const circulation = deriveCirculationSpace(layout);

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
          {generated.layoutId && <button className="btn-teal" onClick={() => navigate(`/layout-sandbox?layoutId=${encodeURIComponent(generated.layoutId!)}`)}>Open in sandbox</button>}
        </div>
        <svg className="generated-layout-preview" viewBox={`0 0 ${layout.room.widthFt} ${layout.room.heightFt}`} role="img" aria-label="Generated laboratory floor plan">
          <rect className="generated-layout-room" x="0" y="0" width={layout.room.widthFt} height={layout.room.heightFt} />
          {circulation.reachable.map((cell) => <rect key={`circulation-${cell.x}-${cell.y}`} className="generated-layout-route" x={cell.x * circulation.gridFt} y={cell.y * circulation.gridFt} width={circulation.gridFt} height={circulation.gridFt} />)}
          {layout.fixtures.map((fixture) => {
            const size = fixtureFootprint(fixture, layout.room.gridFt);
            const x = fixture.x * layout.room.gridFt;
            const y = fixture.y * layout.room.gridFt;
            const width = size.width * layout.room.gridFt;
            const height = size.height * layout.room.gridFt;
            const station = fixture.stations[0];
            const equipmentNames = fixture.stations.flatMap((assignment) => assignment.equipment.map((item) => item.name));
            const summary = `${station?.name ?? fixture.name}. ${equipmentNames.length ? `Equipment: ${equipmentNames.join(', ')}` : 'No equipment assigned.'}`;
            return <g key={fixture.instanceId} className={hoveredId === fixture.instanceId ? 'is-hovered' : ''} tabIndex={0} role="button" aria-label={summary} onMouseEnter={() => setHoveredId(fixture.instanceId)} onMouseLeave={() => setHoveredId(null)} onFocus={() => setHoveredId(fixture.instanceId)} onBlur={() => setHoveredId(null)}><title>{summary}</title><rect className="generated-layout-fixture" style={{ fill: stationColor(station?.stationId) }} x={x} y={y} width={width} height={height} rx=".2" /></g>;
          })}
          {layout.baseObjects.filter((object) => object.kind === 'door').map((door) => <polygon key={door.id} className="generated-layout-exit" points={door.footprint.points.map((point) => `${point.x},${point.y}`).join(' ')} />)}
        </svg>
        <div className="generated-layout-legend" aria-label="Station colors">{stations.map((station) => <span key={station.stationId}><i style={{ background: stationColor(station.stationId) }} />{station.name}</span>)}</div>
        <div className={`generated-layout-hover-card ${hovered ? 'visible' : ''}`} aria-live="polite">
          {hovered ? <><strong>{hoveredStation?.name ?? hovered.name}</strong><span>{hovered.name} · {hovered.widthFt} × {hovered.depthFt} ft</span>{hoverEquipment.length ? <ul>{hoverEquipment.map((equipment) => <li key={equipment.equipmentId}>{equipment.name}<small>{equipment.widthFt ?? '?'} × {equipment.depthFt ?? '?'} ft</small></li>)}</ul> : <span>No equipment assigned to this bench.</span>}</> : <span>Hover or focus a colored bench to inspect its station and equipment assignments.</span>}
        </div>
        {(generated.warnings?.length ?? 0) > 0 && <div className="generated-layout-warnings"><strong>Draft notes</strong>{generated.warnings!.map((warning) => <div key={warning}>{warning}</div>)}</div>}
        <p className="generated-layout-caption">This draft was generated from the questionnaire and MongoDB catalog. Open it in the sandbox to review clearances, utilities, routes, and make adjustments.</p>
        {generated.decisionReport && <DecisionReportSection report={generated.decisionReport} />}
      </section>
    </>
  );
}

// Reports only what the generator actually computed and actually checked —
// no fabricated pass/fail counts, no claim of having compared topologies
// that were never generated. "Not yet implemented" is listed explicitly
// rather than silently omitted, so it's clear what this draft has NOT
// verified, not just what it has.
function DecisionReportSection({ report }: { report: DecisionReport }) {
  const { requiredProgram, topologyProduced, structuralChecksPassed, notYetImplemented } = report;
  return (
    <div className="generated-layout-decision">
      <div>
        <h4>Required program</h4>
        {requiredProgram.length ? (
          <ul>
            {requiredProgram.map((entry) => (
              <li key={entry.stationId}>
                {entry.requiredUnits} parallel {entry.stationName} position{entry.requiredUnits === 1 ? '' : 's'}
                {entry.weeklyHoursNeeded > 0 ? ` (${entry.weeklyHoursNeeded}h/week demand)` : ''}
              </li>
            ))}
          </ul>
        ) : <ul><li>No station demand computed for this draft.</li></ul>}
      </div>
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
