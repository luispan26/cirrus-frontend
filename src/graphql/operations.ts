import { gql } from '@apollo/client';

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
    equipmentList { equipmentId name costUsd widthFt depthFt heightFt stationId }
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

export const DELETE_INVENTORY_ITEM_MUTATION = gql`
  mutation DeleteInventoryItem($inventoryId: String!) {
    deleteInventoryItem(inventoryId: $inventoryId)
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
