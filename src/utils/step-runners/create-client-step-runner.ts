import { StepRunner } from '../../types/step-runner';
import { VleiIssuance } from '../../vlei-issuance';
import { getAgentSecret } from '../../utils/handle-json-config';
import { TestKeria } from '../test-keria';
import { Workflow } from '../../types/workflow';

export const CREATE_CLIENT = 'create_client';

export class CreateClientStepRunner extends StepRunner {
  type: string = CREATE_CLIENT;
  public async run(stepName: string, step: any, config: any): Promise<any> {
    const agentName = step.agent_name;
    const secret = getAgentSecret(config, agentName);
    const testKeria = await TestKeria.getInstance(config['context']);
    const result = await VleiIssuance.createClient(
      testKeria,
      secret,
      agentName
    );
    return result;
  }
}
