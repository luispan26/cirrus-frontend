import type { EquipmentMounting, UtilityRequirement } from '../../lib/layout-sandbox';
import type { SpatialOperationKind } from '../../lib/zone-requirements';

// Shared read-model types for the layout sandbox's catalog queries and
// backend-fetched plan/zoning data — split out of LayoutSandboxPage.tsx so
// the extracted sandbox components (WS-8a) can share them without importing
// the page module itself.

export interface StationCatalogItem { stationId: string; name: string; zone: string; }
export interface EquipmentCatalogItem { equipmentId: string; name: string; widthFt: number; depthFt: number; heightFt: number; stationId: string | null; utilityRequirements: UtilityRequirement[]; mounting: EquipmentMounting | null; }
export interface OperationCatalogueItem { operationId: string; name: string; stationIds: string[]; equipment: string[]; approxCostUsd: number; estimatedTimeHours: number | null; spatialKind: SpatialOperationKind; baseOperationId: string | null; executionPlatform: string | null; catalogueSource: string; catalogueRevision: string; }

export interface ZoningPlanSummary { planId: string; name: string; roomWidthFt: number; roomHeightFt: number; updatedAt: string; }

export interface ZoneRequirementSummary { id: string; family: string; operationIds: string[]; materialClasses: string[]; requiresBsc: boolean; sharingPolicy: string; confirmedBiosafetyLevel: number; minimumAreaCells: number; targetAreaCells: number; }
// Cell grid dims + the zone legend are carried alongside the result (not
// recomputed at render time) so the overlay always matches the geometry and
// zoneRequirements actually returned, even if room size or the planned
// operations list changes after. Zone index in cellZones is a solver
// implementation detail — legend[index-1] is how a cell's family/operations
// are actually looked up, never the raw index by itself.
export interface ZoningOverlay { roomWidth: number; roomHeight: number; cellZones: number[]; legend: ZoneRequirementSummary[]; }
