import { strict as assert } from 'assert';
import { VerifierClient } from 'vlei-verifier-client';
import { resolveEnvironment, TestEnvironment } from './utils/resolve-env.js';
import {
  CREDENTIAL_CRYPT_VALID,
  CREDENTIAL_VERIFIED,
  PresentationStatus,
  AuthorizationStatus,
  AID_CRYPT_VALID,
  AID_VERIFIED,
} from './utils/test-data.js';

export class VleiVerification {
  private env: TestEnvironment;
  private verifierClient: VerifierClient;
  constructor() {
    this.env = resolveEnvironment();
    this.verifierClient = new VerifierClient(this.env.verifierBaseUrl);
  }

  public async credentialPresentation(
    cred: { sad: { d: string } },
    credCesr: string,
    expectedStatus: PresentationStatus = CREDENTIAL_CRYPT_VALID
  ) {
    const presentationExpectedStatusCode =
      expectedStatus.status == CREDENTIAL_CRYPT_VALID.status ? 202 : 400;
    await this.presentation(
      cred.sad.d,
      credCesr,
      presentationExpectedStatusCode
    );
  }

  public async credentialAuthorization(
    aidPrefix: string,
    expectedStatus: AuthorizationStatus = CREDENTIAL_VERIFIED
  ) {
    const checkAidAuthExpectedStatus =
      expectedStatus.status == CREDENTIAL_VERIFIED.status ? 200 : 401;
    await this.authorization(aidPrefix, checkAidAuthExpectedStatus);
  }

  public async aidPresentation(
    aidPrefix: string,
    aidCesr: string,
    expectedStatus: PresentationStatus = AID_CRYPT_VALID
  ) {
    const presentationExpectedStatusCode =
      expectedStatus.status == AID_CRYPT_VALID.status ? 202 : 400;
    await this.presentation(aidPrefix, aidCesr, presentationExpectedStatusCode);
  }

  public async aidAuthorization(
    aidPrefix: string,
    expectedStatus: AuthorizationStatus = AID_VERIFIED
  ) {
    const checkAidAuthExpectedStatus =
      expectedStatus.status == AID_VERIFIED.status ? 200 : 401;
    await this.authorization(aidPrefix, checkAidAuthExpectedStatus);
  }

  private async presentation(
    said: string,
    credCesr: string,
    expected_status_code: number
  ) {
    const verifierResponse = await this.verifierClient.login(said, credCesr);
    assert.equal(verifierResponse.code, expected_status_code);
  }

  private async authorization(aidPrefix: string, expected_status_code: number) {
    const verifierResponse = await this.verifierClient.checkLogin(aidPrefix);
    assert.equal(verifierResponse.code, expected_status_code);
  }
}
