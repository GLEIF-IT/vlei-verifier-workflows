import { StepRunner } from '../types/step-runner.js';
import { VleiIssuance } from '../vlei-issuance.js';
import { getAgentSecret } from '../utils/handle-json-config.js';
import { TestKeria } from '../utils/test-keria.js';

export const CREATE_CLIENT = 'create_client';

export class CreateClientStepRunner extends StepRunner {
  type: string = CREATE_CLIENT;
  public async run(_: string, step: any, config: any): Promise<any> {
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
