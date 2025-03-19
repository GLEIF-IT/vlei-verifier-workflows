import { StepRunner } from '../../types/step-runner.js';
import { VleiIssuance } from '../../vlei-issuance.js';

export const REVOKE_CREDENTIAL = 'revoke_credential';

export class RevokeCredentialStepRunner extends StepRunner {
  type: string = REVOKE_CREDENTIAL;
  public async run(
    stepName: string,
    step: any,
    config: any = null,
    workflowObject?: any
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
