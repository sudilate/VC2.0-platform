import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { credentialSchemas, credentialTemplates } from "@vc-platform/database";
import { db } from "../../lib/db";
import {
  getActiveOrganizationIdOrThrow,
  getSessionOrThrow,
  requireActiveOrganization,
  requireSession,
} from "../../plugins/guards";
import { requireOrganizationPermission } from "../../plugins/permissions";

const createTemplateBody = z.object({
  schemaId: z.string().uuid(),
  name: z.string().min(2).max(255),
  templateJson: z.record(z.string(), z.unknown()),
});

const templateParams = z.object({
  id: z.string().uuid(),
});

function assertTemplateLike(templateJson: Record<string, unknown>) {
  return Object.keys(templateJson).length > 0;
}

export interface TemplateRecord {
  id: string;
  organizationId: string;
  schemaId: string;
  name: string;
  templateJson: Record<string, unknown>;
  status: "draft" | "active" | "archived";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateRepository {
  create(input: {
    organizationId: string;
    schemaId: string;
    name: string;
    templateJson: Record<string, unknown>;
    createdBy: string;
  }): Promise<TemplateRecord>;
  listByOrganization(organizationId: string): Promise<TemplateRecord[]>;
  getById(organizationId: string, id: string): Promise<TemplateRecord | null>;
  schemaExistsInOrganization(organizationId: string, schemaId: string): Promise<boolean>;
}

const drizzleTemplateRepository: TemplateRepository = {
  async create(input) {
    const [row] = await db
      .insert(credentialTemplates)
      .values({
        organizationId: input.organizationId,
        schemaId: input.schemaId,
        name: input.name,
        templateJson: input.templateJson,
        status: "draft",
        createdBy: input.createdBy,
      })
      .returning();

    return row;
  },
  async listByOrganization(organizationId) {
    return db
      .select()
      .from(credentialTemplates)
      .where(eq(credentialTemplates.organizationId, organizationId))
      .orderBy(desc(credentialTemplates.createdAt));
  },
  async getById(organizationId, id) {
    const [row] = await db
      .select()
      .from(credentialTemplates)
      .where(and(eq(credentialTemplates.organizationId, organizationId), eq(credentialTemplates.id, id)));

    return row ?? null;
  },
  async schemaExistsInOrganization(organizationId, schemaId) {
    const [row] = await db
      .select({ id: credentialSchemas.id })
      .from(credentialSchemas)
      .where(and(eq(credentialSchemas.organizationId, organizationId), eq(credentialSchemas.id, schemaId)));

    return Boolean(row);
  },
};

export interface TemplateRouteDependencies {
  repository?: TemplateRepository;
  sessionGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  activeOrganizationGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  permissionChecker?: (
    request: FastifyRequest,
    reply: FastifyReply,
    permissions: Parameters<typeof requireOrganizationPermission>[2],
  ) => Promise<boolean>;
}

export async function registerTemplateRoutes(app: FastifyInstance, deps: TemplateRouteDependencies = {}) {
  const repository = deps.repository ?? drizzleTemplateRepository;
  const sessionGuard = deps.sessionGuard ?? requireSession;
  const activeOrganizationGuard = deps.activeOrganizationGuard ?? requireActiveOrganization;
  const permissionChecker = deps.permissionChecker ?? requireOrganizationPermission;

  app.post("/v1/templates", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const body = createTemplateBody.parse(request.body);
    const allowed = await permissionChecker(request, reply, { template: ["create"] });
    if (!allowed) {
      return;
    }

    if (!assertTemplateLike(body.templateJson)) {
      reply.code(400).send({ message: "templateJson must contain at least one field." });
      return;
    }

    const session = getSessionOrThrow(request);
    const organizationId = getActiveOrganizationIdOrThrow(request);

    const schemaExists = await repository.schemaExistsInOrganization(organizationId, body.schemaId);
    if (!schemaExists) {
      reply.code(400).send({
        message: "schemaId does not belong to active organization.",
      });
      return;
    }

    const created = await repository.create({
      organizationId,
      schemaId: body.schemaId,
      name: body.name,
      templateJson: body.templateJson,
      createdBy: session.user.id,
    });

    reply.code(201).send({ template: created });
  });

  app.get("/v1/templates", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { template: ["read"] });
    if (!allowed) {
      return;
    }

    const organizationId = getActiveOrganizationIdOrThrow(request);
    const templates = await repository.listByOrganization(organizationId);

    return { templates };
  });

  app.get("/v1/templates/:id", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { template: ["read"] });
    if (!allowed) {
      return;
    }

    const params = templateParams.parse(request.params);
    const organizationId = getActiveOrganizationIdOrThrow(request);
    const template = await repository.getById(organizationId, params.id);

    if (!template) {
      reply.code(404).send({ message: "Template not found in active organization." });
      return;
    }

    return { template };
  });
}
