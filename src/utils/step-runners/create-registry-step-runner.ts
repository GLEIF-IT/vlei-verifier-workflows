import { StepRunner } from '../../types/step-runner';
import { VleiIssuance } from '../../vlei-issuance';
import { getIdentifierData, IdentifierData } from '../handle-json-config';

export const CREATE_REGISTRY = 'create_registry';

export class CreateRegistryStepRunner extends StepRunner {
  type: string = CREATE_REGISTRY;
  public async run(
    stepName: string,
    step: any,
    config: any = null,
    workflowObject?: any
  ): Promise<any> {
    const identifierData: IdentifierData = getIdentifierData(config, step.aid);
    const result = await VleiIssuance.createRegistry(identifierData);
    return result;
  }
}
