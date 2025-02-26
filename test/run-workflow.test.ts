import minimist from "minimist";
import path from "path";
import { resolveEnvironment, TestEnvironment } from "../src/utils/resolve-env";
import { getConfig } from "../src/utils/test-data";
import { WorkflowRunner } from "../src/utils/run-workflow";
import { strict as assert } from "assert";
import { loadWorkflow } from "../src/utils/test-data";
import { ARG_KERIA_START_PORT, TestKeria } from "../src/utils/test-keria";
import { TestPaths } from "../src/utils/test-paths";

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

test.only('workflow', async function run() {
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
}, 3600000);
