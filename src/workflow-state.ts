import SignifyClient from 'signify-ts';
import {
  buildCredentials,
  CredentialInfo,
  IdentifierData,
} from './utils/handle-json-config.js';
import { RULES, SCHEMAS, witnessIds } from './constants.js';

export class WorkflowState {
  private static instance: WorkflowState;
  config: any;
  schemas: any = SCHEMAS;
  rules: any = RULES;
  clients = new Map<string, SignifyClient.SignifyClient>();
  aids = new Map<string, any>();
  oobis = new Map<string, any[]>();
  credentialsInfo = new Map<string, CredentialInfo>();
  registries = new Map<string, { regk: string }>();
  credentials = new Map<string, any>();
  aidsInfo = new Map<string, IdentifierData>();
  kargsAID =
    witnessIds.length > 0 ? { toad: witnessIds.length, wits: witnessIds } : {};

  private constructor(config: any) {
    this.config = config;
    this.credentialsInfo = buildCredentials(config);
  }

  static getInstance(config = null): WorkflowState {
    if (!WorkflowState.instance) {
      if (!config) throw 'WorkflowState.getInstance: no config was provided';
      WorkflowState.instance = new WorkflowState(config);
    }
    return WorkflowState.instance;
  }

  static resetInstance() {
    if (WorkflowState.instance) {
      WorkflowState.instance = new WorkflowState(WorkflowState.instance.config);
    }
  }
}
