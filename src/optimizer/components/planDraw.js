// Drawing helpers shared with Cirrus's report floor plan
// (cirrus-frontend src/lib/lab-plan.ts), so both draw a plan the same way.

// Cirrus's fixed workflow-zone colors (the Cirrus palette; General, the
// shared hub, neutral grey); other zones cycle through the rest. Microbial:
// plans made before Cirrus split it into Bacterial and Yeast.
const ZONE_COLORS = { bacterial: "#049295", yeast: "#8C7CFF", mammalian: "#FF3FA4", general: "#69707F", microbial: "#049295" };
const EXTRA_ZONE_COLORS = ["#00D5D5", "#C41678", "#FF5CB8"];
export function zoneColor(zoneId, zoneIds) {
  if (ZONE_COLORS[zoneId]) return ZONE_COLORS[zoneId];
  const extras = zoneIds.filter(id => !ZONE_COLORS[id]);
  return EXTRA_ZONE_COLORS[Math.max(0, extras.indexOf(zoneId)) % EXTRA_ZONE_COLORS.length];
}

// SVG path along the outer edges of a set of cells, in feet.
export function cellOutlinePath(cells, cellFt) {
  const set = new Set(cells.map(([r, c]) => `${r},${c}`)), parts = [];
  for (const [r, c] of cells) {
    const x = c * cellFt, y = r * cellFt, x2 = x + cellFt, y2 = y + cellFt;
    if (!set.has(`${r - 1},${c}`)) parts.push(`M${x} ${y}H${x2}`);
    if (!set.has(`${r + 1},${c}`)) parts.push(`M${x} ${y2}H${x2}`);
    if (!set.has(`${r},${c - 1}`)) parts.push(`M${x} ${y}V${y2}`);
    if (!set.has(`${r},${c + 1}`)) parts.push(`M${x2} ${y}V${y2}`);
  }
  return parts.join("");
}

// Cells merged into horizontal runs, one rectangle per run.
export function cellRuns(cells) {
  const byRow = new Map();
  for (const [r, c] of cells) (byRow.get(r) ?? byRow.set(r, []).get(r)).push(c);
  const runs = [];
  for (const [row, columns] of byRow) {
    columns.sort((a, b) => a - b);
    let start = columns[0], prev = columns[0];
    for (let i = 1; i <= columns.length; i++) {
      const c = columns[i];
      if (c === prev + 1) { prev = c; continue; }
      runs.push({ row, column: start, height: 1, width: prev - start + 1 });
      start = c; prev = c;
    }
  }
  return runs;
}

// Protocol colors: the validated reference categorical order (dataviz
// palette, light mode), assigned by baseline weighted walking so a
// protocol keeps its color everywhere. Past seven protocols the rest fold
// into a neutral "Other".
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"];
export const OTHER = "#8a8984";
export function runColors(perProtocol) {
  const order = [...perProtocol].sort((a, b) => b.weightedTravelFt - a.weightedTravelFt || a.id.localeCompare(b.id));
  return new Map(order.map((p, i) => [p.id, i < SERIES.length ? SERIES[i] : OTHER]));
}
