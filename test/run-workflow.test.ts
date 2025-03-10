import minimist from 'minimist';
import path from 'path';
import { resolveEnvironment, TestEnvironment } from '../src/utils/resolve-env';
import { getConfig } from '../src/utils/test-data';
import { WorkflowRunner } from '../src/utils/run-workflow';
import { strict as assert } from 'assert';
import { loadWorkflow } from '../src/utils/test-data';
import { ARG_KERIA_START_PORT, TestKeria } from '../src/utils/test-keria';
import { TestPaths } from '../src/utils/test-paths';
import {
  DockerComposeState,
  startDockerServices,
  stopDockerCompose,
} from '../src/utils/test-docker';

let testPaths: TestPaths;
let env: TestEnvironment;

const ARG_KERIA_DOMAIN = 'keria_domain'; //external domain for keria
const ARG_WITNESS_HOST = 'witness_host'; //docker domain for witness
const ARG_KERIA_HOST = 'keria_host'; //docker domain for witness
const ARG_KERIA_NUM = 'keria_num';
const ARG_REFRESH = 'refresh';

// Test context constants - use these for test names, configJson['context'], and keria instance IDs
const TEST_CONTEXTS = {
  ISSUANCE_TEST: 'issuance_workflow_test',
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
  console.log('Running run-workflow test cleanup...');
  await TestKeria.cleanupInstances(Object.values(TEST_CONTEXTS));
  // if (TestKeria.instances.size <= 0) {
  //   await stopDockerCompose(testPaths.dockerComposeFile);
  // }
}, 60000);

describe('Workflow Tests', () => {
  test(
    TEST_CONTEXTS.ISSUANCE_TEST,
    async () => {
      const workflowsDir = '../src/workflows/';
      const workflowFile = env.workflow;
      const workflow = loadWorkflow(
        path.join(__dirname, `${workflowsDir}${workflowFile}`)
      );
      const configFileName = env.configuration;
      let dirPath = '../src/config/';
      const configFilePath = path.join(__dirname, dirPath) + configFileName;
      const configJson = await getConfig(configFilePath);
      configJson['context'] = TEST_CONTEXTS.ISSUANCE_TEST;

      if (workflow && configJson) {
        const wr = new WorkflowRunner(
          workflow,
          configJson,
          configJson['context']
        );
        const workflowRunResult = await wr.runWorkflow();
        assert.equal(workflowRunResult, true);
      }
    },
    3600000
  ); // Match the global timeout for the test itself
});
