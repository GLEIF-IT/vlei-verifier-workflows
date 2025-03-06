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
import { DockerComposeState } from '../../src/utils/test-docker';
import { DockerLock } from '../../src/utils/docker-lock';

let testPaths: TestPaths;
let testKerias: Record<string, TestKeria>;
let env: TestEnvironment;

const ARG_KERIA_DOMAIN = 'keria_domain'; //external domain for keria
const ARG_WITNESS_HOST = 'witness_host'; //docker domain for witness
const ARG_KERIA_HOST = 'keria_host'; //docker domain for witness
const ARG_KERIA_NUM = 'keria_num';
const ARG_REFRESH = 'refresh';
const TEST_FILE_NAME = 'workflow-steps';

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
    console.info(`Unknown run-workflow-bank argument, Skipping: ${arg}`);
    // throw new Error(`Unknown argument: ${arg}`);
    return false;
  },
});

const BASE_PORT = parseInt(args[ARG_KERIA_START_PORT], 10) || 20000;
const refresh = args[ARG_REFRESH] ? args[ARG_REFRESH] === 'false' : false;

beforeAll(async () => {
  try {
    console.log('Starting beforeAll setup...');
    env = resolveEnvironment();
    testPaths = TestPaths.getInstance();
    testKerias = {};

    // Start docker-compose services first
    await DockerComposeState.getInstance().initialize(testPaths.dockerComposeFile, 'up', 'verify');
  } catch (error) {
    console.error('Error in beforeAll:', error);
    throw error;
  }
}, 30000);

afterAll(async () => {
  console.log('Running global test cleanup...');

  try {
    // for (const [instanceId, instance] of Object.entries(testKerias)) {
    // First cleanup attempt with TestKeria
    // await TestKeria.afterAll(instance.);

    // Force cleanup any remaining handles
    await Promise.all([
      // Close any open Docker connections
      DockerLock.getInstance().forceRelease(),

      // Add a small delay to ensure cleanup completes
      new Promise((resolve) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          resolve(null);
        }, 2000);
        // Ensure the timer doesn't keep the process alive
        timeout.unref();
      }),
    ]);

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}, 30000); // Increased timeout to ensure cleanup completes

describe('testing Client creation workflow step', () => {
  it('successful client creation', async () => {
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
    configJson['context'] = 'successful_client_creation';

    // Create Keria instance with unique ID based on workflow and config
    await TestKeria.getInstance(
      configJson['context'],
      testPaths,
      args[ARG_KERIA_DOMAIN],
      args[ARG_KERIA_HOST],
      args[ARG_WITNESS_HOST],
      BASE_PORT,
      TestKeria.calcOffset(1),
    );

    if (workflowObj && configJson) {
      const wr = new WorkflowRunner(workflowObj, configJson, configJson['context']);
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
    configJson['context'] = 'successful_aid_creation';
    
    // Create Keria instance for this agent
    await TestKeria.getInstance(
      configJson['context'],
      testPaths,
      args[ARG_KERIA_DOMAIN],
      args[ARG_KERIA_HOST],
      args[ARG_WITNESS_HOST],
      BASE_PORT,
      TestKeria.calcOffset(2),
    );
    
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson, 'successful AID creation');
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
    configJson['context'] = 'aid_creation_failed';
    // Create Keria instance for this agent
    await TestKeria.getInstance(configJson['context'],
    testPaths,
    args[ARG_KERIA_DOMAIN],
    args[ARG_KERIA_HOST],
    args[ARG_WITNESS_HOST],
    BASE_PORT,
    TestKeria.calcOffset(3),
  );
    
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson, 'AID creation failed. Client was not created');
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
    configJson['context'] = 'successful_registry_creation';
    // Create Keria instance for this agent
    await TestKeria.getInstance(configJson['context'],
      testPaths,
      args[ARG_KERIA_DOMAIN],
      args[ARG_KERIA_HOST],
      args[ARG_WITNESS_HOST],
      BASE_PORT,
      TestKeria.calcOffset(4),
    );
    
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson, configJson['context']);
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
    configJson['context'] = 'registry-creation-failed-AID-not-created';
    
    // Create Keria instance for this agent
    await TestKeria.getInstance(configJson['context'],
      testPaths,
      args[ARG_KERIA_DOMAIN],
      args[ARG_KERIA_HOST],
      args[ARG_WITNESS_HOST],
      BASE_PORT,
      TestKeria.calcOffset(5),
    );
    
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson, configJson['context']);
      await expect(wr.runWorkflow()).rejects.toThrow(Error);
    } else throw 'Invalid workflow of configuration';
  }, 3600000);
});

afterAll(async () => {
  console.log('Running global test cleanup...');
  try {
    // Clean up all created TestKeria instances
    const keriaPromises = Object.entries(testKerias).map(async ([instanceId, instance]) => {
      const keriaContainer = instanceId;
      await instance.afterAll(keriaContainer);
    });
    await Promise.all(keriaPromises);
    
    await Promise.all([
      DockerComposeState.getInstance().stop(),
      DockerLock.getInstance().forceRelease(),
      new Promise((resolve) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          resolve(null);
        }, 2000);
        timeout.unref();
      }),
    ]);
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}, 30000);