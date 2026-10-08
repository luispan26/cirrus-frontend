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

export const MAXIMIZE_ZONES_AND_BENCHES_MUTATION = gql`
  mutation MaximizeZonesAndBenches($input: MaximizeZonesAndBenchesInput!) {
    maximizeZonesAndBenches(input: $input) {
      totalZones
      totalBenches
      zoneHandoff {
        grid {
          rows
          columns
          cellSizeInches
          usableCells {
            row
            column
          }
          blockedCells {
            row
            column
          }
          reservedCirculationCells {
            row
            column
          }
        }
        fixedFeatures {
          id
          type
          cells {
            row
            column
          }
        }
        zones {
          id
          family
          minimumWidthCells
          cells {
            row
            column
          }
          circulationAccessCells {
            row
            column
          }
        }
      }
      benchResult {
        solveStatus
        accessConnectivityMode
        validation {
          state
          violations
          unroutableBenchIds
          navigableRegionCells {
            row
            column
          }
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
        aisleCells {
          row
          column
        }
        equipmentPlaceableCells {
          row
          column
        }
        aisleAreaSqFt
        equipmentPlaceableAreaSqFt
        unusedAreaSqFt
        islands { id orientation benchIds }
        arrangement { orientation workingAisleFt crossAisleFt maxBenchesPerIslandSide mode mainWall sameDirection wallBenches }
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
  }
`;

// Same result shape as MAXIMIZE_ZONES_AND_BENCHES_MUTATION, but takes the
// Sandbox's own flat-cell-index geometry (buildLayoutGeometryInput's
// output) instead of an intake-style width/height/door — so a real,
// hand-drawn room (columns, restricted regions, the actual exit door
// position) can be maximized directly.
export const MAXIMIZE_ZONES_AND_BENCHES_FOR_SANDBOX_MUTATION = gql`
  mutation MaximizeZonesAndBenchesForSandbox($input: MaximizeZonesAndBenchesForSandboxInput!) {
    maximizeZonesAndBenchesForSandbox(input: $input) {
      totalZones
      totalBenches
      zoneHandoff {
        grid {
          rows
          columns
          cellSizeInches
          usableCells {
            row
            column
          }
          blockedCells {
            row
            column
          }
          reservedCirculationCells {
            row
            column
          }
        }
        fixedFeatures {
          id
          type
          cells {
            row
            column
          }
        }
        zones {
          id
          family
          minimumWidthCells
          cells {
            row
            column
          }
          circulationAccessCells {
            row
            column
          }
        }
      }
      benchResult {
        solveStatus
        accessConnectivityMode
        validation {
          state
          violations
          unroutableBenchIds
          navigableRegionCells {
            row
            column
          }
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
        aisleCells {
          row
          column
        }
        equipmentPlaceableCells {
          row
          column
        }
        aisleAreaSqFt
        equipmentPlaceableAreaSqFt
        unusedAreaSqFt
        islands { id orientation benchIds }
        arrangement { orientation workingAisleFt crossAisleFt maxBenchesPerIslandSide mode mainWall sameDirection wallBenches }
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

// Before generating: does the room hold the benches the equipment needs?
// Takes the intake JSON as the questionnaire would submit it.
export const LAYOUT_CAPACITY_CHECK_QUERY = gql`
  query LayoutCapacityCheck($intake: JSON!) {
    layoutCapacityCheck(intake: $intake) {
      benches
      benchAreaSqFt
      benchNeedSqFt
      shortfallSqFt
      roomTooSmall
      zones { id name benchNeedSqFt benchAreaSqFt }
    }
  }
`;

// Zone and layout-setting edits from the report's floor plan; returns the
// report with its re-run generated layout.
export const UPDATE_REPORT_LAYOUT_MUTATION = gql`
  mutation UpdateReportLayout($reportId: ID!, $edit: LayoutEditInput!) {
    updateReportLayout(reportId: $reportId, edit: $edit) {
      id
      data
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

export const USERS_COUNT_QUERY = gql`
  query UsersCount {
    usersCount
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

export const REPORTS_COUNT_QUERY = gql`
  query ReportsCount {
    reportsCount
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

export const EQUIPMENT_LIST_QUERY = gql`
  query EquipmentList {
    equipmentList {
      equipmentId name costUsd widthFt depthFt heightFt utilityType utilityRequirements mounting
      needsDimensions canvasDeleted canvasTags tags allTags
    }
  }
`;

// Lighter than EQUIPMENT_LIST_QUERY above — the Dashboard's "Registered
// Equipment" stat only needs a count, not every field.
export const EQUIPMENT_COUNT_QUERY = gql`
  query EquipmentCount {
    equipmentList {
      equipmentId
    }
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

export const CREATE_INVENTORY_ITEM_MUTATION = gql`
  mutation CreateInventoryItem($input: CreateInventoryItemInput!) {
    createInventoryItem(input: $input) { inventoryId }
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

export const VALIDATED_PROTOCOLS_QUERY = gql`
  query ValidatedProtocols {
    validatedProtocols {
      id
      protocolId
      title
      sourceUrl
      cellTypes
      essential
      createdAt
    }
  }
`;

export const REMOVE_VALIDATED_PROTOCOL_MUTATION = gql`
  mutation RemoveValidatedProtocol($protocolId: ID!) {
    removeValidatedProtocol(protocolId: $protocolId)
  }
`;

export const SET_VALIDATED_PROTOCOL_CELL_TYPES_MUTATION = gql`
  mutation SetValidatedProtocolCellTypes($protocolId: ID!, $cellTypes: [String!]!) {
    setValidatedProtocolCellTypes(protocolId: $protocolId, cellTypes: $cellTypes) {
      id
      protocolId
      cellTypes
      essential
    }
  }
`;

export const SET_VALIDATED_PROTOCOL_ESSENTIAL_MUTATION = gql`
  mutation SetValidatedProtocolEssential($protocolId: ID!, $essential: Boolean!) {
    setValidatedProtocolEssential(protocolId: $protocolId, essential: $essential) {
      id
      protocolId
      essential
    }
  }
`;

export const IS_PROTOCOL_VALIDATED_QUERY = gql`
  query IsProtocolValidated($protocolId: ID!) {
    isProtocolValidated(protocolId: $protocolId)
  }
`;

export const VALIDATE_PROTOCOL_MUTATION = gql`
  mutation ValidateProtocol($input: ValidateProtocolInput!) {
    validateProtocol(input: $input) {
      id
      protocolId
      title
      sourceUrl
    }
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
