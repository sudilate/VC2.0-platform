import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { registerCredentialRoutes, type CredentialRepository, type IssuedCredentialRecord, type SchemaForIssuance, type TemplateForIssuance } from "./routes";

function makeSessionGuard(activeOrganizationId = "org_1") {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    request.authSession = {
      user: {
        id: "user_1",
        email: "user@example.com",
        name: "User One",
      },
      session: {
        id: "session_1",
        userId: "user_1",
        activeOrganizationId,
      },
    };
  };
}

const noOpActiveGuard = async () => undefined;
const allowPermission = async () => true;

describe("credential routes", () => {
  let app = Fastify();
  const records: IssuedCredentialRecord[] = [];
  const schemas = new Map<string, SchemaForIssuance>();
  const templates = new Map<string, TemplateForIssuance>();

  const repository: CredentialRepository = {
    async getTemplateById(organizationId, templateId) {
      const record = templates.get(templateId);
      return record && record.organizationId === organizationId ? record : null;
    },
    async getSchemaById(organizationId, schemaId) {
      const record = schemas.get(schemaId);
      return record && record.organizationId === organizationId ? record : null;
    },
    async createCredential(input) {
      const record: IssuedCredentialRecord = {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        templateId: input.templateId,
        issuerDid: input.issuerDid,
        subjectDid: input.subjectDid,
        credentialId: String(input.credentialJson.id),
        format: input.format,
        status: "issued",
        credentialJson: input.credentialJson,
        proofJson: input.proofJson,
        issuedAt: new Date(),
        revokedAt: null,
        createdBy: input.createdBy,
        createdAt: new Date(),
      };
      records.push(record);
      return record;
    },
    async listIssuedCredentials(organizationId) {
      return records.filter((record) => record.organizationId === organizationId);
    },
  };

  beforeEach(async () => {
    records.length = 0;
    schemas.clear();
    templates.clear();

    const schemaId = crypto.randomUUID();
    const templateId = crypto.randomUUID();

    schemas.set(schemaId, {
      id: schemaId,
      organizationId: "org_1",
      name: "Person Schema",
      version: "1.0.0",
      schemaUri: "https://example.com/schemas/person.json",
      schemaJson: {
        type: "object",
        required: ["fullName"],
        properties: {
          fullName: { type: "string" },
          age: { type: "number" },
        },
      },
    });

    templates.set(templateId, {
      id: templateId,
      organizationId: "org_1",
      schemaId,
      name: "Person Template",
      templateJson: {
        type: ["VerifiableCredential", "PersonCredential"],
      },
    });

    app = Fastify();
    await registerCredentialRoutes(app, {
      repository,
      cryptoService: {
        async signCredential(input) {
          return {
            success: true,
            signedCredentialJson: {
              ...input.credentialPayloadJson,
              proof: {
                type: "Ed25519Signature2020",
                verificationMethod: `${input.issuerDid}#keys-1`,
                proofValue: "zFakeSignature",
              },
            },
            errors: [],
          };
        },
        async verifyCredential(input) {
          const proof = (input.verificationInputJson as { proof?: unknown }).proof;
          const isValid = Boolean(proof);
          return {
            success: isValid,
            verificationResultJson: {
              success: isValid,
              isSignatureValid: isValid,
              errors: isValid ? [] : ["Credential proof is missing or malformed"],
            },
            errors: isValid ? [] : ["Credential proof is missing or malformed"],
          };
        },
        async verifyPresentation(input) {
          const proof = (input.verificationInputJson as { proof?: unknown }).proof;
          const verifiableCredential = (input.verificationInputJson as { verifiableCredential?: unknown }).verifiableCredential;
          const hasCredentials = Boolean(verifiableCredential);
          const isValid = Boolean(proof) && hasCredentials;
          return {
            success: isValid,
            verificationResultJson: {
              success: isValid,
              presentationId: input.verificationInputJson.id ?? "unknown",
              proofVerification: {
                isValid: Boolean(proof),
              },
              credentialsVerification: {
                totalCredentials: hasCredentials ? 1 : 0,
                validCredentials: hasCredentials ? 1 : 0,
              },
              errors: isValid ? [] : ["Presentation must include proof and credentials"],
            },
            errors: isValid ? [] : ["Presentation must include proof and credentials"],
          };
        },
      },
      sessionGuard: makeSessionGuard("org_1"),
      activeOrganizationGuard: noOpActiveGuard,
      permissionChecker: allowPermission,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("issues a credential from template and schema", async () => {
    const templateId = Array.from(templates.keys())[0]!;

    const response = await app.inject({
      method: "POST",
      url: "/v1/credentials/issue",
      payload: {
        templateId,
        issuerDid: "did:web:issuer.example",
        subjectDid: "did:key:z6MkSubject123",
        claims: {
          fullName: "Amit Sarang",
          age: 30,
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as { credential: IssuedCredentialRecord };
    expect(body.credential.organizationId).toBe("org_1");
    expect(body.credential.createdBy).toBe("user_1");
    expect(body.credential.credentialJson.credentialSubject).toBeDefined();
  });

  it("rejects issuance when required claims are missing", async () => {
    const templateId = Array.from(templates.keys())[0]!;

    const response = await app.inject({
      method: "POST",
      url: "/v1/credentials/issue",
      payload: {
        templateId,
        issuerDid: "did:web:issuer.example",
        subjectDid: "did:key:z6MkSubject123",
        claims: {
          age: 30,
        },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("lists issued credentials for active organization", async () => {
    const templateId = Array.from(templates.keys())[0]!;
    await repository.createCredential({
      organizationId: "org_1",
      templateId,
      issuerDid: "did:web:issuer.example",
      subjectDid: "did:key:z6MkSubject123",
      format: "vc-jsonld",
      credentialJson: { id: "urn:uuid:test-1" },
      proofJson: { type: "Ed25519Signature2020" },
      createdBy: "user_1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/credentials",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { credentials: IssuedCredentialRecord[] };
    expect(body.credentials).toHaveLength(1);
  });

  it("verifies a signed credential", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/credentials/verify",
      payload: {
        credential: {
          issuer: "did:web:issuer.example",
          credentialSubject: {
            id: "did:key:z6MkSubject123",
          },
          proof: {
            type: "Ed25519Signature2020",
            proofValue: "zFakeSignature",
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { verification: { success: boolean } };
    expect(body.verification.success).toBe(true);
  });

  it("verifies a presentation with embedded credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/presentations/verify",
      payload: {
        presentation: {
          id: "urn:uuid:presentation-1",
          holder: "did:key:z6MkHolder123",
          verifiableCredential: [
            {
              id: "urn:uuid:credential-1",
              issuer: "did:web:issuer.example",
              credentialSubject: { id: "did:key:z6MkSubject123" },
              proof: {
                type: "Ed25519Signature2020",
                proofValue: "zFakeSignature",
              },
            },
          ],
          proof: {
            type: "Ed25519Signature2020",
            proofPurpose: "authentication",
            proofValue: "zFakePresentationSignature",
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { verification: { success: boolean } };
    expect(body.verification.success).toBe(true);
  });

  it("rejects presentation without proof", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/presentations/verify",
      payload: {
        presentation: {
          id: "urn:uuid:presentation-2",
          holder: "did:key:z6MkHolder123",
          verifiableCredential: [],
          // No proof
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { verification: { success: boolean } };
    expect(body.verification.success).toBe(false);
  });
});
