import type { SandboxBaseObject } from '../../lib/layout-sandbox';

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const value = parseInt(full, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

// Architecture kinds (including the legacy sink/fume_hood/bsc/electrical_panel/
// utility_connection ones kept only for backward compatibility) live under
// the 'base' layer, same as always; the three new typed point kinds each get
// their own toggleable layer so turning on "electrical" doesn't also flood
// the canvas with plumbing/ventilation markers.
export function baseObjectLayer(kind: SandboxBaseObject['kind']) {
  if (kind === 'electrical_point') return 'electrical' as const;
  if (kind === 'plumbing_point') return 'plumbing' as const;
  if (kind === 'ventilation_point') return 'ventilation' as const;
  return 'base' as const;
}
