import { Workflow } from '../types/workflow.js';
import { WorkflowState } from '../workflow-state.js';

import {
  StepRunner,
  ISSUE_CREDENTIAL,
  REVOKE_CREDENTIAL,
  NOTIFY_CREDENTIAL_ISSUEE,
  VLEI_VERIFICATION,
  CREATE_CLIENT,
  CREATE_AID,
  CREATE_REGISTRY,
  ADD_ROOT_OF_TRUST,
  IssueCredentialStepRunner,
  RevokeCredentialStepRunner,
  NotifyCredentialIssueeStepRunner,
  VleiVerificationStepRunner,
  CreateClientStepRunner,
  CreateAidStepRunner,
  CreateRegistryStepRunner,
  AddRootOfTrustStepRunner,
} from '../step-runners/index.js';

export class WorkflowRunner {
  stepRunners: Map<string, StepRunner> = new Map<string, StepRunner>();
  config: any;
  workflow: Workflow;
  environmentContext: any;
  agentContext: any;
  executedSteps = new Set<string>();

  constructor(workflow: Workflow, config: any, environmentContext: any, agentContext: any) {
    this.config = config;
    this.workflow = workflow;
    this.environmentContext = environmentContext;
    this.agentContext = agentContext;
    WorkflowState.getInstance(this.config);
    this.registerPredefinedRunners();
  }

  private registerPredefinedRunners(): void {
    this.registerRunner(CREATE_CLIENT, new CreateClientStepRunner());
    this.registerRunner(CREATE_AID, new CreateAidStepRunner());
    this.registerRunner(CREATE_REGISTRY, new CreateRegistryStepRunner());
    this.registerRunner(ISSUE_CREDENTIAL, new IssueCredentialStepRunner());
    this.registerRunner(REVOKE_CREDENTIAL, new RevokeCredentialStepRunner());
    this.registerRunner(ADD_ROOT_OF_TRUST, new AddRootOfTrustStepRunner());
    this.registerRunner(
      NOTIFY_CREDENTIAL_ISSUEE,
      new NotifyCredentialIssueeStepRunner()
    );
    this.registerRunner(VLEI_VERIFICATION, new VleiVerificationStepRunner());
  }

  public registerRunner(type: string, runner: StepRunner): void {
    this.stepRunners.set(type, runner);
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
      await runner.run(stepName, step, this.config);
      this.executedSteps.add(step.id);
    }
    console.log(`Workflow steps execution finished successfully`);
    return true;
  }
}
