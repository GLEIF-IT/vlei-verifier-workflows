import minimist from 'minimist';
import path from 'path';
import { strict as assert } from 'assert';

import {
  EnvironmentRegistry,
  resolveEnvironment,
} from '../src/utils/resolve-env.js';
import { getConfig } from '../src/utils/test-data.js';
import { WorkflowRunner } from '../src/utils/run-workflow.js';
import { loadWorkflow } from '../src/utils/test-data.js';
import {
  ARG_KERIA_DOMAIN,
  ARG_KERIA_HOST,
  ARG_KERIA_START_PORT,
  ARG_REFRESH,
  ARG_WITNESS_HOST,
  TestKeria,
} from '../src/utils/test-keria';
import { TestPaths } from '../src/utils/test-paths';
import { startDockerServices } from '../src/utils/test-docker';

let testPaths: TestPaths;

// Test context constants
const TEST_CONTEXTS = {
  ISSUANCE_TEST: 'issuance_workflow_test',
};

// Parse command-line arguments using minimist
const args = minimist(process.argv.slice(process.argv.indexOf('--') + 1), {
  alias: {
    [ARG_REFRESH]: 'r',
  },
  default: {
    [ARG_WITNESS_HOST]: 'localhost',
    [ARG_KERIA_HOST]: 'localhost',
    [ARG_KERIA_DOMAIN]: 'localhost',
    [ARG_REFRESH]: false,
    [ARG_KERIA_START_PORT]: 20000,
  },
  '--': true,
  unknown: (arg: any) => {
    console.debug(`Unknown run-workflow-bank argument, Skipping: ${arg}`);
    return false;
  },
});

const BASE_PORT = parseInt(args[ARG_KERIA_START_PORT], 10) || 30000;

beforeAll(async () => {
  try {
    testPaths = TestPaths.getInstance();

    const dockerStarted = await startDockerServices(
      testPaths.dockerComposeFile
    );
    if (dockerStarted) {
      // Initialize all Keria instances upfront
      await Promise.all(
        Object.values(TEST_CONTEXTS).map(async (contextId, _) => {
          try {
            console.log(
              `Initializing Keria instance for context: ${contextId}`
            );
            await TestKeria.getInstance(
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
  console.log('Running run-workflow test cleanup...');
  await TestKeria.cleanupInstances(Object.values(TEST_CONTEXTS));
}, 60000);

describe('Workflow Tests', () => {
  test('issuance_workflow_test', async () => {
    const env = resolveEnvironment('docker');
    const configFileName = env.configuration;
    const dirPath = '../src/config/';
    const configFilePath = path.join(__dirname, dirPath) + configFileName;
    const configJson = await getConfig(configFilePath);
    configJson[EnvironmentRegistry.ENVIRONMENT_CONTEXT] = 'docker';

    await TestKeria.getInstance(TEST_CONTEXTS.ISSUANCE_TEST);
    configJson[TestKeria.AGENT_CONTEXT] = TEST_CONTEXTS.ISSUANCE_TEST;

    const workflowsDir = '../src/workflows/';
    const workflowFile = env.workflow;
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`)
    );

    if (workflow && configJson) {
      const wr = new WorkflowRunner(
        workflow,
        configJson,
        configJson[EnvironmentRegistry.ENVIRONMENT_CONTEXT],
        configJson[TestKeria.AGENT_CONTEXT]
      );
      const workflowRunResult = await wr.runWorkflow();
      assert.equal(workflowRunResult, true);
    }
  }, 3600000); // Match the global timeout for the test itself
});
