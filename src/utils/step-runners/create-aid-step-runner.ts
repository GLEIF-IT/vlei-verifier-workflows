import { StepRunner } from '../../types/step-runner';
import { VleiIssuance } from '../../vlei-issuance';
import { getIdentifierData, IdentifierData } from '../handle-json-config';

export const CREATE_AID = 'create_aid';

export class CreateAidStepRunner extends StepRunner {
  type: string = CREATE_AID;
  public async run(
    stepName: string,
    step: any,
    config: any = null
  ): Promise<any> {
    const identifierData: IdentifierData = getIdentifierData(config, step.aid);
    const result = await VleiIssuance.createAid(identifierData);
    return result;
  }
}
