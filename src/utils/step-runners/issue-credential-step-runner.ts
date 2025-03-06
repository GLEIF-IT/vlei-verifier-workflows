import { StepRunner } from '../../types/step-runner';
import { VleiIssuance } from '../../vlei-issuance';

export const ISSUE_CREDENTIAL = 'issue_credential';

export class IssueCredentialStepRunner extends StepRunner {
  type: string = ISSUE_CREDENTIAL;
  public async run(
    stepName: string,
    step: any,
    config: any = null,
    workflowObject?: any
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