import path from "node:path";
import { fileURLToPath } from "node:url";
import { credentials, loadPackageDefinition } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import { env } from "../config/env";

export interface CryptoSignInput {
  organizationId: string;
  environment: string;
  keyRef: string;
  issuerDid: string;
  credentialPayloadJson: Record<string, unknown>;
  signatureSuite: "Ed25519Signature2020" | "SdJwt";
}

export interface CryptoSignResult {
  success: boolean;
  signedCredentialJson: Record<string, unknown> | null;
  errors: string[];
}

export interface CryptoVerifyInput {
  organizationId: string;
  environment: string;
  verificationInputJson: Record<string, unknown>;
}

export interface CryptoVerifyResult {
  success: boolean;
  verificationResultJson: Record<string, unknown>;
  errors: string[];
}

type UnaryCallback<T> = (error: Error | null, response: T) => void;

interface GrpcCryptoClient {
  signCredential(request: Record<string, string>, callback: UnaryCallback<{ success: boolean; signedCredentialJson: string; errors: string[] }>): void;
  verifyCredential(request: Record<string, string>, callback: UnaryCallback<{ success: boolean; verificationResultJson: string; errors: string[] }>): void;
  verifyPresentation(request: Record<string, string>, callback: UnaryCallback<{ success: boolean; verificationResultJson: string; errors: string[] }>): void;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoPath = path.resolve(__dirname, "../../../crypto-engine/proto/crypto_engine.proto");

const packageDefinition = loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = loadPackageDefinition(packageDefinition) as unknown as {
  vcplatform: {
    crypto: {
      v1: {
        CryptoEngine: new (target: string, creds: ReturnType<typeof credentials.createInsecure>) => GrpcCryptoClient;
      };
    };
  };
};

function getGrpcTarget() {
  const target = env.CRYPTO_ENGINE_URL;
  if (target.startsWith("http://") || target.startsWith("https://")) {
    const url = new URL(target);
    return url.host;
  }

  return target;
}

const client = new grpcObject.vcplatform.crypto.v1.CryptoEngine(getGrpcTarget(), credentials.createInsecure());

function parseJsonOrThrow<T extends Record<string, unknown>>(value: string, fallbackMessage: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(fallbackMessage);
  }
}

export async function signCredentialWithCryptoEngine(input: CryptoSignInput): Promise<CryptoSignResult> {
  return new Promise((resolve, reject) => {
    client.signCredential(
      {
        organizationId: input.organizationId,
        environment: input.environment,
        keyRef: input.keyRef,
        issuerDid: input.issuerDid,
        credentialPayloadJson: JSON.stringify(input.credentialPayloadJson),
        signatureSuite: input.signatureSuite,
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          success: response.success,
          signedCredentialJson: response.signedCredentialJson
            ? parseJsonOrThrow<Record<string, unknown>>(response.signedCredentialJson, "Crypto engine returned invalid signed credential JSON.")
            : null,
          errors: response.errors ?? [],
        });
      },
    );
  });
}

export async function verifyCredentialWithCryptoEngine(input: CryptoVerifyInput): Promise<CryptoVerifyResult> {
  return new Promise((resolve, reject) => {
    client.verifyCredential(
      {
        organizationId: input.organizationId,
        environment: input.environment,
        verificationInputJson: JSON.stringify(input.verificationInputJson),
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          success: response.success,
          verificationResultJson: response.verificationResultJson
            ? parseJsonOrThrow<Record<string, unknown>>(response.verificationResultJson, "Crypto engine returned invalid verification result JSON.")
            : {},
          errors: response.errors ?? [],
        });
      },
    );
  });
}

export async function verifyPresentationWithCryptoEngine(input: CryptoVerifyInput): Promise<CryptoVerifyResult> {
  return new Promise((resolve, reject) => {
    client.verifyPresentation(
      {
        organizationId: input.organizationId,
        environment: input.environment,
        verificationInputJson: JSON.stringify(input.verificationInputJson),
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          success: response.success,
          verificationResultJson: response.verificationResultJson
            ? parseJsonOrThrow<Record<string, unknown>>(response.verificationResultJson, "Crypto engine returned invalid presentation verification result JSON.")
            : {},
          errors: response.errors ?? [],
        });
      },
    );
  });
}
