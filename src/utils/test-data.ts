import { SignifyClient } from "signify-ts";
import path = require("path");

const fs = require("fs");
const yaml = require("js-yaml");


// Function to load and parse YAML file
export function loadWorkflow(workflowFilePath: string) {
  try {
    const file = fs.readFileSync(workflowFilePath, "utf8");
    return yaml.load(file);
  } catch (e) {
    console.error("Error reading YAML file:", e);
    return null;
  }
}


export async function getConfig(configFilePath: string) {
  const configJson = JSON.parse(
    fs.readFileSync(configFilePath, "utf-8"),
  );
  return configJson;
}

export async function getGrantedCredential(
  client: SignifyClient,
  credId: string,
): Promise<any> {
  const credentialList = await client.credentials().list({
    filter: { "-d": credId },
  });
  let credential: any;
  if (credentialList.length > 0) {
    credential = credentialList[0];
  }
  return credential;
}

export interface ApiUser {
  roleClient: any;
  ecrAid: any;
  creds: Array<any>;
  lei: string;
  uploadDig: string;
  idAlias: string;
}


