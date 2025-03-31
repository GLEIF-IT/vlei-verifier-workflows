export { generateFileDigest } from './utils/generate-digest.js';
export { buildTestData } from './utils/generate-test-data.js';
export { WorkflowRunner } from './utils/run-workflow.js';
export { getConfig, loadWorkflow } from './utils/test-data.js';
export { StepRunner } from './types/step-runner.js';

export { IssueCredentialStepRunner } from './step-runners/issue-credential-step-runner.js';
export { RevokeCredentialStepRunner } from './step-runners/revoke-credential-step-runner.js';
export { NotifyCredentialIssueeStepRunner } from './step-runners/notify-credential-issuee-step-runner.js';
export { VleiVerificationStepRunner } from './step-runners/vlei-verification-step-runner.js';
export { CreateClientStepRunner } from './step-runners/create-client-step-runner.js';
export { CreateAidStepRunner } from './step-runners/create-aid-step-runner.js';
export { CreateRegistryStepRunner } from './step-runners/create-registry-step-runner.js';
export { AddRootOfTrustStepRunner } from './step-runners/add-root-of-trust-step-runner.js';

export { Workflow, WorkflowStep } from './types/workflow.js';
export { WorkflowState } from './workflow-state.js';
export { VleiIssuance } from './vlei-issuance.js';
export { buildAidData } from './utils/handle-json-config.js';
export { startDockerServices } from './utils/test-docker.js';

export {
  ARG_KERIA_DOMAIN,
  ARG_KERIA_HOST,
  ARG_REFRESH,
  ARG_WITNESS_HOST,
  TestKeria,
} from './utils/test-keria.js';

export {
  WAN,
  WIL,
  WES,
  EnvironmentRegistry,
  resolveEnvironment,
} from './utils/resolve-env.js';

export {
  getWorkflowPath,
  loadPackagedWorkflow,
  listPackagedWorkflows,
} from './utils/workflow-helpers.js';

export { ECR_SCHEMA_SAID, unknownPrefix } from './constants.js';
export { TestPaths } from './utils/test-paths.js';

export { 
  ISSUE_CREDENTIAL,
  REVOKE_CREDENTIAL,
  NOTIFY_CREDENTIAL_ISSUEE,
  VLEI_VERIFICATION,
  CREATE_CLIENT,
  CREATE_AID,
  CREATE_REGISTRY,
  ADD_ROOT_OF_TRUST
} from './step-runners/index.js';

export {
  sleep,
  admitSinglesig,
  assertOperations,
  assertNotifications,
  createAid,
  createAID,
  createTimestamp,
  getEndRoles,
  getGrantedCredential,
  getIssuedCredential,
  getOrCreateAID,
  getOrCreateClient,
  getOrCreateClients,
  getOrCreateIdentifier,
  getOrIssueCredential,
  revokeCredential,
  getStates,
  hasEndRole,
  warnNotifications,
  deleteOperations,
  getReceivedCredential,
  markAndRemoveNotification,
  markNotification,
  resolveOobi,
  waitForCredential,
  waitAndMarkNotification,
  waitForNotifications,
  waitOperation,
  getOrCreateRegistry,
  sendGrantMessage,
  sendAdmitMessage,
} from './utils/test-util.js';

export {
  getIdentifierData,
  getAgentSecret,
  buildCredentials,
} from './utils/handle-json-config.js';

// Type exports
export type { TestEnvironment, TestEnvironmentPreset } from './utils/resolve-env.js';
export type { CredentialInfo, IdentifierData, SinglesigIdentifierData, MultisigIdentifierData } from './utils/handle-json-config.js';