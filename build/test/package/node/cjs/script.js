const workflow = require('@simple-ssi/vlei-verifier-workflows');

console.log('\n\x1b[34m************');
console.log('* CommonJS *');
console.log('************\x1b[0m\n\n');

// just make sure the imports are working
const workflowRunnerCtor = workflow.WorkflowRunner;
const stepRunnnerCtor = workflow.StepRunner;
const getConfigFunc = workflow.getConfig;
const loadWorkflowFunc = workflow.loadWorkflow;

console.log('\x1b[32m[x] OK\x1b[0m');
