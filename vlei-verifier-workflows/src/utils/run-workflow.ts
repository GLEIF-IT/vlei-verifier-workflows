import { VleiIssuance } from "../vlei-issuance";
import { IssueCredentialStepRunner, 
         RevokeCredentialStepRunner, 
         StepRunner, 
         GenerateReportStepRunner, 
         ApiTestStepRunner } from "./workflow-step-runners";

const fs = require("fs");
const yaml = require("js-yaml");


export class WorkflowRunner{
  stepRunners: Map<string, StepRunner> = new Map<string, StepRunner>();
  configJson: any;
  workflow: any;
  vi: VleiIssuance;
  executedSteps = new Set(); 

  constructor(workflow: any, configJson: any) {
    this.configJson = configJson;
    this.workflow = workflow;
    this.vi = new VleiIssuance(this.configJson);    
    this.registerPredefinedRunners();
  }

  private registerPredefinedRunners(){
    this.registerRunner("issue_credential", new IssueCredentialStepRunner());
    this.registerRunner("revoke_credential", new RevokeCredentialStepRunner());
    this.registerRunner("generate_report", new GenerateReportStepRunner());
    this.registerRunner("api_test", new ApiTestStepRunner());
  }

  public async prepareClients() {
    await this.vi.prepareClients();
    await this.vi.createRegistries();
  }

  public registerRunner(name: string, runner: StepRunner){
    this.stepRunners.set(name, runner);
  }

  public async runWorkflow() {  
    for (const [stepName, step] of Object.entries(this.workflow.workflow.steps) as any[]) {
      console.log(`Executing: ${step.description}`);
      const runner = this.stepRunners.get(step.type);
      if (!runner){
        console.log(`No step runner was registered for step '${step.type}'`);
        return false;
      }
      await runner?.run(this.vi, stepName, step, this.configJson);
      this.executedSteps.add(step.id);
    }
    console.log(`Workflow steps execution finished successfully`);
    return true;
  }

}


