import type { ReactNode } from 'react';

type Vec = [number, number];
type Hue = 'teal' | 'pink' | 'violet' | 'neutral';

const HUE_FILLS: Record<Hue, [string, string, string]> = {
  teal: ['rgba(0,213,213,.24)', 'rgba(0,213,213,.14)', 'rgba(0,213,213,.4)'],
  pink: ['rgba(255,63,164,.24)', 'rgba(255,63,164,.14)', 'rgba(255,63,164,.4)'],
  violet: ['rgba(140,124,255,.24)', 'rgba(140,124,255,.14)', 'rgba(140,124,255,.4)'],
  neutral: ['rgba(20,22,31,.07)', 'rgba(20,22,31,.035)', 'rgba(20,22,31,.11)'],
};

function isoFaces(x: number, y: number, w: number, d: number, h: number) {
  const right: Vec = [x + w * 0.866, y + w * 0.5];
  const left: Vec = [x - d * 0.866, y + d * 0.5];
  const back: Vec = [right[0] - d * 0.866, right[1] + d * 0.5];
  const down = (p: Vec): Vec => [p[0], p[1] + h];
  const pts = (arr: Vec[]) => arr.map((p) => p.join(',')).join(' ');
  return {
    top: pts([[x, y], right, back, left]),
    left: pts([[x, y], left, down(left), down([x, y])]),
    right: pts([[x, y], right, down(right), down([x, y])]),
  };
}

function Cube({ x, y, w, d, h, hue = 'neutral' }: { x: number; y: number; w: number; d: number; h: number; hue?: Hue }) {
  const f = isoFaces(x, y, w, d, h);
  const [topFill, leftFill, rightFill] = HUE_FILLS[hue];
  return (
    <g stroke="rgba(20,22,31,.55)" strokeWidth={0.6} strokeLinejoin="round">
      <polygon points={f.left} fill={leftFill} />
      <polygon points={f.right} fill={rightFill} />
      <polygon points={f.top} fill={topFill} />
    </g>
  );
}

function AssetFrame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 140 100" width="100%" height="auto" style={{ display: 'block' }}>
      <ellipse cx="70" cy="86" rx="46" ry="7" fill="rgba(20,22,31,.05)" />
      {children}
    </svg>
  );
}

export function LabAssetBench() {
  return (
    <AssetFrame>
      <Cube x={40} y={52} w={40} d={26} h={7} hue="neutral" />
      <Cube x={48} y={38} w={14} d={12} h={13} hue="teal" />
      <Cube x={70} y={44} w={10} d={9} h={9} hue="pink" />
    </AssetFrame>
  );
}

export function LabAssetHood() {
  return (
    <AssetFrame>
      <Cube x={45} y={20} w={26} d={20} h={44} hue="neutral" />
      <Cube x={50} y={30} w={16} d={2} h={26} hue="violet" />
    </AssetFrame>
  );
}

export function LabAssetInstrument() {
  return (
    <AssetFrame>
      <Cube x={44} y={48} w={28} d={22} h={12} hue="neutral" />
      <Cube x={52} y={34} w={14} d={12} h={14} hue="pink" />
      <ellipse cx="59" cy="34" rx="7" ry="3.6" fill="none" stroke="rgba(0,213,213,.65)" strokeWidth={0.8} />
    </AssetFrame>
  );
}

export const LAB_ASSETS = [LabAssetBench, LabAssetHood, LabAssetInstrument];
