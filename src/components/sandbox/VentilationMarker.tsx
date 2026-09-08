import type { SandboxBaseObject } from '../../lib/layout-sandbox';

// A regular 5-point star centered at (cx,cy), tip pointing up.
function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return points.join(' ');
}

const VENT_MARKER_R = .3;
// One shape per category so they're distinguishable without reading the
// label: star = supply, square = return, open (unfilled) circle = general
// exhaust, diamond = local exhaust connection — the one category that's a
// physical connector rather than a room-HVAC marker, so it reads as one.
export function VentilationMarker({ object }: { object: SandboxBaseObject }) {
  const anchor = object.footprint.points[0];
  const category = object.ventilation?.category;
  if (category === 'local_exhaust_connection') {
    const half = .26;
    return <rect className="ls-infra-connector local_exhaust_connection" x={anchor.x - half} y={anchor.y - half} width={half * 2} height={half * 2} transform={`rotate(45 ${anchor.x} ${anchor.y})`} />;
  }
  if (category === 'hvac_supply') {
    return <polygon className="ls-infra-point ventilation_point hvac_supply" points={starPoints(anchor.x, anchor.y, VENT_MARKER_R + .06, VENT_MARKER_R - .12)} />;
  }
  if (category === 'hvac_return') {
    const half = VENT_MARKER_R - .03;
    return <rect className="ls-infra-point ventilation_point hvac_return" x={anchor.x - half} y={anchor.y - half} width={half * 2} height={half * 2} />;
  }
  return <circle className="ls-infra-point ventilation_point general_exhaust" cx={anchor.x} cy={anchor.y} r={VENT_MARKER_R} />;
}
