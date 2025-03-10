import { StepRunner } from '../../types/step-runner';
import { VleiIssuance } from '../../vlei-issuance';

export const NOTIFY_CREDENTIAL_ISSUEE = 'notify_credential_issuee';

export class NotifyCredentialIssueeStepRunner extends StepRunner {
  type: string = NOTIFY_CREDENTIAL_ISSUEE;
  public async run(
    stepName: string,
    step: any,
    config: any = null,
    workflowObject?: any
  ): Promise<any> {
    const result = await VleiIssuance.notifyCredentialIssuee(
      step.credential,
      step.issuer_aid,
      step.issuee_aid
    );
    return result;
  }
}
