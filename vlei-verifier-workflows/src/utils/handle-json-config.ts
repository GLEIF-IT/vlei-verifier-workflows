export function getIdentifierData(
  jsonConfig: any,
  aidName: string,
): IdentifierData {
  const identifier = jsonConfig.identifiers?.[aidName];
  
  // Check if identifier exists
  if (!identifier) {
    throw new Error(`Identifier not found: ${aidName}`);
  }
  
  if (identifier.identifiers) {
    return {
      type: "multisig",
      ...identifier,
    } as MultisigIdentifierData;
  }
  
  // Make sure agent exists
  if (!identifier.agent || !jsonConfig.agents?.[identifier.agent]) {
    throw new Error(`Agent not found for identifier: ${aidName}`);
  }
  
  const agent = jsonConfig.agents[identifier.agent];
  
  // Make sure secret exists
  if (!agent.secret || !jsonConfig.secrets?.[agent.secret]) {
    throw new Error(`Secret not found for agent: ${identifier.agent}`);
  }
  
  const secret = jsonConfig.secrets[agent.secret];
  
  return {
    type: "singlesig",
    ...identifier,
    agent: {
      name: identifier.agent,
      secret: secret,
    },
  } as SinglesigIdentifierData;
}

export function getAgentSecret(jsonConfig: any, agentName: string): string {
  const agent = jsonConfig.agents[agentName];
  const secret = jsonConfig.secrets[agent["secret"]];
  return secret;
}

export function buildCredentials(jsonConfig: any): Map<string, CredentialInfo> {
  let credentials: Map<string, CredentialInfo> = new Map<
    string,
    CredentialInfo
  >();
  for (const key in jsonConfig.credentials) {
    const cred = jsonConfig.credentials[key];
    let curCred: CredentialInfo = {
      type: cred.type,
      schema: cred.schema,
      rules: cred.rules,
      privacy: cred.privacy,
      attributes: cred.attributes,
      credSource: cred.credSource,
    };
    credentials.set(key, curCred);
  }
  return credentials;
}

export async function buildAidData(jsonConfig: any): Promise<any> {
  let users: Array<User> = new Array<User>();
  const identifiers = structuredClone(jsonConfig.identifiers);
  for (const key of Object.keys(identifiers)) {
    if (identifiers[key]["agent"]) {
      identifiers[key].agent = {
        name: identifiers[key]["agent"],
        secret:
          jsonConfig.secrets[
            jsonConfig.agents[identifiers[key]["agent"]]["secret"]
          ],
      };
    }
  }
  return identifiers;
}

export interface IdentifierData {
  type: "singlesig" | "multisig";
  name: string;
  delegator?: string;
}

export interface SinglesigIdentifierData extends IdentifierData {
  agent: { name: string; secret: string };
}

export interface MultisigIdentifierData extends IdentifierData {
  identifiers: any;
  isith: string;
  nsith: string;
}

export interface User {
  type: string;
  LE: string;
  alias: string;
  identifiers: any;
}

export interface CredentialInfo {
  type: string;
  schema: string;
  rules?: string;
  privacy: boolean;
  attributes: any;
  credSource?: any;
}
