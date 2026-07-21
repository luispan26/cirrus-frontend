import { gql } from '@apollo/client';

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


