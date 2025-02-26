import { resolveEnvironment } from './utils/resolve-env';
import {
  CREDENTIAL_CRYPT_VALID,
  CREDENTIAL_VERIFIED,
  CredentialPresentationStatus,
  CredentialAuthorizationStatus,
  VleiUser,
} from './utils/test-data';
import { strict as assert } from 'assert';
import { VerifierClient } from 'vlei-verifier-client';

export class CredentialVerification {
  private env: any;
  private verifierClient: VerifierClient;
  constructor() {
    this.env = resolveEnvironment();
    this.verifierClient = new VerifierClient(this.env.verifierBaseUrl);
  }

  public async credentialPresentation(
    vleiUser: VleiUser,
    credId: string,
    expectedStatus: CredentialPresentationStatus = CREDENTIAL_CRYPT_VALID
  ) {
    const credential = JSON.parse(JSON.stringify(vleiUser.creds[credId]));

    const presentationExpectedStatusCode =
      expectedStatus.status == CREDENTIAL_CRYPT_VALID.status ? 202 : 400;
    await this.presentCredential(
      credential.cred,
      credential.credCesr,
      presentationExpectedStatusCode
    );
  }

  public async credentialAuthorization(
    vleiUser: VleiUser,
    expectedStatus: CredentialAuthorizationStatus = CREDENTIAL_VERIFIED
  ) {
    const checkAidAuthExpectedStatus =
      expectedStatus.status == CREDENTIAL_VERIFIED.status ? 200 : 401;
    await this.checkAidAuthStatus(
      vleiUser.ecrAid.prefix,
      checkAidAuthExpectedStatus
    );
  }

  private async presentCredential(
    cred: any,
    credCesr: any,
    expected_status_code: number
  ) {
    const verifierResponse = await this.verifierClient.login(
      cred.sad.d,
      credCesr
    );
    assert.equal(verifierResponse.code, expected_status_code);
  }

  private async checkAidAuthStatus(
    aidPrefix: string,
    expected_status_code: number
  ) {
    const verifierResponse = await this.verifierClient.checkLogin(aidPrefix);
    assert.equal(verifierResponse.code, expected_status_code);
  }
}
