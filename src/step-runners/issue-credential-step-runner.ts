import { StepRunner } from '../types/step-runner.js';
import { VleiIssuance } from '../vlei-issuance.js';

export const ISSUE_CREDENTIAL = 'issue_credential';

export class IssueCredentialStepRunner extends StepRunner {
  type: string = ISSUE_CREDENTIAL;
  public async run(
    stepName: string,
    step: any,
    _config: any = null,
    _workflowObject?: any
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
