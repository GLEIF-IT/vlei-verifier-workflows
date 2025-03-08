const workflow = require('@simple-ssi/vlei-verifier-workflows');

// just make sure the imports are working
const workflowRunnerCtor = workflow.WorkflowRunner;
const stepRunnnerCtor = workflow.StepRunner;
const getConfigFunc = workflow.getConfig;
const loadWorkflowFunc = workflow.loadWorkflow;

console.log('\ncjs ok');
