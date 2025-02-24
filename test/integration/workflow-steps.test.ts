import path from "path";
import { resolveEnvironment, TestEnvironment } from "../../src/utils/resolve-env";
import { getConfig } from "../../src/utils/test-data";
import { WorkflowRunner } from "../../src/utils/run-workflow";
import { strict as assert } from "assert";
import { loadWorkflow } from "../../src/utils/test-data";
import { WorkflowState } from "../../src/workflow-state";

let env: TestEnvironment;


describe("testing Client creation workflow step", () => {
  test("successful client creation", async function run() {
    const workflowsDir = "./workflows/";
    const workflowFile = "create-client.yaml";
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`),
    );
    const agentName = "client-agent-1";
    const configFileName = "create-client.json";
    const configDir = "./config/";
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      const workflowRunResult = await wr.runWorkflow();
      const workflowState = WorkflowState.getInstance();
      expect(workflowRunResult).toEqual(true);
      expect(workflowState.clients.get(agentName)).not.toEqual(undefined);
    }
    else throw("Invalid workflow of configuration");
  }, 3600000);
});


describe("testing AID creation workflow step", () => {
  test("successful AID creation", async function run() {
    const workflowsDir = "./workflows/";
    const workflowFile = "create-aid-valid.yaml";
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`),
    );
    const aidName = "aid-1";
    const configFileName = "create-aid.json";
    const configDir = "./config/";
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      const workflowRunResult = await wr.runWorkflow();
      const workflowState = WorkflowState.getInstance();
      expect(workflowRunResult).toEqual(true);
      expect(workflowState.aids.get(aidName)).not.toEqual(undefined);
    }
    else throw("Invalid workflow of configuration");
  }, 3600000);

  test("AID creation failed. Client was not created", async function run() {
    const workflowsDir = "./workflows/";
    const workflowFile = "create-aid-invalid.yaml";
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`),
    );
    const configFileName = "create-aid.json";
    const configDir = "./config/";
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      await expect(wr.runWorkflow()).rejects.toThrow(Error);
    }
    else throw("Invalid workflow of configuration");
  }, 3600000);
});


describe("testing Registry creation workflow step", () => {
  test("successful Registry creation", async function run() {
    const workflowsDir = "./workflows/";
    const workflowFile = "create-registry-valid.yaml";
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`),
    );
    const aidName = "aid-1";
    const configFileName = "create-registry.json";
    const configDir = "./config/";
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      const workflowRunResult = await wr.runWorkflow();
      const workflowState = WorkflowState.getInstance();
      expect(workflowRunResult).toEqual(true);
      expect(workflowState.registries.get(aidName)).not.toEqual(undefined);
    }
    else throw("Invalid workflow of configuration");
  }, 3600000);

  test("Registry creation failed. AID was not created", async function run() {
    const workflowsDir = "./workflows/";
    const workflowFile = "create-registry-invalid-no-aid.yaml";
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`),
    );
    const configFileName = "create-registry.json";
    const configDir = "./config/";
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      await expect(wr.runWorkflow()).rejects.toThrow(Error);
    }
    else throw("Invalid workflow of configuration");
  }, 3600000);
});

