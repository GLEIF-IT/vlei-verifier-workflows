import { StepRunner } from '../../types/step-runner';
import { CredentialVerification } from '../../credential-verification';
import { WorkflowState } from '../../workflow-state';
import { 
  VleiUser, 
  credPresentationStatusMapping, 
  credAuthorizationStatusMapping 
} from '../test-data';
import { 
  MultisigIdentifierData, 
  SinglesigIdentifierData 
} from '../handle-json-config';

export const CREDENTIAL_VERIFICATION = 'credential_verification';

export class CredentialVerificationStepRunner extends StepRunner {
  type: string = CREDENTIAL_VERIFICATION;
  public async run(
    stepName: string,
    step: any,
    config: any = null,
    workflowObject?: any,
    context?: string
  ): Promise<any> {
    const workflow_state = WorkflowState.getInstance(config);
    const credVerification = new CredentialVerification();
    const presenterAid = step.presenter_aid;
    const aid = workflow_state.aids.get(presenterAid);
    const aidInfo = workflow_state.aidsInfo.get(presenterAid)!;
    let client;
    if (aidInfo.type == 'multisig') {
      const multisigIdentifierData = aidInfo as MultisigIdentifierData;
      const multisigMemberAidInfo = workflow_state.aidsInfo.get(
        multisigIdentifierData.identifiers![0]
      )! as SinglesigIdentifierData;
      client = workflow_state.clients.get(multisigMemberAidInfo.agent!.name);
    } else {
      const singlesigIdentifierData = aidInfo as SinglesigIdentifierData;
      client = workflow_state.clients.get(singlesigIdentifierData.agent!.name);
    }

    const credId = step.credential;
    const cred = workflow_state.credentials.get(credId);
    const credCesr = await client!.credentials().get(cred.sad.d, true);
    const vleiUser: VleiUser = {
      roleClient: client,
      ecrAid: aid,
      creds: { [credId]: { cred: cred, credCesr: credCesr } },
      idAlias: presenterAid,
    };
    for (const action of Object.values(step.actions) as any[]) {
      if (action.type == 'presentation') {
        const credStatus = credPresentationStatusMapping.get(
          action.expected_status
        );
        await credVerification.credentialPresentation(
          vleiUser,
          credId,
          credStatus
        );
      } else if (action.type == 'authorization') {
        const credStatus = credAuthorizationStatusMapping.get(
          action.expected_status
        );
        await credVerification.credentialAuthorization(vleiUser, credStatus);
      } else {
        throw new Error(
          `credential_verification: Invalid action: ${action.type} `
        );
      }
    }
    return true;
  }
} 