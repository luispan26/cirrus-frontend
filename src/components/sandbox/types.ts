// Shared read-model types for the layout sandbox — split out of
// LayoutSandboxPage.tsx so the extracted sandbox components (WS-8a) can
// share them without importing the page module itself.

export interface ZoneRequirementSummary { id: string; family: string; }
// The bench fitter's zones as an overlay: cell grid dims + the zone legend
// are carried alongside the result (not recomputed at render time) so the
// overlay always matches the geometry actually returned, even if the room
// changes after. legend[index-1] is how a cell's zone is looked up.
// cellFt: the solved grid's cell size; defaults to the sandbox grid.
export interface ZoningOverlay { roomWidth: number; roomHeight: number; cellZones: number[]; legend: ZoneRequirementSummary[]; cellFt?: number; }
