// Synthetic interoperability fixture, not a measured lab or a production
// export: four south-facing benches in one zone (a protocol only ever uses
// its own zone's equipment), embedded protocols.
export function makeDemoRequest() {
  const benches = [
    { id: "micro-west", zoneId: "microbial", row: 2, column: 2 },
    { id: "micro-east", zoneId: "microbial", row: 2, column: 20 },
    { id: "micro-south", zoneId: "microbial", row: 14, column: 2 },
    { id: "shared", zoneId: "microbial", row: 14, column: 20 },
  ].map(({ row, column, ...b }) => ({ ...b, kind: "island", facing: "S", rect: { row, column, height: 5, width: 12 }, accessRect: { row: row + 5, column, height: 4, width: 12 } }));
  const item = (equipmentId, name, fixed = false) => ({ equipmentId, name, quantity: 1, widthFt: 1, depthFt: 1, heightFt: 1, footprintSqFt: 1, placement: "bench", fixed, placeholderSize: false, sources: [] });
  const microbial = [item("reader", "Plate reader", true), item("centrifuge", "Centrifuge"), item("mixer", "Mixer"), item("reagent", "Shared reagent station", true)];
  const plan = {
    version: 1, gridInches: 6, rows: 24, columns: 36,
    options: { workingSpacePct: 35, optimizerBalance: 0.5 },
    benches, islands: [], aisle: { cells: [] }, unusedFloor: { cells: [] }, doorClearance: { cells: [] }, obstacles: { cells: [] },
    zones: [
      { id: "microbial", name: "Microbial", workflows: ["bacteria", "yeast"], benchIds: benches.map(b => b.id), cells: [], equipment: microbial },
    ], floorItems: [],
  };
  for (let r = 0; r < plan.rows; r++) for (let c = 0; c < plan.columns; c++) {
    if (benches.some(b => r >= b.rect.row && r < b.rect.row + b.rect.height && c >= b.rect.column && c < b.rect.column + b.rect.width)) continue;
    (r === 0 || c === 0 || r === 23 || c === 35 ? plan.unusedFloor : plan.aisle).cells.push([r, c]);
  }
  const initial = (unit, zoneId, benchId, offsetFt) => {
    const b = benches.find(b => b.id === benchId);
    return { instanceId: `${zoneId}:${unit.equipmentId}:1`, equipmentId: unit.equipmentId, zoneId, benchId, name: unit.name, fixed: unit.fixed, placeholderSize: false,
      xFt: b.rect.column * 0.5 + offsetFt, yFt: b.rect.row * 0.5, widthFt: 1, depthFt: 1, spanXFt: 1, spanYFt: 1, offsetFt, rotationDegrees: 0 };
  };
  plan.initialEquipment = { placements: [initial(microbial[0], "microbial", "micro-west", 1), initial(microbial[1], "microbial", "micro-east", 4), initial(microbial[2], "microbial", "micro-south", 1), initial(microbial[3], "microbial", "shared", 4)], workAreas: [], unplaced: [] };
  const steps = ids => ids.map((equipmentId, i) => ({ id: `s${i + 1}`, stepNumber: i + 1, equipmentId }));
  return {
    optimizerSchemaVersion: 1,
    layout: { version: 5, name: "Synthetic Cirrus compatibility example", room: { widthFt: 18, heightFt: 12, gridFt: 0.5 }, fixtures: [], baseObjects: [], plan },
    protocols: [
      { id: "assay", name: "Frequent assay", steps: steps(["reader", "centrifuge", "reader", "mixer", "reader"]) },
      { id: "prep", name: "Shared reagent preparation", steps: steps(["reagent", "mixer", "centrifuge"]) },
    ],
    protocolRuns: [
      { id: "assay-microbial", protocolId: "assay", zoneId: "microbial", runsPerPeriod: 12, period: "week" },
      { id: "prep-microbial", protocolId: "prep", zoneId: "microbial", runsPerPeriod: 2, period: "week" },
    ], constraints: [], settings: { maxEvaluations: 50000, validationMode: "strict" },
  };
}
