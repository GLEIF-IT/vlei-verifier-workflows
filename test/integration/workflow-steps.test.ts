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
let testKeria: TestKeria;
let env: TestEnvironment;

const ARG_KERIA_DOMAIN = 'keria_domain'; //external domain for keria
const ARG_WITNESS_HOST = 'witness_host'; //docker domain for witness
const ARG_KERIA_HOST = 'keria_host'; //docker domain for witness
const ARG_KERIA_NUM = 'keria_num';
const ARG_REFRESH = 'refresh';

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

const keriaImage = `weboftrust/keria:0.2.0-dev4`;
const keriaNum = parseInt(args[ARG_KERIA_NUM], 10) || 0;
const offset = 10 * (keriaNum - 1);
const refresh = args[ARG_REFRESH] ? args[ARG_REFRESH] === 'false' : false;
const keriaContainer = keriaNum === 0 ? 'keria_vvw' : `keria_vvw_${keriaNum}`;

beforeAll(async () => {
  try {
    console.log('Starting beforeAll setup...');
    env = resolveEnvironment();
    testPaths = TestPaths.getInstance();

    console.log(
      `Setting up Keria with image: ${keriaImage}, container: ${keriaContainer}`
    );
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

    const beforeAllPromise = testKeria.beforeAll(
      keriaImage,
      keriaContainer,
      refresh
    );

    // Add timeout to prevent infinite hanging
    const timeout = 180000; // 180 seconds
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('beforeAll timeout')), timeout);
      timeoutId.unref(); // Prevent keeping process alive
    });

    try {
      await Promise.race([beforeAllPromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }

    // Wait for container to fully start
    await new Promise((resolve) => {
      const startupDelay = setTimeout(resolve, 5000);
      startupDelay.unref();
    });
  } catch (error) {
    console.error('Error in beforeAll:', error);
    console.error(
      'Full error details:',
      error instanceof Error ? error.stack : error
    );
    throw error;
  }
}, 30000);

afterAll(async () => {
  console.log('Running global test cleanup...');
  try {
    await testKeria.afterAll();
    
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
