import { SignifyClient } from "signify-ts";
import FormData = require("form-data");
import { getOrCreateClients } from "./utils/test-util";

export class VleiVerifierAdapter {
  verifierBaseUrl: string;
  constructor(verifierBaseUrl: string) {
    this.verifierBaseUrl = verifierBaseUrl;
  }

  public async presentCredential(
    credentialCesr: string,
    credentialSaid: string,
  ): Promise<Response> {
    const heads = new Headers();
    heads.set("Content-Type", "application/json+cesr");
    const url = `${this.verifierBaseUrl}/presentations/${credentialSaid}`;
    const sresp = await fetch(url, {
      headers: heads,
      method: "PUT",
      body: credentialCesr,
    });
    return sresp;
  }

  public async checkAidAuthStatus(aidPrefix: string): Promise<Response> {
    const heads = new Headers();
    const url = `${this.verifierBaseUrl}/authorizations/${aidPrefix}`;
    const sresp = await fetch(url, { headers: heads, method: "GET" });
    return sresp;
  }

  public async addRootOfTrust(
    aidPrefix: string,
    cesr: string,
    oobi: string,
  ): Promise<Response> {
    const heads = new Headers();
    heads.set("Content-Type", "application/json");
    const payload = {
      vlei: cesr,
      oobi: oobi,
    };
    const url = `${this.verifierBaseUrl}/root_of_trust/${aidPrefix}`;
    const sresp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return sresp;
  }
}
