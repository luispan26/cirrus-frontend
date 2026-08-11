import { DonutChart } from './DonutChart';
import { GeneratedLayoutPlan } from './GeneratedLayoutPlan';

function cap(s: string): string {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}
function fmt(n: number | undefined): string {
  return n ? '$' + Number(n).toLocaleString() : '—';
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

export function ReportView({ data }: { data: Record<string, any> }) {
  const essential = asArray(data.essential_equipment);
  const staff = asArray(data.staff);
  const recommended = asArray(data.recommended_equipment);
  const consumables = asArray(data.consumables_monthly);
  const protocols = asArray(data.protocols_json);
  const breakdown = asObject(data.budget_breakdown);
  const revenue = asObject(data.revenue_projections);
  const tips = asArray<string>(data.cost_saving_tips);

  const pieData = Object.entries(breakdown)
    .filter(([, v]) => v && (v as any).amount > 0)
    .map(([k, v]) => ({ name: cap(k), value: (v as any).amount as number }));

  return (
    <div className="rep-content">
      <div className="stat-grid">
        <div className="stat"><div className="stat-val" style={{ color: '#049295' }}>{fmt(data.total_budget)}</div><div className="stat-lbl">Total budget</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#FF3FA4' }}>{fmt(data.total_equipment_cost)}</div><div className="stat-lbl">Equipment cost</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#049295' }}>{data.total_monthly_consumables ? fmt(data.total_monthly_consumables) + '/mo' : '—'}</div><div className="stat-lbl">Monthly consumables</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#FF3FA4' }}>{data.estimated_roi_months ? data.estimated_roi_months + ' months' : '—'}</div><div className="stat-lbl">Est. ROI</div></div>
      </div>

      {pieData.length > 0 && (
        <>
          <div className="sec-head">Budget breakdown<div className="sec-line" /></div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--br)', boxShadow: 'var(--shadow-sm)', marginBottom: 4 }}>
            <div className="pie-wrap">
              <div><DonutChart data={pieData} /></div>
              <div className="pie-legend">
                {pieData.map((e, i) => (
                  <div className="legend-row" key={e.name}>
                    <div className="legend-dot" style={{ background: ['#00D5D5', '#FF3FA4', '#8C7CFF', '#049295', '#FF8FCB', '#5EC9E8'][i % 6] }} />
                    <span className="legend-name">{e.name}</span>
                    <span className="legend-val">{fmt(e.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {essential.length > 0 && (
        <>
          <div className="sec-head">Essential equipment<div className="sec-line" /></div>
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
            <table className="rep-table">
              <thead><tr><th>Equipment</th><th>Vendor</th><th>Protocols</th><th>Qty</th><th>Est. cost</th><th>Priority</th></tr></thead>
              <tbody>
                {essential.map((e, i) => (
                  <tr className={i % 2 === 1 ? 'odd' : ''} key={e.name + i}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td style={{ color: '#69707F' }}>{e.vendor || '—'}</td>
                    <td style={{ fontSize: 11, color: '#69707F', maxWidth: 150 }}>{(e.supports_protocols || []).join(', ') || e.purpose || '—'}</td>
                    <td>{e.quantity_needed || e.quantity || 1}</td>
                    <td style={{ fontWeight: 600, color: '#049295' }}>{fmt(e.estimated_cost_usd || e.estimated_cost)}</td>
                    <td><span className="badge-e">Essential</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {protocols.length > 0 && (
        <>
          <div className="sec-head">Protocol package<div className="sec-line" /></div>
          {protocols.map((p, i) => (
            <div className="proto-card" key={(p.id || p.name) + i}>
              <div className="proto-name">{p.name || p.id}</div>
              <div className="proto-meta">
                <span className="proto-badge" style={{ background: '#E6FBFB', color: '#049295' }}>{p.bsl_requirements || '—'}</span>
                <span className="proto-badge" style={{ background: '#FFEAF5', color: '#C41678' }}>{p.estimated_time_hours || '?'} hrs</span>
              </div>
              <div className="proto-tags">
                {(p.required_equipment || []).map((e: any) => <span className="proto-tag" key={e.name}>{e.name}</span>)}
              </div>
            </div>
          ))}
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

      {consumables.length > 0 && (
        <>
          <div className="sec-head">Monthly consumables<div className="sec-line" /></div>
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
            <table className="rep-table">
              <thead><tr><th>Item</th><th>Monthly cost</th></tr></thead>
              <tbody>
                {consumables.map((c, i) => (
                  <tr className={i % 2 === 1 ? 'odd' : ''} key={c.name + i}>
                    <td>{c.name}</td>
                    <td style={{ fontWeight: 600, color: '#049295' }}>{fmt(c.estimated_monthly_cost)}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    <td style={{ color: v > data.total_budget ? '#16a34a' : '#69707F' }}>
                      {v && data.total_budget ? ((v / data.total_budget) * 100).toFixed(0) + '% of budget' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tips.length > 0 && (
        <>
          <div className="sec-head">Cost saving tips<div className="sec-line" /></div>
          <div className="tip-box">
            {tips.map((t, i) => <div className="tip" key={i}>{t}</div>)}
          </div>
        </>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
