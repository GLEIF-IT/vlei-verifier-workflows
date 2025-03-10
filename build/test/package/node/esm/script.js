import * as workflow from '@gleif-it/vlei-verifier-workflows';
import {
  WorkflowRunner,
  StepRunner,
  getConfig,
  loadWorkflow,
} from '@gleif-it/vlei-verifier-workflows';

console.log('\n\x1b[34m**************');
console.log('* EcmaScript *');
console.log('**************\x1b[0m\n\n');

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

console.log('\x1b[32m[x] OK\x1b[0m');
