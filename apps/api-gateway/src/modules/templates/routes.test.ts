import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { registerTemplateRoutes, type TemplateRecord, type TemplateRepository } from "./routes";

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

const noOpActiveGuard = async () => {
  return;
};

const allowPermission = async () => true;

describe("template routes", () => {
  let app = Fastify();
  const templates: TemplateRecord[] = [];
  const schemaIdsByOrg = new Map<string, Set<string>>();

  const repository: TemplateRepository = {
    async create(input) {
      const record: TemplateRecord = {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        schemaId: input.schemaId,
        name: input.name,
        templateJson: input.templateJson,
        status: "draft",
        createdBy: input.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templates.push(record);
      return record;
    },
    async listByOrganization(organizationId) {
      return templates.filter((template) => template.organizationId === organizationId);
    },
    async getById(organizationId, id) {
      return templates.find((template) => template.organizationId === organizationId && template.id === id) ?? null;
    },
    async schemaExistsInOrganization(organizationId, schemaId) {
      return schemaIdsByOrg.get(organizationId)?.has(schemaId) ?? false;
    },
  };

  beforeEach(async () => {
    templates.length = 0;
    schemaIdsByOrg.clear();
    app = Fastify();
    await registerTemplateRoutes(app, {
      repository,
      sessionGuard: makeSessionGuard("org_1"),
      activeOrganizationGuard: noOpActiveGuard,
      permissionChecker: allowPermission,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates template when schema belongs to active organization", async () => {
    const schemaId = crypto.randomUUID();
    schemaIdsByOrg.set("org_1", new Set([schemaId]));

    const response = await app.inject({
      method: "POST",
      url: "/v1/templates",
      payload: {
        schemaId,
        name: "employee-card-template",
        templateJson: {
          context: "employee",
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as { template: TemplateRecord };
    expect(body.template.organizationId).toBe("org_1");
    expect(body.template.createdBy).toBe("user_1");
  });

  it("rejects template if schema does not belong to active organization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/templates",
      payload: {
        schemaId: crypto.randomUUID(),
        name: "invalid-template",
        templateJson: {
          foo: "bar",
        },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("lists templates for active organization", async () => {
    templates.push({
      id: crypto.randomUUID(),
      organizationId: "org_1",
      schemaId: crypto.randomUUID(),
      name: "template-a",
      templateJson: { a: true },
      status: "draft",
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    templates.push({
      id: crypto.randomUUID(),
      organizationId: "org_2",
      schemaId: crypto.randomUUID(),
      name: "template-b",
      templateJson: { b: true },
      status: "draft",
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/templates",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { templates: TemplateRecord[] };
    expect(body.templates).toHaveLength(1);
    expect(body.templates[0]?.name).toBe("template-a");
  });

  it("returns 404 when template does not exist in active organization", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/templates/${crypto.randomUUID()}`,
    });

    expect(response.statusCode).toBe(404);
  });
});
