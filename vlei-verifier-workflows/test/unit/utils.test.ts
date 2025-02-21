import { getIdentifierData, getAgentSecret, buildCredentials, buildAidData } from "../../src/utils/handle-json-config";

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

describe("testing utility functions", () => {
  test("getIdentifierData should return correct singlesig identifier data", () => {
    const result = getIdentifierData(sampleConfig, "id1");
    expect(result).toEqual({
      agent: { name: "agentA", secret: "valueA" },
      type: "singlesig",
    });
  });

  test("getIdentifierData should return correct multisig identifier data", () => {
    const result = getIdentifierData(sampleConfig, "id3");
    expect(result).toEqual({
      type: "multisig",
      identifiers: ["id1", "id2"],
      isith: "1",
      nsith: "1",
    });
  });
  

  test("getAgentSecret should return the correct secret for an agent", () => {
    const result = getAgentSecret(sampleConfig, "agentA");
    expect(result).toBe("valueA");
  });

  test("buildCredentials should return a map of credential information", () => {
    const result = buildCredentials(sampleConfig);
    expect(result.get("cred1")).toEqual({
      type: "cert",
      schema: "schema1",
      rules: "rules1",
      privacy: true,
      attributes: { key: "value" },
      credSource: "source1",
    });
  });

  test("buildAidData should return processed identifiers with agent secrets", async () => {
    const result = await buildAidData(sampleConfig);
    expect(result).toEqual({
      id1: { agent: { name: "agentA", secret: "valueA" } },
      id2: { agent: { name: "agentB", secret: "valueB" } },
      id3: { identifiers: ["id1", "id2"], isith: "1", nsith: "1" },
    });
  });
});

