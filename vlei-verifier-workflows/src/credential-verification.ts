import { resolveEnvironment } from "./utils/resolve-env";
import {
    CREDENTIAL_CRYPT_VALID,
    CREDENTIAL_VERIFIED,
    CredentialPresentationStatus,
    CredentialAuthorizationStatus,
    VleiUser
} from "./utils/test-data";
import { VleiVerifierAdapter } from "./vlei-verifier-adapter";
import { strict as assert } from "assert";

export class CredentialVerification {
    private env: any;
    private verifierAdapter: VleiVerifierAdapter;
    constructor() {
        this.env = resolveEnvironment();
        this.verifierAdapter = new VleiVerifierAdapter(this.env.verifierBaseUrl);
    }

    public async credentialPresentation(
        vleiUser: VleiUser,
        credId: string,
        expectedStatus: CredentialPresentationStatus = CREDENTIAL_CRYPT_VALID
    ) {
        const credential = JSON.parse(JSON.stringify(vleiUser.creds[credId]));

        const presentationExpectedStatusCode =
            expectedStatus.status == CREDENTIAL_CRYPT_VALID.status ? 202 : 400;
        await this.presentCredential(credential.cred, credential.credCesr, presentationExpectedStatusCode);
    }

    public async credentialAuthorization(
        vleiUser: VleiUser,
        expectedStatus: CredentialAuthorizationStatus = CREDENTIAL_VERIFIED
    ) {
        const checkAidAuthExpectedStatus =
            expectedStatus.status == CREDENTIAL_VERIFIED.status ? 200 : 401;
        await this.checkAidAuthStatus(vleiUser.ecrAid.prefix, checkAidAuthExpectedStatus);
    }


    private async presentCredential(cred: any, credCesr: any, expected_status_code: number) {

        const verifierResponse = await this.verifierAdapter.presentCredential(
            credCesr,
            cred.sad.d,
        );
        assert.equal(verifierResponse.status, expected_status_code)
    }

    private async checkAidAuthStatus(aidPrefix: string, expected_status_code: number) {
        const verifierResponse = await this.verifierAdapter.checkAidAuthStatus(
            aidPrefix
        );
        assert.equal(verifierResponse.status, expected_status_code)
    }

}

