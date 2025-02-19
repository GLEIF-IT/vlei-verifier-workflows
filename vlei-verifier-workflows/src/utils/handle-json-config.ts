export function getIdentifierData(jsonConfig: any, aidName: string): IdentifierData {
  const identifier = jsonConfig.identifiers[aidName];
  if (identifier.identifiers){
    return {
      type: "multisig",
      ...identifier
    } as MultisigIdentifierData
  }  
  const agent = jsonConfig.agents[identifier["agent"]];
  const secret = jsonConfig.secrets[agent["secret"]];
  return {
    type: "singlesig",
    ...identifier,
    agent: {
      name: identifier.agent,
      secret: secret
    },
    
  } as SinglesigIdentifierData
}



export function buildCredentials(
  jsonConfig: any,
): Map<string, CredentialInfo> {
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
  agent: {name: string, secret: string};  
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
