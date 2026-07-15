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
