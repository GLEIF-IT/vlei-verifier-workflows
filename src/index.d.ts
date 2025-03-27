declare module '@gleif-it/vlei-verifier-workflows' {
  export class TestPaths {
    private static instance: TestPaths;

    // All properties from TestPaths
    dockerComposeFile: string;
    maxReportMb: number;
    refreshTestData: boolean;
    testDir: string;
    testDataDir: string;
    testOrigReportsDir: string;
    tmpReportsDir: string;
    testFailReports: string;
    testSignedReports: string;
    testUsersDir: string;
    testUserName: string;
    testUserNum: number;
    testUserDir: string;
    testUserConfigFile: string;
    testTmpFailReports: string;
    testTmpSignedReports: string;
    testDataEbaDir: string;
    testReportUnsigned: string;
    testReportGeneratedUnsignedZip: string;
    testReportGeneratedSignedZip: string;
    workflowsDir: string;

    static getInstance(
      testUserName?: string,
      dockerComposeFile?: string
    ): TestPaths;
    static cleanupInstances(): void;
  }

  export interface TestEnvironment {
    preset: string;
    keriaAdminUrl: string;
    keriaBootUrl: string;
    witnessUrls: string[];
    witnessIds: string[];
    vleiServerUrl: string;
    verifierBaseUrl: string;
    workflow: string;
    configuration: string;
    [key: string]: any; // Allow for extension with additional properties
  }

  export type TestEnvironmentPreset =
    | 'docker'
    | 'local'
    | 'rootsid_dev'
    | 'rootsid_test'
    | string;

  export class EnvironmentRegistry {
    private static instance: EnvironmentRegistry;
    private environments: Map<string, (overrides?: any) => any>;
    public static ENVIRONMENT_CONTEXT: string;

    static getInstance(): EnvironmentRegistry;
    register<T extends TestEnvironment>(
      preset: string,
      configFn: (overrides: Partial<TestEnvironment>) => T
    ): void;
    getEnvironment<T extends TestEnvironment>(
      preset: string,
      overrides?: Partial<T>
    ): T;
  }

  export function resolveEnvironment<
    T extends TestEnvironment = TestEnvironment,
  >(envPreset?: string, overrides?: Partial<T>): T;

  export function listPackagedWorkflows(): string[];

  export function startDockerServices(
    dockerComposeFile: string
  ): Promise<boolean>;

  export class TestKeria {
    static AGENT_CONTEXT: string;

    static getInstance(
      contextName: string,
      testPaths?: TestPaths,
      keriaDomain?: string,
      keriaHost?: string,
      witnessHost?: string,
      basePort?: number,
      bankNum?: number,
      bankImage?: string,
      platform?: string
    ): Promise<TestKeria>;

    static cleanupInstances(): void;
  }

  export interface Workflow {
    workflow: {
      steps: Record<string, WorkflowStep>;
    };
  }

  export interface WorkflowStep {
    id: string;
    type: string;
    description?: string;
    [key: string]: any;
  }

  export class WorkflowRunner {
    stepRunners: Map<string, StepRunner>;
    config: any;
    workflow: Workflow;
    environmentContext: any;
    agentContext: any;
    executedSteps: Set<string>;
    lastError: any;

    constructor(
      workflow: Workflow,
      config: any,
      environmentContext?: any,
      agentContext?: any
    );
    registerRunner(type: string, runner: StepRunner): void;
    runWorkflow(): Promise<boolean>;
    getState(): any;
    getLastError(): any;
    private registerPredefinedRunners(): void;
  }

  export class StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class WorkflowState {
    private static instance: WorkflowState;
    config: any;
    schemas: any;
    rules: any;
    clients: Map<string, any>;
    aids: Map<string, any>;
    oobis: Map<string, any[]>;
    credentialsInfo: Map<string, CredentialInfo>;
    registries: Map<string, { regk: string }>;
    credentials: Map<string, { cred: any; credCesr: string }>;
    aidsInfo: Map<string, IdentifierData>;
    kargsAID: any;

    static getInstance(config?: any): WorkflowState;
    static resetInstance(): void;
  }

  export interface Aid {
    name: string;
    prefix: string;
    oobi: string;
  }

  export interface Notification {
    i: string;
    dt: string;
    r: boolean;
    a: { r: string; d?: string; m?: string };
  }

  export interface RetryOptions {
    retries?: number;
    minTimeout?: number;
    maxTimeout?: number;
    factor?: number;
  }

  export interface CredentialInfo {
    type: string;
    schema: string;
    rules?: string;
    privacy: boolean;
    attributes: any;
    credSource?: any;
  }

  export interface IdentifierData {
    type: 'singlesig' | 'multisig';
    name: string;
    delegator?: string;
    [key: string]: any;
  }

  export interface SinglesigIdentifierData extends IdentifierData {
    type: 'singlesig';
    agent: {
      name: string;
      secret: string;
      [key: string]: any;
    };
  }

  export interface MultisigIdentifierData extends IdentifierData {
    type: 'multisig';
    identifiers: string[];
    isith: string;
    nsith: string;
  }

  export interface EcrTestData {
    aid: string;
    credential: { raw: string; cesr: string; issueName?: string };
    lei: string;
    engagementContextRole: string;
  }

  export interface VleiUser {
    roleClient: any;
    ecrAid: any;
    creds: Record<string, { cred: any; credCesr: string }>;
    idAlias: string;
  }

  export interface User {
    type: string;
    LE: string;
    alias: string;
    identifiers: any;
  }

  // Functions from test-util.ts
  export function sleep(ms: number): Promise<void>;
  export function admitSinglesig(
    client: any,
    aidName: string,
    recipientAid: any
  ): Promise<void>;
  export function assertOperations(...clients: any[]): Promise<void>;
  export function assertNotifications(...clients: any[]): Promise<void>;
  export function createAid(client: any, name: string): Promise<Aid>;
  export function createAID(client: any, name: string): Promise<any>;
  export function createTimestamp(): string;
  export function getEndRoles(
    client: any,
    alias: string,
    role?: string
  ): Promise<any>;
  export function getGrantedCredential(
    client: any,
    credId: string
  ): Promise<any>;
  export function getIssuedCredential(
    issuerClient: any,
    issuerAID: any,
    recipientAID: any,
    schemaSAID: string
  ): Promise<any>;
  export function getOrCreateAID(
    client: any,
    name: string,
    kargs: any
  ): Promise<any>;
  export function getOrCreateClient(
    testKeria: TestKeria,
    bran?: string,
    getOnly?: boolean
  ): Promise<any>;
  export function getOrCreateClients(
    testKeria: TestKeria,
    count: number,
    brans: string[],
    getOnly: boolean
  ): Promise<any>;
  export function getOrCreateIdentifier(
    client: any,
    name: string
  ): Promise<[string, string]>;
  export function getOrIssueCredential(
    issuerClient: any,
    issuerAid: Aid,
    recipientAid: Aid,
    issuerRegistry: { regk: string },
    credData: any,
    schema: string,
    rules?: any,
    source?: any,
    privacy?: boolean
  ): Promise<any>;
  export function revokeCredential(
    issuerClient: any,
    issuerAid: Aid,
    credentialSaid: string
  ): Promise<any>;
  export function getStates(client: any, prefixes: string[]): Promise<any[]>;
  export function hasEndRole(
    client: any,
    alias: string,
    role: string,
    eid: string
  ): Promise<boolean>;
  export function warnNotifications(...clients: any[]): Promise<void>;
  export function deleteOperations<T = any>(
    client: any,
    op: any
  ): Promise<void>;
  export function getReceivedCredential(
    client: any,
    credId: string
  ): Promise<any>;
  export function markAndRemoveNotification(
    client: any,
    note: Notification
  ): Promise<void>;
  export function markNotification(
    client: any,
    note: Notification
  ): Promise<void>;
  export function resolveOobi(
    client: any,
    oobi: string,
    alias?: string
  ): Promise<void>;
  export function waitForCredential(
    client: any,
    credSAID: string,
    MAX_RETRIES?: number
  ): Promise<any>;
  export function waitAndMarkNotification(
    client: any,
    route: string
  ): Promise<string>;
  export function waitForNotifications(
    client: any,
    route: string,
    options?: RetryOptions
  ): Promise<Notification[]>;
  export function waitOperation<T = any>(
    client: any,
    op: any | string,
    signal?: AbortSignal
  ): Promise<any>;
  export function getOrCreateRegistry(
    client: any,
    aid: Aid,
    registryName: string
  ): Promise<{ name: string; regk: string }>;
  export function sendGrantMessage(
    senderClient: any,
    senderAid: Aid,
    recipientAid: Aid,
    credential: any
  ): Promise<void>;
  export function sendAdmitMessage(
    senderClient: any,
    senderAid: Aid,
    recipientAid: Aid
  ): Promise<void>;
  export function retry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T>;

  // Functions from handle-json-config.ts
  export function getIdentifierData(
    jsonConfig: any,
    aidName: string
  ): IdentifierData;
  export function getAgentSecret(jsonConfig: any, agentName: string): string;
  export function buildCredentials(
    jsonConfig: any
  ): Map<string, CredentialInfo>;
  export function buildAidData(jsonConfig: any): Promise<any>;

  export class SignReportStepRunner implements StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class IssueCredentialStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class RevokeCredentialStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class NotifyCredentialIssueeStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class VleiVerificationStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class CreateClientStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class CreateAidStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class CreateRegistryStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export class AddRootOfTrustStepRunner extends StepRunner {
    type: string;
    run(
      stepName: string,
      step: any,
      config?: any,
      workflowObject?: any
    ): Promise<any>;
  }

  export const VleiIssuance: {
    createClient(
      testKeria: TestKeria,
      secret: string,
      agentName: string
    ): Promise<boolean>;
    createAid(identifierData: IdentifierData): Promise<void>;
    fetchOobis(): Promise<void>;
    fetchOobi(identifierData: IdentifierData): Promise<void>;
    createContacts(identifierData: IdentifierData): Promise<void>;
    resolveOobi(identifierData: IdentifierData): void;
    createRegistry(identifierData: IdentifierData): Promise<void>;
    createAidSinglesig(identifierData: IdentifierData): Promise<any>;
    createAidMultisig(identifierData: IdentifierData): Promise<any>;
    createRegistryMultisig(identifierData: IdentifierData): Promise<any>;
    getOrIssueCredential(
      credId: string,
      credentialType: string,
      attributes: any,
      issuerAidKey: string,
      issueeAidKey: string,
      credentialSource?: any,
      generateTestData?: boolean,
      testName?: string
    ): Promise<any>;
    getOrIssueCredentialSingleSig(
      credId: string,
      credName: string,
      attributes: any,
      issuerAidKey: string,
      issueeAidKey: string,
      credSourceId?: string,
      generateTestData?: boolean,
      testName?: string
    ): Promise<any>;
    getOrIssueCredentialMultiSig(
      credId: string,
      credName: string,
      attributes: any,
      issuerAidKey: string,
      issueeAidKey: string,
      credSourceId?: string,
      generateTestData?: boolean,
      testName?: string
    ): Promise<any>;
    revokeCredential(
      credId: string,
      issuerAidKey: string,
      issueeAidKey: string,
      generateTestData?: boolean,
      testName?: string
    ): Promise<any>;
    revokeCredentialSingleSig(
      credId: string,
      issuerAidKey: string,
      issueeAidKey: string,
      generateTestData?: boolean,
      testName?: string
    ): Promise<any>;
    revokeCredentialMultiSig(
      credId: string,
      issuerAidKey: string,
      issueeAidKey: string,
      generateTestData?: boolean,
      testName?: string
    ): Promise<any>;
    notifyCredentialIssuee(
      credId: string,
      issuerAidKey: string,
      issueeAidKey: string
    ): Promise<any>;
    buildCredSource(credType: string, cred: any, o?: string): any;
  };

  export function getConfig(configPath: string): Promise<any>;
  export function loadWorkflow(workflowPath: string): Workflow;
  export function getWorkflowPath(workflowName: string): string;
  export function loadPackagedWorkflow(workflowName: string): Workflow;
  export function buildTestData(
    testData: EcrTestData,
    testName: string,
    issueName: string,
    fileNamePrefix?: string
  ): Promise<string>;

  export const ARG_KERIA_DOMAIN: string;
  export const ARG_KERIA_HOST: string;
  export const ARG_REFRESH: string;
  export const ARG_WITNESS_HOST: string;
  export const unknownPrefix: string;
  export const ECR_SCHEMA_SAID: string;

  // Step type constants
  export const ISSUE_CREDENTIAL: string;
  export const REVOKE_CREDENTIAL: string;
  export const NOTIFY_CREDENTIAL_ISSUEE: string;
  export const VLEI_VERIFICATION: string;
  export const CREATE_CLIENT: string;
  export const CREATE_AID: string;
  export const CREATE_REGISTRY: string;
  export const ADD_ROOT_OF_TRUST: string;

  // Witness IDs
  export const WAN: string;
  export const WIL: string;
  export const WES: string;
}
