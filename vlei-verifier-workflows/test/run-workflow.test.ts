import { VleiIssuance } from "../src/vlei-issuance";
import path from "path";
import { resolveEnvironment, TestEnvironment } from "../src/utils/resolve-env";
import {
  getConfig,
} from "../src/utils/test-data";
import { WorkflowRunner } from "../src/utils/run-workflow";
import { strict as assert } from "assert";
import { loadWorkflow } from "../src/utils/test-data";
//import { GenerateReportStepRunner, ApiTestStepRunner } from '../src/utils/workflow-step-runners';

let env: TestEnvironment;

afterAll((done) => {
  done();
});
beforeAll((done) => {
  done();
  env = resolveEnvironment();
});


test.only("workflow", async function run() {
  const workflowsDir = "../src/workflows/";
  const workflowFile = env.workflow;
  const workflow = loadWorkflow(
    path.join(__dirname, `${workflowsDir}${workflowFile}`),
  );
  const configFileName = env.configuration;
  let dirPath = "../src/config/"
  const configFilePath = path.join(__dirname, dirPath) + configFileName
  const configJson = await getConfig(configFilePath);
  if (workflow && configJson) {
    const wr = new WorkflowRunner(workflow, configJson);    
    await wr.prepareClients();

    // Register the custom step runner
    //wr.registerRunner('generate_report', new GenerateReportStepRunner());
    //wr.registerRunner('api_test', new ApiTestStepRunner());
    //did this in run-workflows.ts

    const workflowRunResult = await wr.runWorkflow();
    assert.equal(workflowRunResult, true);
  }
}, 3600000);
