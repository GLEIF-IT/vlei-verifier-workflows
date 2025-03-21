import { StepRunner } from '../types/step-runner.js';
import { VleiIssuance } from '../vlei-issuance.js';

export const NOTIFY_CREDENTIAL_ISSUEE = 'notify_credential_issuee';

export class NotifyCredentialIssueeStepRunner extends StepRunner {
  type: string = NOTIFY_CREDENTIAL_ISSUEE;
  public async run(
    _stepName: string,
    step: any,
    _config: any = null,
    _workflowObject?: any
  ): Promise<any> {
    const result = await VleiIssuance.notifyCredentialIssuee(
      step.credential,
      step.issuer_aid,
      step.issuee_aid
    );
    return result;
  }
}
