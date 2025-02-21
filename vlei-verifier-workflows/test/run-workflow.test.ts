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

const ARG_KERIA_NUM = "keria_num";
const ARG_REFRESH = "refresh";

const keriaConfig = {
  "dt": "2023-12-01T10:05:25.062609+00:00",
  "keria": {
    "dt": "2023-12-01T10:05:25.062609+00:00",
    "curls": ["http://localhost:3902/"]
  },
  "iurls": [
    "http://localhost:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha/controller",
    "http://localhost:5643/oobi/BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM/controller",
    "http://localhost:5644/oobi/BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX/controller",
    "http://localhost:5645/oobi/BM35JN8XeJSEfpxopjn5jr7tAHCE5749f0OobhMLCorE/controller",
    "http://localhost:5646/oobi/BIj15u5V11bkbtAxMA7gcNJZcax-7TgaBMLsQnMHpYHP/controller",
    "http://localhost:5647/oobi/BF2rZTW79z4IXocYRQnjjsOuvFUQv-ptCf8Yltd7PfsM/controller"
  ]
}

// Parse command-line arguments using minimist
const args = minimist(process.argv.slice(process.argv.indexOf("--") + 1), {
  alias: {
    [ARG_KERIA_NUM]: "knum",
    [ARG_REFRESH]: "r",
  },
  default: {
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
const keriaContainer = `keria_vvw`.toLowerCase();
const offset = 10 * (keriaNum - 1);
const refresh = args[ARG_REFRESH] ? args[ARG_REFRESH] === "false" : true;

afterAll(async () => {
  await testKeria.afterAll();
});

beforeAll(async () => {
  env = resolveEnvironment();
  testPaths = TestPaths.getInstance();
  testKeria = TestKeria.getInstance(testPaths, "localhost", 20001, 20002, 20003, offset);
  await testKeria.beforeAll(keriaImage, keriaContainer, refresh, keriaConfig);
});

test.only("workflow", async function run() {
  const workflowsDir = "../src/workflows/";
  const workflowFile = env.workflow;
  const workflow = loadWorkflow(
    path.join(__dirname, `${workflowsDir}${workflowFile}`)
  );
  const configFileName = env.configuration;
  let dirPath = "../src/config/";
  const configFilePath = path.join(__dirname, dirPath) + configFileName;
  const configJson = await getConfig(configFilePath);
  if (workflow && configJson) {
    const wr = new WorkflowRunner(workflow, configJson);
    const workflowRunResult = await wr.runWorkflow();
    assert.equal(workflowRunResult, true);
  }
}, 3600000);
