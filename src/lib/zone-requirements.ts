// Client-side mirror of cirrus-backend's zone-policy enums. The operation
// catalogue itself is no longer mirrored here — see DAMP_OPERATIONS_QUERY —
// so there is nothing left that can drift into an unknown operationId; a
// selection always names a real Operation document. (OPERATION_LAYOUT_PROFILES
// on the backend is still a *narrower* set than the full operations
// collection — a selected operation with no curated profile still comes
// back as insufficientData, same as before, just no longer from a typo.)
export const MATERIAL_CLASSES = [
  'SyntheticDnaOrReagent',
  'PurifiedNucleicAcid',
  'HumanBlood',
  'HumanTissueUnfixed',
  'HumanCellLine',
  'MicrobialNonpathogenic',
  'EnvironmentalIsolateUnknown',
  'PcrAmplicon',
  'NonviableSampleForAnalysis',
  'WasteOrDecon',
] as const;
export type MaterialClass = (typeof MATERIAL_CLASSES)[number];

export const MATERIAL_CLASS_LABELS: Record<MaterialClass, string> = {
  SyntheticDnaOrReagent: 'Synthetic DNA / reagent',
  PurifiedNucleicAcid: 'Purified nucleic acid',
  HumanBlood: 'Human blood',
  HumanTissueUnfixed: 'Human tissue (unfixed)',
  HumanCellLine: 'Human cell line',
  MicrobialNonpathogenic: 'Microbial (nonpathogenic)',
  EnvironmentalIsolateUnknown: 'Environmental isolate (unclassified)',
  PcrAmplicon: 'PCR amplicon',
  NonviableSampleForAnalysis: 'Nonviable sample (for analysis)',
  WasteOrDecon: 'Waste / decon material',
};

// zone-policy's `requiresBiologicalHandling` isn't collected from the user
// at all — it's implied by which material class they picked (nothing about
// the molecular-biology materials here is ever biologically live/regulated,
// nothing about the biological ones is ever inert). Named for what it
// actually gates, not "viability" — human blood belongs in this set even
// though it's not a question of whether it's "alive": OSHA's Bloodborne
// Pathogens Standard (29 CFR 1910.1030) regulates it categorically, the
// same containment driver as a live pathogen. Asking the user for this
// separately would just be redundant context to type.
const BIOLOGICAL_HANDLING_MATERIAL_CLASSES = new Set<MaterialClass>(['HumanBlood', 'HumanTissueUnfixed', 'HumanCellLine', 'MicrobialNonpathogenic', 'EnvironmentalIsolateUnknown']);
export function materialRequiresBiologicalHandling(materialClass: MaterialClass): boolean {
  return BIOLOGICAL_HANDLING_MATERIAL_CLASSES.has(materialClass);
}

// Mirrors cirrus-backend's SpatialOperationKind (config/schemas/lab-config.schema.ts)
// exactly, PascalCase GraphQL enum values as returned. Governs how an
// operation participates in zone compilation — see that enum's own doc
// comment for what each value means. NonSpatialService operations stay
// selectable in the workflow (this list) but are never sent for zoning
// (see LayoutSandboxPage.tsx's runZoneRequirements) — the backend compiler
// excludes them too, so this is belt-and-suspenders, not the only guard.
export const SPATIAL_OPERATION_KINDS = ['PhysicalOperation', 'EquipmentAccess', 'AutomatedVariant', 'NonSpatialService'] as const;
export type SpatialOperationKind = (typeof SPATIAL_OPERATION_KINDS)[number];
export const SPATIAL_OPERATION_KIND_LABELS: Record<SpatialOperationKind, string> = {
  PhysicalOperation: 'Physical operation',
  EquipmentAccess: 'Equipment access',
  AutomatedVariant: 'Automated variant',
  NonSpatialService: 'Non-spatial service',
};

export const AEROSOL_POTENTIALS = ['Low', 'Medium', 'High'] as const;
export type AerosolPotential = (typeof AEROSOL_POTENTIALS)[number];

export const AMPLIFICATION_STAGES = ['None', 'PrePcr', 'PostPcr'] as const;
export type AmplificationStage = (typeof AMPLIFICATION_STAGES)[number];

// operationName/equipment/stationIds are carried along purely for display
// (the planned-operations list, the confirmation form) — only operationId
// and the four zone-policy fields are ever sent to solveZoneRequirements.
// catalogueSource/catalogueRevision ride along too, unused until the plan is
// actually saved (toPlannedOperationSnapshot) — see that function's comment
// for why they matter.
export interface PlannedOperation {
  key: string;
  operationId: string;
  operationName: string;
  equipment: string[];
  spatialKind: SpatialOperationKind;
  catalogueSource: string;
  catalogueRevision: string;
  materialClass: MaterialClass | '';
  confirmedBiosafetyLevel: number | '';
  aerosolPotential: AerosolPotential | '';
  amplificationStage: AmplificationStage | '';
}

export function newPlannedOperation(catalogueEntry: { operationId: string; name: string; equipment: string[]; spatialKind: SpatialOperationKind; catalogueSource: string; catalogueRevision: string }): PlannedOperation {
  return {
    key: crypto.randomUUID(),
    operationId: catalogueEntry.operationId,
    operationName: catalogueEntry.name,
    equipment: catalogueEntry.equipment,
    spatialKind: catalogueEntry.spatialKind,
    catalogueSource: catalogueEntry.catalogueSource,
    catalogueRevision: catalogueEntry.catalogueRevision,
    materialClass: '',
    confirmedBiosafetyLevel: '',
    aerosolPotential: '',
    amplificationStage: '',
  };
}

// NonSpatialService operations have no physical footprint to zone (see the
// backend's ZoneRequirementCompilerService.compile) — filtered out of the
// zoning request itself here rather than left for the backend to silently
// drop, so the request only ever asks for what it actually wants placed.
export function isZoneable(op: PlannedOperation): boolean {
  return op.spatialKind !== 'NonSpatialService';
}

// Every field zone-policy actually requires beyond the catalogue selection
// itself (confirmedBiosafetyLevel is the one genuinely optional field) —
// used to block submission locally instead of letting an incomplete
// context reach the backend as a confusing error.
export function isPlannedOperationComplete(op: PlannedOperation): boolean {
  return Boolean(op.operationId && op.materialClass && op.aerosolPotential && op.amplificationStage);
}

export function toOperationContextInput(op: PlannedOperation) {
  return {
    operationId: op.operationId,
    materialClass: op.materialClass,
    requiresBiologicalHandling: op.materialClass ? materialRequiresBiologicalHandling(op.materialClass) : false,
    confirmedBiosafetyLevel: op.confirmedBiosafetyLevel === '' ? undefined : op.confirmedBiosafetyLevel,
    aerosolPotential: op.aerosolPotential,
    amplificationStage: op.amplificationStage,
  };
}

// What a saved zoning plan (cirrus-backend's zoning-plans module) stores per
// planned operation — the shape SAVE_ZONING_PLAN_MUTATION's
// PlannedOperationSnapshotInput expects. Two different kinds of information
// travel together here, deliberately: the zone-policy context the user
// entered (materialClass/confirmedBiosafetyLevel/aerosolPotential/
// amplificationStage), and a *snapshot* of what the catalogue said about
// this operation right now (operationNameSnapshot/spatialKindSnapshot/
// equipmentSnapshot/catalogueSource/catalogueRevision). The live catalogue
// entry can keep changing after this plan is saved — this is what lets a
// reopened plan detect that drift (see fromPlannedOperationSnapshot and
// ZONING_PLAN_CATALOGUE_DRIFT_QUERY) instead of silently reinterpreting
// itself under whatever the catalogue currently says.
export interface PlannedOperationSnapshot {
  key: string;
  operationId: string;
  operationNameSnapshot: string;
  spatialKindSnapshot: SpatialOperationKind;
  equipmentSnapshot: string[];
  catalogueSource: string;
  catalogueRevision: string;
  materialClass: MaterialClass;
  confirmedBiosafetyLevel: number | null;
  aerosolPotential: AerosolPotential;
  amplificationStage: AmplificationStage;
}

// Only ever called on a complete operation (isPlannedOperationComplete) —
// the snapshot's zone-policy fields are non-nullable on the backend, same
// gate the "Save plan" button in LayoutSandboxPage.tsx enforces before this
// is reachable.
export function toPlannedOperationSnapshot(op: PlannedOperation): PlannedOperationSnapshot {
  return {
    key: op.key,
    operationId: op.operationId,
    operationNameSnapshot: op.operationName,
    spatialKindSnapshot: op.spatialKind,
    equipmentSnapshot: op.equipment,
    catalogueSource: op.catalogueSource,
    catalogueRevision: op.catalogueRevision,
    materialClass: op.materialClass as MaterialClass,
    confirmedBiosafetyLevel: op.confirmedBiosafetyLevel === '' ? null : op.confirmedBiosafetyLevel,
    aerosolPotential: op.aerosolPotential as AerosolPotential,
    amplificationStage: op.amplificationStage as AmplificationStage,
  };
}

// The inverse — reconstructs a working PlannedOperation from a saved
// snapshot when a plan is loaded back in. operationName/equipment/
// spatialKind/catalogueSource/catalogueRevision come from the snapshot as
// saved, not a fresh catalogue lookup — reopening a plan should show
// exactly what was true when it was saved, with any drift from the *live*
// catalogue surfaced separately (see ZONING_PLAN_CATALOGUE_DRIFT_QUERY)
// rather than silently substituted in here.
export function fromPlannedOperationSnapshot(snapshot: PlannedOperationSnapshot): PlannedOperation {
  return {
    key: snapshot.key,
    operationId: snapshot.operationId,
    operationName: snapshot.operationNameSnapshot,
    equipment: snapshot.equipmentSnapshot,
    spatialKind: snapshot.spatialKindSnapshot,
    catalogueSource: snapshot.catalogueSource,
    catalogueRevision: snapshot.catalogueRevision,
    materialClass: snapshot.materialClass,
    confirmedBiosafetyLevel: snapshot.confirmedBiosafetyLevel ?? '',
    aerosolPotential: snapshot.aerosolPotential,
    amplificationStage: snapshot.amplificationStage,
  };
}

// Keyed by the ZoneFamily GraphQL enum's value names (PascalCase) exactly
// as cirrus-backend returns them — distinct from ZONE_COLORS in lib/kb.ts,
// which is keyed by station zone labels (wet_lab/dry_lab/automation) and
// has nothing to do with zone-policy's ZoneFamily.
export const ZONE_FAMILY_COLORS: Record<string, string> = {
  CleanMolecular: '#00D5D5',
  HumanSpecimenContainment: '#E0334F',
  HumanCellCulture: '#E0824F',
  MicrobialCulture: '#5BC24F',
  BiologicalContainment: '#B23FE0',
  PostPcrAmplicon: '#5B4FE0',
  SharedAnalytical: '#4F8FE0',
  WashDeconWaste: '#8A8F98',
};
export const ZONE_FAMILY_LABELS: Record<string, string> = {
  CleanMolecular: 'Clean molecular',
  HumanSpecimenContainment: 'Human specimen containment',
  HumanCellCulture: 'Human cell culture',
  MicrobialCulture: 'Microbial culture',
  BiologicalContainment: 'Biological containment',
  PostPcrAmplicon: 'Post-PCR / amplicon',
  SharedAnalytical: 'Shared analytical',
  WashDeconWaste: 'Wash / decon / waste',
};
