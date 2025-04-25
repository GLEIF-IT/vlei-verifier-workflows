import { WorkflowState } from '../workflow-state.js';

import {
  IssueCredentialStepRunner,
  NotifyCredentialIssueeStepRunner,
  RevokeCredentialStepRunner,
  StepRunner,
  VleiVerificationStepRunner,
  CreateClientStepRunner,
  CreateAidStepRunner,
  CreateRegistryStepRunner,
  AddRootOfTrustStepRunner,
  SleepStepRunner,
} from './workflow-step-runners.js';

export class WorkflowRunner {
  stepRunners: Map<string, StepRunner> = new Map<string, StepRunner>();
  configJson: any;
  workflow: any;
  executedSteps = new Set();

  constructor(workflow: any, configJson: any) {
    this.configJson = configJson;
    this.workflow = workflow;
    WorkflowState.getInstance(this.configJson);
    this.registerPredefinedRunners();
  }

  private registerPredefinedRunners() {
    this.registerRunner('create_client', new CreateClientStepRunner());
    this.registerRunner('create_aid', new CreateAidStepRunner());
    this.registerRunner('create_registry', new CreateRegistryStepRunner());
    this.registerRunner('issue_credential', new IssueCredentialStepRunner());
    this.registerRunner('revoke_credential', new RevokeCredentialStepRunner());
    this.registerRunner('add_root_of_trust', new AddRootOfTrustStepRunner());
    this.registerRunner(
      'notify_credential_issuee',
      new NotifyCredentialIssueeStepRunner()
    );
    this.registerRunner('vlei_verification', new VleiVerificationStepRunner());
    this.registerRunner('sleep', new SleepStepRunner());
  }

  public registerRunner(name: string, runner: StepRunner) {
    this.stepRunners.set(name, runner);
  }

  public async runWorkflow() {
    for (const [stepName, step] of Object.entries(
      this.workflow.workflow.steps
    ) as any[]) {
      console.log(`Executing: ${step.description}`);
      const runner = this.stepRunners.get(step.type);
      if (!runner) {
        console.log(`No step runner was registered for step '${step.type}'`);
        return false;
      }
      await runner.run(stepName, step, this.configJson);
      this.executedSteps.add(step.id);
    }
    console.log(`Workflow steps execution finished successfully`);
    return true;
  }
}
