import { gql } from '@apollo/client';

export const FLOOR_PLAN_PARSE_QUERY = gql`
  query FloorPlanParse($parseId: ID!) {
    floorPlanParse(parseId: $parseId) {
      parseId
      status
      originalFilename
      format
      parsed
      locked
      failureReason
    }
  }
`;

export const CONFIRM_FLOOR_PLAN_MUTATION = gql`
  mutation ConfirmFloorPlan($input: ConfirmFloorPlanInput!) {
    confirmFloorPlan(input: $input) {
      locked
      corrections
    }
  }
`;

export const GENERATE_ZONES_MUTATION = gql`
  mutation GenerateZones($input: GenerateZonesInput!) {
    generateZones(input: $input) {
      solveStatus
      validation {
        state
        violations
      }
      unassignedCells {
        row
        column
      }
      circulationCells {
        row
        column
      }
      zones {
        id
        family
        areaCells
        minimumWidthCells
        cells {
          row
          column
        }
        boundingBox {
          minimumRow
          maximumRow
          minimumColumn
          maximumColumn
        }
        boundaryEdges {
          side
          cell {
            row
            column
          }
        }
        circulationAccessCells {
          row
          column
        }
        adjacentFeatureIds
        nearbyUtilities {
          featureId
          type
          distanceCells
        }
      }
    }
  }
`;

export const PLACE_BENCHES_MUTATION = gql`
  mutation PlaceBenches($input: PlaceBenchesInput!) {
    placeBenches(input: $input) {
      solveStatus
      accessConnectivityMode
      validation {
        state
        violations
      }
      placementGrid {
        rows
        columns
        cellSizeInches
        sourceCellSizeInches
        scaleFactor
      }
      remainingZoneCells {
        row
        column
      }
      remainingPlaceableCells {
        row
        column
      }
      benches {
        id
        requirementId
        zoneId
        origin {
          row
          column
        }
        rotationDegrees
        accessSide
        footprintCells {
          row
          column
        }
        accessCells {
          row
          column
        }
      }
    }
  }
`;

export const FEASIBILITY_CHECK_QUERY = gql`
  query FeasibilityCheck($input: JSON!) {
    feasibilityCheck(input: $input) {
      ok
      issues { field message }
    }
  }
`;

export const INTAKE_SESSION_QUERY = gql`
  query IntakeSession($sessionId: ID!) {
    intakeSession(sessionId: $sessionId) {
      fields
      complete
      finalIntakeJson
    }
  }
`;

export const UPDATE_INTAKE_FIELDS_MUTATION = gql`
  mutation UpdateIntakeFields($sessionId: ID!, $patch: JSON!, $updatedBy: String!) {
    updateIntakeFields(input: { sessionId: $sessionId, patch: $patch, updatedBy: $updatedBy }) {
      sessionId
    }
  }
`;

export const COMPLETE_INTAKE_MUTATION = gql`
  mutation CompleteIntake($sessionId: ID!, $finalIntakeJson: JSON!) {
    completeIntake(sessionId: $sessionId, finalIntakeJson: $finalIntakeJson) {
      sessionId
    }
  }
`;

export const INTAKE_UPDATED_SUBSCRIPTION = gql`
  subscription IntakeUpdated($sessionId: ID!) {
    intakeUpdated(sessionId: $sessionId) {
      fields
      complete
      finalIntakeJson
    }
  }
`;

export const GENERATE_REPORT_MUTATION = gql`
  mutation GenerateReport($sessionId: ID!) {
    generateReport(sessionId: $sessionId) {
      id
      status
    }
  }
`;

export const REPORT_QUERY = gql`
  query Report($id: ID!) {
    report(id: $id) {
      status
      data
      error
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user { id email name }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user { id email name }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me { id email name }
  }
`;

export const MY_REPORTS_QUERY = gql`
  query MyReports {
    myReports {
      id
      sessionId
      status
      createdAt
      data
      error
    }
  }
`;

export const DELETE_REPORT_MUTATION = gql`
  mutation DeleteReport($id: ID!) {
    deleteReport(id: $id)
  }
`;

export const PROTOCOLS_IO_SEARCH_QUERY = gql`
  query ProtocolsIoSearch($key: String, $page: Int, $pageSize: Int, $workspaceUri: String) {
    protocolsIoSearch(key: $key, page: $page, pageSize: $pageSize, workspaceUri: $workspaceUri) {
      currentPage
      totalPages
      totalResults
      items {
        id
        title
        sourceUrl
        doi
        publishedOn
        authorNames
      }
    }
  }
`;

export const PROTOCOLS_IO_PROTOCOL_QUERY = gql`
  query ProtocolsIoProtocol($protocolId: String!) {
    protocolsIoProtocol(protocolId: $protocolId) {
      id
      title
      sourceUrl
      abstract
      beforeStart
      guidelines
      sections {
        title
        estimatedTime
        steps {
          id
          number
          text
          durationSeconds
          station
          stationColor
          stationLocation
          files { name url }
          notes
          images { url legend width height }
          tables { colTitles rowsJson legend }
          wellPlates { wellJson columnHeaders rowHeaders }
        }
      }
    }
  }
`;

export const STATIONS_QUERY = gql`
  query Stations {
    stations { stationId name category zone typicalSqft positions }
  }
`;

export const DAMP_OPERATIONS_QUERY = gql`
  query DampOperations {
    operations { operationId name stationIds equipment approxCostUsd estimatedTimeHours spatialKind baseOperationId executionPlatform catalogueSource catalogueRevision }
  }
`;

export const UPDATE_STATION_MUTATION = gql`
  mutation UpdateStation($stationId: String!, $input: UpdateStationInput!) {
    updateStation(stationId: $stationId, input: $input) {
      stationId name category zone typicalSqft positions
    }
  }
`;

export const DELETE_STATION_MUTATION = gql`
  mutation DeleteStation($stationId: String!) {
    deleteStation(stationId: $stationId)
  }
`;

export const EQUIPMENT_LIST_QUERY = gql`
  query EquipmentList {
    equipmentList {
      equipmentId name costUsd widthFt depthFt heightFt stationId utilityRequirements mounting
      needsDimensions canvasDeleted
    }
  }
`;

export const INVENTORY_ITEMS_QUERY = gql`
  query InventoryItems {
    inventoryItems { inventoryId name stockNumber stationId }
  }
`;

export const CREATE_EQUIPMENT_MUTATION = gql`
  mutation CreateEquipment($input: CreateEquipmentInput!) {
    createEquipment(input: $input) { equipmentId }
  }
`;

export const SAVE_LAB_LAYOUT_MUTATION = gql`
  mutation SaveLabLayout($input: SaveLabLayoutInput!) {
    saveLabLayout(input: $input) { layoutId revision name schemaVersion }
  }
`;

export const LAB_LAYOUT_QUERY = gql`
  query LabLayout($layoutId: ID!) {
    labLayout(layoutId: $layoutId) { layoutId revision name schemaVersion data createdAt }
  }
`;

export const LAB_LAYOUTS_QUERY = gql`
  query LabLayouts {
    labLayouts { layoutId revision name schemaVersion createdAt }
  }
`;

export const LAYOUT_SANDBOX_CAPABILITIES_QUERY = gql`
  query LayoutSandboxCapabilities {
    layoutSandboxCapabilities
  }
`;

// Kept as a regression fixture (cirrus-backend/scripts hits it directly via
// Docker-side GraphQL calls) — no longer called from the sandbox UI, which
// uses SOLVE_ZONE_REQUIREMENTS_MUTATION so zones come from the operations
// actually selected, not an even-split heuristic.
export const SOLVE_TOY_ZONING_MUTATION = gql`
  mutation SolveToyZoning($input: ToyZoningInput!) {
    solveToyZoning(input: $input) {
      cellZones
      zones
      status
      score
    }
  }
`;

export const SOLVE_ZONE_REQUIREMENTS_MUTATION = gql`
  mutation SolveZoneRequirements($input: SolveZoneRequirementsInput!) {
    solveZoneRequirements(input: $input) {
      status
      solveStatus
      cellZones
      blockingDiagnostics {
        operationId
        disposition
        reason
      }
      insufficientDataDiagnostics {
        operationIds
        reason
      }
      zoneRequirements {
        id
        family
        operationIds
        materialClasses
        requiresBsc
        sharingPolicy
        confirmedBiosafetyLevel
        minimumAreaCells
        targetAreaCells
      }
    }
  }
`;

// A saved plan's operation entries carry both the zone-policy context the
// user entered AND a snapshot of what the catalogue said about that
// operation at save time — see cirrus-backend's zoning-plans/zoning-plan.schema.ts
// for why the snapshot exists (it's what lets zoningPlanCatalogueDrift below
// detect a re-seed/import changing an operationId's meaning after the fact).
const PLANNED_OPERATION_SNAPSHOT_FIELDS = `
  key
  operationId
  operationNameSnapshot
  spatialKindSnapshot
  equipmentSnapshot
  catalogueSource
  catalogueRevision
  materialClass
  confirmedBiosafetyLevel
  aerosolPotential
  amplificationStage
`;

// Engine-state snapshot — see cirrus-backend's lab-program/engine-versions.ts
// and zoning/toy-zoning.model.ts. gridSizeFeet is client-supplied (part of
// SaveZoningPlanInput, like roomWidthFt/roomHeightFt); the three version
// fields are stamped server-side and only ever read back, never sent.
const PLAN_VERSION_FIELDS = `
  gridSizeFeet
  zoneCompilerVersion
  miniZincModelVersion
  areaCalculationVersion
`;

export const SAVE_ZONING_PLAN_MUTATION = gql`
  mutation SaveZoningPlan($input: SaveZoningPlanInput!) {
    saveZoningPlan(input: $input) {
      planId
      name
      roomWidthFt
      roomHeightFt
      operations { ${PLANNED_OPERATION_SNAPSHOT_FIELDS} }
      ${PLAN_VERSION_FIELDS}
      createdAt
      updatedAt
    }
  }
`;

export const ZONING_PLANS_QUERY = gql`
  query ZoningPlans {
    zoningPlans { planId name roomWidthFt roomHeightFt updatedAt }
  }
`;

export const ZONING_PLAN_QUERY = gql`
  query ZoningPlan($planId: ID!) {
    zoningPlan(planId: $planId) {
      planId
      name
      roomWidthFt
      roomHeightFt
      operations { ${PLANNED_OPERATION_SNAPSHOT_FIELDS} }
      ${PLAN_VERSION_FIELDS}
      updatedAt
    }
  }
`;

export const ZONING_PLAN_CATALOGUE_DRIFT_QUERY = gql`
  query ZoningPlanCatalogueDrift($planId: ID!) {
    zoningPlanCatalogueDrift(planId: $planId) { operationId savedRevision currentRevision }
  }
`;

export const DELETE_ZONING_PLAN_MUTATION = gql`
  mutation DeleteZoningPlan($planId: ID!) {
    deleteZoningPlan(planId: $planId)
  }
`;

export const START_LAYOUT_OPTIMIZATION_MUTATION = gql`
  mutation StartLayoutOptimization($input: StartLayoutOptimizationInput!) {
    startLayoutOptimization(input: $input) {
      runId status algorithmVersion baselineRevision result
    }
  }
`;

export const REVIEW_LAYOUT_CANDIDATE_MUTATION = gql`
  mutation ReviewLayoutCandidate($input: ReviewLayoutCandidateInput!) {
    reviewLayoutCandidate(input: $input) { seedId sourceRunId candidateIndex status strategy }
  }
`;

export const APPROVED_LAYOUT_SEEDS_QUERY = gql`
  query ApprovedLayoutSeeds {
    layoutSeeds(status: "approved") { seedId sourceRunId candidateIndex status strategy layout metrics createdAt updatedAt }
  }
`;

export const APPROVE_SANDBOX_LAYOUT_MUTATION = gql`
  mutation ApproveSandboxLayout($layout: JSON!) {
    approveSandboxLayout(layout: $layout) { seedId sourceRunId candidateIndex status strategy }
  }
`;

export const DELETE_LAYOUT_SEED_MUTATION = gql`
  mutation DeleteLayoutSeed($seedId: ID!) { deleteLayoutSeed(seedId: $seedId) }
`;

export const CREATE_INVENTORY_ITEM_MUTATION = gql`
  mutation CreateInventoryItem($input: CreateInventoryItemInput!) {
    createInventoryItem(input: $input) { inventoryId }
  }
`;

export const ASSIGN_EQUIPMENT_TO_STATION_MUTATION = gql`
  mutation AssignEquipmentToStation($equipmentId: String!, $stationId: String) {
    assignEquipmentToStation(equipmentId: $equipmentId, stationId: $stationId) { equipmentId stationId }
  }
`;

export const ASSIGN_INVENTORY_ITEM_TO_STATION_MUTATION = gql`
  mutation AssignInventoryItemToStation($inventoryId: String!, $stationId: String) {
    assignInventoryItemToStation(inventoryId: $inventoryId, stationId: $stationId) { inventoryId stationId }
  }
`;

export const DELETE_EQUIPMENT_MUTATION = gql`
  mutation DeleteEquipment($equipmentId: String!) {
    deleteEquipment(equipmentId: $equipmentId)
  }
`;

export const UPDATE_EQUIPMENT_MUTATION = gql`
  mutation UpdateEquipment($equipmentId: String!, $input: UpdateEquipmentInput!) {
    updateEquipment(equipmentId: $equipmentId, input: $input) {
      equipmentId name costUsd widthFt depthFt heightFt mounting needsDimensions
    }
  }
`;

export const EQUIPMENT_LISTS_QUERY = gql`
  query EquipmentLists {
    equipmentLists { listKey displayName equipmentIds }
  }
`;

export const ADD_EQUIPMENT_TO_LIST_MUTATION = gql`
  mutation AddEquipmentToList($listKey: String!, $equipmentId: String!) {
    addEquipmentToList(listKey: $listKey, equipmentId: $equipmentId) { listKey equipmentIds }
  }
`;

export const ADD_EQUIPMENT_TO_LIST_BULK_MUTATION = gql`
  mutation AddEquipmentToListBulk($listKey: String!, $equipmentIds: [String!]!) {
    addEquipmentToListBulk(listKey: $listKey, equipmentIds: $equipmentIds) { listKey equipmentIds }
  }
`;

export const REMOVE_EQUIPMENT_FROM_LIST_MUTATION = gql`
  mutation RemoveEquipmentFromList($listKey: String!, $equipmentId: String!) {
    removeEquipmentFromList(listKey: $listKey, equipmentId: $equipmentId) { listKey equipmentIds }
  }
`;

export const DELETE_INVENTORY_ITEM_MUTATION = gql`
  mutation DeleteInventoryItem($inventoryId: String!) {
    deleteInventoryItem(inventoryId: $inventoryId)
  }
`;

export const PROTOCOL_IDS_WITH_EQUIPMENT_MAPPINGS_QUERY = gql`
  query ProtocolIdsWithEquipmentMappings {
    protocolIdsWithEquipmentMappings
  }
`;

export const STEP_EQUIPMENT_MAPPINGS_FOR_PROTOCOL_QUERY = gql`
  query StepEquipmentMappingsForProtocol($protocolId: ID!) {
    stepEquipmentMappingsForProtocol(protocolId: $protocolId) {
      id
      protocolId
      stepId
      stepNumber
      equipmentId
    }
  }
`;

export const ASSIGN_EQUIPMENT_TO_STEP_MUTATION = gql`
  mutation AssignEquipmentToStep($input: AssignEquipmentToStepInput!) {
    assignEquipmentToStep(input: $input) {
      id
      stepId
      equipmentId
    }
  }
`;

export const REMOVE_STEP_EQUIPMENT_MAPPING_MUTATION = gql`
  mutation RemoveStepEquipmentMapping($id: ID!) {
    removeStepEquipmentMapping(id: $id)
  }
`;

export const EQUIPMENT_USAGE_FOR_PROTOCOL_QUERY = gql`
  query EquipmentUsageForProtocol($protocolId: ID!) {
    equipmentUsageForProtocol(protocolId: $protocolId) {
      equipmentId
      totalDurationSeconds
      missingDurationStepCount
      steps {
        stepId
        stepNumber
        durationSeconds
      }
    }
  }
`;

export const TRIGGER_CANVAS_SYNC_MUTATION = gql`
  mutation TriggerCanvasSync {
    triggerCanvasSync {
      equipmentSynced
      protocolsSynced
    }
  }
`;

export const PROTOCOL_BSL_QUERY = gql`
  query ProtocolBsl($protocolId: ID!) {
    protocolBsl(protocolId: $protocolId) {
      id
      protocolId
      bslLevel
    }
  }
`;

export const SET_PROTOCOL_BSL_MUTATION = gql`
  mutation SetProtocolBsl($input: SetProtocolBslInput!) {
    setProtocolBsl(input: $input) {
      id
      protocolId
      bslLevel
    }
  }
`;

export const CREATE_STATION_MUTATION = gql`
  mutation CreateStation($input: CreateStationInput!) {
    createStation(input: $input) { stationId }
  }
`;
