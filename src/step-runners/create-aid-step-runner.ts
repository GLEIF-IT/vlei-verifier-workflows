import { StepRunner } from '../types/step-runner.js';
import { VleiIssuance } from '../vlei-issuance.js';
import {
  getIdentifierData,
  IdentifierData,
} from '../utils/handle-json-config.js';

export const CREATE_AID = 'create_aid';

export class CreateAidStepRunner extends StepRunner {
  type: string = CREATE_AID;
  public async run(_: string, step: any, config: any = null): Promise<any> {
    const identifierData: IdentifierData = getIdentifierData(config, step.aid);
    const result = await VleiIssuance.createAid(identifierData);
    return result;
  }
}
