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
import SignifyClient from 'signify-ts';

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
    client: SignifyClient.SignifyClient,
    idAlias: string,
    expectedStatus: PresentationStatus = CREDENTIAL_CRYPT_VALID
  ) {
    const presentationExpectedStatusCode =
      expectedStatus.status == CREDENTIAL_CRYPT_VALID.status ? 202 : 400;
    await this.presentation(
      cred.sad.d,
      credCesr,
      client,
      idAlias,
      presentationExpectedStatusCode
    );
  }

  public async credentialAuthorization(
    client: SignifyClient.SignifyClient,
    idAlias: string,
    aidPrefix: string,
    expectedStatus: AuthorizationStatus = CREDENTIAL_VERIFIED
  ) {
    const checkAidAuthExpectedStatus =
      expectedStatus.status == CREDENTIAL_VERIFIED.status ? 200 : 401;
    await this.authorization(
      client,
      idAlias,
      aidPrefix,
      checkAidAuthExpectedStatus
    );
  }

  public async aidPresentation(
    aidPrefix: string,
    aidCesr: string,
    client: SignifyClient.SignifyClient,
    idAlias: string,
    expectedStatus: PresentationStatus = AID_CRYPT_VALID
  ) {
    const presentationExpectedStatusCode =
      expectedStatus.status == AID_CRYPT_VALID.status ? 202 : 400;
    await this.presentation(
      aidPrefix,
      aidCesr,
      client,
      idAlias,
      presentationExpectedStatusCode
    );
  }

  public async aidAuthorization(
    client: SignifyClient.SignifyClient,
    idAlias: string,
    aidPrefix: string,
    expectedStatus: AuthorizationStatus = AID_VERIFIED
  ) {
    const checkAidAuthExpectedStatus =
      expectedStatus.status == AID_VERIFIED.status ? 200 : 401;
    await this.authorization(
      client,
      idAlias,
      aidPrefix,
      checkAidAuthExpectedStatus
    );
  }

  private async presentation(
    said: string,
    credCesr: string,
    client: SignifyClient.SignifyClient,
    idAlias: string,
    expected_status_code: number
  ) {
    const presentationRequest =
      await this.verifierClient.buildPresentationRequest(said, credCesr);
    const sreq = await client.createSignedRequest(
      idAlias,
      presentationRequest.url,
      presentationRequest.req
    );
    const verifierResponse = await this.verifierClient.presentation(
      said,
      credCesr,
      sreq
    );
    assert.equal(verifierResponse.code, expected_status_code);
  }

  private async authorization(
    client: SignifyClient.SignifyClient,
    idAlias: string,
    aidPrefix: string,
    expected_status_code: number
  ) {
    const authRequest =
      await this.verifierClient.buildAuthorizationRequest(aidPrefix);
    const sreq = await client.createSignedRequest(
      idAlias,
      authRequest.url,
      authRequest.req
    );
    const verifierResponse = await this.verifierClient.authorization(
      aidPrefix,
      sreq
    );
    assert.equal(verifierResponse.code, expected_status_code);
  }
}
