import { StepRunner } from './base-step-runner';
import { VleiIssuance } from '../../vlei-issuance';
import { TestKeria } from '../test-keria';
import { getAgentSecret } from '../handle-json-config';

export const CREATE_CLIENT = 'create_client';

export class CreateClientStepRunner extends StepRunner {
  type: string = CREATE_CLIENT;
  
  public async run(
    stepName: string,
    step: any,
    config: any = null,
    workflow?: any,
  ): Promise<any> {
    const agentName = step.agent_name;
    const secret = getAgentSecret(config, agentName);
    const testKeria = await TestKeria.getInstance(config['context']);
    const result = await VleiIssuance.createClient(testKeria, secret, agentName);
    return result;
  }
} 