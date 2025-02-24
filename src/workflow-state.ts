import { SignifyClient } from 'signify-ts';
import {
  buildCredentials,
  CredentialInfo,
  IdentifierData,
} from './utils/handle-json-config';
import { RULES, SCHEMAS, witnessIds } from './constants';

export class WorkflowState {
  private static instance: WorkflowState;
  configJson: any;
  schemas: any = SCHEMAS;
  rules: any = RULES;
  clients: Map<string, SignifyClient> = new Map();
  aids: Map<string, any> = new Map();
  oobis: Map<string, Array<any>> = new Map();
  credentialsInfo: Map<string, CredentialInfo> = new Map();
  registries: Map<string, { regk: string }> = new Map();
  credentials: Map<string, any> = new Map();
  aidsInfo: Map<string, IdentifierData> = new Map();
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
    if (WorkflowState.instance){
      WorkflowState.instance = new WorkflowState(WorkflowState.instance.configJson);
    }    
  }

  public async preloadState(){

  }


}
