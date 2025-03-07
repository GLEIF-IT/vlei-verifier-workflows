export { generateFileDigest } from './utils/generate-digest.js';
export { buildTestData, EcrTestData } from './utils/generate-test-data.js';
export {
  buildCredentials,
  buildAidData,
  User,
  CredentialInfo,
} from './utils/handle-json-config.js';
export { WorkflowRunner } from './utils/run-workflow.js';
export {
  getConfig,
  getGrantedCredential,
  VleiUser,
  loadWorkflow,
} from './utils/test-data.js';

export {
  StepRunner,
  IssueCredentialStepRunner,
  RevokeCredentialStepRunner,
  CreateAidStepRunner,
  CreateClientStepRunner,
  CreateRegistryStepRunner,
  AddRootOfTrustStepRunner,
  NotifyCredentialIssueeStepRunner,
  CredentialVerificationStepRunner,
} from './utils/workflow-step-runners.js';
export { WorkflowState } from './workflow-state.js';
export { VleiIssuance } from './vlei-issuance.js';
export { getOrCreateClients } from './utils/test-util.js';
