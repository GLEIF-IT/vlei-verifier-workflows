import {
  getIdentifierData,
  getAgentSecret,
  buildCredentials,
  buildAidData,
} from '../../src/utils/handle-json-config';

const sampleConfig = {
  identifiers: {
    id1: { agent: 'agentA' },
    id2: { agent: 'agentB' },
    id3: { identifiers: ['id1', 'id2'], isith: '1', nsith: '1' },
  },
  agents: {
    agentA: { secret: 'secretA' },
    agentB: { secret: 'secretB' },
  },
  secrets: {
    secretA: 'valueA',
    secretB: 'valueB',
  },
  credentials: {
    cred1: {
      type: 'cert',
      schema: 'schema1',
      rules: 'rules1',
      privacy: true,
      attributes: { key: 'value' },
      credSource: 'source1',
    },
  },
};

const sampleConfig2 = {
  identifiers: {
    id1: { agent: 'agentA' },
    id2: { agent: 'agentB' },
    id3: { identifiers: ['id1', 'id2'], isith: '1', nsith: '1' },
    id4: { agent: 'agentC' },
    id5: { identifiers: ['id3', 'id4'], isith: '2', nsith: '2' },
  },
  agents: {
    agentA: { secret: 'secretA' },
    agentB: { secret: 'secretB' },
    agentC: { secret: 'secretC' },
  },
  secrets: {
    secretA: 'valueA',
    secretB: 'valueB',
    secretC: 'valueC',
  },
  credentials: {
    cred1: {
      type: 'cert',
      schema: 'schema1',
      rules: 'rules1',
      privacy: true,
      attributes: { key: 'value1' },
      credSource: 'source1',
    },
    cred2: {
      type: 'license',
      schema: 'schema2',
      rules: 'rules2',
      privacy: false,
      attributes: { key: 'value2' },
      credSource: 'source2',
    },
  },
};

describe('testing utility functions', () => {
  test('getIdentifierData should return correct singlesig identifier data', () => {
    const result = getIdentifierData(sampleConfig, 'id1');
    expect(result).toEqual({
      agent: { name: 'agentA', secret: 'valueA' },
      type: 'singlesig',
    });
  });

  test('getIdentifierData should return correct multisig identifier data', () => {
    const result = getIdentifierData(sampleConfig, 'id3');
    expect(result).toEqual({
      type: 'multisig',
      identifiers: ['id1', 'id2'],
      isith: '1',
      nsith: '1',
    });
  });

  test('getAgentSecret should return the correct secret for an agent', () => {
    const result = getAgentSecret(sampleConfig, 'agentA');
    expect(result).toBe('valueA');
  });

  test('buildCredentials should return a map of credential information', () => {
    const result = buildCredentials(sampleConfig);
    expect(result.get('cred1')).toEqual({
      type: 'cert',
      schema: 'schema1',
      rules: 'rules1',
      privacy: true,
      attributes: { key: 'value' },
      credSource: 'source1',
    });
  });

  test('buildAidData should return processed identifiers with agent secrets', async () => {
    const result = await buildAidData(sampleConfig);
    expect(result).toEqual({
      id1: { agent: { name: 'agentA', secret: 'valueA' } },
      id2: { agent: { name: 'agentB', secret: 'valueB' } },
      id3: { identifiers: ['id1', 'id2'], isith: '1', nsith: '1' },
    });
  });
});

describe('testing utility functions with new sampleConfig', () => {
  test('getIdentifierData should return correct data for a new singlesig identifier', () => {
    const result = getIdentifierData(sampleConfig2, 'id4');
    expect(result).toEqual({
      agent: { name: 'agentC', secret: 'valueC' },
      type: 'singlesig',
    });
  });

  test('getIdentifierData should return correct multisig data for a new identifier', () => {
    const result = getIdentifierData(sampleConfig2, 'id5');
    expect(result).toEqual({
      type: 'multisig',
      identifiers: ['id3', 'id4'],
      isith: '2',
      nsith: '2',
    });
  });

  test('getAgentSecret should return the correct secret for a newly added agent', () => {
    const result = getAgentSecret(sampleConfig2, 'agentC');
    expect(result).toBe('valueC');
  });

  test('buildCredentials should return a map with multiple credentials', () => {
    const result = buildCredentials(sampleConfig2);
    expect(result.get('cred1')).toEqual({
      type: 'cert',
      schema: 'schema1',
      rules: 'rules1',
      privacy: true,
      attributes: { key: 'value1' },
      credSource: 'source1',
    });
    expect(result.get('cred2')).toEqual({
      type: 'license',
      schema: 'schema2',
      rules: 'rules2',
      privacy: false,
      attributes: { key: 'value2' },
      credSource: 'source2',
    });
  });

  test('buildAidData should return processed identifiers with additional agent secrets', async () => {
    const result = await buildAidData(sampleConfig2);
    expect(result).toEqual({
      id1: { agent: { name: 'agentA', secret: 'valueA' } },
      id2: { agent: { name: 'agentB', secret: 'valueB' } },
      id3: { identifiers: ['id1', 'id2'], isith: '1', nsith: '1' },
      id4: { agent: { name: 'agentC', secret: 'valueC' } },
      id5: { identifiers: ['id3', 'id4'], isith: '2', nsith: '2' },
    });
  });
});
