import { SignifyClient } from 'signify-ts';

import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Function to load and parse YAML file
export function loadWorkflow(workflowFilePath: string) {
  try {
    const file = fs.readFileSync(workflowFilePath, 'utf8');
    return yaml.load(file);
  } catch (e) {
    console.error('Error reading YAML file:', e);
    return null;
  }
}

export async function getConfig(configFilePath: string) {
  const configJson = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
  return configJson;
}

export async function getGrantedCredential(
  client: SignifyClient,
  credId: string
): Promise<any> {
  const credentialList = await client.credentials().list({
    filter: { '-d': credId },
  });
  let credential: any;
  if (credentialList.length > 0) {
    credential = credentialList[0];
  }
  return credential;
}

export interface VleiUser {
  roleClient: any;
  ecrAid: any;
  creds: any;
  idAlias: string;
}

export interface CredentialPresentationStatus {
  name: string;
  description: any;
  status: 'valid' | 'invalid';
}

export interface CredentialAuthorizationStatus {
  name: string;
  description: any;
  status: 'success' | 'fail';
}

export const CREDENTIAL_CRYPT_VALID: CredentialPresentationStatus = {
  name: 'cred_crypt_valid',
  description: 'Credential is cryptographically valid',
  status: 'valid',
};
export const CREDENTIAL_CRYPT_INVALID: CredentialPresentationStatus = {
  name: 'cred_crypt_invalid',
  description: 'Credential is not cryptographically valid',
  status: 'invalid',
};
export const CREDENTIAL_VERIFIED: CredentialAuthorizationStatus = {
  name: 'cred_verified',
  description: 'Credential is verified and has a valid login account',
  status: 'success',
};
export const CREDENTIAL_REVOKED: CredentialAuthorizationStatus = {
  name: 'cred_revoked',
  description: 'Credential is revoked',
  status: 'fail',
};
export const CREDENTIAL_INVALID_SCHEMA: CredentialAuthorizationStatus = {
  name: 'cred_invalid_schema',
  description: 'Credential with invalid schema',
  status: 'fail',
};
export const CREDENTIAL_NON_DELEGATED_QVI: CredentialAuthorizationStatus = {
  name: 'cred_non_delegated_qvi',
  description: 'The QVI AID of the credential is not delegated',
  status: 'fail',
};
export const CREDENTIAL_NOT_ROT_DELEGATED_QVI: CredentialAuthorizationStatus = {
  name: 'cred_not_rot_delegated_qvi',
  description:
    'The QVI AID of the credential is not delegated by the root of trust',
  status: 'fail',
};
export const CREDENTIAL_NOT_VALID_ROOT_OF_TRUST: CredentialAuthorizationStatus =
  {
    name: 'cred_not_valid_root_of_trust',
    description: 'Credential is not chained to the valid root of trust',
    status: 'fail',
  };

export const credPresentationStatusMapping = new Map<
  string,
  CredentialPresentationStatus
>([
  ['cred_crypt_valid', CREDENTIAL_CRYPT_VALID],
  ['cred_crypt_invalid', CREDENTIAL_CRYPT_INVALID],
]);

export const credAuthorizationStatusMapping = new Map<
  string,
  CredentialAuthorizationStatus
>([
  ['cred_verified', CREDENTIAL_VERIFIED],
  ['cred_revoked', CREDENTIAL_REVOKED],
  ['cred_invalid_schema', CREDENTIAL_INVALID_SCHEMA],
  ['cred_non_delegated_qvi', CREDENTIAL_NON_DELEGATED_QVI],
  ['cred_not_rot_delegated_qvi', CREDENTIAL_NOT_ROT_DELEGATED_QVI],
  ['cred_not_valid_root_of_trust', CREDENTIAL_NOT_VALID_ROOT_OF_TRUST],
]);
