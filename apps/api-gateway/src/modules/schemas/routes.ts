import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { credentialSchemas } from "@vc-platform/database";
import { db } from "../../lib/db";
import {
  getActiveOrganizationIdOrThrow,
  getSessionOrThrow,
  requireActiveOrganization,
  requireSession,
} from "../../plugins/guards";
import { requireOrganizationPermission, type PermissionMap } from "../../plugins/permissions";

const createSchemaBody = z.object({
  name: z.string().min(2).max(255),
  version: z.string().min(1).max(64),
  schemaUri: z.string().url(),
  schemaJson: z.record(z.string(), z.unknown()),
});

const schemaParams = z.object({
  id: z.string().uuid(),
});

function assertJsonSchemaLike(schemaJson: Record<string, unknown>) {
  if (Object.keys(schemaJson).length === 0) {
    return false;
  }

  const hasStructuralHint =
    "$schema" in schemaJson ||
    "type" in schemaJson ||
    "$defs" in schemaJson ||
    "properties" in schemaJson ||
    "oneOf" in schemaJson ||
    "allOf" in schemaJson;

  return hasStructuralHint;
}

export interface SchemaRecord {
  id: string;
  organizationId: string;
  name: string;
  version: string;
  schemaUri: string;
  schemaJson: Record<string, unknown>;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaRepository {
  create(input: {
    organizationId: string;
    name: string;
    version: string;
    schemaUri: string;
    schemaJson: Record<string, unknown>;
    createdBy: string;
  }): Promise<SchemaRecord>;
  listByOrganization(organizationId: string): Promise<SchemaRecord[]>;
  getById(organizationId: string, id: string): Promise<SchemaRecord | null>;
}

const drizzleSchemaRepository: SchemaRepository = {
  async create(input) {
    const [row] = await db
      .insert(credentialSchemas)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        version: input.version,
        schemaUri: input.schemaUri,
        schemaJson: input.schemaJson,
        status: "draft",
        createdBy: input.createdBy,
      })
      .returning();

    return row;
  },
  async listByOrganization(organizationId) {
    return db
      .select()
      .from(credentialSchemas)
      .where(eq(credentialSchemas.organizationId, organizationId))
      .orderBy(desc(credentialSchemas.createdAt));
  },
  async getById(organizationId, id) {
    const [row] = await db
      .select()
      .from(credentialSchemas)
      .where(and(eq(credentialSchemas.organizationId, organizationId), eq(credentialSchemas.id, id)));

    return row ?? null;
  },
};

export interface SchemaRouteDependencies {
  repository?: SchemaRepository;
  sessionGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  activeOrganizationGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  permissionChecker?: (
    request: FastifyRequest,
    reply: FastifyReply,
    permissions: PermissionMap,
  ) => Promise<boolean>;
}

export async function registerSchemaRoutes(app: FastifyInstance, deps: SchemaRouteDependencies = {}) {
  const repository = deps.repository ?? drizzleSchemaRepository;
  const sessionGuard = deps.sessionGuard ?? requireSession;
  const activeOrganizationGuard = deps.activeOrganizationGuard ?? requireActiveOrganization;
  const permissionChecker = deps.permissionChecker ?? requireOrganizationPermission;

  app.post("/v1/schemas", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const body = createSchemaBody.parse(request.body);
    const allowed = await permissionChecker(request, reply, { schema: ["create"] });
    if (!allowed) {
      return;
    }

    if (!assertJsonSchemaLike(body.schemaJson)) {
      reply.code(400).send({
        message: "schemaJson does not look like a valid JSON Schema document.",
      });
      return;
    }

    const session = getSessionOrThrow(request);
    const organizationId = getActiveOrganizationIdOrThrow(request);

    const created = await repository.create({
      organizationId,
      name: body.name,
      version: body.version,
      schemaUri: body.schemaUri,
      schemaJson: body.schemaJson,
      createdBy: session.user.id,
    });

    reply.code(201).send({ schema: created });
  });

  app.get("/v1/schemas", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { schema: ["read"] });
    if (!allowed) {
      return;
    }

    const organizationId = getActiveOrganizationIdOrThrow(request);
    const schemas = await repository.listByOrganization(organizationId);

    return { schemas };
  });

  app.get("/v1/schemas/:id", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { schema: ["read"] });
    if (!allowed) {
      return;
    }

    const params = schemaParams.parse(request.params);
    const organizationId = getActiveOrganizationIdOrThrow(request);
    const schema = await repository.getById(organizationId, params.id);

    if (!schema) {
      reply.code(404).send({ message: "Schema not found in active organization." });
      return;
    }

    return { schema };
  });
}
