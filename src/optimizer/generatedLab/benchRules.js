// How equipment uses a bench top — the same rules Cirrus uses for zone
// sizing and its initial placement (cirrus-backend
// src/layout-generation/bench-rules.ts), read from plan.benchRules when the
// export carries them:
//   - one row per bench, items side by side along its length, never in front
//     of or behind each other;
//   - pushed to the back edge, front facing the technician, never rotated;
//   - at least 3" between neighbouring stretches (gaps are not working space);
//   - working space = free bench top; the strip in front of an item only
//     counts when the item is shallower than half the bench depth;
//   - pipettes stand in 3 ft full-depth work areas (all working space), at
//     most two per area;
//   - equipment that can't stand on a bench — deeper than its top, or too
//     big to leave the working-space share even alone — but is no wider
//     than one replaces a whole bench: it takes that bench position (the
//     bench is swapped for it when the lab is built), nothing else goes
//     there, and its extra depth may reach up to benchReplacement.maxOverhangFt
//     into the bench's own working strip.
import { EPS } from "./geometry.js";

export const DEFAULT_BENCH_RULES = {
  benchLengthFt: 6,
  benchDepthFt: 2.5,
  gapFt: 0.25,
  frontStripCountsBelowDepthFt: 1.25,
  benchReplacement: { maxOverhangFt: 1 },
  pipetteArea: {
    lengthFt: 3,
    depthFt: 2.5,
    maxPerArea: 2,
    equipmentIds: [
      "pipette-set",
      "dln-34-fisherbrand-pipette-controller",
      "fisherbrand-pipette-controller",
      "thermoscientific-pipet-filler-s1",
      "thermoscientific-pipet-filler-s1-2",
    ],
  },
};

export function rulesOf(plan) {
  const r = plan.benchRules ?? {};
  return {
    ...DEFAULT_BENCH_RULES, ...r,
    pipetteArea: { ...DEFAULT_BENCH_RULES.pipetteArea, ...(r.pipetteArea ?? {}) },
    benchReplacement: { ...DEFAULT_BENCH_RULES.benchReplacement, ...(r.benchReplacement ?? {}) },
  };
}

// The way an item's front faces, always the bench's facing side.
export const FACING_ROTATION = { S: 0, W: 90, N: 180, E: 270 };

// Bench top an item takes away from working space (gaps not included).
export function usedSqFt(rules, widthFt, depthFt) {
  return widthFt * (depthFt >= rules.frontStripCountsBelowDepthFt - EPS ? rules.benchDepthFt : depthFt);
}

// A bench in room feet: its top, and which way "along the bench" runs.
// Benches facing N/S run east-west; benches facing E/W run north-south.
export function benchFrame(plan, bench) {
  const s = plan.gridInches / 12;
  const xFt = bench.rect.column * s, yFt = bench.rect.row * s;
  const wFt = bench.rect.width * s, hFt = bench.rect.height * s;
  const eastWest = bench.facing === "N" || bench.facing === "S";
  return { benchId: bench.id, facing: bench.facing, xFt, yFt, wFt, hFt, lengthFt: eastWest ? wFt : hFt, depthFt: eastWest ? hFt : wFt };
}

// Room footprint of something `lengthFt` long and `depthFt` deep, pushed to
// the back of the bench at `offsetFt` along it (mirrors initial-equipment.ts).
export function footprint(frame, offsetFt, lengthFt, depthFt) {
  const { xFt: x, yFt: y, wFt: w, hFt: h } = frame;
  switch (frame.facing) {
    case "S": return { xFt: x + offsetFt, yFt: y, spanXFt: lengthFt, spanYFt: depthFt };
    case "N": return { xFt: x + offsetFt, yFt: y + h - depthFt, spanXFt: lengthFt, spanYFt: depthFt };
    case "E": return { xFt: x, yFt: y + offsetFt, spanXFt: depthFt, spanYFt: lengthFt };
    default: return { xFt: x + w - depthFt, yFt: y + offsetFt, spanXFt: depthFt, spanYFt: lengthFt };
  }
}

// The offset a supplied room-coordinate placement corresponds to, or null
// when it is not a back-pushed, unrotated footprint on this bench (e.g. a
// placement made before the one-row bench rules existed).
export function offsetFromFootprint(frame, p, lengthFt, depthFt) {
  const eastWest = frame.facing === "N" || frame.facing === "S";
  const offset = eastWest ? p.xFt - frame.xFt : p.yFt - frame.yFt;
  const expected = footprint(frame, offset, lengthFt, depthFt);
  const close = (a, b) => Math.abs(a - b) <= 1e-6;
  return close(expected.xFt, p.xFt) && close(expected.yFt, p.yFt) ? offset : null;
}

// Whether a unit replaces a whole bench (see the top of this file).
export function replacesBench(rules, unit, workingSpacePct, frame = { lengthFt: rules.benchLengthFt, depthFt: rules.benchDepthFt }) {
  if (unit.pipette || unit.placement === "floor" || ![unit.widthFt, unit.depthFt].every(n => Number.isFinite(n) && n > 0)) return false;
  if (unit.widthFt > frame.lengthFt + EPS || unit.depthFt > frame.depthFt + rules.benchReplacement.maxOverhangFt + EPS) return false;
  const alone = usedSqFt(rules, unit.widthFt, unit.depthFt);
  return unit.depthFt > frame.depthFt + EPS || alone > (1 - workingSpacePct / 100) * frame.lengthFt * frame.depthFt + EPS;
}

// Every way a set of stretches breaks the rules on one bench. A stretch is
// { key, offsetFt, lengthFt, usedSqFt, replacement? }.
export function benchRuleIssues(rules, frame, workingSpacePct, stretches) {
  const issues = [];
  // A bench replaced by equipment holds that equipment and nothing else.
  if (stretches.some(s => s.replacement)) {
    if (stretches.length > 1) issues.push(`${frame.benchId} is replaced by ${stretches.find(s => s.replacement).key}; nothing else can stand there.`);
    for (const s of stretches) if (s.replacement && Math.abs(s.offsetFt) > EPS) issues.push(`${s.key} replaces ${frame.benchId} and must stand at its start.`);
    return issues;
  }
  const sorted = [...stretches].sort((a, b) => a.offsetFt - b.offsetFt);
  for (const s of sorted) {
    if (s.offsetFt < -EPS || s.offsetFt + s.lengthFt > frame.lengthFt + EPS) issues.push(`${s.key} extends past the end of ${frame.benchId}.`);
  }
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i];
    if (b.offsetFt < a.offsetFt + a.lengthFt + rules.gapFt - EPS) issues.push(`${a.key} and ${b.key} are closer than ${rules.gapFt * 12}" on ${frame.benchId}.`);
  }
  const used = sorted.reduce((sum, s) => sum + s.usedSqFt, 0) + Math.max(0, sorted.length - 1) * rules.gapFt * frame.depthFt;
  const allowed = (1 - workingSpacePct / 100) * frame.lengthFt * frame.depthFt;
  if (used > allowed + EPS) issues.push(`${frame.benchId} keeps less than ${workingSpacePct}% working space (${used.toFixed(2)} of ${allowed.toFixed(2)} sq ft used).`);
  return issues;
}

// Why a unit can never stand on a bench of this size, or null.
export function misfit(rules, unit, frame = { lengthFt: rules.benchLengthFt, depthFt: rules.benchDepthFt }) {
  if (![unit.widthFt, unit.depthFt].every(n => Number.isFinite(n) && n > 0)) return "Missing usable equipment dimensions.";
  if (unit.replacesBench) return unit.widthFt > frame.lengthFt + EPS ? `Wider than a bench (${frame.lengthFt} ft), so it can't replace one.` : null;
  if (unit.depthFt > frame.depthFt + EPS) return `Deeper than a bench (${frame.depthFt} ft) even allowing ${rules.benchReplacement.maxOverhangFt} ft into its working strip, so it can't replace one.`;
  if (unit.pipette && unit.widthFt > rules.pipetteArea.lengthFt + EPS) return `Wider than a pipette work area (${rules.pipetteArea.lengthFt} ft).`;
  if (unit.widthFt > frame.lengthFt + EPS) return `Wider than a bench (${frame.lengthFt} ft).`;
  return null;
}
