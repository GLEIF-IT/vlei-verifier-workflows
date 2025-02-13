import { buildUserData, User } from '../src/utils/handle-json-config'; // Adjust the import path

describe('buildUserData', () => {
  it('should correctly transform jsonConfig into an array of User objects', async () => {
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


