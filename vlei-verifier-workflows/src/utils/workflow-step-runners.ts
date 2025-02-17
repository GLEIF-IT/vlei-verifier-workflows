import { VleiIssuance } from "../vlei-issuance";
import { CredentialVerification } from "../credential-verification";
import { CESRProccessor } from "./cesr-parser";
import {
  VleiUser,
  credPresentationStatusMapping,
  credAuthorizationStatusMapping,
} from "./test-data";
import { VleiVerifierAdapter } from "../vlei-verifier-adapter";
import { getRootOfTrust } from "./test-util";
import { resolveEnvironment } from "./resolve-env";

export abstract class StepRunner {
  type: string = "";
  public abstract run(
    vi: VleiIssuance,
    stepName: string,
    step: any,
    configJson: any,
  ): Promise<any>;
}

export class IssueCredentialStepRunner extends StepRunner {
  type: string = "issue_credential";
  public async run(
    vi: VleiIssuance,
    stepName: string,
    step: any,
    configJson: any = null,
  ): Promise<any> {
    const result = await vi.getOrIssueCredential(
      stepName,
      step.credential,
      step.attributes,
      step.issuer_aid,
      step.issuee_aid,
      step.credential_source,
      Boolean(step.generate_test_data),
      step.test_name,
    );
    return result;
  }
}

export class RevokeCredentialStepRunner extends StepRunner {
  type: string = "revoke_credential";
  public async run(
    vi: VleiIssuance,
    stepName: string,
    step: any,
    configJson: any = null,
  ): Promise<any> {
    const result = await vi.revokeCredential(
      step.credential,
      step.issuer_aid,
      step.issuee_aid,
      Boolean(step.generate_test_data),
      step.test_name,
    );
    return result;
  }
}

export class NotifyCredentialIssueeStepRunner extends StepRunner {
  type: string = "notify_credential_issuee";
  public async run(
    vi: VleiIssuance,
    stepName: string,
    step: any,
    configJson: any = null,
  ): Promise<any> {
    const result = await vi.notifyCredentialIssuee(
      step.credential,
      step.issuer_aid,
      step.issuee_aid,
    );
    return result;
  }
}

export class CredentialVerificationStepRunner extends StepRunner {
  type: string = "credential_verification";
  public async run(
    vi: VleiIssuance,
    stepName: string,
    step: any,
    configJson: any = null,
  ): Promise<any> {
    const credVerification = new CredentialVerification();
    const presenterAid = step.presenter_aid;
    const aid = vi.aids.get(presenterAid)![0];
    const aidInfo = vi.aidsInfo.get(presenterAid)!;
    const client = vi.clients.get(aidInfo.agent.name)![0];
    const credId = step.credential;
    const cred = vi.credentials.get(credId);
    const credCesr = await client.credentials().get(cred.sad.d, true);
    const vleiUser: VleiUser = {
      roleClient: client,
      ecrAid: aid,
      creds: { [credId]: { cred: cred, credCesr: credCesr } },
      idAlias: presenterAid,
    };
    for (const action of Object.values(step.actions) as any[]) {
      if (action.type == "presentation") {
        const credStatus = credPresentationStatusMapping.get(
          action.expected_status,
        );
        await credVerification.credentialPresentation(
          vleiUser,
          credId,
          credStatus,
        );
      } else if (action.type == "authorization") {
        const credStatus = credAuthorizationStatusMapping.get(
          action.expected_status,
        );
        await credVerification.credentialAuthorization(vleiUser, credStatus);
      } else {
        throw new Error(
          `credential_verification: Invalid action: ${action.type} `,
        );
      }
    }
    return true;
  }
}

export class AddRootOfTrustStepRunner extends StepRunner {
  type: string = "add_root_of_trust";

  public async run(
    vi: VleiIssuance,
    stepName: string,
    step: any,
    configJson: any,
  ): Promise<any> {
    const env = resolveEnvironment();

    const rootOfTrustData = await getRootOfTrust(configJson);
    const va = new VleiVerifierAdapter(env.verifierBaseUrl);
    const response = await va.addRootOfTrust(
      rootOfTrustData.aid,
      rootOfTrustData.vlei,
      rootOfTrustData.oobi,
    );

    return response;
  }
}
