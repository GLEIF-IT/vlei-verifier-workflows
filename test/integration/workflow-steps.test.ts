import path from 'path';
import {
  resolveEnvironment,
  TestEnvironment,
} from '../../src/utils/resolve-env';
import { getConfig } from '../../src/utils/test-data';
import { WorkflowRunner } from '../../src/utils/run-workflow';
import { strict as assert } from 'assert';
import { loadWorkflow } from '../../src/utils/test-data';
import { WorkflowState } from '../../src/workflow-state';
import minimist from "minimist";

import { ARG_KERIA_START_PORT, TestKeria } from "../../src/utils/test-keria";
import { TestPaths } from "../../src/utils/test-paths";

let testPaths: TestPaths;
let testKeria: TestKeria;
let env: TestEnvironment;

const ARG_KERIA_DOMAIN = "keria_domain"; //external domain for keria
const ARG_WITNESS_HOST = "witness_host"; //docker domain for witness
const ARG_KERIA_HOST = "keria_host"; //docker domain for witness
const ARG_KERIA_NUM = "keria_num";
const ARG_REFRESH = "refresh";

const keriaContainer = `keria_vvw`;

// Parse command-line arguments using minimist
const args = minimist(process.argv.slice(process.argv.indexOf("--") + 1), {
  alias: {
    [ARG_KERIA_NUM]: "knum",
    [ARG_REFRESH]: "r",
  },
  default: {
    [ARG_WITNESS_HOST]: "localhost",
    [ARG_KERIA_HOST]: "localhost",
    [ARG_KERIA_DOMAIN]: "localhost",
    [ARG_KERIA_NUM]: 1,
    [ARG_REFRESH]: false,
    [ARG_KERIA_START_PORT]: 20000,
  },
  "--": true,
  unknown: (arg: any) => {
    console.info(`Unknown run-workflow-bank argument, Skipping: ${arg}`);
    // throw new Error(`Unknown argument: ${arg}`);
    return false;
  },
});

const keriaImage = `weboftrust/keria:0.2.0-dev4`;
const keriaNum = parseInt(args[ARG_KERIA_NUM], 10) || 0;
const offset = 10 * (keriaNum - 1);
const refresh = args[ARG_REFRESH] ? args[ARG_REFRESH] === "false" : true;

afterAll(async () => {
  // await testKeria.afterAll();
});

beforeAll(async () => {
  env = resolveEnvironment();
  testPaths = TestPaths.getInstance();
  testKeria = TestKeria.getInstance(
    testPaths,
    args[ARG_KERIA_DOMAIN],
    args[ARG_KERIA_HOST],
    args[ARG_WITNESS_HOST],
    20001,
    20002,
    20003,
    offset
  );
  await testKeria.beforeAll(keriaImage, keriaContainer, refresh);
});


describe('testing Client creation workflow step', () => {
  test('successful client creation', async function run() {
    const workflowsDir = './workflows/';
    const workflowFile = 'create-client.yaml';
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`)
    );
    const agentName = 'client-agent-1';
    const configFileName = 'create-client.json';
    const configDir = './config/';
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      const workflowRunResult = await wr.runWorkflow();
      const workflowState = WorkflowState.getInstance();
      expect(workflowRunResult).toEqual(true);
      expect(workflowState.clients.get(agentName)).not.toEqual(undefined);
    } else throw 'Invalid workflow of configuration';
  }, 3600000);
});

describe('testing AID creation workflow step', () => {
  beforeEach(() => {
    WorkflowState.resetInstance();
  });
  test('successful AID creation', async function run() {
    const workflowsDir = './workflows/';
    const workflowFile = 'create-aid-valid.yaml';
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`)
    );
    const aidName = 'aid-1';
    const configFileName = 'create-aid.json';
    const configDir = './config/';
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      const workflowRunResult = await wr.runWorkflow();
      const workflowState = WorkflowState.getInstance();
      expect(workflowRunResult).toEqual(true);
      expect(workflowState.aids.get(aidName)).not.toEqual(undefined);
    } else throw 'Invalid workflow of configuration';
  }, 3600000);

  test('AID creation failed. Client was not created', async function run() {
    const workflowsDir = './workflows/';
    const workflowFile = 'create-aid-invalid.yaml';
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`)
    );
    const configFileName = 'create-aid.json';
    const configDir = './config/';
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      await expect(wr.runWorkflow()).rejects.toThrow(Error);
    } else throw 'Invalid workflow of configuration';
  }, 3600000);
});

describe('testing Registry creation workflow step', () => {
  beforeEach(() => {
    WorkflowState.resetInstance();
  });
  test('successful Registry creation', async function run() {
    const workflowsDir = './workflows/';
    const workflowFile = 'create-registry-valid.yaml';
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`)
    );
    const aidName = 'aid-1';
    const configFileName = 'create-registry.json';
    const configDir = './config/';
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      const workflowRunResult = await wr.runWorkflow();
      const workflowState = WorkflowState.getInstance();
      expect(workflowRunResult).toEqual(true);
      expect(workflowState.registries.get(aidName)).not.toEqual(undefined);
    } else throw 'Invalid workflow of configuration';
  }, 3600000);

  test('Registry creation failed. AID was not created', async function run() {
    const workflowsDir = './workflows/';
    const workflowFile = 'create-registry-invalid-no-aid.yaml';
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`)
    );
    const configFileName = 'create-registry.json';
    const configDir = './config/';
    const configFilePath = path.join(__dirname, configDir) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      await expect(wr.runWorkflow()).rejects.toThrow(Error);
    } else throw 'Invalid workflow of configuration';
  }, 3600000);
});
