import { VleiIssuance } from "../src/vlei-issuance";
import path from "path";
import { resolveEnvironment, TestEnvironment } from "../src/utils/resolve-env";
import { getConfig } from "../src/utils/test-data";
import { WorkflowRunner } from "../src/utils/run-workflow";
import { strict as assert } from "assert";
import { loadWorkflow } from "../src/utils/test-data";
import { getIdentifierData,
         getAgentSecret,
         buildCredentials,
         buildAidData } from "../src/utils/handle-json-config";

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
  console.log("file path: ", configFilePath)
  const configJson = await getConfig(configFilePath);

  const sampleConfig = {
    identifiers: {
      id1: { agent: "agentA" },
      id2: { agent: "agentB" },
      id3: { identifiers: ["id1", "id2"], isith: "1", nsith: "1" },
    },
    agents: {
      agentA: { secret: "secretA" },
      agentB: { secret: "secretB" },
    },
    secrets: {
      secretA: "valueA",
      secretB: "valueB",
    },
    credentials: {
      cred1: {
        type: "cert",
        schema: "schema1",
        rules: "rules1",
        privacy: true,
        attributes: { key: "value" },
        credSource: "source1",
      },
    },
  };

  // Get Identifier Data Test Cases
  console.log("Running getIdentifierData tests...");
  console.log("should return singlesig identifier data.");
  const resultIdentifierSingleSig = getIdentifierData(sampleConfig, "id1");
  expect(resultIdentifierSingleSig).toEqual({
    agent: { name: "agentA", secret: "valueA" },
    type: "singlesig",
  });

  // Get Identifier Data Test Cases
  console.log("should return multisig identifier data.");
  const resultIdentifierMultiSig = getIdentifierData(sampleConfig, "id3");
  expect(resultIdentifierMultiSig).toEqual({
    type: "multisig",
    identifiers: ["id1", "id2"],
    isith: "1",
    nsith: "1",
  });

  // test using configJson
  console.log("testing with configJson and gleif-aid-1");
  const resultIdentifierConfig1 = getIdentifierData(configJson, "gleif-aid-1") 
  console.log(resultIdentifierConfig1);
  expect(resultIdentifierConfig1).toEqual({
    type: 'singlesig',
    agent: { name: 'gleif-agent-1', secret: 'D_PbQb01zuzQgK-kDWjq1' },
    name: 'gleif-aid-1'
  });

  // console.log("testing with configJson and qvi_aid_1");
  // const resultIdentifierConfig2 = getIdentifierData(configJson, "qvi_aid_1");
  // console.log(resultIdentifierConfig2);
  // expect(resultIdentifierConfig2).toEqual({
  //   type: 'singlesig',
  //   agent: { name: 'gleif-agent-1', secret: 'D_PbQb01zuzQgK-kDWjq1' },
  //   name: 'gleif-aid-1'
  // });



  // Get Agent Secret Test Cases
  console.log("Running getAgentSecret tests...");
  console.log("should return the correct secret for an agent");
  const resultAgent = getAgentSecret(sampleConfig, "agentA");
  expect(resultAgent).toBe("valueA");

  // Build Credentials Test Cases
  console.log("Running buildCredentials tests...");
  console.log("should return a map of credential information");
  const resultCredentials = buildCredentials(sampleConfig);
  expect(resultCredentials.get("cred1")).toEqual({
    type: "cert",
    schema: "schema1",
    rules: "rules1",
    privacy: true,
    attributes: { key: "value" },
    credSource: "source1",
  });

  //test using jsonConfig file
  const resultCredentialsConfig = await buildCredentials(configJson);
  expect(resultCredentialsConfig.get('gleif_to_qvi_vlei_cred')).toEqual({
    type: 'direct',
    schema: 'QVI_SCHEMA_SAID',
    rules: undefined,
    privacy: false,
    attributes: {},
    credSource: undefined
  });
  expect(resultCredentialsConfig.get('qvi_to_le_vlei_cred')).toEqual({
    type: 'direct',
    schema: 'LE_SCHEMA_SAID',
    rules: 'LE_RULES',
    privacy: false,
    attributes: {},
    credSource: { type: 'qvi' }
  });
  expect(resultCredentialsConfig.get('le_to_ecr_vlei_cred')).toEqual({
    type: 'direct',
    schema: 'ECR_SCHEMA_SAID',
    rules: 'ECR_RULES',
    privacy: true,
    attributes: { engagementContextRole: 'EBA Data Submitter' },
    credSource: { type: 'le' }
  });
  expect(resultCredentialsConfig.get('le_to_qvi_ecr_auth_cred')).toEqual({
    type: 'direct',
    schema: 'ECR_AUTH_SCHEMA_SAID',
    rules: 'ECR_AUTH_RULES',
    privacy: false,
    attributes: { engagementContextRole: 'EBA Data Submitter' },
    credSource: { type: 'le' }
  });
  expect(resultCredentialsConfig.get('qvi_to_ecr_vlei_cred_from_le_to_qvi_ecr_auth_cred')).toEqual({
    type: 'direct',
    schema: 'ECR_SCHEMA_SAID',
    rules: 'ECR_RULES',
    privacy: true,
    attributes: { engagementContextRole: 'EBA Data Submitter' },
    credSource: { type: 'auth', o: 'I2I' }
  });
  expect(resultCredentialsConfig.get('le_to_qvi_oor_auth_cred')).toEqual({
    type: 'direct',
    schema: 'OOR_AUTH_SCHEMA_SAID',
    rules: 'OOR_AUTH_RULES',
    privacy: false,
    attributes: { officialRole: 'HR Manager' },
    credSource: { type: 'le' }
  });
  expect(resultCredentialsConfig.get('qvi_to_ecr_vlei_oor_cred_from_le_to_qvi_oor_auth_cred')).toEqual({
    type: 'direct',
    schema: 'OOR_SCHEMA_SAID',
    rules: 'OOR_RULES',
    privacy: false,
    attributes: { officialRole: 'HR Manager' },
    credSource: { type: 'auth', o: 'I2I' }
  });



  // Build Aid Data Cases
  console.log("Running buildAidData tests...");
  console.log("should return processed identifiers with agent secrets");
  const resultAidData = await buildAidData(sampleConfig);
  expect(resultAidData).toEqual({
    id1: { agent: { name: "agentA", secret: "valueA" } },
    id2: { agent: { name: "agentB", secret: "valueB" } },
    id3: { identifiers: ["id1", "id2"], isith: "1", nsith: "1" },
  });

  //test using jsonConfig file
  const resultAidDataConfig = await buildAidData(configJson);
  console.log("given output: ", resultAidDataConfig);
  expect(resultAidDataConfig).toEqual({
      'gleif-aid-1': {
        agent: { name: 'gleif-agent-1', secret: 'D_PbQb01zuzQgK-kDWjq1' },
        name: 'gleif-aid-1'
      },
      'gleif-aid-2': {
        agent: { name: 'gleif-agent-2', secret: 'D_PbQb01zuzQgK-kDWjq2' },
        name: 'gleif-aid-2'
      },
      'gleif-multisig-1': {
        name: 'gleif-multisig-1',
        identifiers: [ 'gleif-aid-1', 'gleif-aid-2' ],
        isith: [ '1/2', '1/2' ],
        nsith: [ '1/2', '1/2' ]
      },
      'qvi-aid-1': {
        agent: { name: 'qvi-agent-1', secret: 'BTaqgh1eeOjXO5iQJp6m1' },
        name: 'qvi-aid-1'
      },
      'qvi-aid-2': {
        agent: { name: 'qvi-agent-2', secret: 'BTaqgh1eeOjXO5iQJp6m2' },
        name: 'qvi-aid-2'
      },
      'qvi-aid-3': {
        agent: { name: 'qvi-agent-3', secret: 'BTaqgh1eeOjXO5iQJp6m3' },
        name: 'qvi-aid-3'
      },
      'qvi-multisig-1': {
        name: 'qvi-multisig-1',
        identifiers: [ 'qvi-aid-1', 'qvi-aid-2', 'qvi-aid-3' ],
        isith: [ '2/3', '1/2', '1/2' ],
        nsith: [ '2/3', '1/2', '1/2' ]
      },
      'le-aid-1': {
        agent: { name: 'le-agent-1', secret: 'Lf8nafHfan8fnafnnnfa1' },
        name: 'le-aid-1'
      },
      'le-aid-2': {
        agent: { name: 'le-agent-2', secret: 'Lf8nafHfan8fnafnnnfa2' },
        name: 'le-aid-2'
      },
      'le-aid-3': {
        agent: { name: 'le-agent-3', secret: 'Lf8nafHfan8fnafnnnfa3' },
        name: 'le-aid-3'
      },
      'le-multisig-1': {
        name: 'le-multisig-1',
        identifiers: [ 'le-aid-1', 'le-aid-2', 'le-aid-3' ],
        isith: [ '2/3', '1/2', '1/2' ],
        nsith: [ '2/3', '1/2', '1/2' ]
      },
      'ecr-aid-1': {
        agent: { name: 'ecr-agent-1', secret: 'nf98hUHUy8Vt5tvdyaYV7' },
        name: 'ecr-aid-1'
      }
  });


  if (workflow && configJson) {
    const wr = new WorkflowRunner(workflow, configJson);
    const workflowRunResult = await wr.runWorkflow();
    assert.equal(workflowRunResult, true);
  }
}, 3600000);



// import { VleiIssuance } from "../src/vlei-issuance";
// import path from "path";
// import { resolveEnvironment, TestEnvironment } from "../src/utils/resolve-env";
// import { getConfig } from "../src/utils/test-data";
// import { WorkflowRunner } from "../src/utils/run-workflow";
// import { strict as assert } from "assert";
// import { loadWorkflow } from "../src/utils/test-data";

// let env: TestEnvironment;

// afterAll((done) => {
//   done();
// });
// beforeAll((done) => {
//   done();
//   env = resolveEnvironment();
// });

// test.only("workflow", async function run() {
//   const workflowsDir = "../src/workflows/";
//   const workflowFile = env.workflow;
//   const workflow = loadWorkflow(
//     path.join(__dirname, `${workflowsDir}${workflowFile}`),
//   );
//   const configFileName = env.configuration;
//   let dirPath = "../src/config/";
//   const configFilePath = path.join(__dirname, dirPath) + configFileName;
//   const configJson = await getConfig(configFilePath);

//   // // Build User Data Test Cases
//   // console.log("Running buildUserData tests...");

//   // // Test 1: Configuration Handling
//   const result1 = await buildUserData(configJson);
//   expect(result1).toEqual([
    
//     {
//       "type": "GLEIF",
//       "alias": "gleif-user-1",
//       "identifiers": [
//         {
//           "name": "gleif-aid-1",
//           "agent": {
//             "name": "gleif-agent-1",
//             "secret": "D_PbQb01zuzQgK-kDWjq5",
//           },
//         },
//       ],
//     },
//     {
//       "type": "QVI",
//       "alias": "qvi-user-1",
//       "identifiers": [
//         {
//           "name": "qvi-aid-1",
//           "delegator": "gleif-aid-1",
//           "agent": {
//             "name": "qvi-agent-1",
//             "secret": "BTaqgh1eeOjXO5iQJp6m5",
//           },
//         },
//       ],
//     },
//     {
//       "type": "LE",
//       "alias": "le-user-1",
//       "identifiers": [
//         {
//           "name": "le-aid-1",
//           "agent": {
//             "name": "le-agent-1",
//             "secret": "Akv4TFoiYeHNqzj3N8gE5",
//           },
//         },
//       ],
//     },
//     {
//       "type": "ECR",
//       "alias": "ecr-user-1",
//       "identifiers": [
//         {
//           "name": "ecr-aid-1",
//           "agent": {
//             "name": "ecr-agent-1",
//             "secret": "nf98hUHUy8Vt5tvdyaYV5",
//           },
//         },
//       ],
//     },
//   ]);

//   // Test 2: Empty User Array Handling
//   console.log("Testing empty users array...");
//   const emptyConfig = { identifiers: {}, agents: {}, secrets: {}, users: [] };
//   const emptyResult = await buildUserData(emptyConfig);
//   expect(emptyResult).toEqual([]);

//   // Test 3: Multiple Users and Identifiers
//   console.log("Testing multiple users and identifiers...");
//   const jsonConfigMultiUsers = {
//     identifiers: {
//       id1: { agent: "agentA" },
//       id2: { agent: "agentB" },
//     },
//     agents: {
//       agentA: { secret: "secretA" },
//       agentB: { secret: "secretB" },
//     },
//     secrets: {
//       secretA: "valueA",
//       secretB: "valueB",
//     },
//     users: [
//       {
//         LE: "CompanyX",
//         identifiers: ["id1", "id2"],
//         alias: "User1",
//         type: "Admin",
//       },
//       {
//         LE: "CompanyY",
//         identifiers: ["id2"],
//         alias: "User2",
//         type: "User",
//       },
//     ],
//   };

//   const multiUserResult = await buildUserData(jsonConfigMultiUsers);
//   expect(multiUserResult).toEqual([
//     {
//       LE: "CompanyX",
//       alias: "User1",
//       type: "Admin",
//       identifiers: [
//         { agent: { name: "agentA", secret: "valueA" } },
//         { agent: { name: "agentB", secret: "valueB" } },
//       ],
//     },
//     {
//       LE: "CompanyY",
//       alias: "User2",
//       type: "User",
//       identifiers: [{ agent: { name: "agentB", secret: "valueB" } }],
//     },
//   ]);

//   // Test 4: Missing Agent and Secret Fields Handling
//   console.log("Testing missing agent and secret fields...");
//   const jsonConfigMissingFields = {
//     identifiers: { id1: {} },
//     agents: {},
//     secrets: {},
//     users: [
//       {
//         LE: "CompanyX",
//         identifiers: ["id1"],
//         alias: "User1",
//         type: "Admin",
//       },
//     ],
//   };

//   const missingFieldsResult = await buildUserData(jsonConfigMissingFields);
//   expect(missingFieldsResult).toEqual([
//     {
//       LE: "CompanyX",
//       alias: "User1",
//       type: "Admin",
//       identifiers: [{}], // No agent data because it's missing
//     },
//   ]);

//   // ==============================
//   // Execute Workflow After Tests
//   // ==============================
//   console.log("Executing workflow steps...");

//   if (workflow && configJson) {
//     const wr = new WorkflowRunner(workflow, configJson);
//     const workflowRunResult = await wr.runWorkflow();
//     assert.equal(workflowRunResult, true);
//   }
// }, 3600000);

