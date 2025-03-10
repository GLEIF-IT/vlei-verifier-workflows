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
import minimist from 'minimist';

import { ARG_KERIA_START_PORT, TestKeria } from '../../src/utils/test-keria';
import { TestPaths } from '../../src/utils/test-paths';
import {
  DockerComposeState,
  startDockerServices,
  stopDockerCompose,
} from '../../src/utils/test-docker';

let testPaths: TestPaths;
let env: TestEnvironment;

const ARG_KERIA_DOMAIN = 'keria_domain'; //external domain for keria
const ARG_WITNESS_HOST = 'witness_host'; //docker domain for witness
const ARG_KERIA_HOST = 'keria_host'; //docker domain for witness
const ARG_KERIA_NUM = 'keria_num';
const ARG_REFRESH = 'refresh';

// Test context constants - use these for test names, configJson['context'], and keria instance IDs
const TEST_CONTEXTS = {
  CLIENT_CREATION: 'successful_client_creation',
  AID_CREATION_SUCCESS: 'successful_aid_creation',
  AID_CREATION_FAILURE: 'aid_creation_failed',
  REGISTRY_CREATION_SUCCESS: 'successful_registry_creation',
  REGISTRY_CREATION_FAILURE: 'registry_creation_failed_aid_not_created',
};

// Parse command-line arguments using minimist
const args = minimist(process.argv.slice(process.argv.indexOf('--') + 1), {
  alias: {
    [ARG_KERIA_NUM]: 'knum',
    [ARG_REFRESH]: 'r',
  },
  default: {
    [ARG_WITNESS_HOST]: 'localhost',
    [ARG_KERIA_HOST]: 'localhost',
    [ARG_KERIA_DOMAIN]: 'localhost',
    [ARG_KERIA_NUM]: 1,
    [ARG_REFRESH]: false,
    [ARG_KERIA_START_PORT]: 20000,
  },
  '--': true,
  unknown: (arg: any) => {
    // console.info(`Unknown run-workflow-bank argument, Skipping: ${arg}`);
    // throw new Error(`Unknown argument: ${arg}`);
    return false;
  },
});

const BASE_PORT = parseInt(args[ARG_KERIA_START_PORT], 10) || 20000;
const refresh = args[ARG_REFRESH] ? args[ARG_REFRESH] === 'false' : false;

beforeAll(async () => {
  try {
    env = resolveEnvironment();
    testPaths = TestPaths.getInstance();

    const dockerStarted = await startDockerServices(
      testPaths.dockerComposeFile
    );
    if (dockerStarted) {
      // Initialize all Keria instances upfront
      await Promise.all(
        Object.values(TEST_CONTEXTS).map(async (contextId, index) => {
          try {
            console.log(
              `Initializing Keria instance for context: ${contextId}`
            );
            const keriaInstance = await TestKeria.getInstance(
              contextId,
              testPaths,
              args[ARG_KERIA_DOMAIN],
              args[ARG_KERIA_HOST],
              args[ARG_WITNESS_HOST],
              BASE_PORT
            );

            console.log(
              `Successfully initialized Keria instance for context: ${contextId}`
            );
          } catch (error) {
            console.error(
              `Failed to initialize Keria instance for context ${contextId}:`,
              error
            );
            throw error;
          }
        })
      );
    }
  } catch (error) {
    console.error('Error in beforeAll:', error);
    throw error;
  }
}, 60000);

afterAll(async () => {
  console.log('Running workflow-steps test cleanup...');
  await TestKeria.cleanupInstances(Object.values(TEST_CONTEXTS));
  // if (TestKeria.instances.size <= 0) {
  //   await stopDockerCompose(testPaths.dockerComposeFile);
  // }
}, 60000);

describe('testing Client creation workflow step', () => {
  it(
    TEST_CONTEXTS.CLIENT_CREATION,
    async () => {
      const workflowsDir = './workflows/';
      const workflowFile = 'create-client.yaml';
      const workflowObj = loadWorkflow(
        path.join(__dirname, `${workflowsDir}${workflowFile}`)
      );
      const configFileName = 'create-client.json';
      const configDir = './config/';
      const configFilePath = path.join(__dirname, configDir) + configFileName;
      const configJson = await getConfig(configFilePath);
      const agentName = 'client-agent-1';
      configJson['context'] = TEST_CONTEXTS.CLIENT_CREATION;

      if (workflowObj && configJson) {
        const wr = new WorkflowRunner(
          workflowObj,
          configJson,
          configJson['context']
        );
        const workflowRunResult = await wr.runWorkflow();
        const workflowState = WorkflowState.getInstance();
        expect(workflowRunResult).toEqual(true);
        expect(workflowState.clients.get(agentName)).not.toEqual(undefined);
      } else throw 'Invalid workflow of configuration';
    },
    3600000
  );
});

describe('testing AID creation workflow step', () => {
  beforeEach(() => {
    WorkflowState.resetInstance();
  });
  test(`${TEST_CONTEXTS.AID_CREATION_SUCCESS}`, async function run() {
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
    configJson['context'] = TEST_CONTEXTS.AID_CREATION_SUCCESS;

    if (workflow && configJson) {
      const wr = new WorkflowRunner(
        workflow,
        configJson,
        configJson['context']
      );
      const workflowRunResult = await wr.runWorkflow();
      const workflowState = WorkflowState.getInstance();
      expect(workflowRunResult).toEqual(true);
      expect(workflowState.aids.get(aidName)).not.toEqual(undefined);
    } else throw 'Invalid workflow of configuration';
  }, 3600000);

  test(
    TEST_CONTEXTS.AID_CREATION_FAILURE,
    async function run() {
      const workflowsDir = './workflows/';
      const workflowFile = 'create-aid-invalid.yaml';
      const workflow = loadWorkflow(
        path.join(__dirname, `${workflowsDir}${workflowFile}`)
      );
      const configFileName = 'create-aid.json';
      const configDir = './config/';
      const configFilePath = path.join(__dirname, configDir) + configFileName;
      const configJson = await getConfig(configFilePath);
      configJson['context'] = TEST_CONTEXTS.AID_CREATION_FAILURE;

      if (workflow && configJson) {
        const wr = new WorkflowRunner(
          workflow,
          configJson,
          configJson['context']
        );
        await expect(wr.runWorkflow()).rejects.toThrow(Error);
      } else throw 'Invalid workflow of configuration';
    },
    3600000
  );
});

describe('testing Registry creation workflow step', () => {
  beforeEach(() => {
    WorkflowState.resetInstance();
  });
  test(
    TEST_CONTEXTS.REGISTRY_CREATION_SUCCESS,
    async function run() {
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
      configJson['context'] = TEST_CONTEXTS.REGISTRY_CREATION_SUCCESS;

      if (workflow && configJson) {
        const wr = new WorkflowRunner(
          workflow,
          configJson,
          configJson['context']
        );
        const workflowRunResult = await wr.runWorkflow();
        const workflowState = WorkflowState.getInstance();
        expect(workflowRunResult).toEqual(true);
        expect(workflowState.registries.get(aidName)).not.toEqual(undefined);
      } else throw 'Invalid workflow of configuration';
    },
    3600000
  );

  test(
    TEST_CONTEXTS.REGISTRY_CREATION_FAILURE,
    async function run() {
      const workflowsDir = './workflows/';
      const workflowFile = 'create-registry-invalid-no-aid.yaml';
      const workflow = loadWorkflow(
        path.join(__dirname, `${workflowsDir}${workflowFile}`)
      );
      const configFileName = 'create-registry.json';
      const configDir = './config/';
      const configFilePath = path.join(__dirname, configDir) + configFileName;
      const configJson = await getConfig(configFilePath);
      configJson['context'] = TEST_CONTEXTS.REGISTRY_CREATION_FAILURE;

      if (workflow && configJson) {
        const wr = new WorkflowRunner(
          workflow,
          configJson,
          configJson['context']
        );
        await expect(wr.runWorkflow()).rejects.toThrow(Error);
      } else throw 'Invalid workflow of configuration';
    },
    3600000
  );
});
