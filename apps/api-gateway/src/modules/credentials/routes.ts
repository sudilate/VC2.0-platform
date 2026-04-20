import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { credentialRecords, credentialSchemas, credentialTemplates } from "@vc-platform/database";
import { db } from "../../lib/db";
import { signCredentialWithCryptoEngine, verifyCredentialWithCryptoEngine, verifyPresentationWithCryptoEngine } from "../../lib/crypto-client";
import {
  getActiveOrganizationIdOrThrow,
  getSessionOrThrow,
  requireActiveOrganization,
  requireSession,
} from "../../plugins/guards";
import { requireOrganizationPermission, type PermissionMap } from "../../plugins/permissions";

const issueCredentialBody = z.object({
  templateId: z.string().uuid(),
  issuerDid: z.string().min(1),
  subjectDid: z.string().min(1),
  claims: z.record(z.string(), z.unknown()),
  format: z.enum(["vc-jsonld", "sd-jwt"]).optional(),
});

const verifyCredentialBody = z.object({
  credential: z.record(z.string(), z.unknown()),
});

const verifyPresentationBody = z.object({
  presentation: z.record(z.string(), z.unknown()),
});

export interface IssuedCredentialRecord {
  id: string;
  organizationId: string;
  templateId: string | null;
  issuerDid: string;
  subjectDid: string;
  credentialId: string;
  format: "vc-jsonld" | "sd-jwt";
  status: "issued" | "revoked";
  credentialJson: Record<string, unknown>;
  proofJson: Record<string, unknown> | null;
  issuedAt: Date;
  revokedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

export interface TemplateForIssuance {
  id: string;
  organizationId: string;
  schemaId: string;
  name: string;
  templateJson: Record<string, unknown>;
}

export interface SchemaForIssuance {
  id: string;
  organizationId: string;
  name: string;
  version: string;
  schemaUri: string;
  schemaJson: Record<string, unknown>;
}

export interface CredentialRepository {
  getTemplateById(organizationId: string, templateId: string): Promise<TemplateForIssuance | null>;
  getSchemaById(organizationId: string, schemaId: string): Promise<SchemaForIssuance | null>;
  createCredential(input: {
    organizationId: string;
    templateId: string;
    issuerDid: string;
    subjectDid: string;
    format: "vc-jsonld" | "sd-jwt";
    credentialJson: Record<string, unknown>;
    proofJson: Record<string, unknown> | null;
    createdBy: string;
  }): Promise<IssuedCredentialRecord>;
  listIssuedCredentials(organizationId: string): Promise<IssuedCredentialRecord[]>;
}

export interface CryptoService {
  signCredential: typeof signCredentialWithCryptoEngine;
  verifyCredential: typeof verifyCredentialWithCryptoEngine;
  verifyPresentation: typeof verifyPresentationWithCryptoEngine;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidType(value: unknown, expectedType: string) {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
    case "integer":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return isRecord(value);
    case "array":
      return Array.isArray(value);
    default:
      return true;
  }
}

function validateClaimsAgainstSchema(schemaJson: Record<string, unknown>, claims: Record<string, unknown>) {
  const required = Array.isArray(schemaJson.required) ? schemaJson.required.filter((item): item is string => typeof item === "string") : [];
  const properties = isRecord(schemaJson.properties) ? schemaJson.properties : {};

  for (const field of required) {
    if (!(field in claims)) {
      return `Missing required claim: ${field}`;
    }
  }

  for (const [field, value] of Object.entries(claims)) {
    const fieldSchema = properties[field];
    if (!fieldSchema || !isRecord(fieldSchema)) {
      continue;
    }

    const expectedType = typeof fieldSchema.type === "string" ? fieldSchema.type : null;
    if (expectedType && !isValidType(value, expectedType)) {
      return `Claim ${field} does not match expected type ${expectedType}`;
    }
  }

  return null;
}

function buildUnsignedCredentialDocument(input: {
  issuerDid: string;
  subjectDid: string;
  claims: Record<string, unknown>;
  template: TemplateForIssuance;
  schema: SchemaForIssuance;
}) {
  const credentialId = `urn:uuid:${crypto.randomUUID()}`;
  const issuedAt = new Date().toISOString();
  const templateTypes = Array.isArray(input.template.templateJson.type)
    ? input.template.templateJson.type.filter((item): item is string => typeof item === "string")
    : [];

  const credentialJson = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: credentialId,
    type: templateTypes.length > 0 ? templateTypes : ["VerifiableCredential"],
    issuer: input.issuerDid,
    validFrom: issuedAt,
    credentialSchema: {
      id: input.schema.schemaUri,
      type: "JsonSchema",
    },
    credentialSubject: {
      id: input.subjectDid,
      ...input.claims,
    },
  } satisfies Record<string, unknown>;

  return { credentialId, credentialJson };
}

const drizzleCredentialRepository: CredentialRepository = {
  async getTemplateById(organizationId, templateId) {
    const [row] = await db
      .select({
        id: credentialTemplates.id,
        organizationId: credentialTemplates.organizationId,
        schemaId: credentialTemplates.schemaId,
        name: credentialTemplates.name,
        templateJson: credentialTemplates.templateJson,
      })
      .from(credentialTemplates)
      .where(and(eq(credentialTemplates.organizationId, organizationId), eq(credentialTemplates.id, templateId)));

    return row ?? null;
  },
  async getSchemaById(organizationId, schemaId) {
    const [row] = await db
      .select({
        id: credentialSchemas.id,
        organizationId: credentialSchemas.organizationId,
        name: credentialSchemas.name,
        version: credentialSchemas.version,
        schemaUri: credentialSchemas.schemaUri,
        schemaJson: credentialSchemas.schemaJson,
      })
      .from(credentialSchemas)
      .where(and(eq(credentialSchemas.organizationId, organizationId), eq(credentialSchemas.id, schemaId)));

    return row ?? null;
  },
  async createCredential(input) {
    const credentialId = typeof input.credentialJson.id === "string" ? input.credentialJson.id : `urn:uuid:${crypto.randomUUID()}`;
    const [row] = await db
      .insert(credentialRecords)
      .values({
        organizationId: input.organizationId,
        templateId: input.templateId,
        issuerDid: input.issuerDid,
        subjectDid: input.subjectDid,
        credentialId,
        format: input.format,
        status: "issued",
        credentialJson: input.credentialJson,
        proofJson: input.proofJson,
        createdBy: input.createdBy,
      })
      .returning();

    return row;
  },
  async listIssuedCredentials(organizationId) {
    return db
      .select()
      .from(credentialRecords)
      .where(eq(credentialRecords.organizationId, organizationId))
      .orderBy(desc(credentialRecords.createdAt));
  },
};

export interface CredentialRouteDependencies {
  repository?: CredentialRepository;
  cryptoService?: CryptoService;
  sessionGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  activeOrganizationGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  permissionChecker?: (request: FastifyRequest, reply: FastifyReply, permissions: PermissionMap) => Promise<boolean>;
}

export async function registerCredentialRoutes(app: FastifyInstance, deps: CredentialRouteDependencies = {}) {
  const repository = deps.repository ?? drizzleCredentialRepository;
  const cryptoService = deps.cryptoService ?? {
    signCredential: signCredentialWithCryptoEngine,
    verifyCredential: verifyCredentialWithCryptoEngine,
    verifyPresentation: verifyPresentationWithCryptoEngine,
  };
  const sessionGuard = deps.sessionGuard ?? requireSession;
  const activeOrganizationGuard = deps.activeOrganizationGuard ?? requireActiveOrganization;
  const permissionChecker = deps.permissionChecker ?? requireOrganizationPermission;

  app.post("/v1/credentials/issue", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { credential: ["issue"] });
    if (!allowed) {
      return;
    }

    const body = issueCredentialBody.parse(request.body);
    const session = getSessionOrThrow(request);
    const organizationId = getActiveOrganizationIdOrThrow(request);

    const template = await repository.getTemplateById(organizationId, body.templateId);
    if (!template) {
      reply.code(404).send({ message: "Template not found in active organization." });
      return;
    }

    const schema = await repository.getSchemaById(organizationId, template.schemaId);
    if (!schema) {
      reply.code(404).send({ message: "Schema for the selected template was not found." });
      return;
    }

    const validationError = validateClaimsAgainstSchema(schema.schemaJson, body.claims);
    if (validationError) {
      reply.code(400).send({ message: validationError });
      return;
    }

    const unsigned = buildUnsignedCredentialDocument({
      issuerDid: body.issuerDid,
      subjectDid: body.subjectDid,
      claims: body.claims,
      template,
      schema,
    });

    const signed = await cryptoService.signCredential({
      organizationId,
      environment: "development",
      keyRef: `${organizationId}:issuer:default`,
      issuerDid: body.issuerDid,
      credentialPayloadJson: unsigned.credentialJson,
      signatureSuite: "Ed25519Signature2020",
    });

    if (!signed.success || !signed.signedCredentialJson) {
      reply.code(502).send({ message: signed.errors[0] ?? "Crypto engine failed to sign credential." });
      return;
    }

    const proofJson = isRecord(signed.signedCredentialJson.proof) ? signed.signedCredentialJson.proof : null;

    const credentialRecord = await repository.createCredential({
      organizationId,
      templateId: template.id,
      issuerDid: body.issuerDid,
      subjectDid: body.subjectDid,
      format: body.format ?? "vc-jsonld",
      credentialJson: signed.signedCredentialJson,
      proofJson,
      createdBy: session.user.id,
    });

    reply.code(201).send({
      credential: credentialRecord,
    });
  });

  app.post("/v1/credentials/verify", { preHandler: [sessionGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { presentation: ["verify"] });
    if (!allowed) {
      return;
    }

    const body = verifyCredentialBody.parse(request.body);
    const organizationId = getSessionOrThrow(request).session.activeOrganizationId ?? "verification-context";

    const verification = await cryptoService.verifyCredential({
      organizationId,
      environment: "development",
      verificationInputJson: body.credential,
    });

    if (!verification.success && verification.errors.length > 0 && Object.keys(verification.verificationResultJson).length === 0) {
      reply.code(400).send({ message: verification.errors[0] });
      return;
    }

    return {
      verification: verification.verificationResultJson,
      errors: verification.errors,
    };
  });

  app.get("/v1/credentials", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { credential: ["read"] });
    if (!allowed) {
      return;
    }

    const organizationId = getActiveOrganizationIdOrThrow(request);
    const credentials = await repository.listIssuedCredentials(organizationId);

    return { credentials };
  });

  app.post("/v1/presentations/verify", { preHandler: [sessionGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { presentation: ["verify"] });
    if (!allowed) {
      return;
    }

    const body = verifyPresentationBody.parse(request.body);
    const organizationId = getSessionOrThrow(request).session.activeOrganizationId ?? "verification-context";

    const verification = await cryptoService.verifyPresentation({
      organizationId,
      environment: "development",
      verificationInputJson: body.presentation,
    });

    if (!verification.success && verification.errors.length > 0 && Object.keys(verification.verificationResultJson).length === 0) {
      reply.code(400).send({ message: verification.errors[0] });
      return;
    }

    return {
      verification: verification.verificationResultJson,
      errors: verification.errors,
    };
  });
}
