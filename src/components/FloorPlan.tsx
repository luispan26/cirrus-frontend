import { Fragment, useMemo, useState } from 'react';
import { KB, ZONE_COLORS, computeFloorPlan, suggestExpansion, type FloorPlanResult, type FloorPlanRow } from '../lib/kb';

function cap(s: string): string {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}
function fmt(n: number | undefined): string {
  return n ? '$' + Number(n).toLocaleString() : '—';
}

export function FloorPlan({ reportData }: { reportData: Record<string, unknown> }) {
  const initialWidth = useMemo(() => {
    const sp = (reportData.space as Record<string, unknown>) || {};
    const w = parseFloat(String(sp.width_ft ?? '')) || (sp.sqft ? Math.round(Math.sqrt((sp.sqft as number) * (4 / 3))) : null) || 40;
    return w;
  }, [reportData]);
  const initialHeight = useMemo(() => {
    const sp = (reportData.space as Record<string, unknown>) || {};
    const h = parseFloat(String(sp.height_ft ?? '')) || (sp.sqft ? Math.round((sp.sqft as number) / initialWidth) : null) || 30;
    return h;
  }, [reportData, initialWidth]);

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [previewOpId, setPreviewOpId] = useState<string | null>(null);
  const [fp, setFp] = useState<FloorPlanResult>(() => computeFloorPlan(reportData, initialWidth, initialHeight));
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  function recompute(w: number, h: number, extraOpIds?: string[]) {
    setFp(computeFloorPlan(reportData, w, h, extraOpIds));
  }

  function regenerate() {
    setPreviewOpId(null);
    recompute(width, height);
    setSelectedCell(null);
  }
  function previewAdd(opId: string) {
    setPreviewOpId(opId);
    recompute(width, height, [opId]);
  }
  function previewReset() {
    setPreviewOpId(null);
    recompute(width, height);
  }

  function findCell(posLabel: string) {
    for (const row of fp.grid) {
      const c = row.cells.find((c) => c.posLabel === posLabel);
      if (c) return c;
    }
    return null;
  }

  function handleDrop(targetPos: string, srcPos: string) {
    if (!srcPos || srcPos === targetPos) return;
    const src = findCell(srcPos);
    const tgt = findCell(targetPos);
    if (!src || !tgt) return;
    const newGrid: FloorPlanRow[] = fp.grid.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.posLabel === srcPos) return { ...c, stationId: tgt.stationId, zone: tgt.zone, name: tgt.name };
        if (c.posLabel === targetPos) return { ...c, stationId: src.stationId, zone: src.zone, name: src.name };
        return c;
      }),
    }));
    setFp({ ...fp, grid: newGrid });
  }

  const pct = Math.min(100, Math.round((fp.neededTotal / fp.capacityPositions) * 100));
  const suggestion = !previewOpId && pct < 80 ? suggestExpansion(fp) : null;
  const previewOp = previewOpId ? KB.operations.find((o) => o.id === previewOpId) : null;

  const selected = selectedCell ? findCell(selectedCell) : null;
  const essential = Array.isArray(reportData.essential_equipment) ? (reportData.essential_equipment as any[]) : [];
  const recommended = Array.isArray(reportData.recommended_equipment) ? (reportData.recommended_equipment as any[]) : [];
  const supportedOps =
    selected?.stationId ? (KB.station_to_protocol_map[selected.stationId] || []).filter((id) => fp.opIds.includes(id)) : [];
  let equip: { name: string }[] = [];
  let equipSource = 'From your report';
  if (selected?.stationId) {
    equip = essential
      .concat(recommended)
      .filter((e) => (e.supports_protocols || []).some((p: string) => supportedOps.includes(p)));
    if (!equip.length) {
      const names = new Set<string>();
      supportedOps.forEach((opId) => {
        const op = KB.operations.find((o) => o.id === opId);
        if (op) op.equipment.forEach((n) => names.add(n));
      });
      equip = [...names].map((n) => ({ name: n }));
      equipSource = 'Typical equipment (knowledge base)';
    }
  }

  return (
    <>
      <div className="sec-head">
        Lab floor plan
        <div className="sec-line" />
      </div>
      <div className="fp-panel">
        <div className="fp-controls">
          <label className="field-label" style={{ margin: 0 }}>Width</label>
          <input type="number" className="field-input" style={{ width: 80 }} value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || width)} />
          <span className="field-unit">ft</span>
          <label className="field-label" style={{ margin: '0 0 0 10px' }}>Height</label>
          <input type="number" className="field-input" style={{ width: 80 }} value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || height)} />
          <span className="field-unit">ft</span>
          <button className="btn-out" onClick={regenerate}>Regenerate</button>
          {fp.overCapacity && (
            <span style={{ color: '#D1316B', fontSize: 12 }}>
              ⚠ Needs ~{fp.neededTotal} positions, space fits ~{fp.capacityPositions}
            </span>
          )}
        </div>

        <div className="fp-util">
          <div className="fp-util-bar">
            <div className="fp-util-fill" style={{ width: `${pct}%`, background: pct < 80 ? '#4FB3AC' : '#D1316B' }} />
          </div>
          <span className="fp-util-label">
            Using ~{pct}% of available space ({fp.neededTotal}/{fp.capacityPositions} positions)
          </span>
        </div>

        {previewOp && (
          <div className="fp-suggest fp-suggest-active">
            <div>
              Previewing <b>{previewOp.name}</b> added to the floor plan — this is a floor-plan-only preview, it does not
              regenerate your BOM, protocols, or financials.
            </div>
            <button className="btn-out" onClick={previewReset}>Reset preview</button>
          </div>
        )}
        {suggestion && (
          <div className="fp-suggest">
            <div>
              Your lab currently uses about <b>{pct}%</b> of the available space. You have room to expand — adding{' '}
              <b>{suggestion.op.name}</b> would use about {suggestion.extraSize || '0 additional'} position
              {suggestion.extraSize === 1 ? '' : 's'} and increase estimated equipment cost by approximately{' '}
              <b>{fmt(suggestion.op.approx_cost_usd)}</b>.
            </div>
            <button className="btn-teal" style={{ padding: '8px 18px', fontSize: 12, borderRadius: 8 }} onClick={() => previewAdd(suggestion.op.id)}>
              Preview in floor plan
            </button>
          </div>
        )}

        <div className="fp-legend">
          <span><i style={{ background: '#4FB3AC' }} />Wet lab</span>
          <span><i style={{ background: '#221F2E' }} />Dry lab</span>
          <span><i style={{ background: '#D1316B' }} />Automation</span>
          <span><i style={{ background: '#E3E0E6' }} />Unassigned</span>
        </div>

        <div className="fp-grid">
          {fp.grid.map((row, i) => (
            <Fragment key={row.label}>
              <div className="fp-rowcol">
                <div className="fp-rowlabel">{row.label}</div>
                {row.cells.map((c) => (
                  <div
                    key={c.posLabel}
                    className="fp-cell"
                    title={`${c.posLabel}${c.name ? ' — ' + c.name : ''}`}
                    draggable
                    style={{ background: c.stationId ? ZONE_COLORS[c.zone] || '#E3E0E6' : '#E3E0E6', color: c.stationId ? 'white' : '#5B5770' }}
                    onClick={() => setSelectedCell(c.posLabel)}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.posLabel)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(c.posLabel, e.dataTransfer.getData('text/plain'))}
                  >
                    {c.posLabel}
                  </div>
                ))}
              </div>
              {i % 2 === 0 && i < fp.grid.length - 1 && (
                <div className="fp-corridor">
                  <span>walkway</span>
                </div>
              )}
            </Fragment>
          ))}
        </div>

        <div className="fp-info">
          {!selected || !selected.stationId ? (
            <span className="fp-info-empty">
              {selected ? `${selected.posLabel} — unassigned position` : fp.stationBlocks.length
                ? 'Click a position to see its station, supported operations, and equipment. Drag one position onto another to reassign.'
                : 'No operations were selected during intake, so no stations were auto-placed. Adjust width/height and regenerate.'}
            </span>
          ) : (
            <div className="fp-info-card">
              <div className="fp-info-title">{selected.posLabel} — {selected.name || selected.stationId}</div>
              <div className="fp-info-row"><b>Zone:</b> {cap(selected.zone)}</div>
              <div className="fp-info-row"><b>Supports:</b> {supportedOps.length ? supportedOps.map(cap).join(', ') : 'General support'}</div>
              <div className="fp-info-row"><b>{equipSource}:</b></div>
              <div className="proto-tags">
                {equip.length ? equip.map((e) => <span className="proto-tag" key={e.name}>{e.name}</span>) : <span style={{ color: '#5B5770', fontSize: 11 }}>None found</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
