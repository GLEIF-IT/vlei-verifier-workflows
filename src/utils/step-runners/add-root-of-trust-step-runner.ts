import { StepRunner } from '../../types/step-runner.js';
import { EnvironmentRegistry, resolveEnvironment } from '../resolve-env.js';
import { getRootOfTrust } from '../test-util.js';
import { VerifierClient } from 'vlei-verifier-client';

export const ADD_ROOT_OF_TRUST = 'add_root_of_trust';

export class AddRootOfTrustStepRunner extends StepRunner {
  type: string = ADD_ROOT_OF_TRUST;

  public async run(stepName: string, step: any, config: any): Promise<any> {
    const env = resolveEnvironment(config[EnvironmentRegistry.ENVIRONMENT_CONTEXT]);
    const rot_aid = step.rot_aid;
    const rot_member_aid = step.rot_member_aid;
    const rootOfTrustData = await getRootOfTrust(
      config,
      rot_aid,
      rot_member_aid
    );
    const verifierClient = new VerifierClient(env.verifierBaseUrl);
    const response = await verifierClient.addRootOfTrust(
      rootOfTrustData.aid,
      rootOfTrustData.vlei,
      rootOfTrustData.oobi
    );

    return response;
  }
}
