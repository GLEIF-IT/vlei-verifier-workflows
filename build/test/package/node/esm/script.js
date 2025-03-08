import * as workflow from '@simple-ssi/vlei-verifier-workflows';
import {
  WorkflowRunner,
  StepRunner,
  getConfig,
  loadWorkflow,
} from '@simple-ssi/vlei-verifier-workflows';

// make sure namespace imports are working
let workflowRunnerCtor = workflow.WorkflowRunner;
let stepRunnnerCtor = workflow.StepRunner;
let getConfigFunc = workflow.getConfig;
let loadWorkflowFunc = workflow.loadWorkflow;

// make sure named imports are working
workflowRunnerCtor = WorkflowRunner;
stepRunnnerCtor = StepRunner;
getConfigFunc = getConfig;
loadWorkflowFunc = loadWorkflow;

console.log('\nesm ok');
