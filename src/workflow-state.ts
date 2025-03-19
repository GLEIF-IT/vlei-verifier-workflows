import SignifyClient from 'signify-ts';
import {
  buildCredentials,
  CredentialInfo,
  IdentifierData,
} from './utils/handle-json-config.js';
import { RULES, SCHEMAS, witnessIds } from './constants.js';

export class WorkflowState {
  private static instance: WorkflowState;
  configJson: any;
  schemas: any = SCHEMAS;
  rules: any = RULES;
  clients = new Map<string, SignifyClient.SignifyClient>();
  aids = new Map<string, any>();
  oobis = new Map<string, any[]>();
  credentialsInfo = new Map<string, CredentialInfo>();
  registries = new Map<string, { regk: string }>();
  credentials = new Map<string, { cred: any; credCesr: string }>();
  aidsInfo = new Map<string, IdentifierData>();
  kargsAID =
    witnessIds.length > 0 ? { toad: witnessIds.length, wits: witnessIds } : {};

  private constructor(configJson: any) {
    this.configJson = configJson;
    this.credentialsInfo = buildCredentials(configJson);
  }

  static getInstance(configJson: any = null): WorkflowState {
    if (!WorkflowState.instance) {
      if (!configJson)
        throw 'WorkflowState.getInstance: no configJson was provided';
      WorkflowState.instance = new WorkflowState(configJson);
    }
    return WorkflowState.instance;
  }

  static resetInstance() {
    if (WorkflowState.instance) {
      WorkflowState.instance = new WorkflowState(
        WorkflowState.instance.configJson
      );
    }
  }
}
