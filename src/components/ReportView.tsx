import type { CSSProperties } from 'react';
import { DonutChart } from './DonutChart';
import { GeneratedLayoutPlan } from './GeneratedLayoutPlan';
import { BASIC_EQUIPMENT_CATEGORIES } from '../lib/questions';

function cap(s: string): string {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}
// typeof-checked, not just truthy — a genuinely-confirmed $0 cost (e.g.
// donated equipment, see bom-generator.ts's EquipmentCostLookupEntry
// comment) is real data and should render as "$0", not fall through to the
// "no value" dash a falsy check would give it.
function fmt(n: number | undefined): string {
  return typeof n === 'number' ? '$' + n.toLocaleString() : '—';
}
function asArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function asObject(v: unknown): Record<string, any> {
  return v && typeof v === 'object' ? (v as Record<string, any>) : {};
}
const ROLE_LABELS: Record<string, string> = {
  PI: 'PI / Lead scientist',
  lab_manager: 'Lab manager',
  technician: 'Technician',
  student_intern: 'Student / intern',
};

// Each BOM category (see BomSection below) renders its OWN <table> — with
// the browser's default auto table-layout, every table sizes its columns
// independently from its own content, so a section whose equipment names
// (or cross-reference pills) run longer or shorter than another section's
// drifts out of column alignment with it. A shared colgroup + fixed layout
// forces identical column widths across every section regardless of that
// section's own content, so columns line up section to section.
function bomTable(rows: any[], style?: CSSProperties, headerColor?: string) {
  const headerStyle: CSSProperties | undefined = headerColor
    ? { background: headerColor, color: '#fff', borderBottom: '1px solid rgba(255,255,255,.25)' }
    : undefined;
  return (
    <table className="rep-table" style={{ tableLayout: 'fixed', ...style }}>
      <colgroup>
        <col style={{ width: '46%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '20%' }} />
      </colgroup>
      <thead><tr><th style={headerStyle}>Equipment Specification</th><th style={headerStyle}>Quantity</th><th style={headerStyle}>Cost per Unit</th><th style={headerStyle}>Total Cost</th></tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr className={i % 2 === 1 ? 'odd' : ''} key={(row.equipmentId || row.equipmentSpecification) + i}>
            <td style={{ fontWeight: 600, overflowWrap: 'break-word' }}>{row.equipmentSpecification}</td>
            <td>{row.quantity}</td>
            <td style={{ color: '#69707F' }}>{row.costPerUnit === 'TBD' || row.costPerUnit === 'N/A' ? row.costPerUnit : fmt(row.costPerUnit)}</td>
            <td style={{ fontWeight: 600, color: row.totalCost === 'N/A' ? '#69707F' : '#049295' }}>
              {row.totalCost === 'TBD' || row.totalCost === 'N/A' ? row.totalCost : fmt(row.totalCost)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Same color-coded-by-source grouping as Q5's finalization step
// (BASIC_EQUIPMENT_CATEGORIES in lib/questions.ts) — each row carries the
// list(s) it was drawn from (see bom-generator.ts's BomRow.sources), grouped
// here by its primary (first-contributing) source with cross-reference pills
// for any others, same as QuestionsPage.tsx's BasicLabEquipmentBody. Reports
// generated before this field existed have no sources on any row, so this
// falls back to one flat table rather than a single "uncategorized" bucket.
function BomSection({ bom }: { bom: any[] }) {
  const hasSources = bom.some((row) => Array.isArray(row.sources) && row.sources.length > 0);
  if (!hasSources) {
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
        {bomTable(bom)}
      </div>
    );
  }

  const categoryByKey = new Map(BASIC_EQUIPMENT_CATEGORIES.map((c) => [c.key, c]));
  const rowsByCategory = new Map<string, any[]>();
  for (const row of bom) {
    const key = (Array.isArray(row.sources) && row.sources[0]) || 'general';
    const bucket = rowsByCategory.get(key);
    if (bucket) bucket.push(row);
    else rowsByCategory.set(key, [row]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 4 }}>
      {BASIC_EQUIPMENT_CATEGORIES.map((category) => {
        const rows = rowsByCategory.get(category.key);
        if (!rows || rows.length === 0) return null;
        const decoratedRows = rows.map((row) => ({
          ...row,
          equipmentSpecification: (
            <>
              {row.equipmentSpecification}
              {(row.sources as string[]).filter((s) => s !== category.key).map((sourceKey) => {
                const meta = categoryByKey.get(sourceKey);
                if (!meta) return null;
                return (
                  <span
                    key={sourceKey}
                    title={`Also required by ${meta.label}`}
                    style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: meta.color, border: `1px solid ${meta.color}`, borderRadius: 10, padding: '1px 7px' }}
                  >
                    + {meta.label}
                  </span>
                );
              })}
            </>
          ),
        }));
        return (
          <div key={category.key} style={{ borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, padding: '8px 12px', background: '#fff' }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.03em', color: category.color, textTransform: 'uppercase' }}>
                {category.label}
              </span>
              <span style={{ fontSize: 11, color: category.color, opacity: 0.7 }}>({rows.length})</span>
            </div>
            {bomTable(decoratedRows, { borderTopLeftRadius: 0, borderTopRightRadius: 0, boxShadow: 'none', marginBottom: 0 }, category.color)}
          </div>
        );
      })}
    </div>
  );
}

// Cost per BOM category (same grouping BomSection uses — see its own
// comment) instead of the old budget_breakdown allocation (equipment/
// construction/staffing/consumables/contingency). Only rows with a real
// numeric totalCost contribute — TBD (unconfirmed cost) and N/A (already
// owned) rows have nothing to attribute, same "exclude it" rule
// bom-generator.ts's own totalCost sum already follows.
function computeCostByCategory(bom: any[]): { name: string; value: number; color: string }[] {
  const categoryByKey = new Map(BASIC_EQUIPMENT_CATEGORIES.map((c) => [c.key, c]));
  const costByCategory = new Map<string, number>();
  for (const row of bom) {
    if (typeof row.totalCost !== 'number') continue;
    const key = (Array.isArray(row.sources) && row.sources[0]) || 'general';
    costByCategory.set(key, (costByCategory.get(key) ?? 0) + row.totalCost);
  }
  return Array.from(costByCategory.entries())
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const meta = categoryByKey.get(key);
      return { name: meta?.label ?? cap(key), value, color: meta?.color ?? '#00D5D5' };
    });
}

export function ReportView({ data }: { data: Record<string, any> }) {
  const bom = asArray(data.bom);
  const staff = asArray(data.staff);
  const recommended = asArray(data.recommended_equipment);
  const revenue = asObject(data.revenue_projections);
  const selectedProtocols = asArray(data.selected_protocols);

  const pieData = computeCostByCategory(bom);

  return (
    <div className="rep-content">
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat"><div className="stat-val" style={{ color: '#049295' }}>{fmt(data.total_budget)}</div><div className="stat-lbl">Total budget</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#FF3FA4' }}>{fmt(data.total_equipment_cost)}</div><div className="stat-lbl">Equipment cost</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#049295' }}>—</div><div className="stat-lbl">Monthly consumables</div></div>
      </div>

      {pieData.length > 0 && (
        <>
          <div className="sec-head">Equipment cost breakdown<div className="sec-line" /></div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--br)', boxShadow: 'var(--shadow-sm)', marginBottom: 4 }}>
            <div className="pie-wrap">
              <div><DonutChart data={pieData} /></div>
              <div className="pie-legend">
                {pieData.map((e) => (
                  <div className="legend-row" key={e.name}>
                    <div className="legend-dot" style={{ background: e.color }} />
                    <span className="legend-name">{e.name}</span>
                    <span className="legend-val">{fmt(e.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {bom.length > 0 && (
        <>
          <div className="sec-head">Bill of materials<div className="sec-line" /></div>
          <BomSection bom={bom} />
        </>
      )}

      {recommended.length > 0 && (
        <>
          <div className="sec-head">Recommended equipment<div className="sec-line" /></div>
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
            <table className="rep-table">
              <thead><tr><th>Equipment</th><th>Vendor</th><th>Purpose</th><th>Qty</th><th>Est. cost</th></tr></thead>
              <tbody>
                {recommended.map((e, i) => (
                  <tr className={i % 2 === 1 ? 'odd' : ''} key={e.name + i}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td style={{ color: '#69707F' }}>{e.vendor || '—'}</td>
                    <td style={{ color: '#69707F' }}>{e.purpose || '—'}</td>
                    <td>{e.quantity || 1}</td>
                    <td style={{ fontWeight: 600, color: '#FF3FA4' }}>{fmt(e.estimated_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedProtocols.length > 0 && (
        <>
          <div className="sec-head">Protocols<div className="sec-line" /></div>
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
            <table className="rep-table">
              <thead><tr><th>Protocol</th><th>Weekly runs</th><th></th></tr></thead>
              <tbody>
                {selectedProtocols.map((p: any, i: number) => (
                  <tr className={i % 2 === 1 ? 'odd' : ''} key={p.protocolId + i}>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td>{p.runsPerWeek}</td>
                    <td>
                      <a href={p.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#049295', fontWeight: 600 }}>
                        View on protocols.io →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <GeneratedLayoutPlan value={data.generated_layout} />

      {staff.length > 0 && (
        <>
          <div className="sec-head">Staffing &amp; wages<div className="sec-line" /></div>
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
            <table className="rep-table">
              <thead><tr><th>Role</th><th>Headcount</th><th>Est. annual wage</th><th>Annual cost</th></tr></thead>
              <tbody>
                {staff.map((s, i) => (
                  <tr className={i % 2 === 1 ? 'odd' : ''} key={s.role + i}>
                    <td style={{ fontWeight: 600 }}>{ROLE_LABELS[s.role] || cap(s.role)}</td>
                    <td>{s.count}</td>
                    <td style={{ color: '#69707F' }}>{fmt(s.annual_wage_usd)}/yr</td>
                    <td style={{ fontWeight: 600, color: '#049295' }}>{fmt(s.annual_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data.total_annual_staff_cost || data.total_monthly_staff_cost) && (
            <p style={{ fontSize: 12, color: 'var(--mid)', margin: '8px 0 4px' }}>
              Total wage bill: <strong style={{ color: 'var(--dark)' }}>{fmt(data.total_annual_staff_cost)}/yr</strong>
              {' '}({fmt(data.total_monthly_staff_cost)}/mo) — auto-estimated from headcount and role, not user-entered.
            </p>
          )}
        </>
      )}

      {(revenue.year_1 || revenue.year_2 || revenue.year_3) && (
        <>
          <div className="sec-head">Revenue projections<div className="sec-line" /></div>
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
            <table className="rep-table">
              <thead><tr><th>Period</th><th>Projected revenue</th><th>vs investment</th></tr></thead>
              <tbody>
                {([['Year 1', revenue.year_1], ['Year 2', revenue.year_2], ['Year 3', revenue.year_3]] as [string, number][]).map(([yr, v], i) => (
                  <tr className={i % 2 === 1 ? 'odd' : ''} key={yr}>
                    <td>{yr}</td>
                    <td style={{ fontWeight: 700, color: '#049295' }}>{fmt(v)}</td>
                    <td style={{ color: v > data.total_budget ? '#049295' : '#69707F' }}>
                      {v && data.total_budget ? ((v / data.total_budget) * 100).toFixed(0) + '% of budget' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
