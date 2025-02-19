import { VleiIssuance } from "../src/vlei-issuance";
import path from "path";
import { resolveEnvironment, TestEnvironment } from "../src/utils/resolve-env";
import { getConfig } from "../src/utils/test-data";
import { WorkflowRunner } from "../src/utils/run-workflow";
import { strict as assert } from "assert";
import { loadWorkflow } from "../src/utils/test-data";

let env: TestEnvironment;

afterAll((done) => {
  done();
});
beforeAll((done) => {
  done();
  env = resolveEnvironment();
});

test.only("workflow", async function run() {
  const workflowsDir = "../src/workflows/";
  const workflowFile = env.workflow;
  const workflow = loadWorkflow(
    path.join(__dirname, `${workflowsDir}${workflowFile}`),
  );
  const configFileName = env.configuration;
  let dirPath = "../src/config/";
  const configFilePath = path.join(__dirname, dirPath) + configFileName;
  const configJson = await getConfig(configFilePath);

  // Build User Data Test Cases
  console.log("Running buildUserData tests...");

  // Test 1: Configuration Handling
  const result1 = await buildUserData(configJson);
  expect(result1).toEqual([
    {
      "type": "GLEIF",
      "alias": "gleif-user-1",
      "identifiers": [
        {
          "name": "gleif-aid-1",
          "agent": {
            "name": "gleif-agent-1",
            "secret": "D_PbQb01zuzQgK-kDWjq5",
          },
        },
      ],
    },
    {
      "type": "QVI",
      "alias": "qvi-user-1",
      "identifiers": [
        {
          "name": "qvi-aid-1",
          "delegator": "gleif-aid-1",
          "agent": {
            "name": "qvi-agent-1",
            "secret": "BTaqgh1eeOjXO5iQJp6m5",
          },
        },
      ],
    },
    {
      "type": "LE",
      "alias": "le-user-1",
      "identifiers": [
        {
          "name": "le-aid-1",
          "agent": {
            "name": "le-agent-1",
            "secret": "Akv4TFoiYeHNqzj3N8gE5",
          },
        },
      ],
    },
    {
      "type": "ECR",
      "alias": "ecr-user-1",
      "identifiers": [
        {
          "name": "ecr-aid-1",
          "agent": {
            "name": "ecr-agent-1",
            "secret": "nf98hUHUy8Vt5tvdyaYV5",
          },
        },
      ],
    },
  ]);

  // Test 2: Empty User Array Handling
  console.log("Testing empty users array...");
  const emptyConfig = { identifiers: {}, agents: {}, secrets: {}, users: [] };
  const emptyResult = await buildUserData(emptyConfig);
  expect(emptyResult).toEqual([]);

  // Test 3: Multiple Users and Identifiers
  console.log("Testing multiple users and identifiers...");
  const jsonConfigMultiUsers = {
    identifiers: {
      id1: { agent: "agentA" },
      id2: { agent: "agentB" },
    },
    agents: {
      agentA: { secret: "secretA" },
      agentB: { secret: "secretB" },
    },
    secrets: {
      secretA: "valueA",
      secretB: "valueB",
    },
    users: [
      {
        LE: "CompanyX",
        identifiers: ["id1", "id2"],
        alias: "User1",
        type: "Admin",
      },
      {
        LE: "CompanyY",
        identifiers: ["id2"],
        alias: "User2",
        type: "User",
      },
    ],
  };

  const multiUserResult = await buildUserData(jsonConfigMultiUsers);
  expect(multiUserResult).toEqual([
    {
      LE: "CompanyX",
      alias: "User1",
      type: "Admin",
      identifiers: [
        { agent: { name: "agentA", secret: "valueA" } },
        { agent: { name: "agentB", secret: "valueB" } },
      ],
    },
    {
      LE: "CompanyY",
      alias: "User2",
      type: "User",
      identifiers: [{ agent: { name: "agentB", secret: "valueB" } }],
    },
  ]);

  // Test 4: Missing Agent and Secret Fields Handling
  console.log("Testing missing agent and secret fields...");
  const jsonConfigMissingFields = {
    identifiers: { id1: {} },
    agents: {},
    secrets: {},
    users: [
      {
        LE: "CompanyX",
        identifiers: ["id1"],
        alias: "User1",
        type: "Admin",
      },
    ],
  };

  const missingFieldsResult = await buildUserData(jsonConfigMissingFields);
  expect(missingFieldsResult).toEqual([
    {
      LE: "CompanyX",
      alias: "User1",
      type: "Admin",
      identifiers: [{}], // No agent data because it's missing
    },
  ]);

  // ==============================
  // Execute Workflow After Tests
  // ==============================
  console.log("Executing workflow steps...");

  if (workflow && configJson) {
    const wr = new WorkflowRunner(workflow, configJson);
    const workflowRunResult = await wr.runWorkflow();
    assert.equal(workflowRunResult, true);
  }
}, 3600000);

