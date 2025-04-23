import { VleiIssuance } from '../vlei-issuance';
import { CredentialVerification } from '../credential-verification';
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
import { getRootOfTrust, signReportZip } from './test-util';
import { VerifierClient } from 'vlei-verifier-client';
import { createSimpleSignature } from './test-util';
import * as path from 'path';

export abstract class StepRunner {
  type = '';
  public abstract run( // considering most overriden versions of this method do not use either stepName or configJson, this method signature should be reexamined
    stepName: string,
    step: any,
    configJson: any
  ): Promise<any>;
}

export class CreateClientStepRunner extends StepRunner {
  type = 'create_client';
  public async run(
    _stepName: string,
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
  type = 'create_aid';
  public async run(
    _stepName: string,
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
  type = 'create_registry';
  public async run(
    _stepName: string,
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
  type = 'issue_credential';
  public async run(
    stepName: string,
    step: any,
    _configJson: any = null
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
  type = 'revoke_credential';
  public async run(
    _stepName: string,
    step: any,
    _configJson: any = null
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
  type = 'notify_credential_issuee';
  public async run(
    _stepName: string,
    step: any,
    _configJson: any = null
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
  type = 'credential_verification';
  public async run(
    _stepName: string,
    step: any,
    _configJson: any = null
  ): Promise<any> {
    const workflow_state = WorkflowState.getInstance();
    const credVerification = new CredentialVerification();
    const presenterAid = step.presenter_aid;
    const aid = workflow_state.aids.get(presenterAid);
    const aidInfo = workflow_state.aidsInfo.get(presenterAid);
    let client;
    if (
      aidInfo !== undefined &&
      aidInfo.type !== undefined &&
      aidInfo.type == 'multisig'
    ) {
      const multisigIdentifierData = aidInfo as MultisigIdentifierData;
      const multisigMemberAidInfo = workflow_state.aidsInfo.get(
        multisigIdentifierData.identifiers[0]
      ) as SinglesigIdentifierData;
      client = workflow_state.clients.get(multisigMemberAidInfo.agent.name);
    } else {
      const singlesigIdentifierData = aidInfo as SinglesigIdentifierData;
      client = workflow_state.clients.get(singlesigIdentifierData.agent.name);
    }

    const credId = step.credential;
    const cred = workflow_state.credentials.get(credId);
    const credCesr =
      client !== undefined
        ? await client.credentials().get(cred.sad.d, true)
        : undefined;
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
  type = 'add_root_of_trust';

  public async run(
    _stepName: string,
    step: any,
    configJson: any
  ): Promise<any> {
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

export class SignReportStepRunner extends StepRunner {
  type = 'sign_report';
  public async run(
    _stepName: string,
    step: any,
  ): Promise<any> {
    const workflow_state = WorkflowState.getInstance();
    const client = workflow_state.clients.get(step.agent_name);
    if (!client) throw new Error(`No client for agent ${step.agent_name}`);

    const aidState = workflow_state.aids.get(step.aid);
    if (!aidState) throw new Error(`No AID state for ${step.aid}`);
    const keeper = client?.manager?.get(aidState);
    if (!keeper) {
      throw new Error(`Keeper not found for aid: ${step.aid}`);
    }
    const reportsDir = path.join(__dirname, '..', 'reports');

    const unsignedZip = path.join(reportsDir, step.reportFileName);
    const signedZip   = path.join(
      reportsDir,
      step.reportFileName.replace(/\.zip$/, '_signed.zip')
    );
    return await signReportZip(unsignedZip, signedZip, aidState.prefix, keeper);
  }
}
