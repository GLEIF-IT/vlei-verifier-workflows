import minimist from "minimist";
import path from "path";
import { resolveEnvironment, TestEnvironment } from "../src/utils/resolve-env";
import { getConfig } from "../src/utils/test-data";
import { WorkflowRunner } from "../src/utils/run-workflow";
import { strict as assert } from "assert";
import { loadWorkflow } from "../src/utils/test-data";
import { ARG_KERIA_START_PORT, TestKeria } from "../src/utils/test-keria";
import { TestPaths } from "../src/utils/test-paths";
import { DockerLock } from '../src/utils/docker-lock';

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
const refresh = args[ARG_REFRESH] ? args[ARG_REFRESH] === "false" : false;

describe('Workflow Tests', () => {
  beforeAll(async () => {
    try {
      console.log('Starting beforeAll setup...');
      env = resolveEnvironment();
      testPaths = TestPaths.getInstance();
      
      console.log(`Setting up Keria with image: ${keriaImage}, container: ${keriaContainer}`);
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
      
      console.log('About to call testKeria.beforeAll()...');
      const beforeAllPromise = testKeria.beforeAll(keriaImage, keriaContainer, refresh);
      
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
        clearTimeout(timeoutId!); // Clean up the timeout
      }
      
      console.log('Verifying container is running...');
      // Wait a moment for container to fully start
      await new Promise(resolve => {
        const startupDelay = setTimeout(resolve, 5000);
        startupDelay.unref(); // Prevent keeping process alive
      });
      
    } catch (error) {
      console.error('Error in beforeAll:', error);
      console.error('Full error details:', error instanceof Error ? error.stack : error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    console.log('Running global test cleanup...');
    
    try {
      // First cleanup attempt with TestKeria
      await testKeria.afterAll();
      
      // Force cleanup any remaining handles
      await Promise.all([
        // Close any open Docker connections
        DockerLock.getInstance().forceRelease(),
        
        // Add a small delay to ensure cleanup completes
        new Promise(resolve => {
          const timeout = setTimeout(() => {
            clearTimeout(timeout);
            resolve(null);
          }, 2000);
          // Ensure the timer doesn't keep the process alive
          timeout.unref();
        })
      ]);
      
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }, 30000); // Increased timeout to ensure cleanup completes

  test('workflow', async () => {
    const workflowsDir = '../src/workflows/';
    const workflowFile = env.workflow;
    const workflow = loadWorkflow(
      path.join(__dirname, `${workflowsDir}${workflowFile}`)
    );
    const configFileName = env.configuration;
    let dirPath = '../src/config/';
    const configFilePath = path.join(__dirname, dirPath) + configFileName;
    const configJson = await getConfig(configFilePath);
    if (workflow && configJson) {
      const wr = new WorkflowRunner(workflow, configJson);
      const workflowRunResult = await wr.runWorkflow();
      assert.equal(workflowRunResult, true);
    }
  }, 90000); // Match the global timeout for the test itself
});
