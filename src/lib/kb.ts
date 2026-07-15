export interface StationMeta {
  id: string;
  name: string;
  category: string;
  zone: 'wet_lab' | 'dry_lab' | 'automation' | 'unassigned';
  typical_sqft: number;
}

export interface OperationMeta {
  id: string;
  name: string;
  stations: string[];
  equipment: string[];
  approx_cost_usd: number;
}

export const ZONE_COLORS: Record<string, string> = {
  wet_lab: '#4FB3AC',
  dry_lab: '#221F2E',
  automation: '#D1316B',
  unassigned: '#E3E0E6',
};

export const KB = {
  stations: {
    DNA_RNA_Prep: { id: 'DNA_RNA_Prep', name: 'DNA/RNA Prep Station', category: 'molecular_biology', zone: 'wet_lab', typical_sqft: 40 },
    MED_Prep: { id: 'MED_Prep', name: 'Media Prep Station', category: 'microbiology', zone: 'wet_lab', typical_sqft: 30 },
    Microbial_Culture_PREP: { id: 'Microbial_Culture_PREP', name: 'Microbial Culture Prep Station', category: 'microbiology', zone: 'wet_lab', typical_sqft: 35 },
    Analytical_Instrumentation: { id: 'Analytical_Instrumentation', name: 'Analytical Instrumentation Station', category: 'analytical', zone: 'dry_lab', typical_sqft: 50 },
    GEL_Electrophoresis: { id: 'GEL_Electrophoresis', name: 'Gel Electrophoresis Station', category: 'molecular_biology', zone: 'wet_lab', typical_sqft: 25 },
    GEL_Imaging: { id: 'GEL_Imaging', name: 'Gel Imaging Station', category: 'molecular_biology', zone: 'dry_lab', typical_sqft: 15 },
    Dry_Chemical_PREP: { id: 'Dry_Chemical_PREP', name: 'Dry Chemical Prep Station', category: 'analytical', zone: 'wet_lab', typical_sqft: 20 },
    Automation_Prep: { id: 'Automation_Prep', name: 'Automation / Robotics Station', category: 'automation', zone: 'automation', typical_sqft: 60 },
    Spectroscopy: { id: 'Spectroscopy', name: 'Spectroscopy Station', category: 'analytical', zone: 'dry_lab', typical_sqft: 20 },
  } as Record<string, StationMeta>,

  operations: [
    { id: 'glycerol_stocking', name: 'Glycerol Stocking', stations: ['DNA_RNA_Prep'], equipment: ['Cryotubes', 'Bunsen burner', 'Pipette / tips', 'Fridge'], approx_cost_usd: 800 },
    { id: 'making_overnight_cultures', name: 'Making Overnight Cultures', stations: ['MED_Prep', 'Microbial_Culture_PREP'], equipment: ['Bunsen burner', 'Pipettes', 'Serological pipette', '250 mL Erlenmeyer flask (sterile)'], approx_cost_usd: 600 },
    { id: 'nanodrop', name: 'Nanodrop - dsDNA Quantification', stations: ['Analytical_Instrumentation'], equipment: ['Pipette'], approx_cost_usd: 6000 },
    { id: 'gel_electrophoresis', name: 'Gel Electrophoresis', stations: ['GEL_Imaging', 'GEL_Electrophoresis'], equipment: ['Gel tray', 'Gel casting tray', 'Gel running cassette', 'Power supply', 'Gel imager'], approx_cost_usd: 4500 },
    { id: 'bca_assay_manual', name: 'BCA Assay (Manual)', stations: ['Dry_Chemical_PREP', 'Analytical_Instrumentation'], equipment: ['Synergy H1 Microplate Reader'], approx_cost_usd: 9000 },
    { id: 'bca_assay_automated', name: 'BCA Assay (Automated)', stations: ['Automation_Prep', 'Analytical_Instrumentation'], equipment: ['Synergy H1 Microplate Reader', 'Opentrons FLEX'], approx_cost_usd: 24000 },
    { id: 'miniprep', name: 'Plasmid Miniprep', stations: ['Analytical_Instrumentation', 'DNA_RNA_Prep'], equipment: ['Eppendorf tubes (1.5 mL)', 'Bunsen burner', 'Centrifuge', 'Plate reader'], approx_cost_usd: 2500 },
    { id: 'send_to_sequencing', name: 'Send Sample to Sequencing', stations: ['DNA_RNA_Prep', 'Spectroscopy'], equipment: ['Pipettes', 'Vortexer', 'Benchtop centrifuge'], approx_cost_usd: 1500 },
    { id: 'miniprep_automated', name: 'Plasmid Miniprep (Automated)', stations: ['Automation_Prep', 'DNA_RNA_Prep'], equipment: ['Opentrons FLEX or Hamilton', 'Eppendorf tubes (1.5 mL)', 'Centrifuge'], approx_cost_usd: 20000 },
  ] as OperationMeta[],

  station_to_protocol_map: {
    DNA_RNA_Prep: ['glycerol_stocking', 'miniprep', 'miniprep_automated', 'send_to_sequencing'],
    MED_Prep: ['making_overnight_cultures'],
    Microbial_Culture_PREP: ['making_overnight_cultures'],
    Analytical_Instrumentation: ['nanodrop', 'bca_assay_manual', 'bca_assay_automated', 'miniprep'],
    GEL_Electrophoresis: ['gel_electrophoresis'],
    GEL_Imaging: ['gel_electrophoresis'],
    Dry_Chemical_PREP: ['bca_assay_manual'],
    Automation_Prep: ['bca_assay_automated', 'miniprep_automated'],
    Spectroscopy: ['send_to_sequencing'],
  } as Record<string, string[]>,

  station_sizing: {
    position_sqft: 6,
    bench_depth_ft: 2.5,
    corridor_ft: 4,
    positions_by_station: {
      Automation_Prep: 10, Analytical_Instrumentation: 8, DNA_RNA_Prep: 7, Microbial_Culture_PREP: 6,
      MED_Prep: 5, GEL_Electrophoresis: 4, Spectroscopy: 3, Dry_Chemical_PREP: 3, GEL_Imaging: 2,
    } as Record<string, number>,
  },
};

export interface FloorPlanCell {
  col: number;
  stationId: string | null;
  zone: string;
  name: string | null;
  posLabel: string;
}
export interface FloorPlanRow {
  label: string;
  cells: FloorPlanCell[];
}
export interface FloorPlanResult {
  grid: FloorPlanRow[];
  opIds: string[];
  allOpIds: string[];
  stationBlocks: { id: string; size: number; zone: string; name: string }[];
  width: number;
  height: number;
  positionsPerRow: number;
  rowsFit: number;
  totalPositions: number;
  neededTotal: number;
  capacityPositions: number;
  overCapacity: boolean;
}

function rowLabel(i: number): string {
  const letter = String.fromCharCode(65 + (i % 26));
  const suffix = Math.floor(i / 26);
  return suffix > 0 ? letter + suffix : letter;
}

function rowsFitHeight(height_ft: number): number {
  const benchDepth = KB.station_sizing.bench_depth_ft || 2.5;
  const corridorFt = KB.station_sizing.corridor_ft || 4;
  let depth = 0, i = 0;
  while (depth + benchDepth <= height_ft) {
    depth += benchDepth;
    if (i % 2 === 0) {
      if (depth + corridorFt > height_ft) break;
      depth += corridorFt;
    }
    i++;
  }
  return Math.max(1, i);
}

function neededStations(protocols: { id?: string }[], extraOpIds?: string[]) {
  const opIds = (protocols || []).map((p) => p.id).filter(Boolean) as string[];
  const allOpIds = [...new Set([...opIds, ...(extraOpIds || [])])];
  const stationSet = new Set<string>();
  allOpIds.forEach((id) => {
    const op = KB.operations.find((o) => o.id === id);
    if (op) op.stations.forEach((s) => stationSet.add(s));
  });
  return { opIds, allOpIds, stations: [...stationSet] };
}

export function computeFloorPlan(
  reportData: { protocols_json?: unknown },
  width: number,
  height: number,
  extraOpIds?: string[],
): FloorPlanResult {
  const protocols: { id?: string }[] = Array.isArray(reportData.protocols_json)
    ? (reportData.protocols_json as { id?: string }[])
    : [];
  const { opIds, allOpIds, stations } = neededStations(protocols, extraOpIds);
  const posSqft = KB.station_sizing.position_sqft;
  const benchDepth = KB.station_sizing.bench_depth_ft || 2.5;

  const stationBlocks = stations
    .map((id) => {
      const meta = KB.stations[id] || ({} as StationMeta);
      const size = KB.station_sizing.positions_by_station[id] || Math.max(1, Math.ceil((meta.typical_sqft || 24) / posSqft));
      return { id, size, zone: meta.zone || 'unassigned', name: meta.name || id };
    })
    .sort((a, b) => b.size - a.size);
  const neededTotal = stationBlocks.reduce((s, b) => s + b.size, 0);

  const positionWidthFt = posSqft / benchDepth;
  const positionsPerRow = Math.max(4, Math.floor(width / positionWidthFt) || 8);
  const rowsFit = rowsFitHeight(height);
  const capacityPositions = positionsPerRow * rowsFit;
  const totalPositions = Math.max(capacityPositions, neededTotal, 1);

  const rows: Omit<FloorPlanCell, 'posLabel'>[][] = [];
  let currentRowCells: Omit<FloorPlanCell, 'posLabel'>[] = [];
  let col = 1;
  function newRow() {
    rows.push(currentRowCells);
    currentRowCells = [];
    col = 1;
  }
  stationBlocks.forEach((b) => {
    if (col + b.size - 1 > positionsPerRow) newRow();
    for (let i = 0; i < b.size; i++) {
      currentRowCells.push({ col: col + i, stationId: b.id, zone: b.zone, name: b.name });
    }
    col += b.size;
  });
  let filled = rows.reduce((s, r) => s + r.length, 0) + currentRowCells.length;
  while (filled < totalPositions) {
    if (col > positionsPerRow) newRow();
    currentRowCells.push({ col, stationId: null, zone: 'unassigned', name: null });
    col++;
    filled++;
  }
  newRow();

  const grid: FloorPlanRow[] = rows
    .filter((r) => r.length)
    .map((cells, i) => {
      const label = rowLabel(i);
      const labeled = cells.map((c) => ({ ...c, posLabel: label + c.col }));
      return { label, cells: labeled };
    });

  return {
    grid, opIds, allOpIds, stationBlocks, width, height, positionsPerRow, rowsFit,
    totalPositions, neededTotal, capacityPositions, overCapacity: neededTotal > capacityPositions,
  };
}

export function suggestExpansion(fp: FloorPlanResult) {
  const remaining = fp.capacityPositions - fp.neededTotal;
  if (remaining <= 0) return null;
  const placedStations = new Set(fp.stationBlocks.map((b) => b.id));
  const candidates = KB.operations
    .filter((op) => !fp.allOpIds.includes(op.id))
    .map((op) => {
      const extraStations = op.stations.filter((s) => !placedStations.has(s));
      const extraSize = extraStations.reduce((s, id) => s + (KB.station_sizing.positions_by_station[id] || 2), 0);
      return { op, extraSize };
    })
    .filter((c) => c.extraSize <= remaining)
    .sort((a, b) => a.extraSize - b.extraSize || a.op.approx_cost_usd - b.op.approx_cost_usd);
  return candidates[0] || null;
}
