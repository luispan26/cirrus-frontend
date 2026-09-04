import type { ReactElement } from 'react';

export interface DonutDatum {
  name: string;
  value: number;
  // Falls back to PALETTE-by-index when omitted (the original behavior) —
  // set this when the caller already has a meaningful per-category color
  // (e.g. the report's BOM-category cost breakdown reusing the same colors
  // BomSection/Q5 use for those categories elsewhere in the app) so the
  // wedge and its legend swatch (rendered by the caller, not this
  // component) actually match.
  color?: string;
}

const PALETTE = ['#00D5D5', '#FF3FA4', '#8C7CFF', '#049295', '#FF8FCB', '#5EC9E8'];

export function DonutChart({ data, size = 200 }: { data: DonutDatum[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const ir = size * 0.26;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  let angle = -Math.PI / 2;
  const paths: ReactElement[] = [];

  data.forEach((d, i) => {
    const pct = d.value / total;
    const a = pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + a), y2 = cy + r * Math.sin(angle + a);
    const x3 = cx + ir * Math.cos(angle + a), y3 = cy + ir * Math.sin(angle + a);
    const x4 = cx + ir * Math.cos(angle), y4 = cy + ir * Math.sin(angle);
    const lg = a > Math.PI ? 1 : 0;
    const color = d.color ?? PALETTE[i % PALETTE.length];
    paths.push(
      <path
        key={d.name}
        d={`M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${ir},${ir} 0 ${lg},0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`}
        fill={color}
        stroke="white"
        strokeWidth={2}
      />,
    );
    if (pct > 0.06) {
      const mx = cx + (r * 0.68 + ir * 0.32) * Math.cos(angle + a / 2);
      const my = cy + (r * 0.68 + ir * 0.32) * Math.sin(angle + a / 2);
      paths.push(
        <text
          key={d.name + '-label'}
          x={mx.toFixed(1)}
          y={my.toFixed(1)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={11}
          fontWeight={700}
        >
          {Math.round(pct * 100)}%
        </text>,
      );
    }
    angle += a;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </svg>
  );
}
