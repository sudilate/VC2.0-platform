import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { registerSchemaRoutes, type SchemaRecord, type SchemaRepository } from "./routes";

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

describe("schema routes", () => {
  let app = Fastify();
  const records: SchemaRecord[] = [];

  const repository: SchemaRepository = {
    async create(input) {
      const record: SchemaRecord = {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        name: input.name,
        version: input.version,
        schemaUri: input.schemaUri,
        schemaJson: input.schemaJson,
        status: "draft",
        createdBy: input.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      records.push(record);
      return record;
    },
    async listByOrganization(organizationId) {
      return records.filter((record) => record.organizationId === organizationId);
    },
    async getById(organizationId, id) {
      return records.find((record) => record.organizationId === organizationId && record.id === id) ?? null;
    },
  };

  beforeEach(async () => {
    records.length = 0;
    app = Fastify();
    await registerSchemaRoutes(app, {
      repository,
      sessionGuard: makeSessionGuard("org_1"),
      activeOrganizationGuard: noOpActiveGuard,
      permissionChecker: allowPermission,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates a schema for the active organization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/schemas",
      payload: {
        name: "kyc-profile",
        version: "1.0.0",
        schemaUri: "https://example.com/schemas/kyc-profile.json",
        schemaJson: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            fullName: { type: "string" },
          },
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as { schema: SchemaRecord };
    expect(body.schema.organizationId).toBe("org_1");
    expect(body.schema.createdBy).toBe("user_1");
    expect(body.schema.name).toBe("kyc-profile");
  });

  it("rejects schema payloads that are not schema-like", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/schemas",
      payload: {
        name: "bad-schema",
        version: "1.0.0",
        schemaUri: "https://example.com/schemas/bad.json",
        schemaJson: {},
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("lists schemas scoped to active organization", async () => {
    await repository.create({
      organizationId: "org_1",
      name: "resident",
      version: "1.0.0",
      schemaUri: "https://example.com/schemas/resident.json",
      schemaJson: { type: "object" },
      createdBy: "user_1",
    });
    await repository.create({
      organizationId: "org_2",
      name: "employee",
      version: "1.0.0",
      schemaUri: "https://example.com/schemas/employee.json",
      schemaJson: { type: "object" },
      createdBy: "user_1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/schemas",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { schemas: SchemaRecord[] };
    expect(body.schemas).toHaveLength(1);
    expect(body.schemas[0]?.organizationId).toBe("org_1");
  });

  it("returns 404 when schema does not exist in active organization", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/schemas/${crypto.randomUUID()}`,
    });

    expect(response.statusCode).toBe(404);
  });
});
