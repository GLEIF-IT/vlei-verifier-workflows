import { StepRunner } from './base-step-runner.js';
import { VleiIssuance } from '../../vlei-issuance.js';
import { TestKeria } from '../test-keria.js';
import { getAgentSecret } from '../handle-json-config.js';

export const CREATE_CLIENT = 'create_client';

export class CreateClientStepRunner extends StepRunner {
  type: string = CREATE_CLIENT;

  public async run(
    stepName: string,
    step: any,
    config: any = null,
    workflow?: any
  ): Promise<any> {
    const agentName = step.agent_name;
    const secret = getAgentSecret(config, agentName);
    const testKeria = await TestKeria.getInstance(config[TestKeria.AGENT_CONTEXT]);
    const result = await VleiIssuance.createClient(
      testKeria,
      secret,
      agentName
    );
    return result;
  }
}
