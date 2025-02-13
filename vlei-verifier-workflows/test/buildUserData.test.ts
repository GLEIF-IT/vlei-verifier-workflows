import { buildUserData, User } from '../src/utils/handle-json-config'; // Adjust the import path
import { VleiIssuance } from "../src/vlei-issuance";
import path from "path";
import { resolveEnvironment, TestEnvironment } from "../src/utils/resolve-env";
import {
  getConfig,
} from "../src/utils/test-data";
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

describe('buildUserData', () => {
  it('should correctly transform jsonConfig into an array of User objects', async () => {
    console.log("buildUserData test for transforming jsonConfig into 1 user object");
    // Arrange: Mock input JSON configuration
    const jsonConfig = {
      identifiers: {
        id1: { agent: 'agentA' },
      },
      agents: {
        agentA: { secret: 'secretA' },
      },
      secrets: {
        secretA: 'super-secret-value',
      },
      users: [
        {
          LE: 'CompanyX',
          identifiers: ['id1'],
          alias: 'User1',
          type: 'Admin',
        },
      ],
    };

    // Act: Call the function
    const result: User[] = await buildUserData(jsonConfig);

    // Assert: Verify output
    expect(result).toEqual([
      {
        LE: 'CompanyX',
        alias: 'User1',
        type: 'Admin',
        identifiers: [
          {
            agent: {
              name: 'agentA',
              secret: 'super-secret-value',
            },
          },
        ],
      },
    ]);
  });

  it('should handle empty users array', async () => {
    console.log("buildUserData test for transforming empty jsonConfig into empty user array");
    const jsonConfig = {
      identifiers: {},
      agents: {},
      secrets: {},
      users: [],
    };

    const result = await buildUserData(jsonConfig);
    expect(result).toEqual([]);
  });

  it('should correctly map multiple users and identifiers', async () => {
    console.log("buildUserData test for transforming jsonConfig into multiple user objects");
    const jsonConfig = {
      identifiers: {
        id1: { agent: 'agentA' },
        id2: { agent: 'agentB' },
      },
      agents: {
        agentA: { secret: 'secretA' },
        agentB: { secret: 'secretB' },
      },
      secrets: {
        secretA: 'valueA',
        secretB: 'valueB',
      },
      users: [
        {
          LE: 'CompanyX',
          identifiers: ['id1', 'id2'],
          alias: 'User1',
          type: 'Admin',
        },
        {
          LE: 'CompanyY',
          identifiers: ['id2'],
          alias: 'User2',
          type: 'User',
        },
      ],
    };

    const result = await buildUserData(jsonConfig);

    expect(result).toEqual([
      {
        LE: 'CompanyX',
        alias: 'User1',
        type: 'Admin',
        identifiers: [
          { agent: { name: 'agentA', secret: 'valueA' } },
          { agent: { name: 'agentB', secret: 'valueB' } },
        ],
      },
      {
        LE: 'CompanyY',
        alias: 'User2',
        type: 'User',
        identifiers: [
          { agent: { name: 'agentB', secret: 'valueB' } },
        ],
      },
    ]);
  });

  it('should handle missing agent and secret fields gracefully', async () => {
    console.log("buildUserData test for transforming jsonConfig with missing fields into 1 user object");
    const jsonConfig = {
      identifiers: {
        id1: {},
      },
      agents: {},
      secrets: {},
      users: [
        {
          LE: 'CompanyX',
          identifiers: ['id1'],
          alias: 'User1',
          type: 'Admin',
        },
      ],
    };

    const result = await buildUserData(jsonConfig);
    
    expect(result).toEqual([
      {
        LE: 'CompanyX',
        alias: 'User1',
        type: 'Admin',
        identifiers: [{}], // No agent data because it's missing
      },
    ]);
  });
});


describe('buildUserData', () => {
    it('should handle configuration-singlesig-single-user-light.json', async ()=> {
        const configFileName = env.configuration;
        let dirPath = "../src/config/"
        const configFilePath = path.join(__dirname, dirPath) + configFileName
        //console.log("path: ", configFilePath);
        const configJson = await getConfig(configFilePath);
        console.log(configJson);

        const result = await buildUserData(configJson);
    
        expect(result).toEqual([
            {
                "type": "GLEIF",
                "alias": "gleif-user-1",
                "identifiers": [
                    {
                        "name": "gleif-aid-1",
                        "agent": {
                            "name": "gleif-agent-1",
                            "secret": "D_PbQb01zuzQgK-kDWjq5"
                        }
                    }
                ]
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
                            "secret": "BTaqgh1eeOjXO5iQJp6m5"
                        }
                    }
                ]
            },
            {
                "type": "LE",
                "alias": "le-user-1",
                "identifiers": [
                    {
                        "name": "le-aid-1",
                        "agent": {
                            "name": "le-agent-1",
                            "secret": "Akv4TFoiYeHNqzj3N8gE5"
                        }
                    }
                ]
            },
            {
                "type": "ECR",
                "alias": "ecr-user-1",
                "identifiers": [
                    {
                        "name": "ecr-aid-1",
                        "agent": {
                            "name": "ecr-agent-1",
                            "secret": "nf98hUHUy8Vt5tvdyaYV5"
                        }
                    }
                ]
            }
        ]);
    });
});