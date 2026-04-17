import type { Environment } from "./auth";

export interface DidResolutionResult {
  did: string;
  document: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SignCredentialRequest {
  organizationId: string;
  environment: Environment;
  keyRef: string;
  issuerDid: string;
  credentialPayloadJson: Record<string, unknown>;
  signatureSuite: "Ed25519Signature2020" | "SdJwt";
}

export interface SignCredentialResponse {
  success: boolean;
  signedCredentialJson: Record<string, unknown> | null;
  errors: string[];
}

export interface VerifyPresentationRequest {
  organizationId: string;
  environment: Environment;
  verificationInputJson: Record<string, unknown>;
}

export interface VerifyPresentationResponse {
  success: boolean;
  verificationResultJson: Record<string, unknown>;
  errors: string[];
}
