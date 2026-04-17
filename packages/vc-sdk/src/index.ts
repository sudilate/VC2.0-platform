import type { SignCredentialRequest, SignCredentialResponse, VerifyPresentationRequest, VerifyPresentationResponse } from "@vc-platform/types";

export interface VcClientOptions {
  baseUrl: string;
  apiKey: string;
}

export class VcClient {
  constructor(private readonly options: VcClientOptions) {}

  async issueCredential(input: SignCredentialRequest): Promise<SignCredentialResponse> {
    const response = await fetch(`${this.options.baseUrl}/v1/credentials/issue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify(input),
    });

    return response.json() as Promise<SignCredentialResponse>;
  }

  async verifyPresentation(input: VerifyPresentationRequest): Promise<VerifyPresentationResponse> {
    const response = await fetch(`${this.options.baseUrl}/v1/presentations/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify(input),
    });

    return response.json() as Promise<VerifyPresentationResponse>;
  }
}
