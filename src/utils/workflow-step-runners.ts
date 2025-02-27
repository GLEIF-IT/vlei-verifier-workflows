import { VleiIssuance } from '../vlei-issuance';
import { CredentialVerification } from '../credential-verification';
import { CESRProccessor } from './cesr-parser';
import {
  VleiUser,
  credPresentationStatusMapping,
  credAuthorizationStatusMapping,
} from './test-data';
import {
  getAgentSecret,
  getIdentifierData,
  IdentifierData,
  MultisigIdentifierData,
  SinglesigIdentifierData,
} from './handle-json-config';
import { WorkflowState } from '../workflow-state';
import { resolveEnvironment } from './resolve-env';
import { getRootOfTrust } from './test-util';
import { VerifierClient } from 'vlei-verifier-client';

export abstract class StepRunner {
  type: string = '';
  public abstract run(
    stepName: string,
    step: any,
    configJson: any
  ): Promise<any>;
}

export class CreateClientStepRunner extends StepRunner {
  type: string = 'create_client';
  public async run(
    stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const agentName = step.agent_name;
    const secret = getAgentSecret(configJson, agentName);
    const result = await VleiIssuance.createClient(secret, agentName);
    return result;
  }
}

export class CreateAidStepRunner extends StepRunner {
  type: string = 'create_aid';
  public async run(
    stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const identifierData: IdentifierData = getIdentifierData(
      configJson,
      step.aid
    );
    const result = await VleiIssuance.createAid(identifierData);
    return result;
  }
}

export class CreateRegistryStepRunner extends StepRunner {
  type: string = 'create_registry';
  public async run(
    stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const identifierData: IdentifierData = getIdentifierData(
      configJson,
      step.aid
    );
    const result = await VleiIssuance.createRegistry(identifierData);
    return result;
  }
}

export class IssueCredentialStepRunner extends StepRunner {
  type: string = 'issue_credential';
  public async run(
    stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const result = await VleiIssuance.getOrIssueCredential(
      stepName,
      step.credential,
      step.attributes,
      step.issuer_aid,
      step.issuee_aid,
      step.credential_source,
      Boolean(step.generate_test_data),
      step.test_name
    );
    return result;
  }
}

export class RevokeCredentialStepRunner extends StepRunner {
  type: string = 'revoke_credential';
  public async run(
    stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const result = await VleiIssuance.revokeCredential(
      step.credential,
      step.issuer_aid,
      step.issuee_aid,
      Boolean(step.generate_test_data),
      step.test_name
    );
    return result;
  }
}

export class NotifyCredentialIssueeStepRunner extends StepRunner {
  type: string = 'notify_credential_issuee';
  public async run(
    stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const result = await VleiIssuance.notifyCredentialIssuee(
      step.credential,
      step.issuer_aid,
      step.issuee_aid
    );
    return result;
  }
}

export class CredentialVerificationStepRunner extends StepRunner {
  type: string = 'credential_verification';
  public async run(
    stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const workflow_state = WorkflowState.getInstance();
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

export class AddRootOfTrustStepRunner extends StepRunner {
  type: string = 'add_root_of_trust';

  public async run(stepName: string, step: any, configJson: any): Promise<any> {
    const env = resolveEnvironment();
    const rot_aid = step.rot_aid;
    const rot_member_aid = step.rot_member_aid;
    const rootOfTrustData = await getRootOfTrust(
      configJson,
      rot_aid,
      rot_member_aid
    );
    const verifierClient = new VerifierClient(env.verifierBaseUrl);
    const response = await verifierClient.addRootOfTrust(
      rootOfTrustData.aid,
      rootOfTrustData.vlei,
      rootOfTrustData.oobi
    );

    return response;
  }
}
