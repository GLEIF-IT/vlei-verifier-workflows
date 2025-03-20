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

  public async runWorkflow(): Promise<boolean> {
    try {
      const steps = this.workflow.workflow.steps;
      for (const [stepName, step] of Object.entries(steps)) {
        try {
          console.log(`Executing: ${step.description || stepName}`);
          
          const stepType = step.type;
          const stepRunner = this.stepRunners.get(stepType);
          
          if (!stepRunner) {
            const errorMsg = `No step runner registered for step type: ${stepType}`;
            console.error(`❌ ERROR in step "${stepName}": ${errorMsg}`);
            throw new Error(errorMsg);
          }
          
          await stepRunner.run(stepName, step, this.config);
          this.executedSteps.add(stepName);
          console.log(`✅ Successfully completed step: ${stepName}`);
        } catch (error) {
          // Instead of swallowing the error, print it clearly and rethrow
          console.error(`❌ ERROR in step "${stepName}":`);
          console.error(error);
          
          // Optionally print the step details for debugging
          console.error(`Step details:`, JSON.stringify(step, null, 2));
          
          // Rethrow to stop workflow execution
          throw error;
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Workflow execution failed:');
      console.error(error);
      return false;
    }
  }
}
