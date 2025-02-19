import { VleiIssuance } from "../vlei-issuance";

export abstract class StepRunner{
    type: string = "";
    public abstract run(vi: VleiIssuance, stepName: string, step: any, configJson: any): Promise<any>;
}

export class IssueCredentialStepRunner extends StepRunner{
    type: string = "issue_credential";
    public async run(vi: VleiIssuance, stepName: string, step: any, configJson: any = null): Promise<any>{
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


export class RevokeCredentialStepRunner extends StepRunner{
    type: string = "revoke_credential";
    public async run(vi: VleiIssuance, stepName: string, step: any, configJson: any = null): Promise<any>{
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



